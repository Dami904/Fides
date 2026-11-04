// Day 1 mainnet runs (SPEC sections 15 and 24): check 4 (MPP payment) and check 5 (Move anchor) on mainnet.
//
//   node scripts/day1-mainnet.mjs         preflight only. Spends nothing. Says exactly what is missing.
//   node scripts/day1-mainnet.mjs --yes   preflight, then spend: one 0.01 USDC payment, one anchor
//                                         publish and one report. Verifies both through Tatum and writes
//                                         the results into docs/DAY1.md.
//
// Only Agent A needs funds (it pays gas and USDC). The merchants wallet only receives.
// Cross-platform Node. Never prints key values.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getProfile, getBalances, getPayment, tatumGraphql, SUI_TYPE } from '../packages/chain/profile.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const go = process.argv.includes('--yes');
const profile = getProfile('mainnet');

const MIN_SUI = 100_000_000n; // 0.1 SUI covers publish plus two small transactions with margin
const MIN_USDC = 50_000n; // 0.05 USDC, the payment is 0.01
const PAY_RAW = 10_000n;
const fmt = (n, d) => (Number(n) / 10 ** d).toFixed(d === 9 ? 4 : 2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Addresses come from the keys in .env, derived by the child scripts. Read them here from the profile env.
async function addressOf(envName) {
  const { Ed25519Keypair } = await import('../packages/move/node_modules/@mysten/sui/dist/keypairs/ed25519/index.mjs');
  const { decodeSuiPrivateKey } = await import('../packages/move/node_modules/@mysten/sui/dist/cryptography/index.mjs');
  return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(profile.env[envName]).secretKey).toSuiAddress();
}

function run(label, file, args) {
  console.log(`\n== ${label}`);
  const r = spawnSync(process.execPath, [file, ...args], { cwd: root, encoding: 'utf8', env: process.env });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  console.log(out.trimEnd());
  return { ok: r.status === 0, out };
}
const grab = (out, key) => out.match(new RegExp(`^${key} (\\S+)`, 'm'))?.[1];

console.log(`Fides day 1 mainnet runs. ${go ? 'SPENDING MODE (--yes)' : 'Preflight only, nothing is spent'}`);

// ---- preflight
const problems = [];
const agentA = await addressOf('SUI_PRIVATE_KEY_A');
const merchants = await addressOf('SUI_PRIVATE_KEY_MERCHANTS');

try {
  const d = await tatumGraphql(profile, '{ checkpoint { sequenceNumber } }');
  console.log(`Tatum mainnet GraphQL ok, checkpoint ${d.checkpoint.sequenceNumber}`);
} catch (e) {
  problems.push(`Tatum mainnet GraphQL failed: ${e.message}`);
}

try {
  const h = await fetch(`${profile.memwalRelayerUrl}/health`).then((r) => r.json());
  console.log(`Walrus Memory mainnet relayer ok, status ${h.status}`);
} catch (e) {
  problems.push(`Walrus Memory relayer unreachable: ${e.message}`);
}

const bal = await getBalances(profile, agentA);
const sui = bal[SUI_TYPE] ?? 0n;
const usdc = bal[profile.usdcType] ?? 0n;
console.log(`Agent A ${agentA}`);
console.log(`  SUI  ${fmt(sui, 9)}  (needs at least ${fmt(MIN_SUI, 9)})`);
console.log(`  USDC ${fmt(usdc, 6)}  (needs at least ${fmt(MIN_USDC, 6)})`);
if (sui < MIN_SUI) problems.push(`Agent A needs about ${fmt(MIN_SUI - sui, 9)} more SUI on mainnet (send 0.2 SUI to ${agentA})`);
if (usdc < MIN_USDC) problems.push(`Agent A needs about ${fmt(MIN_USDC - usdc, 6)} more Sui mainnet USDC (send 1 USDC to ${agentA})`);

const dry = run('compile the anchor and check the publisher (no spend)', 'packages/move/publish.mjs', ['mainnet', '--dry']);
if (!dry.ok) problems.push('the Move anchor did not compile; see output above');

