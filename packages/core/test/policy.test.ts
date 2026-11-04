import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { decide, isPriceSpike } from '../src/policy.js';
import type { CheckInput, DecisionContext, EvidenceItem, SimilarIncident } from '../src/types.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 28);
const SELF = '0xSELF';
const PAYTO = '0x' + 'ab'.repeat(32);
const cfg = loadConfig({ dailyCapUsd: '5' });

let n = 0;
const ev = (reporter: string, verdict: 'clean' | 'burned', ageDays = 0): EvidenceItem => ({
  id: `ev${n++}`,
  reporter,
  verdict,
  burnKind: verdict === 'burned' ? 'junk' : null,
  issuedAtMs: NOW - ageDays * DAY,
});

const reporters = ['0xR1', '0xR2', '0xR3', '0xR4', '0xR5', '0xR6', SELF];
const counts = Object.fromEntries(reporters.map((r) => [r, 20]));
const clean = (rs: string[], each = 3) => rs.flatMap((r) => Array.from({ length: each }, () => ev(r, 'clean')));

const input = (over: Partial<CheckInput> = {}): CheckInput => ({
  ownerId: 'A',
  merchantHost: 'merchant.example',
  payTo: PAYTO,
  amount: '0.01',
  asset: 'USDC',
  network: 'sui-mainnet',
  resource: '/data/prices',
  ...over,
});
const ctx = (over: Partial<DecisionContext> = {}): DecisionContext => ({
  nowMs: NOW,
  selfAddress: SELF,
  spentTodayRaw: 0n,
  pinnedPayTo: PAYTO,
  pastPaidRaw: [10_000n, 10_000n, 10_000n],
  evidence: [],
  reporterVerifiedCounts: counts,
  sharedRecord: 'attached',
  similar: [],
  ...over,
});
const similar = (over: Partial<SimilarIncident> = {}): SimilarIncident => ({
  blobId: 'blob1',
  distance: 0.2,
  merchantHost: 'other.example',
  burnKind: 'address_changed',
  pattern: 'clean_streak',
  ...over,
});

const established = clean(['0xR1', '0xR2', '0xR3']);
const trusted = clean(['0xR1', '0xR2', '0xR3', '0xR4', '0xR5', '0xR6']);

