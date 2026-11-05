import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TatumChainReader } from '../src/reader.js';
import { TatumError, TatumGraphql } from '../src/tatum.js';
import { anchorPackageId, chainFromEnv, getNetwork } from '../src/network.js';

const KEY = 'SECRETKEY123';
const URL_ = 'https://sui-mainnet.gateway.tatum.io/graphql';
const PKG = '0x' + '1e'.repeat(32);

interface Call {
  url: string;
  headers: Record<string, string>;
  body: { query: string; variables?: Record<string, unknown> };
}
type Reply = { status?: number; headers?: Record<string, string>; json?: unknown; throw?: Error };

/** A fetch that replays scripted replies and records calls. Virtual clock: sleep advances time instantly. */
function rig(replies: Reply[], opts: { minIntervalMs?: number } = {}) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  let t = 1_000_000;
  const q = [...replies];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) });
    const r = q.shift() ?? { json: { data: {} } };
    if (r.throw) throw r.throw;
    return new Response(JSON.stringify(r.json ?? { data: {} }), { status: r.status ?? 200, headers: r.headers });
  }) as unknown as typeof fetch;
  const client = new TatumGraphql({
    url: URL_,
    apiKey: KEY,
    fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms);
      t += ms;
    },
    now: () => t,
    ...opts,
  });
  return { client, calls, sleeps, reader: new TatumChainReader(client) };
}
const ok = (data: unknown): Reply => ({ json: { data } });
/** The error a promise rejects with. Fails the test if it resolves. */
async function failure(p: Promise<unknown>): Promise<TatumError> {
  try {
    await p;
  } catch (e) {
    return e as TatumError;
  }
  throw new Error('expected the promise to reject');
}

