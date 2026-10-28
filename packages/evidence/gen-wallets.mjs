// Generates Sui keypairs for agents A, B and the mock merchants and appends them to the repo .env.
// Never overwrites an existing value. Prints addresses only, never private keys.
// Run: node packages/evidence/gen-wallets.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
const text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
const lines = text.split(/\r?\n/);

const isSet = (name) =>
  lines.some((l) => l.startsWith(`${name}=`) && l.slice(name.length + 1).trim() !== '');

const setVar = (name, value) => {
  const i = lines.findIndex((l) => l.startsWith(`${name}=`));
  if (i >= 0) lines[i] = `${name}=${value}`;
  else lines.push(`${name}=${value}`);
};

for (const name of ['SUI_PRIVATE_KEY_A', 'SUI_PRIVATE_KEY_B', 'SUI_PRIVATE_KEY_MERCHANTS']) {
  if (isSet(name)) {
    console.log(`${name}: already set, left alone`);
    continue;
  }
  const kp = Ed25519Keypair.generate();
  setVar(name, kp.getSecretKey());
  console.log(`${name}: new key, address ${kp.toSuiAddress()}`);
}

if (!isSet('TATUM_SUI_RPC_URL')) setVar('TATUM_SUI_RPC_URL', 'https://sui-mainnet.gateway.tatum.io');

writeFileSync(envPath, lines.filter((l, i) => l !== '' || i < lines.length - 1).join('\n') + '\n');
