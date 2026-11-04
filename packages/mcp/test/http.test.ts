import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { testing } from '@fides/sdk';
import { createFidesMcpHttp } from '../src/http.js';

const { newWorld, makeAgent, MERCHANT_HOST, PAYTO, USDC } = testing;
const TOKEN = 'a-long-random-test-token-123456';
const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (closers.length) await closers.pop()!();
});

async function boot(over: Partial<Parameters<typeof createFidesMcpHttp>[1]> = {}) {
  const agent = makeAgent(newWorld(), 'A');
  const server = createFidesMcpHttp(agent.fides, { token: TOKEN, ownerId: 'A', ...over });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
  closers.push(() => new Promise((r) => server.close(() => r())));
  return { url, agent };
}
const rpc = (url: string, headers: Record<string, string>, body: unknown = { jsonrpc: '2.0', id: 1, method: 'tools/list' }, method = 'POST') =>
  fetch(url, { method, headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers }, ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) });
const auth = { authorization: `Bearer ${TOKEN}` };

describe('Fides MCP over HTTP', () => {
  it('a real MCP client with the token lists the tools and gets a verdict', async () => {
    const { url } = await boot();
    const client = new Client({ name: 'http-client', version: '0.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: auth } }));
    closers.push(() => client.close());
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual(['fides_check', 'fides_lookup', 'fides_report']);
    const r = await client.callTool({ name: 'fides_check', arguments: { merchantHost: MERCHANT_HOST, payTo: PAYTO, amount: '0.01', asset: USDC } });
    expect(r.structuredContent).toMatchObject({ decision: 'ASK', cannotSay: true });
  });

  it('refuses to start without a real token', () => {
    const agent = makeAgent(newWorld(), 'A');
    expect(() => createFidesMcpHttp(agent.fides, { token: '' })).toThrow(/bearer token/);
    expect(() => createFidesMcpHttp(agent.fides, { token: 'short' })).toThrow(/at least 16/);
  });

  it('no token, a wrong token, and a malformed header are all 401 and say how to authenticate', async () => {
    const { url } = await boot();
    const attempts: Record<string, string>[] = [{}, { authorization: 'Bearer wrong-token-wrong-token' }, { authorization: TOKEN }, { authorization: 'Basic abc' }];
    for (const headers of attempts) {
      const r = await rpc(url, headers);
      expect(r.status).toBe(401);
      expect(r.headers.get('www-authenticate')).toMatch(/^Bearer/);
    }
  });

  it('the token is not accepted from the query string', async () => {
    const { url } = await boot();
    expect((await rpc(`${url}?token=${TOKEN}`, {})).status).toBe(401);
  });

  it('a request from a web page (an Origin header) is refused even with the token, unless the origin is allowed', async () => {
    const { url } = await boot();
    expect((await rpc(url, { ...auth, origin: 'https://evil.example' })).status).toBe(403);
    const ok = await boot({ allowedOrigins: ['https://app.example'] });
    expect((await rpc(ok.url, { ...auth, origin: 'https://app.example' })).status).toBe(200);
    expect((await rpc(ok.url, { ...auth, origin: 'https://evil.example' })).status).toBe(403);
  });

  it('a Host header that is not local or allowed is refused (DNS rebinding)', async () => {
    const { url } = await boot();
    // fetch does not let us set Host, so go through a raw request
    const { request } = await import('node:http');
    const u = new URL(url);
    const status = await new Promise<number>((resolve) => {
      const req = request({ host: u.hostname, port: u.port, path: '/mcp', method: 'POST', headers: { host: 'attacker.example', ...auth, 'content-type': 'application/json' } }, (r) => resolve(r.statusCode ?? 0));
      req.end('{}');
    });
    expect(status).toBe(403);
  });

  it('only POST /mcp: other methods are 405, other paths 404', async () => {
    const { url } = await boot();
    expect((await rpc(url, auth, undefined, 'GET')).status).toBe(405);
    expect((await rpc(url, auth, undefined, 'DELETE')).status).toBe(405);
    expect((await rpc(url.replace('/mcp', '/other'), auth)).status).toBe(404);
  });

  it('an oversized body is 413 and invalid JSON is a parse error, not a crash', async () => {
    const { url } = await boot({ maxBodyBytes: 200 });
    expect((await rpc(url, auth, 'x'.repeat(500))).status).toBe(413);
    const big = await boot();
    const r = await rpc(big.url, auth, '{not json');
    expect(r.status).toBe(400);
    expect((await r.json()).error.code).toBe(-32700);
  });

  it('is stateless: calls share nothing between requests', async () => {
    const { url } = await boot();
    const a = await (await rpc(url, auth)).json();
    const b = await (await rpc(url, auth)).json();
    expect(a.result.tools).toHaveLength(3);
    expect(b.result.tools).toHaveLength(3);
  });

  it('a burst over the rate limit is 429 with Retry-After, and the bucket refills with time', async () => {
    let t = 1_000_000;
    const { url } = await boot({ rateLimit: { perMinute: 6, burst: 2 }, now: () => t });
    expect((await rpc(url, auth)).status).toBe(200);
    expect((await rpc(url, auth)).status).toBe(200);
    const over = await rpc(url, auth);
    expect(over.status).toBe(429);
    expect(over.headers.get('retry-after')).toBe('10'); // 6 a minute: one every 10 s
    expect((await rpc(url, {})).status).toBe(401); // a request without the token is refused before it can spend the bucket
    t += 10_000;
    expect((await rpc(url, auth)).status).toBe(200);
    expect((await rpc(url, auth)).status).toBe(429);
  });

  it('a call that does not finish in time is answered 504, not left hanging', async () => {
    const { url, agent } = await boot({ requestTimeoutMs: 150 });
    agent.fides.check = () => new Promise(() => undefined); // Tatum never answers
    const r = await rpc(url, auth, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'fides_check', arguments: { merchantHost: MERCHANT_HOST, payTo: PAYTO, amount: '0.01', asset: USDC } } });
    expect(r.status).toBe(504);
    expect((await r.json()).error).toBe('no answer within 150 ms');
  });
});
