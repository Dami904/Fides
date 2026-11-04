// Run the demo.
//   pnpm --filter @fides/agent demo                       simulated: fast, free, no network
//   pnpm --filter @fides/agent demo -- --live             real payments, Tatum and anchors on FIDES_NETWORK (testnet by default),
//                                                         memory kept in this process
//   pnpm --filter @fides/agent demo -- --live --memory=live   also writes to Walrus Memory (permanent, counts toward the 10)
import { runDemo } from './demo.js';
import { liveHarness, loadEnvFile, simHarness } from './harness.js';

const args = process.argv.slice(2);
const live = args.includes('--live');
const memory = args.includes('--memory=live') ? 'live' : 'fake';

const h = live ? await liveHarness({ env: loadEnvFile(), memory }) : await simHarness();
try {
  const r = await runDemo(h);
  process.exitCode = r.ok ? 0 : 1;
} finally {
  await h.close();
}
