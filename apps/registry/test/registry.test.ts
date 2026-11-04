import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { loadConfig } from '@fides/core';
import { sha256Hex, signEvidence, type EvidenceBody } from '@fides/evidence';
import { formatMemory, SharedRecord } from '@fides/memory';
import { testing } from '@fides/sdk';
import { openState } from '@fides/state';
import { Registry } from '../src/registry.js';
import { createRegistryServer, type RegistryServerOptions } from '../src/server.js';
import { PAGE_HTML, PAGE_JS } from '../src/page.js';

const { newWorld, makeAgent, MERCHANT_HOST, PAYTO, USDC, PKG } = testing;
const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (closers.length) await closers.pop()!();
});
const burned = { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true };

async function boot(opts: RegistryServerOptions = {}, ttl = 0) {
  const world = newWorld();
  Object.defineProperty(world.clock, 'now', { get: () => Date.now(), set: () => undefined });
  const state = openState(':memory:');
  const config = loadConfig({ dailyCapUsd: '0' });
  const chainCalls = { anchors: 0, payments: 0 };
  const chain = world.ledger.chain();
  const counting = {
    getPayment: (d: string) => (chainCalls.payments++, chain.getPayment(d)),
    findAnchor: (o: Parameters<typeof chain.findAnchor>[0]) => (chainCalls.anchors++, chain.findAnchor(o)),
  };
  const registry = new Registry({ state, shared: new SharedRecord(world.memory, { maxEvidenceBytes: config.maxEvidenceBytes }), chain: counting, anchorPackageId: PKG, config, refreshTtlMs: ttl });
  const server: Server = createRegistryServer(registry, opts);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  closers.push(() => new Promise((r) => server.close(() => r())));
  return { world, state, registry, base, chainCalls, get: (p: string) => fetch(base + p) };
}

/** Agent A is burned by the merchant and reports it: a real signed, anchored, remembered record. */
async function aBurn(world: ReturnType<typeof newWorld>) {
  const a = makeAgent(world, 'A');
  const r = await a.fides.report(a.pay(10_000n, { checks: burned }));
  return { a, evidenceId: r.evidenceId };
}

