// Fifteen trials in different circumstances, on a real network with the real Walrus Memory relayer. Unlike the demo,
// which is scripted around one story, this exercises the engine across situations and records what it decided:
// a good merchant whose record grows, a flaky one seen through the shared record and seen detached (delivering, stale,
// junk), a merchant that swaps its payout address, and a person who declines an ASK.
//
// Every paid trial follows the write rule: real payment, verified through Tatum, signed, anchored, then remembered.
// Refusals and declines pay nothing and write nothing.
//
//   FIDES_NETWORK=mainnet pnpm trials -- --yes     run them (about 9 payments of 0.01 USDC)
//   pnpm trials                                    say what would run, spend nothing
import { describeBuy } from './demo.js';
import type { BuyResult } from './agent.js';
import { liveHarness, loadEnvFile, type AgentHandle } from './harness.js';

type Who = 'A' | 'B' | 'C';
type Merchant = 'good' | 'flaky' | 'malicious';
interface Trial {
  who: Who;
  merchant: Merchant;
  circumstance: string;
  /** What the merchant does before the call. */
  setup?: { flaky?: 'ok' | 'stale' | 'junk' | null; turnMalicious?: true };
  shared?: 'attached' | 'detached';
  /** How the person answers if the agent asks. */
  approve?: boolean;
}

const TRIALS: Trial[] = [
  { who: 'A', merchant: 'good', circumstance: 'good merchant, one clean report on record' },
  { who: 'B', merchant: 'good', circumstance: 'good merchant, a second reporter' },
  { who: 'C', merchant: 'good', circumstance: 'good merchant, a third reporter' },
  { who: 'A', merchant: 'good', circumstance: 'good merchant, clean reports from three agents' },
  { who: 'B', merchant: 'flaky', circumstance: 'flaky merchant, three signed burns on record', setup: { flaky: 'ok' } },
  { who: 'C', merchant: 'flaky', circumstance: 'flaky merchant, one of the burns on record is from C', setup: { flaky: 'ok' } },
  { who: 'A', merchant: 'malicious', circumstance: 'malicious merchant still honest, the person declines', approve: false },
  { who: 'B', merchant: 'malicious', circumstance: 'malicious merchant still honest, the person approves' },
  { who: 'C', merchant: 'malicious', circumstance: 'malicious merchant swaps its payout address and quotes 4x', setup: { turnMalicious: true } },
  { who: 'A', merchant: 'malicious', circumstance: 'swapped address, agent with the pinned address on record' },
  { who: 'A', merchant: 'flaky', circumstance: 'detached from the shared record, flaky delivers', shared: 'detached', setup: { flaky: 'ok' } },
  { who: 'C', merchant: 'flaky', circumstance: 'detached, flaky sends stale data', shared: 'detached', setup: { flaky: 'stale' } },
  { who: 'B', merchant: 'flaky', circumstance: 'detached, flaky sends junk', shared: 'detached', setup: { flaky: 'junk' } },
  { who: 'A', merchant: 'flaky', circumstance: 'attached again, after the new burns', setup: { flaky: 'ok' } },
  { who: 'B', merchant: 'good', circumstance: 'good merchant, after all of the above' },
];

const args = process.argv.slice(2);
const env = loadEnvFile();
if (!args.includes('--yes')) {
  console.log(`Would run ${TRIALS.length} trials on ${env.FIDES_NETWORK ?? 'testnet'} with the real Walrus Memory relayer (permanent writes):`);
  TRIALS.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.who} -> ${t.merchant}: ${t.circumstance}`));
  console.log('Run again with --yes to do it.');
} else {
  const h = await liveHarness({ env, memory: 'live' });
  let approveNext = true;
  const agents: Record<Who, AgentHandle> = {
    A: h.makeAgent('A', () => approveNext),
    B: h.makeAgent('B', () => approveNext),
    C: h.makeAgent('C', () => approveNext),
  };
  const results: { t: Trial; r: BuyResult; late: number }[] = [];
  try {
    console.log(`Fides trials on ${h.network}, real Walrus Memory. ${TRIALS.length} trials.`);
    for (const [i, t] of TRIALS.entries()) {
      if (t.setup?.flaky !== undefined) await h.merchants.flaky.admin('/admin/flaky', { force: t.setup.flaky });
      if (t.setup?.turnMalicious) await h.merchants.malicious.admin('/admin/turn-malicious?force=1');
      const who = agents[t.who];
      who.fides.setSharedRecord(t.shared ?? 'attached');
      approveNext = t.approve ?? true;
      const r = await who.agent.buy(h.merchants[t.merchant].resource);
      who.fides.setSharedRecord('attached');
      // A report made while detached is held back; it reaches the shared record once the agent is attached again.
      const late = t.shared === 'detached' ? (await who.agent.retryUnreported()).filter((x) => x.reported).length : 0;
      results.push({ t, r, late });
      const conf = r.check ? ` tier ${r.check.verdict.tier}${r.check.verdict.cannotSay ? ', cannot say' : ''}` : '';
      console.log(`\n${String(i + 1).padStart(2)}. ${t.circumstance}${conf}`);
      console.log('    ' + describeBuy(r));
      if (late) console.log('    held while detached, written to the shared record after attaching again');
    }
  } finally {
    await h.close();
  }
  const paid = results.filter((x) => x.r.paid);
  const burned = paid.filter((x) => !Object.values(x.r.exchange!.checks).every(Boolean));
  const reported = results.filter((x) => x.r.receipt?.status === 'complete' || x.late > 0);
  const byDecision: Record<string, number> = {};
  for (const { r } of results) byDecision[r.decision ?? 'error'] = (byDecision[r.decision ?? 'error'] ?? 0) + 1;
  console.log(`\nSummary: ${results.length} trials. Decisions: ${Object.entries(byDecision).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  console.log(`Paid ${paid.length} (burned ${burned.length}), reports written to the shared record ${reported.length}, not paid ${results.length - paid.length}.`);
  const notReported = paid.filter((x) => x.r.receipt?.status !== 'complete' && !x.late);
  if (notReported.length) console.log(`Paid but not reported: ${notReported.map((x) => `${x.t.who}->${x.t.merchant} (${x.r.reportError ?? x.r.receipt?.status})`).join(', ')}`);
  process.exitCode = notReported.length || results.some((x) => x.r.decision === null) ? 1 : 0;
}
