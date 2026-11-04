// The UI on live data: runs the real demo and the simulation, serves them on 127.0.0.1, and starts the UI against them.
//   pnpm web:live                         simulated settlement, in-process memory, no keys needed
//   pnpm web:live -- --live               real payments, Tatum and anchors on FIDES_NETWORK (testnet by default)
//   pnpm web:live -- --live --memory=live also writes to Walrus Memory (permanent)
//   --port=4600 for the API, --no-ui to serve the API alone
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { liveHarness, loadEnvFile, simHarness } from '@fides/agent';
import { buildLiveData, liveServer } from './live';

const args = process.argv.slice(2);
const live = args.includes('--live');
const memory = args.includes('--memory=live') ? 'live' : 'fake';
const port = Number(args.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 4600);

const h = live ? await liveHarness({ env: loadEnvFile(), memory }) : await simHarness();
console.error(`running the demo (${h.mode}, ${h.network}) and the simulation; this takes a minute${live ? ' or two' : ''}...`);
const data = await buildLiveData(h, { memory, log: (l) => console.error(l) });
if (!data.demo.ok) console.error('WARNING: the demo did not meet every expectation; the UI shows what happened anyway');

const server = liveServer(h, data);
await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
console.error(`live API on http://127.0.0.1:${port}/api`);

let ui: ReturnType<typeof spawn> | null = null;
if (!args.includes('--no-ui')) {
  const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  ui = spawn(process.execPath, [vite, fileURLToPath(new URL('..', import.meta.url))], {
    stdio: 'inherit',
    env: { ...process.env, VITE_FIDES_API: '/api', FIDES_API_PORT: String(port) },
  });
}

const stop = async () => {
  ui?.kill();
  server.close();
  await h.close();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