describe('rule 1: budget', () => {
  it('asks when spend plus payment exceeds the cap', () => {
    const v = decide(input({ amount: '1' }), ctx({ spentTodayRaw: 4_500_000n, evidence: trusted }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['budget']);
  });
  it('allows spend exactly up to the cap', () => {
    const v = decide(input({ amount: '0.5' }), ctx({ spentTodayRaw: 4_500_000n, evidence: trusted, pastPaidRaw: [500_000n] }), cfg);
    expect(v.decision).toBe('PAY');
  });
  it('budget wins over a refusal-worthy later rule (first match wins) but still raises the address alert', () => {
    const v = decide(input({ amount: '1', payTo: '0x' + 'cd'.repeat(32) }), ctx({ spentTodayRaw: 4_500_000n }), cfg);
    expect(v.rulesFired[0]).toBe('budget');
    expect(v.alerts).toEqual([{ kind: 'address_changed', merchant: 'merchant.example' }]);
  });
});

describe('rule 2: address', () => {
  const other = '0x' + 'cd'.repeat(32);
  it('changed address with the same price asks and raises an alert', () => {
    const v = decide(input({ payTo: other }), ctx({ evidence: trusted }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['address']);
    expect(v.alerts).toHaveLength(1);
  });
  it('changed address plus a price spike refuses', () => {
    const v = decide(input({ payTo: other, amount: '0.04' }), ctx({ evidence: trusted }), cfg);
    expect(v.decision).toBe('REFUSE');
    expect(v.rulesFired).toEqual(['address']);
  });
  it('address comparison ignores case', () => {
    const v = decide(input({ payTo: PAYTO.toUpperCase().replace('0X', '0x') }), ctx({ evidence: trusted }), cfg);
    expect(v.alerts).toEqual([]);
  });
  it('no pinned address yet: nothing to compare', () => {
    const v = decide(input(), ctx({ pinnedPayTo: null }), cfg);
    expect(v.alerts).toEqual([]);
  });
});

describe('rule 3: price spike, factor by tier', () => {
  it('integer spike test uses thousandths', () => {
    expect(isPriceSpike(30_000n, 10_000n, 3)).toBe(false);
    expect(isPriceSpike(30_001n, 10_000n, 3)).toBe(true);
    expect(isPriceSpike(15_000n, 10_000n, 1.5)).toBe(false);
    expect(isPriceSpike(15_001n, 10_000n, 1.5)).toBe(true);
    expect(isPriceSpike(1n, null, 3)).toBe(false);
  });
  it('new merchant: 3x allowed, above 3x asks', () => {
    expect(decide(input({ amount: '0.03' }), ctx(), cfg).rulesFired).not.toContain('price-spike');
    const v = decide(input({ amount: '0.031' }), ctx(), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['price-spike']);
  });
  it('established merchant: 2x', () => {
    expect(decide(input({ amount: '0.02' }), ctx({ evidence: established }), cfg).decision).toBe('PAY');
    expect(decide(input({ amount: '0.021' }), ctx({ evidence: established }), cfg).rulesFired).toEqual(['price-spike']);
  });
  it('trusted merchant: 1.5x', () => {
    expect(decide(input({ amount: '0.015' }), ctx({ evidence: trusted }), cfg).decision).toBe('PAY');
    expect(decide(input({ amount: '0.016' }), ctx({ evidence: trusted }), cfg).rulesFired).toEqual(['price-spike']);
  });
  it('no past payments: no typical price, no spike', () => {
    expect(decide(input({ amount: '4' }), ctx({ pastPaidRaw: [] }), cfg).rulesFired).not.toContain('price-spike');
  });
});

describe('rule 4: shared record, exact', () => {
  it('two independent reporters with verified burns refuse', () => {
    const v = decide(input(), ctx({ evidence: [ev('0xR1', 'burned'), ev('0xR2', 'burned')] }), cfg);
    expect(v.decision).toBe('REFUSE');
    expect(v.rulesFired).toEqual(['shared-burns']);
    expect(v.citations.evidenceIds).toHaveLength(2);
  });
  it('two burns from the same reporter count once', () => {
    const v = decide(input(), ctx({ evidence: [ev('0xR1', 'burned'), ev('0xR1', 'burned')] }), cfg);
    expect(v.decision).not.toBe('REFUSE');
    expect(v.rulesFired).toEqual(['shared-burn']);
  });
  it('one burn: small payment is PAY_CAPPED with the cap', () => {
    const v = decide(input(), ctx({ evidence: [ev('0xR1', 'burned')] }), cfg);
    expect(v.decision).toBe('PAY_CAPPED');
    expect(v.capAmount).toBe('0.05');
    expect(v.citations.evidenceIds).toHaveLength(1);
  });
  it('one burn: a larger payment asks', () => {
    const v = decide(input({ amount: '0.06' }), ctx({ evidence: [ev('0xR1', 'burned')], pastPaidRaw: [] }), cfg);
    expect(v.decision).toBe('ASK');
  });
  it('burns outside the window are ignored', () => {
    const v = decide(input(), ctx({ evidence: [ev('0xR1', 'burned', 40), ev('0xR2', 'burned', 40)] }), cfg);
    expect(v.rulesFired).not.toContain('shared-burns');
  });
  it('own burns do not count as another reporter', () => {
    const v = decide(input(), ctx({ evidence: [ev(SELF, 'burned')] }), cfg);
    expect(v.rulesFired).toEqual(['own-history']);
  });
});

describe('rule 5: own history', () => {
  it('one own burn asks', () => {
    const v = decide(input(), ctx({ evidence: [ev(SELF, 'burned')] }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['own-history']);
  });
  it('repeated own burns refuse', () => {
    const v = decide(input(), ctx({ evidence: [ev(SELF, 'burned'), ev(SELF, 'burned', 2)] }), cfg);
    expect(v.decision).toBe('REFUSE');
  });
});

describe('rule 6: similar-incident recall', () => {
  const base = { evidence: established };
  it('downgrades a PAY to ASK and cites the recalled memory', () => {
    const v = decide(input(), ctx({ ...base, similar: [similar()] }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['similar-incident']);
    expect(v.citations.memoryBlobIds).toEqual(['blob1']);
  });
  it('without the recalled memory the same merchant is paid', () => {
    expect(decide(input(), ctx(base), cfg).decision).toBe('PAY');
  });
  it('ignores a match that is not strongly similar', () => {
    expect(decide(input(), ctx({ ...base, similar: [similar({ distance: 0.5 })] }), cfg).decision).toBe('PAY');
  });
  it('post-filters by exact host: a recall hit about this same merchant is not a different merchant', () => {
    expect(decide(input(), ctx({ ...base, similar: [similar({ merchantHost: 'Merchant.Example' })] }), cfg).decision).toBe('PAY');
  });
  it('ignores recalled entries that are not burns', () => {
    expect(decide(input(), ctx({ ...base, similar: [similar({ burnKind: null })] }), cfg).decision).toBe('PAY');
  });
  it('ignores a pattern that does not match the situation', () => {
    expect(decide(input(), ctx({ ...base, similar: [similar({ pattern: 'unrelated' })] }), cfg).decision).toBe('PAY');
  });
  it('flags a new merchant with the same pattern', () => {
    const v = decide(input(), ctx({ similar: [similar({ pattern: 'new_merchant' })] }), cfg);
    expect(v.rulesFired).toEqual(['similar-incident']);
  });
});

describe('rule 7: tier', () => {
  it('trusted pays', () => {
    const v = decide(input(), ctx({ evidence: trusted }), cfg);
    expect(v.decision).toBe('PAY');
    expect(v.tier).toBe('trusted');
    expect(v.cannotSay).toBe(false);
  });
  it('established pays', () => {
    expect(decide(input(), ctx({ evidence: established }), cfg).decision).toBe('PAY');
  });
  it('new asks', () => {
    const v = decide(input(), ctx({ evidence: clean(['0xR1'], 1) }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.tier).toBe('new');
  });
  it('cannot say with no history: ASK, never a guess', () => {
    const v = decide(input(), ctx({ pastPaidRaw: [] }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.cannotSay).toBe(true);
    expect(v.reasons.join(' ')).toMatch(/cannot say/);
    expect(v.confidence).toBe(0);
  });
});

describe('shared record states', () => {
  const burnedByOthers = [ev('0xR1', 'burned'), ev('0xR2', 'burned')];
  it('attached: other agents burns refuse', () => {
    expect(decide(input(), ctx({ evidence: burnedByOthers }), cfg).decision).toBe('REFUSE');
  });
  it('detached: the same merchant is no longer refused, the demo flip', () => {
    const v = decide(input(), ctx({ evidence: [...burnedByOthers, ...established], sharedRecord: 'detached', similar: [similar()] }), cfg);
    expect(v.decision).not.toBe('REFUSE');
    expect(v.citations.evidenceIds).toEqual([]);
  });
  it('detached still uses the agents own reports', () => {
    const v = decide(input(), ctx({ evidence: [...burnedByOthers, ev(SELF, 'burned')], sharedRecord: 'detached' }), cfg);
    expect(v.rulesFired).toEqual(['own-history']);
  });
  it('unreachable: other agents reports are hidden, so a merchant they vouched for is not paid', () => {
    const v = decide(input(), ctx({ evidence: trusted, sharedRecord: 'unreachable' }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.tier).toBe('new');
  });
  it('unreachable: even when own reports alone would earn a PAY, it becomes ASK with the shared-unavailable reason (second layer of fail closed)', () => {
    // Raise the per-reporter cap so one reporter can reach established; the override must still fire.
    const solo = loadConfig({ dailyCapUsd: '5', reporterInfluenceCap: 100 });
    const own = Array.from({ length: 10 }, () => ev(SELF, 'clean'));
    expect(decide(input(), ctx({ evidence: own, sharedRecord: 'attached' }), solo).decision).toBe('PAY');
    const v = decide(input(), ctx({ evidence: own, sharedRecord: 'unreachable' }), solo);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).toEqual(['tier', 'shared-unavailable']);
    expect(v.reasons.join(' ')).toMatch(/shared record unavailable/);
  });
  it('unreachable never softens a refusal from own history', () => {
    const v = decide(input(), ctx({ evidence: [ev(SELF, 'burned'), ev(SELF, 'burned')], sharedRecord: 'unreachable' }), cfg);
    expect(v.decision).toBe('REFUSE');
  });
  it('unreachable turns a capped pay into ASK', () => {
    const v = decide(input(), ctx({ evidence: [ev('0xR1', 'burned')], sharedRecord: 'unreachable' }), cfg);
    // With the shared record unreachable the other agent's burn is not visible, and the result must still not be PAY.
    expect(v.decision).toBe('ASK');
  });
  it('empty but attached is an honest cold start, not an error', () => {
    const v = decide(input(), ctx({ pastPaidRaw: [] }), cfg);
    expect(v.decision).toBe('ASK');
    expect(v.rulesFired).not.toContain('shared-unavailable');
    expect(v.cannotSay).toBe(true);
  });
});

describe('verdict shape', () => {
  it('always carries reasons, rules fired, citations, tier, confidence', () => {
    const v = decide(input(), ctx({ evidence: trusted }), cfg);
    expect(v.reasons.length).toBeGreaterThan(0);
    expect(v.rulesFired.length).toBeGreaterThan(0);
    expect(v.citations.evidenceIds.length).toBeGreaterThan(0);
    expect(v.confidence).toBeGreaterThan(0);
    expect(v.confidence).toBeLessThan(1);
  });
  it('rejects an invalid amount instead of guessing', () => {
    expect(() => decide(input({ amount: 'abc' }), ctx(), cfg)).toThrow();
  });
});