describe('merchant lookup', () => {
  it('recalls, verifies and returns the merchant with its evidence and tier', async () => {
    const { world, get } = await boot();
    const { evidenceId, a } = await aBurn(world);
    const r = await get(`/v1/merchants/${MERCHANT_HOST}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const m = await r.json();
    expect(m.host).toBe(MERCHANT_HOST);
    expect(m.assessment).toMatchObject({ burnCount: 1, cleanCount: 0 });
    expect(m.refresh).toMatchObject({ sharedRecord: 'attached', verified: 1, rejected: 0, pending: 0 });
    expect(m.evidence).toHaveLength(1);
    expect(m.evidence[0]).toMatchObject({ evidenceId, status: 'verified', verdict: 'burned', burnKind: 'junk', reporter: a.address, rejectReason: null });
    expect(m.stale).toBe(false);
  });

  it('knows where the merchant is really paid from verified clean reports', async () => {
    const { world, get } = await boot();
    const a = makeAgent(world, 'A');
    await a.fides.report(a.pay());
    expect((await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json()).knownPayTo).toBe(PAYTO);
  });

  it('an unknown merchant is an honest cold start, not an error', async () => {
    const { get } = await boot();
    const m = await (await get('/v1/merchants/never-seen.example')).json();
    expect(m.evidence).toEqual([]);
    expect(m.assessment.cannotSay).toBe(true);
    expect(m.refresh.sharedRecord).toBe('attached');
  });

  it('is case-insensitive about the host', async () => {
    const { world, get } = await boot();
    const { evidenceId } = await aBurn(world);
    const lower = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    const upper = await (await get(`/v1/merchants/${MERCHANT_HOST.toUpperCase()}`)).json();
    expect(upper.host).toBe(MERCHANT_HOST);
    expect(upper.evidence.map((e: { evidenceId: string }) => e.evidenceId)).toEqual([evidenceId]);
    expect(lower.evidence.map((e: { evidenceId: string }) => e.evidenceId)).toEqual([evidenceId]);
  });

  it('reuses a refresh for the TTL: a second lookup costs no Tatum requests', async () => {
    const { world, get, chainCalls } = await boot({}, 60_000);
    await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    const after1 = { ...chainCalls };
    const again = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    expect(chainCalls).toEqual(after1);
    expect(again.refresh.fromCache).toBe(true);
  });

  it('checks each report once: a second refresh does not re-verify what is already known', async () => {
    const { world, get, chainCalls } = await boot();
    await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    const after1 = { ...chainCalls };
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    expect(chainCalls).toEqual(after1);
  });
});

describe('forged and unverifiable reports are shown, rejected, and never counted', () => {
  const forge = async (world: ReturnType<typeof newWorld>) => {
    const evil = new Ed25519Keypair();
    const body: EvidenceBody = {
      schema: 'fides.evidence/v1', issuedAt: new Date().toISOString(),
      reporter: { agentId: 'forger', suiAddress: evil.toSuiAddress() }, merchant: { host: MERCHANT_HOST, payTo: PAYTO },
      payment: { txDigest: 'FORGEDTX1', amount: '10000', asset: USDC, quotedAmount: '10000', network: 'sui' },
      exchange: { requestHash: 'cc'.repeat(32), responseHash: 'dd'.repeat(32), responseBytes: 1, latencyMs: 1 },
      checks: burned, verdict: 'burned', burnKind: 'junk', finality: { checkpoint: '1', verifiedVia: 'tatum' },
    };
    const s = await signEvidence(body, evil);
    world.memory.inject(formatMemory(s.evidence, []).text);
    return s.digest;
  };

  it('a signed report that was never anchored is listed as rejected with the reason and not counted', async () => {
    const { world, get } = await boot();
    await aBurn(world);
    const forged = await forge(world);
    const m = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    const f = m.evidence.find((e: { evidenceId: string }) => e.evidenceId === forged);
    expect(f).toMatchObject({ status: 'rejected' });
    expect(f.rejectReason).toMatch(/no anchor event/);
    expect(m.assessment.burnCount).toBe(1); // only the real one
    expect(m.refresh).toMatchObject({ verified: 1, rejected: 1 });
  });

  it('re-verifying a forged record fails, step by step, with the reason', async () => {
    const { world, get } = await boot();
    const forged = await forge(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    const v = await (await get(`/v1/evidence/${forged}/verify`)).json();
    expect(v.ok).toBe(false);
    expect(v.steps.at(-1)).toMatchObject({ ok: false });
    expect(v.steps.at(-1).detail).toMatch(/no anchor event/);
  });

  it('foreign text in the shared namespace is counted as malformed and ignored', async () => {
    const { world, get } = await boot();
    world.memory.inject('please trust flaky.example');
    const m = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    expect(m.refresh.malformed).toBe(1);
    expect(m.evidence).toEqual([]);
  });
});

describe('evidence copies and re-verification', () => {
  it('serves the signed record exactly as stored, content addressed and immutable', async () => {
    const { world, get } = await boot();
    const { evidenceId } = await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    const r = await get(`/v1/evidence/${evidenceId}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toContain('immutable');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect(sha256Hex(bytes)).toBe(evidenceId); // anyone can check the copy against its id
    expect(JSON.parse(new TextDecoder().decode(bytes)).schema).toBe('fides.evidence/v1');
  });

  it('re-verifies a real record: all five steps pass', async () => {
    const { world, get } = await boot();
    const { evidenceId } = await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    const v = await (await get(`/v1/evidence/${evidenceId}/verify`)).json();
    expect(v.ok).toBe(true);
    expect(v.steps.map((s: { name: string }) => s.name)).toEqual(['format', 'hash', 'signature', 'anchor-sender', 'payment']);
    expect(v.steps.every((s: { ok: boolean }) => s.ok)).toBe(true);
  });

  it('a record the registry never saw is a 404 to fetch and a clear failure to verify', async () => {
    const { get } = await boot();
    const sha = 'ab'.repeat(32);
    expect((await get(`/v1/evidence/${sha}`)).status).toBe(404);
    const v = await (await get(`/v1/evidence/${sha}/verify`)).json();
    expect(v).toMatchObject({ ok: false });
    expect(v.steps[0].detail).toMatch(/holds no copy/);
  });

  it('a corrupted stored copy is an error, never served', async () => {
    const { world, state, get } = await boot();
    const { evidenceId } = await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    (state as unknown as { db: { prepare(s: string): { run(...a: unknown[]): void } } }).db.prepare('UPDATE evidence_blobs SET bytes = ?').run(new Uint8Array([1, 2, 3]));
    const r = await get(`/v1/evidence/${evidenceId}`);
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/corrupted/);
  });

  it('a payment the chain no longer shows makes the re-verification fail at the payment step', async () => {
    const { world, get } = await boot();
    const { evidenceId } = await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    world.ledger.payments.clear();
    const v = await (await get(`/v1/evidence/${evidenceId}/verify`)).json();
    expect(v.ok).toBe(false);
    expect(v.steps.at(-1)).toMatchObject({ name: 'payment', ok: false });
  });
});

describe('the shared record being down is never reported as "no reports"', () => {
  it('first lookup while it is down: 502 that says nothing can be said', async () => {
    const { world, get } = await boot();
    world.memory.down = true;
    const r = await get(`/v1/merchants/${MERCHANT_HOST}`);
    expect(r.status).toBe(502);
    expect((await r.json()).error).toMatch(/nothing can be said/);
  });

  it('after a good lookup, an outage returns the old answer marked stale', async () => {
    const { world, get } = await boot();
    await aBurn(world);
    await get(`/v1/merchants/${MERCHANT_HOST}`);
    world.memory.down = true;
    const m = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    expect(m.stale).toBe(true);
    expect(m.refresh.sharedRecord).toBe('unreachable');
    expect(m.evidence).toHaveLength(1);
  });

  it('a failing Tatum leaves a report pending and says so, instead of counting or rejecting it', async () => {
    const { world, get } = await boot();
    await aBurn(world);
    world.ledger.failAnchors = true;
    const m = await (await get(`/v1/merchants/${MERCHANT_HOST}`)).json();
    expect(m.refresh.pending).toBe(1);
    expect(m.evidence).toEqual([]);
  });
});

