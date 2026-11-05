// The build the hosted site uses: the recorded run on Sui mainnet (apps/web/fixtures/demo-mainnet.json) instead of the
// simulated one. A recording, so the page labels it as one. Works on any shell: sets the variable itself.
//   pnpm web:build:hosted        then, from apps/web/dist:  vercel deploy --prod --yes
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const r = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'build'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, VITE_FIDES_FIXTURE: 'mainnet' },
});
process.exit(r.status ?? 1);
