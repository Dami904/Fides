import { describe, expect, it } from 'vitest';
import demoJson from '../fixtures/demo.json';
import simJson from '../fixtures/sim.json';
import { fixturesApi } from '../src/api';
import { attempts, boardAt, gradeAt, glyphCells, href, merchantOrder, parseRoute, parseSteps, short, shortAddr, usd } from '../src/lib';
import type { DemoFixture, SimFixture, VerifyStep } from '../src/types';

const demo = demoJson as unknown as DemoFixture;
const sim = simJson as unknown as SimFixture;
const api = fixturesApi({ stepDelayMs: 0 });
const collect = async (id: string) => {
  const out: VerifyStep[] = [];
  for await (const s of api.verifyEvidence(id)) out.push(s);
  return out;
};

describe('attempts: the event stream grouped into one record per attempt', () => {
  const a = attempts(demo.events);
  it('starts a record at each challenge', () => {
    expect(a).toHaveLength(demo.events.filter((e) => e.type === 'challenge').length);
    expect(a.every((x) => x.agent && x.host && x.recipient)).toBe(true);
  });
  it('a refused attempt has a verdict and a reason it was skipped, and nothing was paid', () => {
    const refused = a.filter((x) => x.check?.decision === 'REFUSE');
    expect(refused.length).toBeGreaterThan(0);
    for (const r of refused) {
      expect(r.skipped).toBeDefined();
      expect(r.paid).toBeUndefined();
    }
  });
  it('a paid attempt carries its response and its report', () => {
    const paid = a.filter((x) => x.paid);
    expect(paid.length).toBeGreaterThan(0);
    for (const p of paid) {
      expect(p.response).toBeDefined();
      expect(p.reported).toBeDefined();
    }
  });
  it('ignores events before the first challenge', () => {
    expect(attempts([{ type: 'paid', agent: 'A', host: 'x', txDigest: 'y' }])).toEqual([]);
  });
});

describe('glyph: a stable picture of a hash', () => {
  it('is the same for the same hash and different for different hashes', () => {
    const h1 = 'a'.repeat(64), h2 = 'b3f5e7d9c1a2b4d6'.repeat(4);
    expect(glyphCells(h1)).toEqual(glyphCells(h1));
    expect(JSON.stringify(glyphCells(h1))).not.toBe(JSON.stringify(glyphCells(h2)));
  });
  it('is mirrored left to right', () => {
    const cells = new Set(glyphCells('3c5a9e17b2d4f680').map(([c, r]) => `${c},${r}`));
    for (const key of cells) {
      const [c, r] = key.split(',').map(Number);
      expect(cells.has(`${4 - c!},${r}`)).toBe(true);
    }
  });
  it('survives a short or empty hash', () => {
    expect(() => glyphCells('')).not.toThrow();
    expect(() => glyphCells('f')).not.toThrow();
  });
});

describe('gradeAt: self-grading on the recorded simulation', () => {
  it('grades only paid attempts, up to the round, and agrees with the board', () => {
    expect(gradeAt(sim.shared.events, 0).auto.graded).toBe(0);
    const end = sim.shared.config.rounds;
    const g = gradeAt(sim.shared.events, end);
    const paid = sim.shared.events.filter((e) => e.paid);
    const tierTotal = Object.values(g.byTier).reduce((n, l) => n + l!.graded, 0);
    expect(tierTotal).toBe(paid.length); // every paid attempt has the tier its verdict had
    expect(Object.values(g.byTier).reduce((n, l) => n + l!.graded - l!.clean, 0)).toBe(boardAt(sim.shared.events, end).totals.burns);
    expect(gradeAt(sim.detached.events, end).auto.graded).toBe(0); // without the record nothing is ever paid without asking
  });
});

