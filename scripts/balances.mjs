// Read-only: the SUI and USDC balance of each Fides wallet on the network in FIDES_NETWORK (default mainnet).
// Prints addresses and amounts only, never keys. One Tatum request per wallet.
//   node scripts/balances.mjs
import { getProfile, getBalances, SUI_TYPE } from '../packages/chain/profile.mjs';

const net = process.env.FIDES_NETWORK ?? 'mainnet';
const profile = getProfile(net);
const { Ed25519Keypair } = await import('../packages/move/node_modules/@mysten/sui/dist/keypairs/ed25519/index.mjs');
const { decodeSuiPrivateKey } = await import('../packages/move/node_modules/@mysten/sui/dist/cryptography/index.mjs');

const wallets = ['A', 'B', 'C', 'MERCHANTS'];
console.log(`Fides wallets on ${net}`);
for (const w of wallets) {
  const raw = profile.env[`SUI_PRIVATE_KEY_${w}`];
  if (!raw) { console.log(`  ${w.padEnd(9)} no key in .env`); continue; }
  const addr = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(raw).secretKey).toSuiAddress();
  const bal = await getBalances(profile, addr);
  const usdc = Object.entries(bal).find(([t]) => /::usdc::USDC$/i.test(t))?.[1] ?? 0n;
  console.log(`  ${w.padEnd(9)} ${addr.slice(0, 10)}...${addr.slice(-6)}  SUI ${(Number(bal[SUI_TYPE] ?? 0n) / 1e9).toFixed(4)}  USDC ${(Number(usdc) / 1e6).toFixed(2)}`);
  await new Promise((r) => setTimeout(r, 400)); // the free Tatum plan allows 3 requests per second
}
