// Day 1 check 2: write with delegate key A, recall with delegate key B, same account and namespace.
// Uses MEMWAL_KEY_A, MEMWAL_KEY_B, MEMWAL_ACCOUNT_ID from .env. Never prints key values.
// Run: node packages/memory/day1-check2-share.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MemWal } from '@mysten-incubation/memwal';

const env = {};
for (const l of readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const serverUrl = 'https://relayer.memory.walrus.xyz';
const namespace = 'fides-day1';
const mk = (key) => MemWal.create({ key, accountId: env.MEMWAL_ACCOUNT_ID, serverUrl, namespace });
const a = mk(env.MEMWAL_KEY_A);
const b = mk(env.MEMWAL_KEY_B);

const marker = `check2-${Date.now()}`;
const text = `Fides day-1 check 2 shared-record test ${marker}: merchant shared-test.example behaved cleanly. Throwaway record.`;

const t0 = Date.now();
const job = await a.remember(text);
console.log('A queued', job.status, `${Date.now() - t0}ms`);
const done = await a.waitForRememberJob(job.job_id, { timeoutMs: 120000 });
console.log('A stored, blob', done.blob_id, `${Date.now() - t0}ms`);

const res = await b.recall({ query: `shared record test ${marker}`, limit: 5 });
const hit = res.results.find((r) => r.text.includes(marker));
console.log('B recall total', res.total, 'found marker:', Boolean(hit), hit ? `distance ${hit.distance}` : '');
process.exit(hit ? 0 : 1);
