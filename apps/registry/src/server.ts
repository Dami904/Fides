// The registry's HTTP surface. Read only, rate limited, with strict input checks. Anyone can query it.
//   GET /                               the lookup page
//   GET /v1/health
//   GET /v1/merchants/:host             tier, evidence (verified and rejected), refreshed from the shared record
//   GET /v1/evidence/:sha256            the signed record exactly as stored (content addressed, immutable)
//   GET /v1/evidence/:sha256/verify     run the section 8 checks again now, step by step
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PAGE_HTML, PAGE_JS } from './page.js';
import type { Registry } from './registry.js';

export interface RegistryServerOptions {
  /** Requests a client may burst, and how many it earns back per second. Defaults 20 and 0.5. */
  burst?: number;
  refillPerSecond?: number;
  /** Merchant lookups and re-verifications cost more tokens: they spend Tatum and relayer requests. Default 5. */
  heavyCost?: number;
  /** How many refreshes or re-verifications may run at once. Default 4. */
  maxConcurrentHeavy?: number;
  /** Take the client address from X-Forwarded-For. Only when a trusted proxy sets it. */
  trustProxy?: boolean;
  now?: () => number;
}

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/i;
const SHA = /^[0-9a-f]{64}$/i;

const CSP = "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const BASE_HEADERS = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'access-control-allow-origin': '*' };

export function createRegistryServer(registry: Registry, o: RegistryServerOptions = {}): Server {
  const burst = o.burst ?? 20;
  const refill = o.refillPerSecond ?? 0.5;
  const heavy = o.heavyCost ?? 5;
  const maxHeavy = o.maxConcurrentHeavy ?? 4;
  const now = o.now ?? (() => Date.now());
  const buckets = new Map<string, { tokens: number; at: number }>();
  let running = 0;

  const take = (ip: string, cost: number): number => {
    const t = now();
    const b = buckets.get(ip) ?? { tokens: burst, at: t };
    b.tokens = Math.min(burst, b.tokens + ((t - b.at) / 1000) * refill);
    b.at = t;
    if (buckets.size > 10_000) buckets.clear(); // never let the table grow without bound
    if (b.tokens < cost) {
      buckets.set(ip, b);
      return Math.ceil((cost - b.tokens) / refill);
    }
    b.tokens -= cost;
    buckets.set(ip, b);
    return 0;
  };

  const send = (res: ServerResponse, status: number, body: string | Uint8Array, type: string, extra: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': type, ...BASE_HEADERS, ...extra });
    res.end(body);
  };
  const json = (res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) =>
    send(res, status, JSON.stringify(body), 'application/json; charset=utf-8', { 'cache-control': 'no-store', ...extra });
  const clientIp = (req: IncomingMessage) => (o.trustProxy ? String(req.headers['x-forwarded-for'] ?? '').split(',')[0]!.trim() : '') || req.socket.remoteAddress || 'unknown';

  const heavyRun = async <T>(res: ServerResponse, fn: () => Promise<T>): Promise<T | undefined> => {
    if (running >= maxHeavy) {
      json(res, 503, { error: 'the registry is busy; try again in a few seconds' }, { 'retry-after': '5' });
      return undefined;
    }
    running++;
    try {
      return await fn();
    } finally {
      running--;
    }
  };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://registry.local');
      if (req.method !== 'GET') return json(res, 405, { error: 'read only: GET is the only method' }, { allow: 'GET' });

      const path = url.pathname;
      if (path === '/') return send(res, 200, PAGE_HTML, 'text/html; charset=utf-8', { 'content-security-policy': CSP, 'cache-control': 'no-cache' });
      if (path === '/app.js') return send(res, 200, PAGE_JS, 'text/javascript; charset=utf-8', { 'cache-control': 'no-cache' });
      if (path === '/v1/health') return json(res, 200, { ok: true });

      const merchant = /^\/v1\/merchants\/([^/]+)$/.exec(path);
      const evidence = /^\/v1\/evidence\/([^/]+)$/.exec(path);
      const verify = /^\/v1\/evidence\/([^/]+)\/verify$/.exec(path);
      if (!merchant && !evidence && !verify) return json(res, 404, { error: 'not found' });

      // Check the input first, which costs nothing. A malformed request is turned away cheaply; only a valid one that will
      // spend Tatum or relayer requests is charged the heavy cost.
      let host = '';
      let badInput = '';
      if (merchant) {
        try {
          host = decodeURIComponent(merchant[1]!);
          if (!HOST.test(host)) badInput = 'host must be a plain hostname: letters, digits, dots and hyphens, no scheme or port';
        } catch {
          badInput = 'invalid host';
        }
      } else if (!SHA.test((evidence ?? verify)![1]!)) {
        badInput = 'evidence id must be 64 hex characters';
      }
      const ip = clientIp(req);
      const wait = take(ip, !badInput && (merchant || verify) ? heavy : 1);
      if (wait > 0) return json(res, 429, { error: 'rate limit: slow down' }, { 'retry-after': String(wait) });
      if (badInput) return json(res, 400, { error: badInput });

      if (merchant) {
        const r = await heavyRun(res, () => registry.refresh(host));
        if (!r) return;
        // Never present an unreachable shared record as "no reports".
        if (r.sharedRecord === 'unreachable' && !registry.hasMerchant(host)) {
          return json(res, 502, { error: `the shared record could not be reached, so nothing can be said about ${host}: ${r.error ?? 'unreachable'}` });
        }
        return json(res, 200, registry.view(host, r));
      }

      if (evidence) {
        const sha = evidence[1]!;
        if (!SHA.test(sha)) return json(res, 400, { error: 'evidence id must be 64 hex characters' });
        let bytes: Uint8Array | null;
        try {
          bytes = registry.evidenceBytes(sha);
        } catch (e) {
          return json(res, 500, { error: (e as Error).message });
        }
        if (!bytes) return json(res, 404, { error: 'this registry holds no copy of that record' });
        return send(res, 200, bytes, 'application/json; charset=utf-8', { 'cache-control': 'public, max-age=31536000, immutable', 'x-fides-sha256': sha.toLowerCase() });
      }

      const sha = verify![1]!;
      if (!SHA.test(sha)) return json(res, 400, { error: 'evidence id must be 64 hex characters' });
      const result = await heavyRun(res, async () => {
        const steps = [];
        for await (const s of registry.reverify(sha.toLowerCase())) steps.push(s);
        return steps;
      });
      if (!result) return;
      return json(res, 200, { evidenceId: sha.toLowerCase(), ok: result.length > 0 && result.every((s) => s.ok) && result.length === 5, steps: result });
    } catch (e) {
      return json(res, 500, { error: `internal error: ${(e as Error).message}` });
    }
  });
}
