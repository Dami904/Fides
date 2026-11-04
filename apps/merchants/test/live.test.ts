// Live check: the three merchants over real HTTP with real MPP payments on Sui TESTNET (free test USDC).
// Skipped unless FIDES_LIVE=1. Pays 0.02 testnet USDC from Agent A. Never pays the malicious merchant.
// Run: FIDES_LIVE=1 node node_modules/vitest/vitest.mjs run apps/merchants/test/live.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Mppx as MppxClient } from 'mppx/client';
import { USDC_TESTNET, sui as suiClient } from '@suimpp/mpp/client';
import { chainFromEnv } from '@fides/chain';
import { checkResponse } from '@fides/sdk';
import { MERCHANTS, schemaDoc, walletsFromEnv } from '../src/config.js';
import { mppGate, readChallenge } from '../src/gate.js';
import { Merchant } from '../src/merchant.js';

const env: Record<string, string> = {};
if (process.env.FIDES_LIVE) {
  for (const l of readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]!] = m[2]!.trim();
  }
}

describe.skipIf(!process.env.FIDES_LIVE)('live: mock merchants with real testnet payments', () => {
  it(
    'good delivers, flaky takes the money and returns junk, malicious swaps its address; Tatum confirms the payments',
    async () => {
      const wallets = walletsFromEnv(env);
      const gate = mppGate({ network: 'testnet' });
      const started = await Promise.all(
        (['good', 'flaky', 'malicious'] as const).map(async (n) => {
          const m = new Merchant({ def: MERCHANTS[n], gate, wallets, goodCalls: 0 });
          return { n, m, s: await m.serve(0) };
        }),
      );
      const by = Object.fromEntries(started.map((x) => [x.n, x]));
      try {
        const signer = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(env.SUI_PRIVATE_KEY_A!).secretKey);
        const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'https://fullnode.testnet.sui.io:443' });
        const payer = MppxClient.create({ methods: [suiClient({ client, signer, currency: USDC_TESTNET })], polyfill: false });
        const { reader } = chainFromEnv({ ...env, FIDES_NETWORK: 'testnet' });
        const NOW = () => Date.now();

        // good: paid, on schema, fresh; Tatum confirms the payment went to the merchants wallet
        const g = await payer.fetch(by.good!.s.url + MERCHANTS.good.path);
        expect(g.status).toBe(200);
        const gBody = await g.text();
        expect(checkResponse(schemaDoc(MERCHANTS.good), gBody, NOW())).toMatchObject({ schemaValid: true, fresh: true });
        const gDigest = JSON.parse(Buffer.from(g.headers.get('payment-receipt')!, 'base64url').toString()).reference as string;
        const gPay = await reader.getPayment(gDigest);
        expect(gPay).toMatchObject({ status: 'SUCCESS', sender: signer.toSuiAddress() });
        expect(gPay!.changes.find((c) => c.owner === wallets.main)?.amount).toBe(10_000n);

        // flaky, forced junk: the payment still goes through and the merchant answers with a wrong schema
        await fetch(by.flaky!.s.url + '/admin/flaky', { method: 'POST', body: JSON.stringify({ force: 'junk' }) });
        const f = await payer.fetch(by.flaky!.s.url + MERCHANTS.flaky.path);
        expect(f.status).toBe(200);
        expect(checkResponse(schemaDoc(MERCHANTS.flaky), await f.text(), NOW()).schemaValid).toBe(false);

        // malicious: the 402 before and after the turn (no payment is made to it)
        const before = readChallenge(await fetch(by.malicious!.s.url + MERCHANTS.malicious.path));
        await fetch(by.malicious!.s.url + '/admin/turn-malicious', { method: 'POST' });
        const after = readChallenge(await fetch(by.malicious!.s.url + MERCHANTS.malicious.path));
        console.log('malicious 402 before:', before.amount, before.recipient.slice(0, 10), ' after:', after.amount, after.recipient.slice(0, 10));
        expect(before).toMatchObject({ amount: '0.01', recipient: wallets.main });
        expect(after).toMatchObject({ amount: '0.04', recipient: wallets.attacker });
      } finally {
        await Promise.all(started.map((x) => x.s.close()));
      }
    },
    240_000,
  );
});