describe('Tatum client', () => {
  it('sends the key in the x-api-key header only, never in the URL, and passes variables', async () => {
    const { client, calls } = rig([ok({ x: 1 })]);
    await client.query('query($a: Int){x}', { a: 1 });
    expect(calls[0]!.headers['x-api-key']).toBe(KEY);
    expect(calls[0]!.url).toBe(URL_);
    expect(calls[0]!.url).not.toContain(KEY);
    expect(calls[0]!.body.variables).toEqual({ a: 1 });
  });

  it('spaces concurrent calls so they cannot burst past 3 requests per second', async () => {
    const { client, sleeps } = rig([ok({}), ok({}), ok({}), ok({})]);
    await Promise.all([client.query('{a}'), client.query('{b}'), client.query('{c}'), client.query('{d}')]);
    // the first call needs no wait, each later one waits the full interval on the virtual clock
    expect(sleeps).toEqual([400, 400, 400]);
  });

  it('retries HTTP 429 and succeeds, honouring Retry-After', async () => {
    const { client, calls, sleeps } = rig([{ status: 429, headers: { 'retry-after': '2' } }, ok({ x: 1 })]);
    await expect(client.query('{x}')).resolves.toEqual({ x: 1 });
    expect(calls).toHaveLength(2);
    expect(sleeps).toContain(2000);
  });

  it('gives up after the retry limit with a status, instead of returning nothing', async () => {
    const { client, calls } = rig([{ status: 429 }, { status: 429 }, { status: 429 }, { status: 429 }]);
    const err = await failure(client.query('{x}'));
    expect(err).toBeInstanceOf(TatumError);
    expect(err.status).toBe(429);
    expect(calls).toHaveLength(4); // first try plus three retries
  });

  it('does not retry a 4xx other than 429', async () => {
    const { client, calls } = rig([{ status: 401 }]);
    const err = await failure(client.query('{x}'));
    expect(err.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it('GraphQL errors are errors, and the key never appears in a message', async () => {
    const { client } = rig([{ json: { errors: [{ message: `bad thing near ${KEY}` }] } }]);
    const err = await failure(client.query('{x}'));
    expect(err).toBeInstanceOf(TatumError);
    expect(err.message).toContain('GraphQL error');
    expect(err.message).not.toContain(KEY);
  });

  it('a network failure is retried then reported without the key', async () => {
    const { client } = rig([{ throw: new Error(`socket closed ${KEY}`) }, { throw: new Error(`socket closed ${KEY}`) }, { throw: new Error('x') }, { throw: new Error(`socket closed ${KEY}`) }]);
    const err = await failure(client.query('{x}'));
    expect(err).toBeInstanceOf(TatumError);
    expect(err.message).not.toContain(KEY);
  });

  it('one failed call does not break the queue for the next', async () => {
    const { client } = rig([{ status: 401 }, ok({ x: 2 })]);
    await client.query('{x}').catch(() => undefined);
    await expect(client.query('{x}')).resolves.toEqual({ x: 2 });
  });

  it('requires a key', () => {
    expect(() => new TatumGraphql({ url: URL_, apiKey: '' })).toThrow(/required/);
  });
});

const tx = (over: Record<string, unknown> = {}) => ({
  transaction: {
    sender: { address: '0xaaa' },
    effects: {
      status: 'SUCCESS',
      timestamp: '2026-10-28T13:42:57.509Z',
      checkpoint: { sequenceNumber: 400173491 },
      balanceChanges: { nodes: [{ owner: { address: '0xaaa' }, amount: '-10000', coinType: { repr: '0xusdc::usdc::USDC' } }, { owner: { address: '0xbbb' }, amount: '10000', coinType: { repr: '0xusdc::usdc::USDC' } }] },
    },
    ...over,
  },
});

describe('getPayment (finality and payment facts)', () => {
  it('maps sender, status, checkpoint, chain time and balance changes', async () => {
    const { reader } = rig([ok(tx())]);
    expect(await reader.getPayment('ABC123')).toEqual({
      sender: '0xaaa',
      status: 'SUCCESS',
      checkpoint: 400173491,
      timestamp: '2026-10-28T13:42:57.509Z',
      changes: [
        { owner: '0xaaa', amount: -10000n, coinType: '0xusdc::usdc::USDC' },
        { owner: '0xbbb', amount: 10000n, coinType: '0xusdc::usdc::USDC' },
      ],
    });
  });
  it('returns null only when the transaction does not exist', async () => {
    expect(await rig([ok({ transaction: null })]).reader.getPayment('ABC123')).toBeNull();
  });
  it('a lookup failure throws, it is never "not found"', async () => {
    await expect(rig([{ status: 401 }]).reader.getPayment('ABC123')).rejects.toBeInstanceOf(TatumError);
  });
  it('caches a final transaction: the second read costs no request', async () => {
    const { reader, calls } = rig([ok(tx())]);
    await reader.getPayment('ABC123');
    await reader.getPayment('ABC123');
    expect(calls).toHaveLength(1);
  });
  it('does not cache a transaction that is not in a checkpoint yet, so finality is re-checked', async () => {
    const pending = tx({ effects: { status: 'SUCCESS', checkpoint: null, balanceChanges: { nodes: [] } } });
    const { reader, calls } = rig([ok(pending), ok(tx())]);
    expect((await reader.getPayment('ABC123'))?.checkpoint).toBeNull();
    expect((await reader.getPayment('ABC123'))?.checkpoint).toBe(400173491);
    expect(calls).toHaveLength(2);
  });
  it('rejects a digest that could break out of the query before any request is made', async () => {
    const { reader, calls } = rig([]);
    await expect(reader.getPayment('x") { __typename } #')).rejects.toThrow(/invalid transaction digest/);
    expect(calls).toHaveLength(0);
  });
  it('passes the digest as a variable, not spliced into the query text', async () => {
    const { reader, calls } = rig([ok(tx())]);
    await reader.getPayment('ABC123');
    expect(calls[0]!.body.query).not.toContain('ABC123');
    expect(calls[0]!.body.variables).toEqual({ d: 'ABC123' });
  });
});

describe('balances and checkpoint', () => {
  it('parses raw balances by coin type', async () => {
    const { reader } = rig([ok({ address: { balances: { nodes: [{ coinType: { repr: '0x2::sui::SUI' }, totalBalance: '991433600' }] } } })]);
    expect(await reader.getBalances('0xabc')).toEqual({ '0x2::sui::SUI': 991433600n });
  });
  it('an address with no balances is an empty record', async () => {
    expect(await rig([ok({ address: { balances: { nodes: [] } } })]).reader.getBalances('0xabc')).toEqual({});
  });
  it('rejects a malformed address', async () => {
    await expect(rig([]).reader.getBalances('0xzz"')).rejects.toThrow(/invalid address/);
  });
  it('reads the latest checkpoint', async () => {
    expect(await rig([ok({ checkpoint: { sequenceNumber: 42 } })]).reader.latestCheckpoint()).toBe(42);
  });
});

const hex = 'cd33dc9135f3e7a4e804463224afe8164e3e6dfc326f5bb25e40f0e285e5d5d3';
const event = (sha: string, verdict = 0, digest = 'test-pay-tx-digest', sender = '0xaaa') => ({
  timestamp: '2026-10-28T13:32:43.026Z',
  transaction: { digest: 'EVTX' },
  sender: { address: sender },
  contents: { json: { merchant: 'm.example', evidence_sha256: Buffer.from(sha, 'hex').toString('base64'), pay_tx_digest: Buffer.from(digest).toString('base64'), verdict } },
});
const page = (nodes: unknown[], hasPreviousPage = false, startCursor: string | null = 'c1') => ok({ events: { pageInfo: { hasPreviousPage, startCursor }, nodes } });

describe('anchor events', () => {
  it('decodes base64 vector<u8> fields to the hex digest and the transaction digest string', async () => {
    const { reader } = rig([page([event(hex, 1)])]);
    const r = await reader.listAnchors({ packageId: PKG });
    expect(r.anchors[0]).toEqual({ evidenceSha256: hex, sender: '0xaaa', payTxDigest: 'test-pay-tx-digest', verdict: 'burned', merchant: 'm.example', eventTxDigest: 'EVTX', timestamp: '2026-10-28T13:32:43.026Z' });
  });
  it('filters by the anchor event type and, when given, the reporter, using variables', async () => {
    const { reader, calls } = rig([page([])]);
    await reader.listAnchors({ packageId: PKG, sender: '0xaaa', pageSize: 5 });
    expect(calls[0]!.body.variables).toMatchObject({ f: { type: `${PKG}::anchor::Report`, sender: '0xaaa' }, n: 5 });
  });
  it('bounds the scan at the checkpoint the package was published in: an unbounded scan fails on a pruned node', async () => {
    const client = new TatumGraphql({ url: URL_, apiKey: KEY, minIntervalMs: 0, fetchImpl: (async (_u: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string)); return new Response(JSON.stringify({ data: { events: { pageInfo: { hasPreviousPage: false, startCursor: null }, nodes: [] } } })); }) as unknown as typeof fetch });
    const sent: { variables: { f: Record<string, unknown> } }[] = [];
    const reader = new TatumChainReader(client, { anchorFromCheckpoint: { [PKG]: 1000 } });
    await reader.listAnchors({ packageId: PKG });
    expect(sent[0]!.variables.f.afterCheckpoint).toBe(999); // after is exclusive: the publish checkpoint itself stays in
    await reader.listAnchors({ packageId: '0x' + 'ab'.repeat(32) });
    expect(sent[1]!.variables.f).not.toHaveProperty('afterCheckpoint');
  });
  it('every published anchor package has a publish checkpoint recorded', () => {
    const all = JSON.parse(readFileSync(new globalThis.URL('../../move/deployments.json', import.meta.url), 'utf8')) as Record<string, { publishCheckpoint?: number }>;
    for (const d of Object.values(all)) expect(d.publishCheckpoint).toBeGreaterThan(0);
  });
  it('rejects a malformed package id', async () => {
    await expect(rig([]).reader.listAnchors({ packageId: '0x1"; drop' })).rejects.toThrow(/invalid anchor package id/);
  });
  it('findAnchor finds the digest on a later page', async () => {
    const other = 'ee'.repeat(32);
    const { reader, calls } = rig([page([event(other)], true, 'c1'), page([event(hex)], false, 'c0')]);
    const a = await reader.findAnchor({ packageId: PKG, evidenceSha256: hex.toUpperCase() });
    expect(a?.evidenceSha256).toBe(hex);
    expect(calls[1]!.body.variables).toMatchObject({ b: 'c1' });
  });
  it('findAnchor returns null only when the scan reached the start', async () => {
    const { reader } = rig([page([event('ee'.repeat(32))], false)]);
    expect(await reader.findAnchor({ packageId: PKG, evidenceSha256: hex })).toBeNull();
  });
  it('findAnchor throws, not null, when it stops scanning before reaching the start', async () => {
    const { reader } = rig([page([event('ee'.repeat(32))], true, 'c1'), page([event('ee'.repeat(32))], true, 'c2')]);
    await expect(reader.findAnchor({ packageId: PKG, evidenceSha256: hex, maxPages: 2 })).rejects.toThrow(/not exhaustive/);
  });
  it('findAnchor propagates a lookup failure', async () => {
    await expect(rig([{ status: 401 }]).reader.findAnchor({ packageId: PKG, evidenceSha256: hex })).rejects.toBeInstanceOf(TatumError);
  });
});

describe('network profile', () => {
  it('picks gateway, key and USDC by network', () => {
    expect(getNetwork('mainnet')).toMatchObject({ tatumGraphqlUrl: 'https://sui-mainnet.gateway.tatum.io/graphql', usdcType: expect.stringContaining('0xdba34672') });
    expect(getNetwork('testnet').tatumKeyEnv).toBe('TATUM_TESTNET_API_KEY');
    expect(getNetwork(undefined).name).toBe('testnet');
    expect(() => getNetwork('devnet')).toThrow(/unknown FIDES_NETWORK/);
  });
  it('uses the key that belongs to the network and fails loudly without it', () => {
    expect(chainFromEnv({ FIDES_NETWORK: 'mainnet', TATUM_MAINNET_API_KEY: 'k' }).network.name).toBe('mainnet');
    expect(() => chainFromEnv({ FIDES_NETWORK: 'mainnet', TATUM_TESTNET_API_KEY: 'k' })).toThrow(/TATUM_MAINNET_API_KEY is not set/);
  });
  it('knows the published anchor package, and fails loudly where there is none', () => {
    expect(anchorPackageId('testnet')).toMatch(/^0x[0-9a-f]{64}$/);
    expect(() => anchorPackageId('nowhere')).toThrow(/no anchor package published/);
  });
});
