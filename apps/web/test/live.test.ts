// The live FidesApi end to end: the real engine runs the demo on the simulated ledger, the live server serves it, and
// the UI's own client reads it back. Re-verify runs the section 8 checks for real against the server's chain.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { simHarness, type Harness } from '@fides/agent';
import { buildLiveData, liveServer, type LiveData } from '../server/live';
import { liveApi, type FidesApi } from '../src/api';

let h: Harness;
let server: Server;
let data: LiveData;
let api: FidesApi;
let base: string;

beforeAll(async () => {
  h = await simHarness();
  data = await buildLiveData(h, { memory: 'fake', sim: { agents: 4, rounds: 2 } });
  server = liveServer(h, data);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  api = await liveApi(base);
}, 120_000);

afterAll(async () => {
  server?.close();
  await h?.close();
});

const collect = async (id: string) => {
  const out = [];
  for await (const s of api.verifyEvidence(id)) out.push(s);
  return out;
};

describe('the live API', () => {
  it('serves the run it made, labelled live', async () => {
    expect(data.demo.ok).toBe(true);
    expect(api.mode).toBe('live');
    expect(api.honesty().items.find((i) => i.key === 'Re-verify')?.value).toMatch(/runs now/);
    expect((await api.listDecisions()).length).toBeGreaterThan(5);
    expect((await api.getSimulation()).shared.config.agents).toBe(4);
  });

  it('re-verifies a real record for real: five checks pass', async () => {
    const m = await api.getMerchant(data.demo.merchants.flaky);
    const real = m.evidence.find((e) => e.status === 'verified')!;
    const steps = await collect(real.id);
    expect(steps.map((s) => s.ok)).toEqual([true, true, true, true, true]);
  }, 30_000);

  it('the forged record fails at the hash: nothing on Sui to compare it with', async () => {
    const m = await api.getMerchant(data.demo.merchants.flaky);
    const forged = m.evidence.find((e) => e.status === 'rejected')!;
    const steps = await collect(forged.id);
    expect(steps.at(-1)).toMatchObject({ name: 'hash', ok: false });
    expect(steps.at(-1)!.detail).toMatch(/no anchor event/);
  }, 30_000);

  it('an unknown id is an error, and so is a bad one', async () => {
    await expect(collect('0'.repeat(64))).rejects.toThrow(/404/);
    expect((await fetch(`${base}/verify/not-hex`)).status).toBe(404);
    expect((await fetch(`${base}/demo`, { method: 'POST' })).status).toBe(405);
  });

  it('an unreachable live API rejects instead of falling back', async () => {
    await expect(liveApi('http://127.0.0.1:9/api')).rejects.toThrow();
  });
});
