import { describe, expect, it } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { canonicalize, sha256Hex, toBytes } from '../src/canonical.js';
import { signEvidence } from '../src/sign.js';
import { verifyEvidence, verifyEvidenceSteps } from '../src/verify.js';
import type { Anchor, ChainReader, EvidenceBody, PaymentFacts } from '../src/types.js';

const USDC = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
const PAYTO = '0x' + 'ab'.repeat(32);
const MAX = 524_288;

const reporter = new Ed25519Keypair();
const attacker = new Ed25519Keypair();

const body = (over: Partial<EvidenceBody> = {}): EvidenceBody => ({
  schema: 'fides.evidence/v1',
  issuedAt: '2026-10-28T12:00:00.000Z',
  reporter: { agentId: 'A', suiAddress: reporter.toSuiAddress() },
  merchant: { host: 'flaky.example', payTo: PAYTO },
  payment: { txDigest: 'TXDIGEST1', amount: '10000', asset: USDC, quotedAmount: '10000', network: 'sui-mainnet' },
  exchange: { requestHash: 'aa'.repeat(32), responseHash: 'bb'.repeat(32), responseBytes: 120, latencyMs: 340 },
  checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
  verdict: 'burned',
  burnKind: 'junk',
  finality: { checkpoint: '400173491', verifiedVia: 'tatum' },
  ...over,
});

const goodPayment = (over: Partial<PaymentFacts> = {}): PaymentFacts => ({
  sender: reporter.toSuiAddress(),
  status: 'SUCCESS',
  checkpoint: 400173491,
  changes: [
    { owner: reporter.toSuiAddress(), amount: -10_000n, coinType: USDC },
    { owner: PAYTO, amount: 10_000n, coinType: USDC },
  ],
  ...over,
});
const chainOf = (p: PaymentFacts | null | Error): ChainReader => ({
  getPayment: async () => {
    if (p instanceof Error) throw p;
    return p;
  },
});
const anchorFor = (digest: string, over: Partial<Anchor> = {}): Anchor => ({
  evidenceSha256: digest,
  sender: reporter.toSuiAddress(),
  payTxDigest: 'TXDIGEST1',
  verdict: 'burned',
  ...over,
});

const seal = (b = body()) => signEvidence(b, reporter);
const opts = { maxBytes: MAX };

describe('canonical JSON', () => {
  it('sorts keys and has no whitespace', () => {
    expect(canonicalize({ b: 1, a: { d: 'x', c: [2, 1] } })).toBe('{"a":{"c":[2,1],"d":"x"},"b":1}');
  });
  it('is independent of input key order', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });
  it('rejects floats and unsafe integers', () => {
    expect(() => canonicalize({ a: 1.5 })).toThrow(/floats/);
    expect(() => canonicalize({ a: 2 ** 60 })).toThrow(/too large/);
  });
  it('sha256 is over the bytes as given', () => {
    const bytes = toBytes('{"a":1}');
    expect(sha256Hex(bytes)).toBe('015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862');
  });
});

describe('sign and verify: the good path', () => {
  it('a signed record passes every step', async () => {
    const s = await seal();
    const r = await verifyEvidence(s.bytes, anchorFor(s.digest), chainOf(goodPayment()), opts);
    expect(r.ok).toBe(true);
    expect(r.steps.map((x) => x.name)).toEqual(['format', 'hash', 'signature', 'anchor-sender', 'payment']);
    expect(r.steps.every((x) => x.ok)).toBe(true);
    expect(r.evidence?.verdict).toBe('burned');
    expect(r.digest).toBe(s.digest);
  });
  it('yields the steps one at a time for the Re-verify animation', async () => {
    const s = await seal();
    const names: string[] = [];
    for await (const st of verifyEvidenceSteps(s.bytes, anchorFor(s.digest), chainOf(goodPayment()), opts)) names.push(st.name);
    expect(names).toHaveLength(5);
  });
  it('signing refuses a signer that is not the stated reporter', async () => {
    await expect(signEvidence(body(), attacker)).rejects.toThrow(/does not match/);
  });
});

describe('forgery and tampering are rejected, visibly', () => {
  it('tampered bytes: hash no longer matches the Sui anchor', async () => {
    const s = await seal();
    const tampered = toBytes(canonicalize({ ...s.evidence, verdict: 'clean', burnKind: null }));
    const r = await verifyEvidence(tampered, anchorFor(s.digest), chainOf(goodPayment()), opts);
    expect(r.ok).toBe(false);
    expect(r.rejectedAt).toBe('hash');
  });

  it('tampered body that was re-anchored by the attacker: the signature fails', async () => {
    const s = await seal();
    const tampered = toBytes(canonicalize({ ...s.evidence, verdict: 'clean', burnKind: null }));
    const r = await verifyEvidence(tampered, anchorFor(sha256Hex(tampered)), chainOf(goodPayment()), opts);
    expect(r.ok).toBe(false);
    expect(r.rejectedAt).toBe('signature');
  });

  it('forged: attacker signs a report that names the victim as reporter', async () => {
    const b = body();
    const { signature } = await attacker.signPersonalMessage(toBytes(canonicalize(b)));
    const bytes = toBytes(canonicalize({ ...b, signature }));
    const r = await verifyEvidence(bytes, anchorFor(sha256Hex(bytes)), chainOf(goodPayment()), opts);
    expect(r.ok).toBe(false);
    expect(r.rejectedAt).toBe('signature');
    expect(r.reason).toMatch(/not by the stated reporter/);
  });

  it('copying someone else\'s public payment digest into a fake report fails: the payment sender is not the reporter', async () => {
    // The attacker signs honestly as themself but cites a payment that another agent made.
    const b = body({ reporter: { agentId: 'evil', suiAddress: attacker.toSuiAddress() } });
    const s = await signEvidence(b, attacker);
    const anchor = anchorFor(s.digest, { sender: attacker.toSuiAddress() });
    const r = await verifyEvidence(s.bytes, anchor, chainOf(goodPayment()), opts); // payment was sent by `reporter`
    expect(r.ok).toBe(false);
    expect(r.rejectedAt).toBe('payment');
    expect(r.reason).toMatch(/not by the reporter/);
  });

  it('anchor sent by someone other than the reporter is rejected', async () => {
    const s = await seal();
    const r = await verifyEvidence(s.bytes, anchorFor(s.digest, { sender: attacker.toSuiAddress() }), chainOf(goodPayment()), opts);
    expect(r.rejectedAt).toBe('anchor-sender');
  });
});

