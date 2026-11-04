import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { assessMerchant, decayFactor, reporterWeight, wilsonLowerBound } from '../src/trust.js';
import type { EvidenceItem } from '../src/types.js';
import { formatAmount, median, parseAmount } from '../src/amount.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 28);
const cfg = loadConfig({ dailyCapUsd: '5' });
const full = (...ids: string[]) => Object.fromEntries(ids.map((i) => [i, 20]));

let n = 0;
const ev = (reporter: string, verdict: 'clean' | 'burned', ageDays = 0): EvidenceItem => ({
  id: `e${n++}`,
  reporter,
  verdict,
  burnKind: verdict === 'burned' ? 'junk' : null,
  issuedAtMs: NOW - ageDays * DAY,
});

describe('amounts', () => {
  it('parses decimals without floats', () => {
    expect(parseAmount('0.01')).toBe(10_000n);
    expect(parseAmount('1.5')).toBe(1_500_000n);
    expect(parseAmount('5')).toBe(5_000_000n);
    expect(formatAmount(10_000n)).toBe('0.01');
    expect(formatAmount(5_000_000n)).toBe('5');
  });
  it('rejects bad input', () => {
    expect(() => parseAmount('-1')).toThrow();
    expect(() => parseAmount('1e3')).toThrow();
    expect(() => parseAmount('0.1234567')).toThrow();
    expect(() => parseAmount('')).toThrow();
  });
  it('median of odd and even counts', () => {
    expect(median([])).toBeNull();
    expect(median([3n, 1n, 2n])).toBe(2n);
    expect(median([1n, 2n, 3n, 4n])).toBe(2n);
  });
});

describe('config', () => {
  it('refuses to start without a daily cap', () => {
    expect(() => loadConfig({})).toThrow(/dailyCapUsd is required/);
    expect(() => loadConfig({ dailyCapUsd: '  ' })).toThrow();
  });
});

describe('trust math', () => {
  it('reporter weight grows with verified reports and saturates', () => {
    expect(reporterWeight(0, 20)).toBe(0);
    expect(reporterWeight(20, 20)).toBeCloseTo(1, 10);
    expect(reporterWeight(500, 20)).toBe(1);
    expect(reporterWeight(3, 20)).toBeCloseTo(Math.log2(4) / Math.log2(21), 10);
    expect(() => reporterWeight(-1, 20)).toThrow();
  });
  it('decay halves every half-life', () => {
    expect(decayFactor(0, 14)).toBe(1);
    expect(decayFactor(14, 14)).toBeCloseTo(0.5, 10);
    expect(decayFactor(28, 14)).toBeCloseTo(0.25, 10);
  });
  it('wilson lower bound matches known values', () => {
    expect(wilsonLowerBound(0, 0, 1.96)).toBe(0);
    expect(wilsonLowerBound(5, 5, 1.96)).toBeCloseTo(0.5655, 3);
    expect(wilsonLowerBound(16, 16, 1.96)).toBeGreaterThan(0.8);
    expect(wilsonLowerBound(15, 16, 1.96)).toBeLessThan(0.8);
  });
});

describe('assessMerchant', () => {
  it('cannot say with no history', () => {
    const a = assessMerchant([], {}, NOW, cfg);
    expect(a.tier).toBe('new');
    expect(a.cannotSay).toBe(true);
    expect(a.confidence).toBe(0);
  });

  it('cannot say with fewer than the minimum clean outcomes and no burns', () => {
    const a = assessMerchant([ev('r1', 'clean'), ev('r2', 'clean')], full('r1', 'r2'), NOW, cfg);
    expect(a.tier).toBe('new');
    expect(a.cannotSay).toBe(true);
  });

  it('a burn is evidence: not cannot-say', () => {
    const a = assessMerchant([ev('r1', 'burned')], full('r1'), NOW, cfg);
    expect(a.cannotSay).toBe(false);
  });

  it('established needs enough clean outcomes from enough independent reporters', () => {
    const items = ['r1', 'r2', 'r3'].flatMap((r) => [ev(r, 'clean'), ev(r, 'clean'), ev(r, 'clean')]);
    const a = assessMerchant(items, full('r1', 'r2', 'r3'), NOW, cfg);
    expect(a.tier).toBe('established');
    expect(a.cannotSay).toBe(false);
  });

  it('one reporter cannot make a merchant established, however many clean reports (influence cap)', () => {
    const items = Array.from({ length: 30 }, () => ev('r1', 'clean'));
    const a = assessMerchant(items, full('r1'), NOW, cfg);
    expect(a.cleanCount).toBe(30);
    expect(a.weightedClean).toBeLessThanOrEqual(cfg.reporterInfluenceCap + 1e-9);
    expect(a.tier).toBe('new');
  });

  it('trusted needs many clean outcomes and no burn in the window', () => {
    const reporters = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
    const items = reporters.flatMap((r) => [ev(r, 'clean'), ev(r, 'clean'), ev(r, 'clean')]);
    expect(assessMerchant(items, full(...reporters), NOW, cfg).tier).toBe('trusted');
    const withBurn = [...items, ev('r7', 'burned', 1)];
    expect(assessMerchant(withBurn, full(...reporters, 'r7'), NOW, cfg).tier).not.toBe('trusted');
  });

  it('a verified burn drops the tier immediately', () => {
    const reporters = ['r1', 'r2', 'r3'];
    const items = reporters.flatMap((r) => [ev(r, 'clean'), ev(r, 'clean'), ev(r, 'clean')]);
    expect(assessMerchant(items, full(...reporters), NOW, cfg).tier).toBe('established');
    const after = assessMerchant([...items, ev('r4', 'burned')], full(...reporters, 'r4'), NOW, cfg);
    expect(after.tier).toBe('burned');
  });

  it('recovery is slow: an old burn decays and the tier does not bounce back at once', () => {
    const burn = ev('r4', 'burned', 1);
    const fresh = assessMerchant([burn], full('r4'), NOW, cfg);
    expect(fresh.tier).toBe('burned');
    // After four half-lives the burn mass is below the burned threshold but it is still counted in the window.
    const old = ev('r4', 'burned', 28);
    const later = assessMerchant([old], full('r4'), NOW, cfg);
    expect(later.weightedBurn).toBeLessThan(fresh.weightedBurn);
    expect(later.burnCount).toBe(1);
  });

  it('evidence outside the window is ignored', () => {
    const a = assessMerchant([ev('r1', 'burned', 45)], full('r1'), NOW, cfg);
    expect(a.burnCount).toBe(0);
    expect(a.usedIds).toEqual([]);
  });

  it('evidence dated a little ahead of our clock still counts (clock skew), but not far ahead', () => {
    const soon = { ...ev('r1', 'burned'), issuedAtMs: NOW + 60_000 }; // one minute ahead
    const far = { ...ev('r2', 'burned'), issuedAtMs: NOW + 3_600_000 }; // an hour ahead
    expect(assessMerchant([soon], full('r1'), NOW, cfg).burnCount).toBe(1);
    expect(assessMerchant([far], full('r2'), NOW, cfg).burnCount).toBe(0);
  });

  it('a reporter with no history counts for less than an experienced one', () => {
    const newbie = assessMerchant([ev('rn', 'burned')], {}, NOW, cfg);
    const vet = assessMerchant([ev('rv', 'burned')], full('rv'), NOW, cfg);
    expect(newbie.weightedBurn).toBeLessThan(vet.weightedBurn);
  });
});