describe('boardAt: the simulation as of a round', () => {
  it('is empty before round 1', () => {
    const b = boardAt(sim.shared.events, 0);
    expect(b.cells.size).toBe(0);
    expect(b.totals).toEqual({ burns: 0, paid: 0, refused: 0, asked: 0 });
  });
  it('ends on exactly the totals the engine reported, for both conditions', () => {
    for (const run of [sim.shared, sim.detached]) {
      const t = boardAt(run.events, run.config.rounds).totals;
      expect(t.burns).toBe(run.burns);
      expect(t.paid).toBe(run.paid);
      expect(t.refused).toBe(run.refused);
      expect(t.asked).toBe(run.asked);
    }
  });
  it('counters never go down as the rounds advance', () => {
    let prev = 0;
    for (let r = 0; r <= sim.shared.config.rounds; r++) {
      const t = boardAt(sim.shared.events, r).totals;
      expect(t.burns).toBeGreaterThanOrEqual(prev);
      prev = t.burns;
    }
  });
  it('a cell shows the worst thing that happened there: a burn beats a clean payment', () => {
    const events = [
      { round: 1, agent: 'a', merchant: 'm', kind: 'good' as const, decision: 'ASK' as const, rules: [], paid: true, burned: false },
      { round: 2, agent: 'a', merchant: 'm', kind: 'good' as const, decision: 'ASK' as const, rules: [], paid: true, burned: true },
      { round: 3, agent: 'a', merchant: 'm', kind: 'good' as const, decision: 'PAY' as const, rules: [], paid: true, burned: false },
    ];
    expect(boardAt(events, 1).cells.get('a|m')).toBe('clean');
    expect(boardAt(events, 3).cells.get('a|m')).toBe('burn');
  });
  it('with the shared record there are fewer burns than without, in the recorded run', () => {
    expect(sim.shared.burns).toBeLessThan(sim.detached.burns);
  });
  it('orders merchants good first, then flaky, then malicious', () => {
    const m = merchantOrder(sim.shared.events);
    expect(m).toHaveLength(6);
    expect(m.slice(0, 4).every((x) => x.startsWith('good'))).toBe(true);
    expect(m[4]).toMatch(/^flaky/);
    expect(m[5]).toMatch(/^malicious/);
  });
});

describe('parseRoute: every page has an address', () => {
  it('reads list and detail pages', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/feed')).toEqual({ name: 'feed' });
    expect(parseRoute('#/feed/3')).toEqual({ name: 'decision', index: 3 });
    expect(parseRoute('#/merchants')).toEqual({ name: 'merchants' });
    expect(parseRoute('#/merchants/flaky.fides-demo.test')).toEqual({ name: 'merchant', host: 'flaky.fides-demo.test' });
    expect(parseRoute('#/evidence/abc')).toEqual({ name: 'evidence', id: 'abc' });
  });
  it('keeps the old merchant address working, and sends anything unknown home', () => {
    expect(parseRoute('#/merchant')).toEqual({ name: 'merchants' });
    expect(parseRoute('#/nope')).toEqual({ name: 'home' });
    expect(parseRoute('#/feed/x')).toEqual({ name: 'feed' });
  });
  it('round-trips what href builds', () => {
    expect(parseRoute(href.merchant('a b.test'))).toEqual({ name: 'merchant', host: 'a b.test' });
    expect(parseRoute(href.decision(7))).toEqual({ name: 'decision', index: 7 });
  });
});

describe('formatting helpers', () => {
  it('shortens ids and addresses without inventing characters', () => {
    expect(short('abcdef1234567890')).toBe('abcdef12');
    expect(short(undefined)).toBe('');
    expect(shortAddr('0x' + 'ab'.repeat(32))).toBe('0xababab…abab');
    expect(shortAddr('0xabc')).toBe('0xabc');
    expect(usd('0.01')).toBe('0.01');
    expect(usd(1)).toBe('1.00');
  });
  it('parses the recorded re-verify lines', () => {
    expect(parseSteps(['re-verify hash          ok   sha256 abc matches', 'something else', 're-verify payment       FAIL no tx'])).toEqual([
      { name: 'hash', ok: true, detail: 'sha256 abc matches' },
      { name: 'payment', ok: false, detail: 'no tx' },
    ]);
  });
});

