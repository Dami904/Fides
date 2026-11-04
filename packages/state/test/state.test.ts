import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FidesState, openState } from '../src/state.js';

const DATE = '2026-10-28';
const NOW = Date.UTC(2026, 9, 28);
const cleanup: (() => void)[] = [];
afterEach(() => {
  while (cleanup.length) cleanup.pop()!();
});

function memory(): FidesState {
  const s = openState(':memory:');
  cleanup.push(() => s.close());
  return s;
}
function filePair(): [FidesState, FidesState] {
  const dir = mkdtempSync(join(tmpdir(), 'fides-state-'));
  const a = openState(join(dir, 's.sqlite'));
  const b = openState(join(dir, 's.sqlite'));
  cleanup.push(() => {
    a.close();
    b.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return [a, b];
}
const claim = (key: string, amountRaw: bigint, capRaw = 10_000_000n, owner = 'A') => ({
  idempotencyKey: key,
  owner,
  merchant: 'Merchant.Example',
  amountRaw,
  capRaw,
  utcDate: DATE,
  nowMs: NOW,
});

describe('atomic claims and the daily cap', () => {
  it('reserves spend and counts it', () => {
    const s = memory();
    expect(s.reserve(claim('k1', 4_000_000n))).toEqual({ status: 'reserved', spentRaw: 4_000_000n });
    expect(s.spentToday('A', DATE)).toBe(4_000_000n);
  });

  it('refuses a payment that would pass the cap and reserves nothing', () => {
    const s = memory();
    s.reserve(claim('k1', 6_000_000n));
    expect(s.reserve(claim('k2', 5_000_000n))).toEqual({ status: 'over_cap', spentRaw: 6_000_000n });
    expect(s.spentToday('A', DATE)).toBe(6_000_000n);
    expect(s.reserve(claim('k3', 4_000_000n)).status).toBe('reserved'); // exactly the cap is allowed
  });

  it('the same idempotency key never reserves twice', () => {
    const s = memory();
    s.reserve(claim('k1', 4_000_000n));
    const again = s.reserve(claim('k1', 4_000_000n));
    expect(again).toMatchObject({ status: 'duplicate', claimStatus: 'reserved', spentRaw: 4_000_000n });
    expect(s.spentToday('A', DATE)).toBe(4_000_000n);
  });

  it('two connections to one file cannot both pass the cap', () => {
    const [a, b] = filePair();
    expect(a.reserve(claim('k1', 6_000_000n)).status).toBe('reserved');
    expect(b.reserve(claim('k2', 6_000_000n)).status).toBe('over_cap');
    expect(b.spentToday('A', DATE)).toBe(6_000_000n);
  });

  it('a writer inside BEGIN IMMEDIATE blocks the other writer instead of letting it read a stale total', () => {
    const [a, b] = filePair();
    // Simulate the first writer being mid-transaction.
    (a as unknown as { db: { exec(s: string): void } }).db.exec('BEGIN IMMEDIATE');
    (b as unknown as { db: { exec(s: string): void } }).db.exec('PRAGMA busy_timeout = 50');
    expect(() => b.reserve(claim('k2', 1n))).toThrow(/locked|busy/i);
    (a as unknown as { db: { exec(s: string): void } }).db.exec('ROLLBACK');
    expect(b.reserve(claim('k2', 1n)).status).toBe('reserved'); // and works once the first one finishes
  });

  it('a failed payment releases its spend, a paid one keeps it', () => {
    const s = memory();
    s.reserve(claim('k1', 3_000_000n));
    s.reserve(claim('k2', 2_000_000n));
    s.settle('k1', 'failed');
    s.settle('k2', 'paid');
    expect(s.spentToday('A', DATE)).toBe(2_000_000n);
    expect(s.pastPaid('A', 'merchant.example')).toEqual([2_000_000n]);
  });

  it('a claim settles once only, and unknown claims are errors', () => {
    const s = memory();
    s.reserve(claim('k1', 1n));
    s.settle('k1', 'paid');
    expect(() => s.settle('k1', 'failed')).toThrow(/not reserved/);
    expect(() => s.settle('nope', 'paid')).toThrow(/unknown claim/);
  });

  it('spend is kept per owner and per day', () => {
    const s = memory();
    s.reserve(claim('k1', 4_000_000n, 5_000_000n, 'A'));
    s.reserve(claim('k2', 4_000_000n, 5_000_000n, 'B'));
    expect(s.spentToday('A', DATE)).toBe(4_000_000n);
    expect(s.spentToday('B', DATE)).toBe(4_000_000n);
    expect(s.spentToday('A', '2026-10-29')).toBe(0n);
  });

  it('keeps exact integers beyond float precision', () => {
    const s = memory();
    const big = 9_007_199_254_740_993n; // 2^53 + 1
    expect(s.reserve(claim('k1', big, 2n ** 62n)).spentRaw).toBe(big);
    expect(s.spentToday('A', DATE)).toBe(big);
  });
});

describe('pinned payout address', () => {
  it('pins on first sight and never overwrites', () => {
    const s = memory();
    expect(s.pinPayToIfNew('Merchant.Example', '0xaaa', NOW)).toBe('0xaaa');
    expect(s.pinPayToIfNew('merchant.example', '0xbbb', NOW)).toBe('0xaaa');
    expect(s.getMerchant('MERCHANT.example')?.pinnedPayTo).toBe('0xaaa');
  });
  it('a human can re-pin', () => {
    const s = memory();
    s.pinPayToIfNew('m.example', '0xaaa', NOW);
    s.repinPayTo('m.example', '0xbbb');
    expect(s.getMerchant('m.example')?.pinnedPayTo).toBe('0xbbb');
  });
  it('unknown merchant is null, not an error', () => {
    expect(memory().getMerchant('nope.example')).toBeNull();
  });
});

describe('alerts stay open until cleared', () => {
  it('opens once per merchant and kind, and closes only on request', () => {
    const s = memory();
    const id = s.openAlert('M.example', 'address_changed', NOW);
    expect(s.openAlert('m.example', 'address_changed', NOW + 1)).toBe(id);
    expect(s.openAlerts('m.example')).toHaveLength(1);
    s.closeAlert(id);
    expect(s.openAlerts()).toHaveLength(0);
  });
});

describe('evidence index keeps rejections visible', () => {
  const row = (id: string, status: 'verified' | 'rejected', reporter = '0xR1') => ({
    evidenceId: id,
    merchant: 'm.example',
    reporter,
    sha256: id,
    txDigest: 'tx-' + id,
    anchorTx: null,
    verdict: 'burned' as const,
    burnKind: 'junk',
    issuedAtMs: NOW,
    status,
    rejectReason: status === 'rejected' ? 'signature does not verify' : null,
    verifiedAt: NOW,
  });
  it('lists verified and rejected separately and counts verified per reporter', () => {
    const s = memory();
    s.upsertEvidence(row('e1', 'verified'));
    s.upsertEvidence(row('e2', 'verified'));
    s.upsertEvidence(row('e3', 'rejected', '0xEVIL'));
    expect(s.listEvidence('M.example', 'verified').map((e) => e.evidenceId)).toEqual(['e1', 'e2']);
    expect(s.listEvidence('m.example', 'rejected')[0]?.rejectReason).toBe('signature does not verify');
    expect(s.verifiedCounts()).toEqual({ '0xR1': 2 });
  });
  it('upsert updates status instead of duplicating', () => {
    const s = memory();
    s.upsertEvidence(row('e1', 'verified'));
    s.upsertEvidence({ ...row('e1', 'rejected'), rejectReason: 'payment lookup failed' });
    expect(s.listEvidence('m.example')).toHaveLength(1);
    expect(s.listEvidence('m.example')[0]?.status).toBe('rejected');
  });
});

describe('decisions', () => {
  it('records a decision and later its outcome', () => {
    const s = memory();
    const id = s.recordDecision({ owner: 'A', merchant: 'm.example', decision: 'ASK', rules: ['tier'], citations: { evidenceIds: [] }, confidence: 0.4, nowMs: NOW });
    s.setDecisionOutcome(id, { verdict: 'clean' });
    const [d] = s.listDecisions({ owner: 'A', merchant: 'M.example' });
    expect(d).toMatchObject({ decision: 'ASK', rules: ['tier'], confidence: 0.4, outcome: { verdict: 'clean' } });
    expect(s.listDecisions({ owner: 'B' })).toEqual([]);
  });
});
