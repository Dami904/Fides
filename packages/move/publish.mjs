// Publish the Fides anchor Move package and emit one test report.
// Usage: node packages/move/publish.mjs [testnet|mainnet]   (default testnet)
// Signs with SUI_PRIVATE_KEY_A from .env. Never prints key values.
// Needs the Sui CLI only to compile: set SUI_CLI to its path (default ~/.tools/sui-cli/bin/sui.exe).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { createHash } from 'node:crypto';

const network = process.argv[2] ?? 'testnet';
if (!['testnet', 'mainnet'].includes(network)) throw new Error('network must be testnet or mainnet');

const env = {};
for (const l of readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const { secretKey } = decodeSuiPrivateKey(env.SUI_PRIVATE_KEY_A);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const sender = keypair.toSuiAddress();

const cli = process.env.SUI_CLI ?? join(homedir(), '.tools', 'sui-cli', 'bin', 'sui.exe');
const pkgDir = fileURLToPath(new URL('.', import.meta.url));
const built = JSON.parse(
  execFileSync(cli, ['move', 'build', '--dump-bytecode-as-base64', '--path', pkgDir], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);

const client = new SuiGrpcClient({
  network,
  baseUrl: network === 'mainnet' ? 'https://fullnode.mainnet.sui.io:443' : 'https://fullnode.testnet.sui.io:443',
});

console.log(`network ${network}, publisher ${sender}`);

const pub = new Transaction();
pub.setSender(sender);
const [upgradeCap] = pub.publish({ modules: built.modules, dependencies: built.dependencies });
pub.transferObjects([upgradeCap], sender);
const pubRes = await client.signAndExecuteTransaction({ transaction: pub, signer: keypair, include: { effects: true } });
const pubTx = pubRes.Transaction ?? pubRes.FailedTransaction;
console.log('publish status', pubTx.status.success ? 'success' : 'FAILED', 'digest', pubTx.digest);
if (!pubTx.status.success) {
  console.log(JSON.stringify(pubTx.status));
  process.exit(1);
}
await client.waitForTransaction({ digest: pubTx.digest });
const pkg = pubTx.effects.changedObjects.find((o) => o.outputState === 'PackageWrite');
if (!pkg) {
  console.log('could not find package id; changed objects:', JSON.stringify(pubTx.effects.changedObjects).slice(0, 600));
  process.exit(1);
}
console.log('PACKAGE_ID', pkg.objectId);

// One test report so check 5 can read an event back through Tatum.
const evidence = createHash('sha256').update('fides day1 check5 test evidence').digest();
const tx = new Transaction();
tx.setSender(sender);
tx.moveCall({
  target: `${pkg.objectId}::anchor::report`,
  arguments: [
    tx.pure.string('check5.test.example'),
    tx.pure.vector('u8', [...evidence]),
    tx.pure.vector('u8', [...Buffer.from('test-pay-tx-digest')]),
    tx.pure.u8(0),
  ],
});
const res = await client.signAndExecuteTransaction({ transaction: tx, signer: keypair, include: { effects: true } });
const rt = res.Transaction ?? res.FailedTransaction;
console.log('report status', rt.status.success ? 'success' : 'FAILED', 'digest', rt.digest);
console.log('EVIDENCE_SHA256', evidence.toString('hex'));
