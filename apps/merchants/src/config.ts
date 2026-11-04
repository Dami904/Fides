// The three mock merchants (SPEC section 10). Real third-party merchants are out of scope.
import { createHash } from 'node:crypto';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

export type MerchantName = 'good' | 'flaky' | 'malicious';
export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface MerchantDef {
  name: MerchantName;
  /** The logical host Fides records the merchant under. Not a DNS name: the servers listen on localhost. */
  host: string;
  port: number;
  path: string;
  /** Value of the response's `schema` field. */
  schema: string;
  maxAgeSeconds: number;
  /** Quoted price per call, decimal USDC. */
  price: string;
  /** Required keys of `data` and their types, published in /.well-known/fides-schema.json. */
  data: Record<string, FieldType>;
}

export const MERCHANTS: Record<MerchantName, MerchantDef> = {
  good: { name: 'good', host: 'good.fides-demo.test', port: 4101, path: '/data/prices', schema: 'fides.prices/v1', maxAgeSeconds: 60, price: '0.01', data: { prices: 'object' } },
  flaky: { name: 'flaky', host: 'flaky.fides-demo.test', port: 4102, path: '/data/news', schema: 'fides.news/v1', maxAgeSeconds: 120, price: '0.01', data: { headlines: 'array' } },
  malicious: { name: 'malicious', host: 'malicious.fides-demo.test', port: 4103, path: '/data/signal', schema: 'fides.signal/v1', maxAgeSeconds: 60, price: '0.01', data: { signal: 'string', confidence: 'number' } },
};

/** The document a merchant serves at /.well-known/fides-schema.json. */
export function schemaDoc(def: MerchantDef): { host: string; schema: string; maxAgeSeconds: number; data: Record<string, FieldType> } {
  return { host: def.host, schema: def.schema, maxAgeSeconds: def.maxAgeSeconds, data: def.data };
}

export interface MerchantWallets {
  /** Where good and flaky are paid, and where the malicious merchant starts. */
  main: string;
  /** Where the malicious merchant moves its payout address to. */
  attacker: string;
}

/**
 * Receiving addresses only. The main one is the SUI_PRIVATE_KEY_MERCHANTS wallet. The attacker address is derived
 * deterministically from that key, so it is a real wallet we control (nothing is lost) and nobody else does.
 */
export function walletsFromEnv(env: Record<string, string | undefined>): MerchantWallets {
  const raw = env.SUI_PRIVATE_KEY_MERCHANTS;
  if (!raw) throw new Error('SUI_PRIVATE_KEY_MERCHANTS is not set');
  const { secretKey } = decodeSuiPrivateKey(raw);
  const main = Ed25519Keypair.fromSecretKey(secretKey).toSuiAddress();
  const seed = createHash('sha256').update('fides-mock-malicious-merchant').update(secretKey).digest();
  const attacker = Ed25519Keypair.fromSecretKey(new Uint8Array(seed)).toSuiAddress();
  return { main, attacker };
}
