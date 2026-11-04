import { describe, expect, it } from 'vitest';
import { compare, runSimulation } from '../src/sim.js';

const small = { agents: 12, rounds: 8 };

// The two heavy tests (about 20 s together) run with FIDES_SLOW=1. The quick ones always run.
const slow = process.env.FIDES_SLOW ? it : it.skip;

describe('simulation', () => {
  it('is repeatable: the same seed gives the same run', async () => {
    // A wide gap between the deadline and the late answer, so a busy machine cannot turn an honest answer into a burn.
    const timing = { maxLatencyMs: 1500, lateMs: 3000 };
    const a = await runSimulation({ ...small, ...timing, seed: 3, mode: 'shared' });
    const b = await runSimulation({ ...small, ...timing, seed: 3, mode: 'shared' });
    expect(b.events.map((e) => [e.agent, e.merchant, e.decision, e.burned])).toEqual(a.events.map((e) => [e.agent, e.merchant, e.decision, e.burned]));
    expect(b.burns).toBe(a.burns);
  }, 120_000);

  slow('the shared record prevents burns, over several seeds, without refusing good merchants', async () => {
    const c = await compare([1, 2], small);
    expect(c.totals.shared.burns).toBeLessThan(c.totals.detached.burns);
    expect(c.totals.shared.refusedGood).toBe(0);
    expect(c.totals.detached.refusedGood).toBe(0);
    // every burn comes from a bad merchant
    for (const r of [...c.shared, ...c.detached]) {
      for (const host of Object.keys(r.burnsByMerchant)) expect(host).toMatch(/^(flaky|malicious)/);
    }
  }, 180_000);

  slow('with the shared record, trusted good merchants are paid automatically; without it nobody gets past ask (needs the full 20 agents: trust takes volume)', async () => {
    const full = { agents: 20, rounds: 12 };
    const shared = await runSimulation({ ...full, seed: 1, mode: 'shared' });
    const detached = await runSimulation({ ...full, seed: 1, mode: 'detached' });
    const autoPaysGood = (r: typeof shared) => r.events.filter((e) => e.kind === 'good' && e.decision === 'PAY').length;
    expect(autoPaysGood(shared)).toBeGreaterThan(0);
    expect(autoPaysGood(detached)).toBe(0);
    expect(shared.asked).toBeLessThan(detached.asked);
  }, 180_000);

  it('the malicious merchant is only dangerous after it turns', async () => {
    const r = await runSimulation({ ...small, seed: 2, mode: 'detached', turnAtRound: 5 });
    const before = r.events.filter((e) => e.kind === 'malicious' && e.round < 5 && e.burned);
    expect(before).toEqual([]);
  }, 120_000);
});
