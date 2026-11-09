// Run the research agent demo.
//   pnpm research                              simulated: fast, free, no network
//   pnpm research -- --live                    real payments, Tatum and anchors on FIDES_NETWORK, memory kept in this process
//   pnpm research -- --live --memory=live      also writes to Walrus Memory (permanent). Set FIDES_MEMORY_NAMESPACE to keep it apart.
//   add --json=path to save the run (what the UI replays)
import { writeFileSync } from 'node:fs';
import { liveHarness, loadEnvFile, simHarness } from './harness.js';
import { runResearchDemo } from './research-demo.js';

const args = process.argv.slice(2);
const live = args.includes('--live');
const memory = args.includes('--memory=live') ? 'live' : 'fake';
const json = args.find((a) => a.startsWith('--json='))?.slice(7);

const h = live ? await liveHarness({ env: loadEnvFile(), memory }) : await simHarness();
try {
  const r = await runResearchDemo(h);
  if (json) {
    writeFileSync(json, JSON.stringify({ ...r, events: undefined }, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
    console.log(`saved ${json}`);
  }
  process.exitCode = r.ok ? 0 : 1;
} finally {
  await h.close();
}