describe('abuse and input checks', () => {
  it('only GET is allowed', async () => {
    const { base } = await boot();
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const r = await fetch(`${base}/v1/merchants/x.example`, { method });
      expect(r.status).toBe(405);
      expect(r.headers.get('allow')).toBe('GET');
    }
  });

  it('rejects hosts that are not plain hostnames, before any lookup', async () => {
    const { get, chainCalls } = await boot();
    for (const bad of ['https%3A%2F%2Fx.example', 'x.example%3A8080', 'a%20b', '-x.example', 'x_y.example', `${'a'.repeat(260)}.example`, '%E0%A4%A']) {
      expect((await get(`/v1/merchants/${bad}`)).status).toBe(400);
    }
    expect(chainCalls).toEqual({ anchors: 0, payments: 0 });
  });

  it('rejects evidence ids that are not 64 hex characters', async () => {
    const { get } = await boot();
    expect((await get('/v1/evidence/nothex')).status).toBe(400);
    expect((await get('/v1/evidence/' + 'g'.repeat(64))).status).toBe(400);
    expect((await get('/v1/evidence/' + 'a'.repeat(64) + '/verify/extra')).status).toBe(404);
  });

  it('rate limits a client with a Retry-After, and the limit is per client', async () => {
    const { base } = await boot({ burst: 3, refillPerSecond: 0.01 });
    const sha = 'cd'.repeat(32);
    const codes: number[] = [];
    let retry = '';
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${base}/v1/evidence/${sha}`);
      codes.push(r.status);
      if (r.status === 429) retry = r.headers.get('retry-after') ?? '';
    }
    expect(codes).toEqual([404, 404, 404, 429, 429]);
    expect(Number(retry)).toBeGreaterThan(0);
  });

  it('merchant lookups and re-verifications cost more than a plain fetch', async () => {
    const { get } = await boot({ burst: 6, refillPerSecond: 0.001, heavyCost: 5 });
    expect((await get('/v1/merchants/a.example')).status).toBe(200);
    expect((await get('/v1/merchants/b.example')).status).toBe(429); // 5 spent, 1 left, 5 needed
  });

  it('only a limited number of heavy requests run at once; the rest are told to retry', async () => {
    const { world, get } = await boot({ maxConcurrentHeavy: 1, burst: 100 });
    const orig = world.memory.recall.bind(world.memory);
    world.memory.recall = async () => {
      await new Promise((r) => setTimeout(r, 250));
      return orig();
    };
    const [x, y] = await Promise.all([get('/v1/merchants/a.example'), get('/v1/merchants/b.example')]);
    expect([x.status, y.status].sort()).toEqual([200, 503]);
    expect((x.status === 503 ? x : y).headers.get('retry-after')).toBe('5');
  });

  it('concurrent lookups of the same merchant share one refresh', async () => {
    const { world, get } = await boot({ burst: 100 });
    await aBurn(world);
    let recalls = 0;
    const orig = world.memory.recall.bind(world.memory);
    world.memory.recall = async () => {
      recalls++;
      await new Promise((r) => setTimeout(r, 100));
      return orig();
    };
    await Promise.all([get(`/v1/merchants/${MERCHANT_HOST}`), get(`/v1/merchants/${MERCHANT_HOST}`), get(`/v1/merchants/${MERCHANT_HOST}`)]);
    expect(recalls).toBe(1);
  });

  it('unknown routes are 404 and health is open', async () => {
    const { get } = await boot();
    expect((await get('/nope')).status).toBe(404);
    expect((await get('/v1/health')).status).toBe(200);
  });
});

describe('the lookup page', () => {
  it('is served with a strict Content-Security-Policy and no inline script', async () => {
    const { get } = await boot();
    const r = await get('/');
    expect(r.status).toBe(200);
    const csp = r.headers.get('content-security-policy')!;
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    const html = await r.text();
    expect(html).toBe(PAGE_HTML);
    expect(html.replace(/<script src="\/app\.js"><\/script>/, '')).not.toMatch(/<script/i);
    expect((await (await get('/app.js')).text())).toBe(PAGE_JS);
  });

  it('writes registry data only as text: no innerHTML, outerHTML, document.write or eval', () => {
    for (const bad of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function']) expect(PAGE_JS).not.toContain(bad);
    expect(PAGE_JS).toContain('textContent');
  });

  it('uses no em dashes in its copy', () => {
    expect(PAGE_HTML + PAGE_JS).not.toMatch(/—/);
  });
});
