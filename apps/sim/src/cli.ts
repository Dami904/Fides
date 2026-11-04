// pnpm sim                    20 agents, 6 merchants (2 bad), 12 rounds, seeds 1 to 3, with and without the shared record
// pnpm sim -- --seeds=5 --agents=20 --rounds=12
import { compare, gradeEvents } from './sim.js';

const arg = (k: string, d: number) => Number(process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d);
const seedCount = arg('seeds', 3);
const seeds = Array.from({ length: seedCount }, (_, i) => i + 1);
const rule6Off = process.argv.includes('--no-rule6');
const over = { agents: arg('agents', 20), rounds: arg('rounds', 12), ...(rule6Off ? { fides: { similarityMaxDistance: 0 } } : {}) };

console.log(`Simulation: ${over.agents} agents, 6 merchants (4 good, 1 flaky, 1 malicious), ${over.rounds} rounds, ${seeds.length} seeds. Settlement simulated.${rule6Off ? ' Rule 6 (similar-incident recall) OFF.' : ''}\n`);
const c = await compare(seeds, over, (l) => console.log(l));
const { shared, detached } = c.totals;
const usd = (raw: bigint) => (Number(raw) / 1e6).toFixed(2);
console.log('\n                      with shared record   without');
console.log(`  burns                 ${String(shared.burns).padStart(6)}            ${String(detached.burns).padStart(6)}`);
console.log(`  paid calls            ${String(shared.paid).padStart(6)}            ${String(detached.paid).padStart(6)}`);
console.log(`  refused               ${String(shared.refused).padStart(6)}            ${String(detached.refused).padStart(6)}`);
console.log(`  ...of which good      ${String(shared.refusedGood).padStart(6)}            ${String(detached.refusedGood).padStart(6)}   (the cost of caution)`);
console.log(`  asked a person        ${String(shared.asked).padStart(6)}            ${String(detached.asked).padStart(6)}`);
console.log(`  lost to burns (USDC)  ${usd(shared.lostRaw).padStart(6)}            ${usd(detached.lostRaw).padStart(6)}`);
const avoided = detached.burns - shared.burns;
console.log(`\nThe shared record avoided ${avoided} of ${detached.burns} burns (${detached.burns ? Math.round((100 * avoided) / detached.burns) : 0}%).`);

const rules = (rs: typeof c.shared) => {
  const t: Record<string, number> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.rules)) t[k] = (t[k] ?? 0) + v;
  return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
};
console.log(`\nRules that decided checks, with the record: ${rules(c.shared)}`);
console.log(`Rules that decided checks, without it:     ${rules(c.detached)}`);

// Self-grading: every paid attempt's verdict against what the merchant actually returned. Refusals are not graded.
const pct = (l: { graded: number; clean: number; cleanRate: number | null }) => (l.cleanRate === null ? 'nothing to grade' : `${Math.round(100 * l.cleanRate)}% clean (${l.clean} of ${l.graded})`);
for (const [label, rs] of [['with the record', c.shared], ['without it', c.detached]] as const) {
  const g = gradeEvents(rs.flatMap((r) => r.events));
  const tiers = Object.entries(g.byTier).map(([t, l]) => `${t} ${pct(l)}`).join('; ');
  console.log(`
Self-grade, ${label}: when Fides paid without asking, ${pct(g.autoPaid)}. By tier at the time: ${tiers}.`);
}