describe('payment checks', () => {
  const run = async (p: PaymentFacts | null | Error, b = body()) => {
    const s = await seal(b);
    return verifyEvidence(s.bytes, anchorFor(s.digest), chainOf(p), opts);
  };
  it('payment does not exist', async () => {
    const r = await run(null);
    expect(r.rejectedAt).toBe('payment');
    expect(r.reason).toMatch(/does not exist/);
  });
  it('payment failed on chain', async () => {
    expect((await run(goodPayment({ status: 'FAILURE' }))).reason).toMatch(/status is FAILURE/);
  });
  it('payment not final yet', async () => {
    expect((await run(goodPayment({ checkpoint: null }))).reason).toMatch(/not final/);
  });
  it('payment went to a different recipient', async () => {
    const r = await run(goodPayment({ changes: [{ owner: '0x' + 'cd'.repeat(32), amount: 10_000n, coinType: USDC }] }));
    expect(r.rejectedAt).toBe('payment');
    expect(r.reason).toMatch(/received 0/);
  });
  it('payment was smaller than the report states', async () => {
    const r = await run(goodPayment({ changes: [{ owner: PAYTO, amount: 5_000n, coinType: USDC }] }));
    expect(r.reason).toMatch(/received 5000/);
  });
  it('payment was in a different asset', async () => {
    const r = await run(goodPayment({ changes: [{ owner: PAYTO, amount: 10_000n, coinType: '0x2::sui::SUI' }] }));
    expect(r.ok).toBe(false);
  });
  it('a failed lookup is an error, not "not found"', async () => {
    const r = await run(new Error('Tatum GraphQL HTTP 429'));
    expect(r.rejectedAt).toBe('payment');
    expect(r.reason).toMatch(/lookup failed/);
    expect(r.reason).toMatch(/429/);
  });
  it('address comparison ignores zero padding and case', async () => {
    const short = reporter.toSuiAddress().toUpperCase().replace('0X', '0x');
    const r = await run(goodPayment({ sender: short }));
    expect(r.ok).toBe(true);
  });
});

describe('format checks', () => {
  const check = async (bytes: Uint8Array, maxBytes = MAX) => {
    const r = await verifyEvidence(bytes, anchorFor(sha256Hex(bytes)), chainOf(goodPayment()), { maxBytes });
    return r;
  };
  it('oversized record', async () => {
    const s = await seal();
    const r = await check(s.bytes, 100);
    expect(r.rejectedAt).toBe('format');
    expect(r.reason).toMatch(/limit is 100/);
  });
  it('not JSON', async () => {
    expect((await check(toBytes('not json'))).rejectedAt).toBe('format');
  });
  it('invalid UTF-8', async () => {
    expect((await check(new Uint8Array([0xff, 0xfe, 0xfd]))).rejectedAt).toBe('format');
  });
  it('wrong schema id', async () => {
    const s = await seal();
    const bad = toBytes(canonicalize({ ...s.evidence, schema: 'fides.evidence/v2' }));
    expect((await check(bad)).reason).toMatch(/schema must be/);
  });
  it('missing field', async () => {
    const { merchant: _m, ...rest } = (await seal()).evidence;
    expect((await check(toBytes(canonicalize(rest)))).reason).toMatch(/merchant is malformed/);
  });
  it('a float anywhere is rejected', async () => {
    const s = await seal();
    const text = new TextDecoder().decode(s.bytes).replace('"latencyMs":340', '"latencyMs":340.5');
    const r = await check(toBytes(text));
    expect(r.rejectedAt).toBe('format');
  });
  it('pretty printed JSON is rejected: the signed bytes must be canonical', async () => {
    const s = await seal();
    const pretty = toBytes(JSON.stringify(s.evidence, null, 2));
    expect((await check(pretty)).reason).toMatch(/not canonical/);
  });
  it('burnKind must be set exactly when the verdict is burned', async () => {
    const s = await seal();
    const bad = toBytes(canonicalize({ ...s.evidence, burnKind: null }));
    expect((await check(bad)).reason).toMatch(/burnKind must be set/);
  });
  it('stops at the first failure and says which step', async () => {
    const r = await check(toBytes('{}'));
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0]?.ok).toBe(false);
  });
});
