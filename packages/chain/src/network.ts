// Network profile for TypeScript code (SPEC section 24). The same networks.json drives the scripts (profile.mjs).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { TatumGraphql } from './tatum.js';
import { TatumChainReader } from './reader.js';

const require = createRequire(import.meta.url);
export interface NetworkProfile {
  suiNetwork: string;
  fullnodeUrl: string;
  tatumGraphqlUrl: string;
  tatumGrpcUrl: string;
  tatumKeyEnv: string;
  memwalRelayerUrl: string;
  usdcType: string;
  usdcDecimals: number;
}
const networks = require('../networks.json') as Record<string, NetworkProfile>;

export function getNetwork(name: string | undefined): { name: string } & NetworkProfile {
  const n = name ?? 'testnet';
  const p = networks[n];
  if (!p) throw new Error(`unknown FIDES_NETWORK "${n}", expected testnet or mainnet`);
  return { name: n, ...p };
}

/** A reader for the configured network, using that network's Tatum key. */
export function chainFromEnv(env: Record<string, string | undefined>): { network: ReturnType<typeof getNetwork>; client: TatumGraphql; reader: TatumChainReader } {
  const network = getNetwork(env.FIDES_NETWORK);
  const apiKey = env[network.tatumKeyEnv] ?? env.TATUM_API_KEY;
  if (!apiKey) throw new Error(`${network.tatumKeyEnv} is not set`);
  const client = new TatumGraphql({ url: network.tatumGraphqlUrl, apiKey });
  return { network, client, reader: new TatumChainReader(client, { anchorFromCheckpoint: anchorFloors() }) };
}

/** The checkpoint each published anchor package appeared in (packages/move/deployments.json). */
function anchorFloors(): Record<string, number> {
  const all = JSON.parse(readFileSync(new URL('../../move/deployments.json', import.meta.url), 'utf8')) as Record<string, { packageId: string; publishCheckpoint?: number }>;
  return Object.fromEntries(Object.values(all).flatMap((d) => (d.publishCheckpoint !== undefined ? [[d.packageId, d.publishCheckpoint] as const] : [])));
}

/** The anchor package id published for this network (packages/move/deployments.json). Fails loudly if there is none. */
export function anchorPackageId(network: string): string {
  const path = new URL('../../move/deployments.json', import.meta.url);
  const all = JSON.parse(readFileSync(path, 'utf8')) as Record<string, { packageId: string }>;
  const id = all[network]?.packageId;
  if (!id) throw new Error(`no anchor package published on ${network}: run packages/move/publish.mjs ${network}`);
  return id;
}
