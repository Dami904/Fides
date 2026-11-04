// The simulation (SPEC section 11): many agents against several merchants, two of them bad, run with and without
// the shared record, burn counts measured. Settlement is simulated (fake ledger, in-process memory), everything else is
// real: the agent loop, the engine, signed evidence, read-time verification, the merchants over HTTP. The headline demo
// uses real payments; this is for numbers.
//
// Same seed, same world: the merchants' random failures and the agents' choices come from seeded generators, so a run is
// repeatable. The two conditions differ only in whether agents may use the shared record, but the merchants' random
// sequence is consumed by different calls in each, so compare across several seeds, not one.
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { FidesConfig } from '@fides/core';
import { PayingAgent, simGate, simPayer } from '@fides/agent';
import { MERCHANTS, Merchant, seededRandom, walletsFromEnv, type MerchantDef } from '@fides/merchants';
import { selfGrade, testing, type SelfGrade } from '@fides/sdk';

export type Mode = 'shared' | 'detached';

export interface SimConfig {
  agents: number;
  rounds: number;
  seed: number;
  mode: Mode;
  /** Chance a person approves an ASK. Default 0.8: people are busy and usually say yes. */
  pApprove: number;
  /** The malicious merchant swaps its address and price at the start of this round (1-based). */
  turnAtRound: number;
  /** Share of the flaky merchant's paid calls that go wrong. */
  flakyRate: number;
  /**
   * How long an agent waits for a paid answer, and how late the flaky merchant's late answers are. A real clock and real
   * HTTP run underneath, so the gap between the two must be wider than any stall the machine can have, or a slow honest
   * answer turns into a burn and the same seed stops giving the same run. Defaults favour speed; tests that compare runs
   * should widen them.
   */
  maxLatencyMs: number;
  lateMs: number;
  /** Engine threshold overrides. */
  fides?: Partial<FidesConfig>;
}

export const DEFAULT_SIM: SimConfig = { agents: 20, rounds: 12, seed: 1, mode: 'shared', pApprove: 0.8, turnAtRound: 6, flakyRate: 0.4, maxLatencyMs: 400, lateMs: 1500 };

export interface SimEvent {
  round: number;
  agent: string;
  merchant: string;
  kind: 'good' | 'flaky' | 'malicious';
  decision: string | null;
  /** The tier the verdict had. */
  tier: string | null;
  rules: string[];
  paid: boolean;
  burned: boolean;
}

export interface SimResult {
  config: SimConfig;
  /** Paid calls that went wrong (the number the spec asks for). */
  burns: number;
  paid: number;
  refused: number;
  /** REFUSE decisions about a good merchant: the cost of caution. */
  refusedGood: number;
  asked: number;
  approvedAsks: number;
  /** Raw USDC lost to burns. */
  lostRaw: bigint;
  burnsByMerchant: Record<string, number>;
  /** How often each rule decided a check. */
  rules: Record<string, number>;
  events: SimEvent[];
  /** Every paid attempt's verdict scored against what the merchant actually returned (self-grading). */
  grade: SelfGrade;
}

/** Two bad merchants among six: four good, one flaky, one malicious. */
function merchantDefs(): MerchantDef[] {
  const mk = (base: 'good' | 'flaky' | 'malicious', i: number): MerchantDef => ({ ...MERCHANTS[base], host: `${base}${i}.fides-sim.test`, port: 0 });
  return [mk('good', 1), mk('good', 2), mk('good', 3), mk('good', 4), mk('flaky', 1), mk('malicious', 1)];
}

