// Run the rule 6 demo.
//   pnpm demo:rule6                       simulated: fast, free, no network
//   pnpm demo:rule6 -- --live             real payments, Tatum and anchors on FIDES_NETWORK, memory kept in this process
//   pnpm demo:rule6 -- --live --memory=live   also writes to Walrus Memory (permanent). Set FIDES_MEMORY_NAMESPACE to keep it apart.
import { liveHarness, loadEnvFile, simHarness } from './harness.js';
import { runRule6 } from './rule6.js';

const args = process.argv.slice(2);
const live = args.includes('--live');
const memory = args.includes('--memory=live') ? 'live' : 'fake';

const h = live ? await liveHarness({ env: loadEnvFile(), memory }) : await simHarness();
try {
  const r = await runRule6(h);
  process.exitCode = r.ok ? 0 : 1;
} finally {
  await h.close();
}
