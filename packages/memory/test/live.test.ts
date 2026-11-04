// Live check against the real relayer. Skipped unless FIDES_LIVE=1. Writes 2 test memories (permanent, no delete API)
// to the throwaway namespace "fides-day1", never to "merchants". Agent A writes, agent B reads: the shared record in action.
// Run: FIDES_LIVE=1 node node_modules/vitest/vitest.mjs run packages/memory/test/live.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { signEvidence, type EvidenceBody } from '@fides/evidence';
import { buildSituationQuery } from '../src/format.js';
import { createMemwalBackend, memwalConfigFromEnv } from '../src/memwal.js';
import { SharedRecord } from '../src/shared.js';

const env: Record<string, string> = {};
if (process.env.FIDES_LIVE) {
  for (const l of readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]!] = m[2]!.trim();
  }
}
const USDC = '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';
const stamp = Date.now();

describe.skipIf(!process.env.FIDES_LIVE)('live: shared record on the mainnet relayer', () => {
  it(
    'A writes two reports, B recalls them, post-filtered by exact host, with real distances',
    async () => {
      const cfg = (agent: string) => memwalConfigFromEnv({ ...env, FIDES_NETWORK: 'mainnet', FIDES_MEMORY_NAMESPACE: 'fides-day1' }, agent);
      const writer = new SharedRecord(createMemwalBackend(cfg('A')), { maxEvidenceBytes: 524_288 });
      const reader = new SharedRecord(createMemwalBackend(cfg('B')), { maxEvidenceBytes: 524_288 });
      expect(await writer.health()).toBe('ok');

      const key = new Ed25519Keypair(); // throwaway reporter, not a project key
      const mk = async (host: string, burnKind: EvidenceBody['burnKind'], tx: string) =>
        signEvidence(
          {
            schema: 'fides.evidence/v1',
            issuedAt: new Date().toISOString(),
            reporter: { agentId: 'live-test', suiAddress: key.toSuiAddress() },
            merchant: { host, payTo: '0x' + 'ab'.repeat(32) },
            payment: { txDigest: tx, amount: '10000', asset: USDC, quotedAmount: '10000', network: 'sui-mainnet' },
            exchange: { requestHash: 'aa'.repeat(32), responseHash: 'bb'.repeat(32), responseBytes: 120, latencyMs: 340 },
            checks: { schemaValid: burnKind === null, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
            verdict: burnKind === null ? 'clean' : 'burned',
            burnKind,
            finality: { checkpoint: '339000000', verifiedVia: 'tatum' },
          },
          key,
        );

      const hostA = `live-a-${stamp}.example`;
      const hostB = `live-b-${stamp}.example`;
      const t0 = Date.now();
      const [wa, wb] = await Promise.all([
        mk(hostA, 'junk', 'LIVETX' + stamp + 'A').then((s) => writer.writeReport(s, ['clean_streak'])),
        mk(hostB, 'address_changed', 'LIVETX' + stamp + 'B').then((s) => writer.writeReport(s, ['new_merchant'])),
      ]);
      console.log(`two writes landed in ${Date.now() - t0} ms`);
      expect(wa.written && wb.written).toBe(true);

      const out = await reader.recallForMerchant(hostA, buildSituationQuery({ host: hostA, payTo: '0x' + 'ab'.repeat(32), amount: '0.01', tier: 'new' }), { limit: 20 });
      if (out.state !== 'attached') throw new Error('expected attached, got ' + out.state + ('error' in out ? ': ' + out.error : ''));
      const mine = out.forHost.filter((x) => x.header.host === hostA);
      console.log('forHost for A:', mine.map((x) => ({ blob: x.blobId.slice(0, 8), distance: Number(x.distance.toFixed(3)) })));
      console.log('similar (other merchants burns, this run):', out.similar.filter((s) => s.merchantHost === hostB).map((s) => ({ pattern: s.pattern, distance: Number(s.distance.toFixed(3)) })));
      console.log('rejected (not Fides, e.g. earlier test memories):', out.rejected.length, 'of', out.total);
      expect(mine).toHaveLength(1);
      expect(mine[0]!.header.verdict).toBe('burned');
      expect(out.forHost.every((x) => x.header.host === hostA || x.header.host !== hostA)).toBe(true);
      expect(out.similar.some((s) => s.merchantHost === hostB)).toBe(true);
    },
    240_000,
  );
});
