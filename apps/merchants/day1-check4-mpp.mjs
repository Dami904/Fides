// Day 1 check 4: one end-to-end MPP payment on Sui (merchant + client in one process).
// Usage: node apps/merchants/day1-check4-mpp.mjs [testnet|mainnet]
// Merchant receives at the SUI_PRIVATE_KEY_MERCHANTS address, Agent A (SUI_PRIVATE_KEY_A) pays 0.01 USDC.
// The merchant verifies with the package default fullnode: Tatum's gRPC host cannot be used as
// @suimpp/mpp's rpcUrl (see docs/DAY1.md). Fides verifies the payment through Tatum GraphQL instead.
// Prints PAYMENT_DIGEST for the caller. Never prints key values.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Mppx as MppxServer } from 'mppx/server';
import { Mppx as MppxClient } from 'mppx/client';
import { InMemoryDigestStore, USDC, USDC_TESTNET, sui as suiServer } from '@suimpp/mpp/server';
import { sui as suiClient } from '@suimpp/mpp/client';
import { getProfile } from '../../packages/chain/profile.mjs';

const profile = getProfile(process.argv[2]);
const currency = profile.name === 'mainnet' ? USDC : USDC_TESTNET;
if (currency.type !== profile.usdcType) throw new Error('USDC type in networks.json does not match @suimpp/mpp');

const kp = (v) => Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(v).secretKey);
const merchant = kp(profile.env.SUI_PRIVATE_KEY_MERCHANTS);
const agent = kp(profile.env.SUI_PRIVATE_KEY_A);

const mppx = MppxServer.create({
  methods: [
    suiServer({
      currency,
      recipient: merchant.toSuiAddress(),
      network: profile.suiNetwork,
      store: new InMemoryDigestStore(),
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
console.log(`network ${profile.name}, merchant ${merchant.toSuiAddress()}, payer ${agent.toSuiAddress()}`);

const bare = await fetch(url);
console.log('unpaid request ->', bare.status);

const client = new SuiGrpcClient({ network: profile.suiNetwork, baseUrl: profile.fullnodeUrl });
const paying = MppxClient.create({ methods: [suiClient({ client, signer: agent, currency })], polyfill: false });
const t0 = Date.now();
const res = await paying.fetch(url);
console.log('paid request ->', res.status, `${Date.now() - t0}ms`);
console.log('body', (await res.text()).slice(0, 200));
const receipt = res.headers.get('payment-receipt');
if (receipt) {
  const r = JSON.parse(Buffer.from(receipt, 'base64url').toString());
  console.log('PAYMENT_DIGEST', r.reference);
}
server.close();
process.exit(res.status === 200 ? 0 : 1);
