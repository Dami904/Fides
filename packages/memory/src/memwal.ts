// Adapter from the real @mysten-incubation/memwal SDK to MemoryBackend, plus config from the environment.
// Keys are read from the environment and never logged.
import { createRequire } from 'node:module';
import { MemWal } from '@mysten-incubation/memwal';
import type { MemoryBackend } from './shared.js';

export const DEFAULT_NAMESPACE = 'merchants';

export interface MemwalConfig {
  /** Ed25519 delegate private key, hex. */
  key: string;
  /** MemWalAccount object id on Sui. */
  accountId: string;
  serverUrl: string;
  namespace: string;
}

export function createMemwalBackend(c: MemwalConfig): MemoryBackend {
  const mw = MemWal.create({ key: c.key, accountId: c.accountId, serverUrl: c.serverUrl, namespace: c.namespace });
  return {
    remember: async (text, o) => {
      const r = await mw.remember(text, { idempotencyKey: o.idempotencyKey });
      return { job_id: r.job_id };
    },
    waitForRememberJob: async (jobId, o) => {
      const r = await mw.waitForRememberJob(jobId, { timeoutMs: o.timeoutMs });
      return { blob_id: r.blob_id };
    },
    recall: async (p) => {
      const r = await mw.recall({ query: p.query, limit: p.limit, ...(p.maxDistance !== undefined ? { maxDistance: p.maxDistance } : {}), ...(p.timeoutMs ? { timeoutMs: p.timeoutMs } : {}) });
      return { results: r.results.map((x) => ({ blob_id: x.blob_id, text: x.text, distance: x.distance, ...(x.created_at ? { created_at: x.created_at } : {}) })), total: r.total };
    },
    health: () => mw.health(),
  };
}

const networks = createRequire(import.meta.url)('../../chain/networks.json') as Record<string, { memwalRelayerUrl: string }>;

/**
 * Config for one agent from the environment. FIDES_NETWORK picks the relayer (testnet or mainnet, SPEC section 24);
 * MEMWAL_KEY_<AGENT> is that agent's delegate key; MEMWAL_ACCOUNT_ID is the shared registry account.
 */
export function memwalConfigFromEnv(env: Record<string, string | undefined>, agent: string): MemwalConfig {
  const net = env.FIDES_NETWORK ?? 'testnet';
  const profile = networks[net];
  if (!profile) throw new Error(`unknown FIDES_NETWORK "${net}"`);
  const key = env[`MEMWAL_KEY_${agent.toUpperCase()}`];
  const accountId = env.MEMWAL_ACCOUNT_ID;
  if (!key) throw new Error(`MEMWAL_KEY_${agent.toUpperCase()} is not set`);
  if (!accountId) throw new Error('MEMWAL_ACCOUNT_ID is not set');
  return {
    key,
    accountId,
    serverUrl: env.FIDES_MEMWAL_RELAYER_URL ?? profile.memwalRelayerUrl,
    namespace: env.FIDES_MEMORY_NAMESPACE ?? DEFAULT_NAMESPACE,
  };
}
