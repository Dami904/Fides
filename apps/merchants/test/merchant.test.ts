import { describe, expect, it, vi } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { checkResponse, type SchemaDoc } from '@fides/sdk';
import { MERCHANTS, schemaDoc, walletsFromEnv, type MerchantName } from '../src/config.js';
import { mppGate, readChallenge, type Gate } from '../src/gate.js';
import { Merchant, seededRandom } from '../src/merchant.js';

const NOW = Date.UTC(2026, 9, 28, 12, 0, 0);
const wallets = walletsFromEnv({ SUI_PRIVATE_KEY_MERCHANTS: new Ed25519Keypair().getSecretKey() });
const get = (m: Merchant, path = m.def.path, headers: Record<string, string> = {}) => m.handle(new Request('http://x' + path, { headers }));
const post = (m: Merchant, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  m.handle(new Request('http://x' + path, { method: 'POST', headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }));

/** A gate that answers 402 unless the request carries x-paid. Records every charge it was asked for. */
function fakeGate() {
  const charges: { amount: string; recipient: string }[] = [];
  const gate: Gate = async (req, charge) => {
    charges.push(charge);
    if (!req.headers.get('x-paid')) return { status: 402, challenge: new Response('pay', { status: 402 }) };
    return { status: 200, withReceipt: (res) => res };
  };
  return { gate, charges };
}
const PAID = { 'x-paid': '1' };

function make(name: MerchantName, over: Partial<ConstructorParameters<typeof Merchant>[0]> = {}) {
  const { gate, charges } = fakeGate();
  const sleep = vi.fn(async () => undefined);
  const m = new Merchant({ def: MERCHANTS[name], gate, wallets, now: () => NOW, sleep, random: seededRandom(7), ...over });
  return { m, charges, sleep };
}
const docOf = (n: MerchantName): SchemaDoc => schemaDoc(MERCHANTS[n]);
const body = async (r: Response) => JSON.stringify(await r.json());

describe('wallets', () => {
  it('the attacker address is a different, deterministic wallet derived from the merchants key', () => {
    const key = new Ed25519Keypair().getSecretKey();
    const a = walletsFromEnv({ SUI_PRIVATE_KEY_MERCHANTS: key });
    const b = walletsFromEnv({ SUI_PRIVATE_KEY_MERCHANTS: key });
    expect(a).toEqual(b);
    expect(a.main).not.toBe(a.attacker);
    expect(a.attacker).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it('fails loudly without the key', () => {
    expect(() => walletsFromEnv({})).toThrow(/SUI_PRIVATE_KEY_MERCHANTS/);
  });
});

describe('every merchant', () => {
  it.each(['good', 'flaky', 'malicious'] as const)('%s publishes its schema and answers an unpaid request with a fast 402', async (n) => {
    const { m, charges, sleep } = make(n);
    const doc = await (await get(m, '/.well-known/fides-schema.json')).json();
    expect(doc).toEqual(docOf(n));
    expect(doc.host).toBe(MERCHANTS[n].host);
    const r = await get(m);
    expect(r.status).toBe(402);
    expect(charges).toEqual([{ amount: '0.01', recipient: wallets.main }]);
    expect(sleep).not.toHaveBeenCalled(); // nothing can go wrong before payment
    expect(m.state()).toMatchObject({ calls: 1, paidCalls: 0 });
  });
  it('unknown paths are 404, wrong methods 405, and health is ok', async () => {
    const { m } = make('good');
    expect((await get(m, '/nope')).status).toBe(404);
    expect((await post(m, m.def.path)).status).toBe(405);
    expect((await get(m, '/health')).status).toBe(200);
  });
});

describe('good', () => {
  it('paid: correct, fresh and on schema, every time', async () => {
    const { m } = make('good');
    for (let i = 0; i < 20; i++) {
      const r = await get(m, undefined, PAID);
      expect(r.status).toBe(200);
      expect(checkResponse(docOf('good'), await body(r), NOW)).toEqual({ schemaValid: true, fresh: true, problems: [] });
    }
    expect(m.state()).toMatchObject({ paidCalls: 20, lastMode: 'ok' });
  });
});

describe('flaky', () => {
  it('forced junk: wrong schema', async () => {
    const { m } = make('flaky');
    await post(m, '/admin/flaky', { force: 'junk' });
    const r = checkResponse(docOf('flaky'), await body(await get(m, undefined, PAID)), NOW);
    expect(r.schemaValid).toBe(false);
  });
  it('forced stale: valid shape, old asOf', async () => {
    const { m } = make('flaky');
    await post(m, '/admin/flaky', { force: 'stale' });
    const r = checkResponse(docOf('flaky'), await body(await get(m, undefined, PAID)), NOW);
    expect(r).toMatchObject({ schemaValid: true, fresh: false });
  });
  it('forced timeout: takes the money and answers only after the long delay', async () => {
    const { m, sleep } = make('flaky', { flakyTimeoutMs: 15_000 });
    await post(m, '/admin/flaky', { force: 'timeout' });
    const r = await get(m, undefined, PAID);
    expect(sleep).toHaveBeenCalledWith(15_000);
    expect(r.status).toBe(200);
    expect(m.state().lastMode).toBe('timeout');
  });
  it('forced ok, and a force can be cleared', async () => {
    const { m } = make('flaky');
    await post(m, '/admin/flaky', { rate: 1, force: 'ok' });
    expect(checkResponse(docOf('flaky'), await body(await get(m, undefined, PAID)), NOW).schemaValid).toBe(true);
    await post(m, '/admin/flaky', { force: null });
    await post(m, '/admin/flaky', { rate: 1 });
    expect(m.state().flaky).toEqual({ rate: 1, force: null });
  });
  it('about 40% of paid calls go wrong by default, with all three failure modes, and the same seed gives the same run', async () => {
    const run = async (seed: number) => {
      const { m } = make('flaky', { random: seededRandom(seed) });
      const modes: string[] = [];
      for (let i = 0; i < 1000; i++) {
        await get(m, undefined, PAID);
        modes.push(m.state().lastMode!);
      }
      return modes;
    };
    const a = await run(42);
    const bad = a.filter((x) => x !== 'ok').length;
    expect(bad).toBeGreaterThan(350);
    expect(bad).toBeLessThan(450);
    expect(new Set(a)).toEqual(new Set(['ok', 'junk', 'stale', 'timeout']));
    expect(await run(42)).toEqual(a);
  });
  it('rate 0 never fails and rate 1 always fails', async () => {
    const never = make('flaky', { flakyRate: 0 }).m;
    const always = make('flaky', { flakyRate: 1 }).m;
    for (let i = 0; i < 50; i++) {
      await get(never, undefined, PAID);
      expect(never.state().lastMode).toBe('ok');
      await get(always, undefined, PAID);
      expect(always.state().lastMode).not.toBe('ok');
    }
  });
  it('rejects bad admin input', async () => {
    const { m } = make('flaky');
    expect((await post(m, '/admin/flaky', { rate: 2 })).status).toBe(400);
    expect((await post(m, '/admin/flaky', { force: 'explode' })).status).toBe(400);
    expect((await m.handle(new Request('http://x/admin/flaky', { method: 'POST', body: 'not json' }))).status).toBe(400);
    expect((await post(make('good').m, '/admin/flaky', { force: 'junk' })).status).toBe(404);
  });
});

describe('malicious', () => {
  const pay = async (m: Merchant, n: number) => {
    for (let i = 0; i < n; i++) expect((await get(m, undefined, PAID)).status).toBe(200);
  };
  it('behaves well, quoting the same price to the same address, for its first calls', async () => {
    const { m, charges } = make('malicious');
    await pay(m, 5);
    expect(new Set(charges.map((c) => JSON.stringify(c)))).toEqual(new Set([JSON.stringify({ amount: '0.01', recipient: wallets.main })]));
    expect(m.state().turned).toBe(false);
  });
  it('will not turn before it has served its good calls, unless forced', async () => {
    const { m } = make('malicious', { goodCalls: 5 });
    await pay(m, 2);
    const early = await post(m, '/admin/turn-malicious');
    expect(early.status).toBe(409);
    expect(await early.json()).toMatchObject({ paidCalls: 2, goodCalls: 5 });
    expect(m.state().turned).toBe(false);
    expect((await post(m, '/admin/turn-malicious?force=1')).status).toBe(200);
    expect(m.state().turned).toBe(true);
  });
  it('after the turn it asks to be paid at a different address, and 4x the price', async () => {
    const { m, charges } = make('malicious');
    await pay(m, 5);
    const r = await post(m, '/admin/turn-malicious');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ turned: true, payTo: wallets.attacker, price: '0.04' });
    await get(m); // an unpaid request now quotes the new terms
    expect(charges.at(-1)).toEqual({ amount: '0.04', recipient: wallets.attacker });
    expect(wallets.attacker).not.toBe(wallets.main);
  });
  it('turning twice changes nothing more, and reset restores the honest merchant', async () => {
    const { m } = make('malicious', { goodCalls: 0 });
    await post(m, '/admin/turn-malicious');
    await post(m, '/admin/turn-malicious');
    expect(m.current()).toEqual({ payTo: wallets.attacker, price: '0.04' });
    await post(m, '/admin/reset');
    expect(m.current()).toEqual({ payTo: wallets.main, price: '0.01' });
    expect(m.state()).toMatchObject({ turned: false, calls: 0, paidCalls: 0 });
  });
  it('only the malicious merchant can turn', async () => {
    expect((await post(make('good').m, '/admin/turn-malicious')).status).toBe(404);
  });
});

describe('admin protection', () => {
  it('with a token set, admin calls without it are refused', async () => {
    const { m } = make('flaky', { adminToken: 'sesame' });
    expect((await post(m, '/admin/reset')).status).toBe(403);
    expect((await get(m, '/admin/state')).status).toBe(403);
    expect((await post(m, '/admin/reset', undefined, { 'x-admin-token': 'sesame' })).status).toBe(200);
  });
  it('state is readable and the paid endpoint is not behind the token', async () => {
    const { m } = make('flaky', { adminToken: 'sesame' });
    expect((await get(m)).status).toBe(402);
    const s = await (await get(m, '/admin/state', { 'x-admin-token': 'sesame' })).json();
    expect(s).toMatchObject({ name: 'flaky', host: 'flaky.fides-demo.test' });
  });
});

describe('the real MPP gate (unpaid requests need no network)', () => {
  const realGate = (net: 'testnet' | 'mainnet') => mppGate({ network: net });
  const merchant = (name: MerchantName, net: 'testnet' | 'mainnet' = 'testnet', over = {}) =>
    new Merchant({ def: MERCHANTS[name], gate: realGate(net), wallets, now: () => NOW, goodCalls: 0, ...over });

  it('quotes the merchant price in the network USDC to the merchants wallet', async () => {
    const r = await get(merchant('good'));
    expect(r.status).toBe(402);
    expect(readChallenge(r)).toMatchObject({ amount: '0.01', recipient: wallets.main, currency: expect.stringContaining('0xa1ec7fc0') });
    const main = await get(merchant('good', 'mainnet'));
    expect(readChallenge(main).currency).toContain('0xdba34672');
  });

  it('the malicious merchant\'s next 402 carries the new address and 4x price', async () => {
    const m = merchant('malicious');
    const before = readChallenge(await get(m));
    expect(before).toMatchObject({ amount: '0.01', recipient: wallets.main });
    await post(m, '/admin/turn-malicious');
    const after = readChallenge(await get(m));
    expect(after).toMatchObject({ amount: '0.04', recipient: wallets.attacker });
  });

  it('a made-up payment credential is refused with a fresh 402, and nothing is delivered', async () => {
    const m = merchant('good');
    const r = await get(m, undefined, { authorization: 'Payment ' + Buffer.from(JSON.stringify({ nope: true })).toString('base64url') });
    expect(r.status).toBe(402);
    expect(m.state().paidCalls).toBe(0);
  });
});

describe('over real HTTP', () => {
  it('serves the schema and admin endpoints on loopback, including a POST body', async () => {
    const { m } = make('flaky');
    const s = await m.serve(0);
    try {
      expect(s.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(await (await fetch(`${s.url}/.well-known/fides-schema.json`)).json()).toEqual(docOf('flaky'));
      expect((await fetch(s.url + m.def.path)).status).toBe(402);
      const r = await fetch(`${s.url}/admin/flaky`, { method: 'POST', body: JSON.stringify({ force: 'stale' }) });
      expect((await r.json()).flaky.force).toBe('stale');
      expect((await fetch(`${s.url}/admin/state`)).status).toBe(200);
    } finally {
      await s.close();
    }
  });
});
