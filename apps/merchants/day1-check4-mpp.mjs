// Day 1 check 4: one end-to-end MPP payment on Sui (merchant + client in one process).
// Usage: node apps/merchants/day1-check4-mpp.mjs [testnet|mainnet] [server-rpc-url]
// Merchant receives at the SUI_PRIVATE_KEY_MERCHANTS address, Agent A (SUI_PRIVATE_KEY_A) pays 0.01 USDC.
// Optional server-rpc-url is passed to @suimpp/mpp as `rpcUrl` (for example Tatum's gRPC host).
// Never prints key values.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Mppx as MppxServer } from 'mppx/server';
import { Mppx as MppxClient } from 'mppx/client';
import { InMemoryDigestStore, USDC, USDC_TESTNET, sui as suiServer } from '@suimpp/mpp/server';
import { sui as suiClient } from '@suimpp/mpp/client';

const network = process.argv[2] ?? 'testnet';
const rpcUrl = process.argv[3];
if (!['testnet', 'mainnet'].includes(network)) throw new Error('network must be testnet or mainnet');
const currency = network === 'mainnet' ? USDC : USDC_TESTNET;

const env = {};
for (const l of readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const kp = (v) => Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(v).secretKey);
const merchant = kp(env.SUI_PRIVATE_KEY_MERCHANTS);
const agent = kp(env.SUI_PRIVATE_KEY_A);

const mppx = MppxServer.create({
  methods: [
    suiServer({
      currency,
      recipient: merchant.toSuiAddress(),
      network,
      store: new InMemoryDigestStore(),
      ...(rpcUrl ? { rpcUrl } : {}),
    }),
  ],
  realm: 'localhost',
  secretKey: randomBytes(32).toString('hex'),
});

const charge = mppx.sui.charge({ amount: '0.01' });
const server = createServer(async (req, res) => {
  const origin = `http://${req.headers.host}`;
  const result = await charge(new Request(new URL(req.url, origin), { method: req.method, headers: req.headers }));
  const response =
    result.status === 402
      ? result.challenge
      : result.withReceipt(
          Response.json({ schema: 'fides.demo/v1', asOf: new Date().toISOString(), data: { price: 42 } }),
        );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/data/prices`;
console.log(`network ${network}, server rpcUrl ${rpcUrl ?? '(package default)'}`);

const bare = await fetch(url);
console.log('unpaid request ->', bare.status, bare.headers.get('www-authenticate')?.slice(0, 60));

const client = new SuiGrpcClient({
  network,
  baseUrl: network === 'mainnet' ? 'https://fullnode.mainnet.sui.io:443' : 'https://fullnode.testnet.sui.io:443',
});
const paying = MppxClient.create({ methods: [suiClient({ client, signer: agent, currency })], polyfill: false });
const t0 = Date.now();
const res = await paying.fetch(url);
console.log('paid request ->', res.status, `${Date.now() - t0}ms`);
console.log('body', (await res.text()).slice(0, 200));
const receipt = res.headers.get('payment-receipt');
if (receipt) console.log('receipt', Buffer.from(receipt, 'base64url').toString().slice(0, 300));
server.close();
process.exit(res.status === 200 ? 0 : 1);