if (problems.length) {
  console.log('\nNOT READY:');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('\nPreflight OK.');
if (!go) {
  console.log('Run again with --yes to spend: one 0.01 USDC payment, one anchor publish and one report.');
  process.exit(0);
}

// ---- check 4: MPP payment on mainnet
const results = { date: new Date().toISOString().slice(0, 10) };
const pay = run('check 4: MPP payment on mainnet', 'apps/merchants/day1-check4-mpp.mjs', ['mainnet']);
results.paymentDigest = grab(pay.out, 'PAYMENT_DIGEST');
if (!pay.ok || !results.paymentDigest) {
  console.log('\nCheck 4 failed, stopping before check 5. Anything already paid is on chain; see the digest above if any.');
  process.exit(1);
}
await sleep(1500);
let p = null;
for (let i = 0; i < 5 && !p; i++) {
  p = await getPayment(profile, results.paymentDigest);
  if (!p) await sleep(2500);
}
const to = p?.changes.find((c) => c.owner === merchants && c.coinType === profile.usdcType);
const from = p?.changes.find((c) => c.owner === agentA && c.coinType === profile.usdcType);
results.payment = p && {
  sender: p.sender,
  status: p.status,
  checkpoint: p.checkpoint,
  paid: to?.amount?.toString(),
  verified: p.sender === agentA && p.status === 'SUCCESS' && p.checkpoint !== null && (to?.amount ?? 0n) >= PAY_RAW && (from?.amount ?? 0n) <= -PAY_RAW,
};
console.log('Tatum verification of the payment:', JSON.stringify(results.payment));

// ---- check 5: anchor on mainnet
const pub = run('check 5: publish the Move anchor on mainnet', 'packages/move/publish.mjs', ['mainnet']);
results.packageId = grab(pub.out, 'PACKAGE_ID');
results.reportDigest = pub.out.match(/report status success digest (\S+)/)?.[1];
results.publishDigest = pub.out.match(/publish status success digest (\S+)/)?.[1];
if (!pub.ok || !results.packageId || !results.reportDigest) {
  console.log('\nCheck 5 failed; see output above.');
  process.exit(1);
}
let ev = null;
for (let i = 0; i < 6 && !ev; i++) {
  await sleep(2500);
  const d = await tatumGraphql(
    profile,
    `{ events(first: 5, filter: { type: "${results.packageId}::anchor::Report" }) { nodes { transaction { digest } sender { address } contents { json } } } }`,
  );
  ev = d.events.nodes.find((n) => n.transaction.digest === results.reportDigest) ?? null;
}
results.event = ev && { sender: ev.sender.address, senderIsPublisher: ev.sender.address === agentA, merchant: ev.contents.json.merchant, verdict: ev.contents.json.verdict };
console.log('Tatum read-back of the anchor event:', JSON.stringify(results.event));

// ---- write results into docs/DAY1.md
const ok = results.payment?.verified && results.event?.senderIsPublisher;
const md = `
## Mainnet runs (${results.date}, run by scripts/day1-mainnet.mjs)

- Check 4 on mainnet: MPP payment of 0.01 USDC from Agent A to the merchants wallet. Payment digest \`${results.paymentDigest}\`. Verified through Tatum mainnet GraphQL: sender ${results.payment?.sender === agentA ? '= Agent A' : '!= Agent A'}, status ${results.payment?.status}, checkpoint ${results.payment?.checkpoint}, USDC received by the merchants wallet ${results.payment?.paid} raw units. ${results.payment?.verified ? 'All checks passed.' : 'A CHECK FAILED, see output.'}
- Check 5 on mainnet: anchor published, package \`${results.packageId}\` (saved to packages/move/deployments.json), publish tx \`${results.publishDigest}\`, test report tx \`${results.reportDigest}\`. Read back through Tatum mainnet GraphQL: ${results.event ? `event found, sender ${results.event.senderIsPublisher ? '= publisher' : '!= publisher'}, merchant "${results.event.merchant}", verdict ${results.event.verdict}` : 'EVENT NOT FOUND within 15 s, see output'}.
- Overall: ${ok ? 'mainnet checks 4 and 5 passed.' : 'NOT all passed.'}
`;
const docPath = root + 'docs/DAY1.md';
writeFileSync(docPath, (existsSync(docPath) ? readFileSync(docPath, 'utf8').trimEnd() : '') + '\n' + md);
console.log('\n' + (ok ? 'MAINNET CHECKS 4 AND 5 PASSED.' : 'Some checks did not pass.') + ' Results appended to docs/DAY1.md (not committed).');
process.exit(ok ? 0 : 1);
