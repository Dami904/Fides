// Start the three mock merchants on localhost. Real MPP payments on the network in FIDES_NETWORK.
//   pnpm --filter @fides/merchants start                (testnet unless FIDES_NETWORK=mainnet in .env)
// Prints public addresses only. Admin endpoints (turn the malicious merchant, force flaky failures) are on 127.0.0.1.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getNetwork } from '@fides/chain';
import { MERCHANTS, walletsFromEnv } from './config.js';
import { mppGate } from './gate.js';
import { Merchant, seededRandom } from './merchant.js';

const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
const env: Record<string, string | undefined> = { ...process.env };
if (existsSync(envPath)) {
  for (const l of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]!] === undefined) env[m[1]!] = m[2]!.trim();
  }
}

const network = getNetwork(env.FIDES_NETWORK);
const wallets = walletsFromEnv(env);
const gate = mppGate({ network: network.suiNetwork as 'testnet' | 'mainnet' });
const seed = env.FIDES_MERCHANT_SEED ? Number(env.FIDES_MERCHANT_SEED) : undefined;

console.log(`Fides mock merchants on Sui ${network.name}`);
console.log(`  pays to        ${wallets.main}`);
console.log(`  attacker after ${wallets.attacker}`);
for (const def of Object.values(MERCHANTS)) {
  const m = new Merchant({ def, gate, wallets, ...(seed !== undefined ? { random: seededRandom(seed + def.port) } : {}), ...(env.MERCHANT_ADMIN_TOKEN ? { adminToken: env.MERCHANT_ADMIN_TOKEN } : {}) });
  const s = await m.serve();
  console.log(`  ${def.name.padEnd(9)} ${def.host.padEnd(28)} ${s.url}${def.path}   price ${def.price} USDC`);
}
console.log('Ctrl+C to stop.');
