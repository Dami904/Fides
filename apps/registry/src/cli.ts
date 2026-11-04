// Run the registry.
//   pnpm registry                       network from FIDES_NETWORK (testnet by default), real Walrus Memory relayer
//   pnpm registry -- --memory=fake      an empty in-process memory (nothing to show; for trying the page)
// Listens on 127.0.0.1:4200 (PORT to change, HOST=0.0.0.0 to expose it, behind a proxy you trust).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chainFromEnv, anchorPackageId } from '@fides/chain';
import { loadConfig } from '@fides/core';
import { createMemwalBackend, memwalConfigFromEnv, SharedRecord } from '@fides/memory';
import { testing } from '@fides/sdk';
import { openState } from '@fides/state';
import { Registry } from './registry.js';
import { createRegistryServer } from './server.js';

const env: Record<string, string | undefined> = { ...process.env };
const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envPath)) {
  for (const l of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]!] === undefined) env[m[1]!] = m[2]!.trim();
  }
}

const config = loadConfig({ dailyCapUsd: '0' }); // the registry never pays; the cap is unused
const { network, reader } = chainFromEnv(env);
const fake = process.argv.includes('--memory=fake');
// A read-only identity on the shared record: a dedicated delegate key if there is one, otherwise agent A's.
const key = env.MEMWAL_KEY_REGISTRY ?? env.MEMWAL_KEY_A;
const backend = fake ? new testing.SharedMemory() : createMemwalBackend(memwalConfigFromEnv({ ...env, MEMWAL_KEY_REGISTRY: key }, 'REGISTRY'));
const registry = new Registry({
  state: openState(env.FIDES_REGISTRY_DB ?? './fides-registry.sqlite'),
  shared: new SharedRecord(backend, { maxEvidenceBytes: config.maxEvidenceBytes }),
  chain: reader,
  anchorPackageId: anchorPackageId(network.name),
  config,
});
const port = Number(env.PORT ?? 4200);
const host = env.HOST ?? '127.0.0.1';
createRegistryServer(registry, { trustProxy: env.TRUST_PROXY === '1' }).listen(port, host, () => {
  console.log(`Fides registry on http://${host}:${port}  (Sui ${network.name}, memory ${fake ? 'fake' : 'Walrus Memory'})`);
});
