// Day 1 check 2: which keys are delegates on MEMWAL_ACCOUNT_ID, and can two of them share a namespace?
// Prints names and results only, never key values.
// Run: node packages/memory/day1-check2-delegates.mjs
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemWal } from '@mysten-incubation/memwal';

const env = {};
for (const l of readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const cred = join(homedir(), '.memwal', 'credentials.json');
const plugin = existsSync(cred) ? JSON.parse(readFileSync(cred, 'utf8')) : {};

const accountId = env.MEMWAL_ACCOUNT_ID;
const serverUrl = 'https://relayer.memory.walrus.xyz';
const namespace = 'fides-day1';

const candidates = {
  PLUGIN_DELEGATE: plugin.delegatePrivateKey,
  WEBAPP_DELEGATE_KEY: env.WEBAPP_DELEGATE_KEY,
  WALRUS_PRIVATE_KEY: env.WALRUS_PRIVATE_KEY,
  MEMWAL_KEY_A: env.MEMWAL_KEY_A,
  MEMWAL_KEY_B: env.MEMWAL_KEY_B,
};

const ok = [];
for (const [name, key] of Object.entries(candidates)) {
  if (!key) {
    console.log(`${name}: not set`);
    continue;
  }
  try {
    const mw = MemWal.create({ key, accountId, serverUrl, namespace });
    await mw.recall({ query: 'Fides day-1 connectivity test write', limit: 1 });
    console.log(`${name}: ACCEPTED as delegate`);
    ok.push(name);
  } catch (e) {
    console.log(`${name}: rejected (${String(e?.message ?? e).slice(0, 120)})`);
  }
}
console.log('delegates accepted:', ok.join(', ') || 'none');