describe('the fixtures API', () => {
  it('says plainly what is real and what is not', () => {
    const h = api.honesty().items;
    expect(h.find((i) => i.key === 'Settlement')).toMatchObject({ value: 'simulated', real: false });
    expect(h.find((i) => i.key === 'Engine and signatures')).toMatchObject({ real: true });
    expect(api.mode).toBe('fixtures');
  });

  it('the split view: B refuses with the record, asks without it, and does not pay when it cannot reach it', async () => {
    const s = await api.getSplit();
    expect(s.states.attached.check!.verdict.decision).toBe('REFUSE');
    expect(s.states.attached.check!.verdict.citations.evidenceIds).toHaveLength(2);
    expect(s.states.detached.check!.verdict.decision).toBe('ASK');
    expect(s.states.detached.check!.verdict.citations.evidenceIds).toEqual([]);
    expect(s.states.detached.loss).toBe(0.01);
    expect(s.states.unreachable.check!.sharedState).toBe('unreachable');
    expect(['PAY', 'PAY_CAPPED']).not.toContain(s.states.unreachable.check!.verdict.decision);
    expect(s.states.attached.loss).toBe(0);
  });

  it('what B cites on the split view are the records A and C reported', async () => {
    const s = await api.getSplit();
    const reported = new Set(s.earlier.map((e) => e.evidenceId));
    for (const id of s.states.attached.check!.verdict.citations.evidenceIds) expect(reported.has(id)).toBe(true);
  });

  it('the flaky merchant is burned, shows a rejected record, and the malicious one raises an address alert', async () => {
    const f = await api.getMerchant(demo.merchants.flaky);
    expect(f.tier).toBe('burned');
    expect(f.decision).toBe('REFUSE');
    expect(f.rejectedCount).toBe(1);
    expect(f.evidence.filter((e) => e.status === 'rejected')).toHaveLength(1);
    expect(f.evidence.filter((e) => e.status === 'verified').every((e) => e.id.length === 64)).toBe(true);
    const m = await api.getMerchant(demo.merchants.malicious);
    expect(m.addressAlert).toBe(true);
    expect(m.quotedNow).not.toBe(m.firstPaidAt);
    expect((await api.getMerchant(demo.merchants.good)).addressAlert).toBe(false);
  });

  it('re-verifying a real record passes five steps; a forged one fails at the hash', async () => {
    const f = await api.getMerchant(demo.merchants.flaky);
    const real = f.evidence.find((e) => e.status === 'verified')!;
    const ok = await collect(real.id);
    expect(ok.map((s) => s.name)).toEqual(['format', 'hash', 'signature', 'anchor-sender', 'payment']);
    expect(ok.every((s) => s.ok)).toBe(true);
    const bad = await collect(f.evidence.find((e) => e.status === 'rejected')!.id);
    expect(bad.at(-1)).toMatchObject({ name: 'hash', ok: false });
    expect(bad.at(-1)!.detail).toMatch(/no anchor event/);
  });

  it('finds a record with its merchant, and an unknown id is an error', async () => {
    const f = await api.getMerchant(demo.merchants.flaky);
    const forgedItem = f.evidence.find((e) => e.status === 'rejected')!;
    const got = await api.getEvidence(forgedItem.id);
    expect(got.merchant.host).toBe(demo.merchants.flaky);
    expect(got.item.status).toBe('rejected');
    await expect(api.getEvidence('not-a-record')).rejects.toThrow(/no record/);
  });

  it('lists every merchant and every attempt', async () => {
    expect(await api.listMerchants()).toHaveLength(3);
    expect((await api.listDecisions()).length).toBe(attempts(demo.events).length);
    expect((await api.getSimulation()).shared.config.agents).toBe(20);
  });
});
