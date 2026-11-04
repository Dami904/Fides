// TESTNET ONLY. Moves free testnet USDC from Agent A to Agents B and C so the live demo rehearsal can run.
// Refuses to run on mainnet. Usage: node packages/move/fund-testnet-agents.mjs [usdc-each, default 3]
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getProfile, getBalances } from '../chain/profile.mjs';

const profile = getProfile('testnet'); // fixed on purpose
const each = BigInt(Math.round(Number(process.argv[2] ?? 3) * 1e6));
const kp = (name) => Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(profile.env[`SUI_PRIVATE_KEY_${name}`]).secretKey);
const a = kp('A');
const targets = ['B', 'C'].map((n) => ({ n, addr: kp(n).toSuiAddress() }));

const client = new SuiGrpcClient({ network: 'testnet', baseUrl: profile.fullnodeUrl });
const tx = new Transaction();
tx.setSender(a.toSuiAddress());
for (const t of targets) tx.transferObjects([coinWithBalance({ type: profile.usdcType, balance: each })], t.addr);
const res = await client.signAndExecuteTransaction({ transaction: tx, signer: a, include: { effects: true } });
const t = res.Transaction ?? res.FailedTransaction;
console.log('transfer', t.status.success ? 'success' : 'FAILED', t.digest);
await client.waitForTransaction({ digest: t.digest });
for (const n of ['A', 'B', 'C']) {
  const b = await getBalances(profile, kp(n).toSuiAddress());
  console.log(n, 'USDC', Number(b[profile.usdcType] ?? 0n) / 1e6, 'SUI', Number(b[Object.keys(b).find((k) => k.endsWith('::sui::SUI'))] ?? 0n) / 1e9);
}
process.exit(t.status.success ? 0 : 1);
