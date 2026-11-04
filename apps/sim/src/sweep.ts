// How sensitive is the result to the trust thresholds? Runs the shared-record condition under several engine settings,
// over several seeds, and reports burns, automatic payments to good merchants and how often a person was asked.
// node node_modules/tsx/dist/cli.mjs apps/sim/src/sweep.ts            (about 5 minutes)
// This only measures. It changes no default: a threshold is a claim about the world, and the simulation is not the world.
import type { FidesConfig } from '@fides/core';
import { runSimulation } from './sim.js';

const seeds = [1, 2, 3];
const configs: { name: string; fides: Partial<FidesConfig> }[] = [
  { name: 'defaults', fides: {} },
  { name: 'reporter weight saturates at 5 reports (default 20)', fides: { reporterWeightSaturation: 5 } },
  { name: 'one reporter may count up to 5 (default 3)', fides: { reporterInfluenceCap: 5 } },
  { name: 'established needs Wilson above 0.4 (default 0.6)', fides: { tiers: { establishedMinClean: 3, establishedWilsonLb: 0.4, trustedMinClean: 10, trustedWilsonLb: 0.8 } } },
  { name: 'all three of the above', fides: { reporterWeightSaturation: 5, reporterInfluenceCap: 5, tiers: { establishedMinClean: 3, establishedWilsonLb: 0.4, trustedMinClean: 10, trustedWilsonLb: 0.8 } } },
];

console.log(`20 agents, 6 merchants (2 bad), 12 rounds, seeds ${seeds.join(', ')}, shared record on. Settlement simulated.\n`);
console.log('burns  auto-paid good  asked  refused good   setting');
for (const c of configs) {
  let burns = 0, auto = 0, asked = 0, refusedGood = 0;
  for (const seed of seeds) {
    const r = await runSimulation({ seed, mode: 'shared', fides: c.fides });
    burns += r.burns;
    asked += r.asked;
    refusedGood += r.refusedGood;
    auto += r.events.filter((e) => e.kind === 'good' && e.decision === 'PAY').length;
  }
  console.log(`${String(burns).padStart(5)}  ${String(auto).padStart(14)}  ${String(asked).padStart(5)}  ${String(refusedGood).padStart(12)}   ${c.name}`);
}
