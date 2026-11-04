// Live end-to-end rehearsal. Skipped unless FIDES_LIVE=1.
//
// Chain side: Sui TESTNET through Tatum testnet (free tokens). Agent A reports the real payment from day 1 check 4
// (0.01 testnet USDC, Agent A to the merchants wallet), anchoring on testnet from Agent A's wallet.
// Memory side: the mainnet relayer, throwaway namespace "fides-day1" (the staging relayer has a broken TLS certificate).
// That is a mixed setup for a rehearsal only. Writes 2 permanent memories there: one real report, one forged report.
//
// Run: FIDES_LIVE=1 node node_modules/vitest/vitest.mjs run packages/sdk/test/live.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { signEvidence, type EvidenceBody } from '@fides/evidence';
import { createMemwalBackend, formatMemory, memwalConfigFromEnv } from '@fides/memory';
import { fidesFromEnv } from '../src/env.js';

const raw: Record<string, string> = {};
if (process.env.FIDES_LIVE) {
  for (const l of readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) raw[m[1]!] = m[2]!.trim();
  }
}
const env = {
  ...raw,
  FIDES_NETWORK: 'testnet',
  FIDES_DAILY_CAP_USD: '5',
  FIDES_MEMORY_NAMESPACE: 'fides-day1',
  FIDES_MEMWAL_RELAYER_URL: 'https://relayer.memory.walrus.xyz',
};
const AGENT_A = '0x1e27871ad624952bd034c7bb6b995f927ea494537603dc82b9fef6b537c6f4ec';
const MERCHANTS = '0x6bb4c83392650cbd167bac4140ad7688a798a3c4347b0a21bf2d63a50de7071e';
const USDC_TESTNET = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
const REAL_PAYMENT = 'EyDnQAhoR9Y2z9arkKNuJVpyWHqs53cRGhD2gQNpVyQ7';

describe.skipIf(!process.env.FIDES_LIVE)('live: report then check across two agents, with a forged record', () => {
  it(
    'A reports a real payment (testnet anchor + shared memory); B verifies it against Tatum and caps; B rejects a forged report',
    async () => {
      const host = `live-sdk-${Date.now()}.example`;
      const a = fidesFromEnv(env, 'A', { statePath: ':memory:' });
      const b = fidesFromEnv(env, 'B', { statePath: ':memory:' });
      expect(a.address).toBe(AGENT_A);

      // 1. A reports. Verified through Tatum testnet, signed, anchored on testnet, written to Walrus Memory.
      const t0 = Date.now();
      const receipt = await a.report({
        merchantHost: host,
        payTo: MERCHANTS,
        txDigest: REAL_PAYMENT,
        amount: '10000',
        quotedAmount: '10000',
        asset: USDC_TESTNET,
        requestHash: 'aa'.repeat(32),
        responseHash: 'bb'.repeat(32),
        responseBytes: 120,
        latencyMs: 300,
        checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
      });
      console.log(`report: ${receipt.status} in ${Date.now() - t0} ms`, JSON.stringify(receipt.steps));
      expect(receipt.status).toBe('complete');

      // 2. B, which has never seen this merchant, reads it from the shared record and verifies it independently.
      const t1 = Date.now();
      const r = await b.check({ ownerId: 'B', merchantHost: host, payTo: MERCHANTS, amount: '0.01', asset: USDC_TESTNET, network: 'sui-testnet', resource: '/live' });
      console.log(`B check in ${Date.now() - t1} ms:`, r.verdict.decision, r.verdict.rulesFired, 'rejected', r.rejected.length, 'pending', r.pending);
      expect(r.sharedState).toBe('attached');
      expect(r.pending).toBe(0);
      expect(r.verdict.decision).toBe('PAY_CAPPED');
      expect(r.verdict.citations.evidenceIds).toEqual([receipt.evidenceId]);

      // 3. A forged report, written into the same shared namespace by someone with a delegate key. Never anchored.
      const evil = new Ed25519Keypair();
      const body: EvidenceBody = {
        schema: 'fides.evidence/v1',
        issuedAt: new Date().toISOString(),
        reporter: { agentId: 'forger', suiAddress: evil.toSuiAddress() },
        merchant: { host, payTo: MERCHANTS },
        payment: { txDigest: REAL_PAYMENT, amount: '10000', asset: USDC_TESTNET, quotedAmount: '10000', network: 'sui-testnet' },
        exchange: { requestHash: 'cc'.repeat(32), responseHash: 'dd'.repeat(32), responseBytes: 1, latencyMs: 1 },
        checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
        verdict: 'burned',
        burnKind: 'junk',
        finality: { checkpoint: '400173491', verifiedVia: 'tatum' },
      };
      const sealed = await signEvidence(body, evil);
      const writer = createMemwalBackend(memwalConfigFromEnv(env, 'B'));
      const job = await writer.remember(formatMemory(sealed.evidence, []).text, { idempotencyKey: sealed.digest });
      await writer.waitForRememberJob(job.job_id, { timeoutMs: 120_000 });

      const r2 = await b.check({ ownerId: 'B', merchantHost: host, payTo: MERCHANTS, amount: '0.01', asset: USDC_TESTNET, network: 'sui-testnet', resource: '/live' });
      console.log('after the forgery:', r2.verdict.decision, 'rejected:', JSON.stringify(r2.rejected.map((x) => x.reason)));
      expect(r2.rejected.some((x) => /no anchor event/.test(x.reason))).toBe(true);
      expect(r2.verdict.citations.evidenceIds).toEqual([receipt.evidenceId]); // still only the real one
      expect(b.lookup(host).evidence.map((e) => e.status).sort()).toEqual(['rejected', 'verified']);
    },
    420_000,
  );
});