export async function runSimulation(over: Partial<SimConfig> = {}, onEvent?: (e: SimEvent) => void): Promise<SimResult> {
  const cfg: SimConfig = { ...DEFAULT_SIM, ...over };
  const rand = seededRandom(cfg.seed * 7919 + 13);
  const world = testing.newWorld();
  Object.defineProperty(world.clock, 'now', { get: () => Date.now(), set: () => undefined });
  const wallets = walletsFromEnv({ SUI_PRIVATE_KEY_MERCHANTS: Ed25519Keypair.generate().getSecretKey() });
  const gate = simGate(world);

  const servers: { def: MerchantDef; url: string; admin: (p: string, b?: unknown) => Promise<unknown>; close: () => Promise<void> }[] = [];
  for (const [i, def] of merchantDefs().entries()) {
    const m = new Merchant({ def, gate, wallets, goodCalls: 0, flakyRate: cfg.flakyRate, flakyTimeoutMs: cfg.lateMs, random: seededRandom(cfg.seed * 1000 + i) });
    const s = await m.serve(0);
    servers.push({ def, url: s.url + def.path, admin: async (p, b) => (await fetch(s.url + p, { method: 'POST', ...(b !== undefined ? { body: JSON.stringify(b) } : {}) })).json(), close: s.close });
  }

  const events: SimEvent[] = [];
  const result: SimResult = { config: cfg, burns: 0, paid: 0, refused: 0, refusedGood: 0, asked: 0, approvedAsks: 0, lostRaw: 0n, burnsByMerchant: {}, rules: {}, events, grade: selfGrade([]) };
  const ask = () => {
    result.asked++;
    const yes = rand() < cfg.pApprove;
    if (yes) result.approvedAsks++;
    return yes;
  };

  const agents = Array.from({ length: cfg.agents }, (_, i) => {
    const name = `agent${i + 1}`;
    const a = testing.makeAgent(world, name, cfg.fides);
    if (cfg.mode === 'detached') a.fides.setSharedRecord('detached');
    // By default 150 ms against a 400 ms late answer: a timeout is a burn, quickly.
    const agent = new PayingAgent({ name, fides: a.fides, payer: simPayer(world, a.address), askPolicy: ask, maxLatencyMs: cfg.maxLatencyMs, reportDelayMs: 0, sleep: async () => undefined });
    return agent;
  });

  try {
    for (let round = 1; round <= cfg.rounds; round++) {
      if (round === cfg.turnAtRound) await servers.find((s) => s.def.name === 'malicious')!.admin('/admin/turn-malicious?force=1');
      // a fresh order each round, so no agent always goes first
      const order = agents.map((a, i) => ({ a, k: rand(), i })).sort((x, y) => x.k - y.k);
      for (const { a } of order) {
        const s = servers[Math.floor(rand() * servers.length)]!;
        const r = await a.buy(s.url);
        const burned = r.paid && !!r.exchange && !Object.values(r.exchange.checks).every(Boolean);
        const rules = r.check?.verdict.rulesFired ?? [];
        for (const rule of rules) result.rules[rule] = (result.rules[rule] ?? 0) + 1;
        if (r.decision === 'REFUSE') {
          result.refused++;
          if (s.def.name === 'good') result.refusedGood++;
        }
        if (r.paid) result.paid++;
        if (burned) {
          result.burns++;
          result.lostRaw += 10_000n;
          result.burnsByMerchant[s.def.host] = (result.burnsByMerchant[s.def.host] ?? 0) + 1;
        }
        const e: SimEvent = { round, agent: a.name, merchant: s.def.host, kind: s.def.name, decision: r.decision, tier: r.check?.verdict.tier ?? null, rules, paid: r.paid, burned };
        events.push(e);
        onEvent?.(e);
      }
    }
  } finally {
    await Promise.all(servers.map((s) => s.close()));
  }
  result.grade = gradeEvents(events);
  return result;
}

/** Scores the verdicts of paid attempts against their outcome. Unpaid attempts teach nothing and are not graded. */
export function gradeEvents(events: SimEvent[]): SelfGrade {
  return selfGrade(events.filter((e) => e.paid && e.decision).map((e) => ({ decision: e.decision!, tier: e.tier ?? 'unknown', outcome: e.burned ? 'burned' : 'clean' })));
}

export interface Comparison {
  seeds: number[];
  shared: SimResult[];
  detached: SimResult[];
  totals: { shared: Totals; detached: Totals };
}
export interface Totals {
  burns: number;
  paid: number;
  refused: number;
  refusedGood: number;
  asked: number;
  lostRaw: bigint;
}
const sum = (rs: SimResult[]): Totals => ({
  burns: rs.reduce((n, r) => n + r.burns, 0),
  paid: rs.reduce((n, r) => n + r.paid, 0),
  refused: rs.reduce((n, r) => n + r.refused, 0),
  refusedGood: rs.reduce((n, r) => n + r.refusedGood, 0),
  asked: rs.reduce((n, r) => n + r.asked, 0),
  lostRaw: rs.reduce((n, r) => n + r.lostRaw, 0n),
});

/** The same worlds with and without the shared record, over several seeds. */
export async function compare(seeds: number[], over: Partial<SimConfig> = {}, log?: (l: string) => void): Promise<Comparison> {
  const shared: SimResult[] = [];
  const detached: SimResult[] = [];
  for (const seed of seeds) {
    for (const mode of ['shared', 'detached'] as const) {
      const r = await runSimulation({ ...over, seed, mode });
      (mode === 'shared' ? shared : detached).push(r);
      log?.(`seed ${seed} ${mode.padEnd(8)} burns ${String(r.burns).padStart(3)}  paid ${String(r.paid).padStart(3)}  refused ${String(r.refused).padStart(3)}  asked ${String(r.asked).padStart(3)}`);
    }
  }
  return { seeds, shared, detached, totals: { shared: sum(shared), detached: sum(detached) } };
}
