// Publish the Fides anchor Move package and emit one test report.
// Usage: node packages/move/publish.mjs [testnet|mainnet] [--dry]
//   --dry  compile and check the bytecode and the publisher, spend nothing.
// Signs with SUI_PRIVATE_KEY_A from .env. Never prints key values.
// The Sui CLI is only used to compile: set SUI_CLI to its path (default ~/.tools/sui-cli/bin/sui.exe).
// On success the package id is saved to packages/move/deployments.json under the network name.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getProfile } from '../chain/profile.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const profile = getProfile(args.find((a) => !a.startsWith('--')));

const { secretKey } = decodeSuiPrivateKey(profile.env.SUI_PRIVATE_KEY_A);
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
console.log(`network ${profile.name}, publisher ${sender}`);
console.log(`built ${built.modules.length} module(s), ${built.dependencies.length} dependencies`);
if (dry) {
  console.log('DRY RUN: nothing published');
  process.exit(0);
}

const client = new SuiGrpcClient({ network: profile.suiNetwork, baseUrl: profile.fullnodeUrl });

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

const depPath = join(pkgDir, 'deployments.json');
const deployments = existsSync(depPath) ? JSON.parse(readFileSync(depPath, 'utf8')) : {};
deployments[profile.name] = { packageId: pkg.objectId, publishDigest: pubTx.digest, publisher: sender };
writeFileSync(depPath, JSON.stringify(deployments, null, 2) + '\n');

// One test report so the event can be read back through Tatum.
const evidence = createHash('sha256').update('fides day1 anchor test evidence').digest();
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
process.exit(rt.status.success ? 0 : 1);
