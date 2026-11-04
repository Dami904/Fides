// Live read-only check against Tatum testnet. Skipped unless FIDES_LIVE=1. Spends and writes nothing.
// Run: FIDES_LIVE=1 node node_modules/vitest/vitest.mjs run packages/chain/test/live.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anchorPackageId, chainFromEnv } from '../src/network.js';

const env: Record<string, string> = {};
if (process.env.FIDES_LIVE) {
  for (const l of readFileSync(new URL('../../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]!] = m[2]!.trim();
  }
}
const AGENT_A = '0x1e27871ad624952bd034c7bb6b995f927ea494537603dc82b9fef6b537c6f4ec';
const MERCHANTS = '0x6bb4c83392650cbd167bac4140ad7688a798a3c4347b0a21bf2d63a50de7071e';
const USDC_TESTNET = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';

describe.skipIf(!process.env.FIDES_LIVE)('live: Tatum testnet reads', () => {
  // The describe body runs even when skipped, so build the client only when the live run is on.
  const { reader } = process.env.FIDES_LIVE ? chainFromEnv({ ...env, FIDES_NETWORK: 'testnet' }) : ({} as ReturnType<typeof chainFromEnv>);

  it('reads the check 4 payment: final, sender is Agent A, 0.01 USDC to the merchants wallet', async () => {
    const p = await reader.getPayment('EyDnQAhoR9Y2z9arkKNuJVpyWHqs53cRGhD2gQNpVyQ7');
    expect(p).not.toBeNull();
    expect(p!.status).toBe('SUCCESS');
    expect(p!.checkpoint).not.toBeNull();
    expect(p!.sender.toLowerCase()).toBe(AGENT_A);
    const got = p!.changes.find((c) => c.owner?.toLowerCase() === MERCHANTS && c.coinType === USDC_TESTNET);
    expect(got?.amount).toBe(10_000n);
  });

  it('a well formed digest that does not exist is null; a malformed one is a loud error, not null', async () => {
    expect(await reader.getPayment('11111111111111111111111111111111')).toBeNull(); // base58 of 32 zero bytes
    await expect(reader.getPayment('1111111111111111111111111111111111111111111')).rejects.toThrow(/Expected digest to be 32B/);
  });

  it('lists anchor events (newest first paging with last/before) and decodes them', async () => {
    const r = await reader.listAnchors({ packageId: anchorPackageId('testnet'), pageSize: 5 });
    expect(r.anchors.length).toBeGreaterThan(0);
    const a = r.anchors.find((x) => x.eventTxDigest === 'FPK8RHuG1y6AbWnwUTSYymV6M98WT8HLpRkNUBBdoWho');
    expect(a).toMatchObject({ evidenceSha256: 'cd33dc9135f3e7a4e804463224afe8164e3e6dfc326f5bb25e40f0e285e5d5d3', verdict: 'clean', merchant: 'check5.test.example', payTxDigest: 'test-pay-tx-digest' });
    expect(a!.sender.toLowerCase()).toBe(AGENT_A);
  });

  it('finds an anchor by evidence digest, filtered by reporter', async () => {
    const a = await reader.findAnchor({ packageId: anchorPackageId('testnet'), evidenceSha256: 'cd33dc9135f3e7a4e804463224afe8164e3e6dfc326f5bb25e40f0e285e5d5d3', reporter: AGENT_A });
    expect(a?.eventTxDigest).toBe('FPK8RHuG1y6AbWnwUTSYymV6M98WT8HLpRkNUBBdoWho');
    expect(await reader.findAnchor({ packageId: anchorPackageId('testnet'), evidenceSha256: 'ab'.repeat(32), reporter: AGENT_A })).toBeNull();
  });

  it('reads balances and the latest checkpoint', async () => {
    const b = await reader.getBalances(AGENT_A);
    expect(b[USDC_TESTNET]).toBeGreaterThan(0n);
    expect(await reader.latestCheckpoint()).toBeGreaterThan(400_000_000);
  });
});
