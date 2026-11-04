// Fides as a remote MCP server over HTTP (streamable HTTP, stateless), for clients that need a URL: hosted connectors in
// the vendors' APIs, and agents on another machine. The tools are the same as over stdio.
//
// It spends the agent's money-adjacent state (daily cap, evidence written under the agent's key), so it is closed by default:
//   - a bearer token is required, and the server refuses to start without one
//   - it binds to the loopback interface unless told otherwise; put TLS and a proxy in front of it to expose it
//   - the Host and Origin headers are checked, which stops a web page in the user's browser reaching a local server
//   - POST /mcp only, a small body limit, no sessions and no event streams
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { timingSafeEqual, createHash } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Fides } from '@fides/sdk';
import { createFidesMcp, type FidesMcpOptions } from './server.js';

export interface FidesMcpHttpOptions extends FidesMcpOptions {
  /** Required. Clients send it as "Authorization: Bearer <token>". Use a long random string. */
  token: string;
  /** Host header values to accept besides localhost and 127.0.0.1 (for example "mcp.example.com"). */
  allowedHosts?: string[];
  /** Origins to accept. A request with an Origin header not in this list is refused. Default: none (non-browser clients only). */
  allowedOrigins?: string[];
  /** Largest request body. Default 1 MB. */
  maxBodyBytes?: number;
}

const digest = (s: string) => createHash('sha256').update(s).digest();

export function createFidesMcpHttp(fides: Fides, o: FidesMcpHttpOptions): Server {
  if (!o.token || o.token.length < 16) throw new Error('a bearer token of at least 16 characters is required to serve MCP over HTTP');
  const want = digest(o.token);
  const maxBody = o.maxBodyBytes ?? 1_048_576;
  const origins = new Set(o.allowedOrigins ?? []);

  const reply = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(body));
  };
  const authorized = (req: IncomingMessage) => {
    const h = req.headers.authorization ?? '';
    const m = /^Bearer (.+)$/.exec(h);
    // compare fixed-length digests so the comparison takes the same time whatever the guess
    return !!m && timingSafeEqual(digest(m[1]!), want);
  };
  const hostOk = (req: IncomingMessage) => {
    const host = (req.headers.host ?? '').toLowerCase();
    const name = host.replace(/:\d+$/, '');
    return name === 'localhost' || name === '127.0.0.1' || name === '[::1]' || (o.allowedHosts ?? []).some((h) => h.toLowerCase() === host || h.toLowerCase() === name);
  };

  return createServer(async (req, res) => {
    try {
      if (!hostOk(req)) return reply(res, 403, { error: 'host not allowed' });
      const origin = req.headers.origin;
      if (origin !== undefined && !origins.has(origin)) return reply(res, 403, { error: 'origin not allowed' });
      if (new URL(req.url ?? '/', 'http://x').pathname !== '/mcp') return reply(res, 404, { error: 'not found: the endpoint is /mcp' });
      if (!authorized(req)) return reply(res, 401, { error: 'a valid bearer token is required' }, { 'www-authenticate': 'Bearer realm="fides"' });
      if (req.method !== 'POST') return reply(res, 405, { error: 'POST only: this server is stateless and has no event stream' }, { allow: 'POST' });

      const chunks: Buffer[] = [];
      let size = 0;
      for await (const c of req) {
        size += (c as Buffer).length;
        if (size > maxBody) return reply(res, 413, { error: `request body over ${maxBody} bytes` });
        chunks.push(c as Buffer);
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return reply(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: 'parse error: the body is not JSON' }, id: null });
      }

      // Stateless: a fresh server and transport per request, so nothing is shared between callers.
      const server = createFidesMcp(fides, o);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req as IncomingMessage & { auth?: never }, res, body);
    } catch (e) {
      if (!res.headersSent) reply(res, 500, { error: `internal error: ${(e as Error).message}` });
    }
  });
}
