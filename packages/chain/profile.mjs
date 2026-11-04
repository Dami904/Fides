// Network profile: one setting, FIDES_NETWORK=testnet|mainnet (SPEC section 24), picks every
// network-specific value. Shared by the day-1 scripts; the TypeScript engine reads networks.json.
// Never prints key values.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const networks = JSON.parse(readFileSync(new URL('./networks.json', import.meta.url), 'utf8'));

export function loadEnv() {
  const env = {};
  const p = root + '.env';
  if (existsSync(p)) {
    for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('FIDES_'))) };
}

/** name: explicit argument, else FIDES_NETWORK, else testnet. */
export function getProfile(name) {
  const env = loadEnv();
  const n = name ?? env.FIDES_NETWORK ?? 'testnet';
  const p = networks[n];
  if (!p) throw new Error(`unknown network "${n}", expected testnet or mainnet`);
  const tatumKey = env[p.tatumKeyEnv] || env.TATUM_API_KEY;
  if (!tatumKey) throw new Error(`${p.tatumKeyEnv} is not set in .env`);
  return { name: n, ...p, tatumKey, env };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
/** Tatum free plan allows 3 requests per second: serialize and space calls. */
export async function tatumGraphql(profile, query) {
  const wait = last + 400 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const res = await fetch(profile.tatumGraphqlUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': profile.tatumKey },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Tatum GraphQL HTTP ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`Tatum GraphQL: ${JSON.stringify(body.errors).slice(0, 300)}`);
  return body.data;
}

/** Raw balances by coin type for an address, read through Tatum. */
export async function getBalances(profile, address) {
  const d = await tatumGraphql(
    profile,
    `{ address(address: "${address}") { balances { nodes { coinType { repr } totalBalance } } } }`,
  );
  const out = {};
  for (const n of d.address?.balances?.nodes ?? []) out[n.coinType.repr] = BigInt(n.totalBalance);
  return out;
}

export const SUI_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

/** Payment facts for SPEC section 8 check 4, read through Tatum. */
export async function getPayment(profile, digest) {
  const d = await tatumGraphql(
    profile,
    `{ transaction(digest: "${digest}") { sender { address } effects { status checkpoint { sequenceNumber } balanceChanges { nodes { owner { address } amount coinType { repr } } } } } }`,
  );
  const t = d.transaction;
  if (!t) return null;
  return {
    sender: t.sender.address,
    status: t.effects.status,
    checkpoint: t.effects.checkpoint?.sequenceNumber ?? null,
    changes: t.effects.balanceChanges.nodes.map((n) => ({
      owner: n.owner?.address,
      amount: BigInt(n.amount),
      coinType: n.coinType.repr,
    })),
  };
}
