// Build a ready Fides client for one agent from the environment (SPEC section 13 variable names).
// FIDES_NETWORK picks relayer, Tatum gateway and key, Sui network and anchor package (SPEC section 24).
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { anchorPackageId, chainFromEnv } from '@fides/chain';
import { configFromEnv, loadConfig, type FidesConfig } from '@fides/core';
import { createMemwalBackend, memwalConfigFromEnv, SharedRecord, type MemoryBackend } from '@fides/memory';
import { openState } from '@fides/state';
import { SuiAnchorer } from './anchor.js';
import { Fides } from './fides.js';
import { jsonLogger, type Logger } from './log.js';

export interface FidesFromEnvOptions {
  /** SQLite file. Defaults to FIDES_DB_PATH_<AGENT>, then ./fides-<agent>.sqlite. ":memory:" for tests. */
  statePath?: string;
  /** Use this memory backend instead of the Walrus Memory relayer (for rehearsals that must not write permanent memories). */
  memory?: MemoryBackend;
  /** Override engine thresholds (calibration). The daily cap still comes from FIDES_DAILY_CAP_USD. */
  config?: Partial<FidesConfig>;
  /** Structured logs. Default: JSON lines on stderr when FIDES_LOG=json, otherwise none. */
  log?: Logger;
}

/**
 * agent is the suffix of the key variables, for example "A" reads SUI_PRIVATE_KEY_A and MEMWAL_KEY_A.
 * Throws if FIDES_DAILY_CAP_USD is missing: the engine refuses to start without a daily cap.
 */
export function fidesFromEnv(env: Record<string, string | undefined>, agent: string, o: FidesFromEnvOptions = {}): Fides {
  const suffix = agent.toUpperCase();
  const base = configFromEnv(env); // throws without FIDES_DAILY_CAP_USD
  const config = o.config ? loadConfig({ ...base, ...o.config, dailyCapUsd: base.dailyCapUsd }) : base;
  const { network, reader } = chainFromEnv(env);
  const rawKey = env[`SUI_PRIVATE_KEY_${suffix}`];
  if (!rawKey) throw new Error(`SUI_PRIVATE_KEY_${suffix} is not set`);
  const signer = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(rawKey).secretKey);

  const backend = o.memory ?? createMemwalBackend(memwalConfigFromEnv(env, agent));
  const shared = new SharedRecord(backend, { maxEvidenceBytes: config.maxEvidenceBytes });
  const packageId = anchorPackageId(network.name);

  return new Fides({
    config,
    state: openState(o.statePath ?? env[`FIDES_DB_PATH_${suffix}`] ?? `./fides-${agent.toLowerCase()}.sqlite`),
    shared,
    chain: reader,
    anchorer: new SuiAnchorer({ signer, packageId, network: network.suiNetwork as 'mainnet' | 'testnet', fullnodeUrl: network.fullnodeUrl }),
    signer,
    agentId: agent,
    anchorPackageId: packageId,
    networkName: `sui-${network.name}`,
    ...(o.log ? { log: o.log } : env.FIDES_LOG === 'json' ? { log: jsonLogger() } : {}),
  });
}
