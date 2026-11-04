// The live side of the UI's FidesApi (SPEC section 12: "two implementations, fixtures and live"). It runs the real
// scripted demo and the simulation once, then serves what they produced, in the same shapes as the recorded fixtures,
// and runs Re-verify for real on request: the record is recalled from the shared record, its anchor is looked up and
// the five checks of SECTION 8 run against the harness's chain (Sui through Tatum in --live mode).
//
// It binds to loopback only, answers GET only, and has no write endpoints: it shows a run, it does not drive one.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { verifyEvidenceSteps, type Anchor } from '@fides/evidence';
import { runDemo, type Harness } from '@fides/agent';
import { runSimulation, type SimConfig } from '@fides/sim';
import type { DemoFixture, Honesty, SimFixture } from '../src/types';

export interface LiveData {
  demo: DemoFixture;
  sim: SimFixture;
  honesty: Honesty;
}

/** bigint becomes a string and bytes are dropped, exactly as for the recorded fixtures. */
const plain = <T,>(v: unknown): T => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x instanceof Uint8Array ? undefined : x))) as T;

export async function buildLiveData(h: Harness, o: { memory: 'fake' | 'live'; sim?: Partial<SimConfig>; log?: (l: string) => void } = { memory: 'fake' }): Promise<LiveData> {
  const startedAt = new Date().toISOString();
  const report = await runDemo(h, { log: o.log ?? (() => undefined) });
  const demo = plain<DemoFixture>({
    generatedAt: startedAt,
    mode: report.mode,
    network: report.network,
    ok: report.ok,
    lost: report.lost,
    merchants: { good: h.merchants.good.host, flaky: h.merchants.flaky.host, malicious: h.merchants.malicious.host },
    steps: report.steps,
    events: report.events,
  });
  const shared = await runSimulation({ ...o.sim, seed: 1, mode: 'shared' });
  const detached = await runSimulation({ ...o.sim, seed: 1, mode: 'detached' });
  const slim = (r: typeof shared) => ({ config: r.config, burns: r.burns, paid: r.paid, refused: r.refused, refusedGood: r.refusedGood, asked: r.asked, lostRaw: r.lostRaw, burnsByMerchant: r.burnsByMerchant, rules: r.rules, events: r.events });
  const sim = plain<SimFixture>({ generatedAt: new Date().toISOString(), seed: 1, shared: slim(shared), detached: slim(detached) });
  const onChain = h.mode === 'live';
  return {
    demo,
    sim,
    honesty: {
      items: [
        { key: 'Data', value: `run at ${startedAt.slice(11, 19)} UTC`, real: true },
        { key: 'Settlement', value: onChain ? `Sui ${h.network}` : 'simulated', real: onChain },
        { key: 'Memory', value: o.memory === 'live' ? 'Walrus Memory' : 'in-process', real: o.memory === 'live' },
        { key: 'Re-verify', value: onChain ? 'runs now, through Tatum' : 'runs now, simulated ledger', real: onChain },
        { key: 'Simulation board', value: 'simulated settlement', real: false },
        { key: 'Engine and signatures', value: 'real', real: true },
      ],
    },
  };
}

class ProbeUnavailable extends Error {}
const PROBE_STATES = ['attached', 'detached', 'unreachable'] as const;
type ProbeState = (typeof PROBE_STATES)[number];

const NO_ANCHOR ='no anchor event found for this evidence: there is nothing on Sui to compare the hash with';

export function liveServer(h: Harness, data: LiveData): Server {
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  /** Find a record in the shared record by its id, or by the first characters of it (the demo shows forged ids short). */
  const findRecord = async (id: string) => {
    const reader = h.sharedReader();
    for (const host of Object.values(data.demo.merchants)) {
      const out = await reader.recallForMerchant(host, `Merchant ${host}`, { limit: 50 });
      if (out.state === 'unreachable') throw new Error(`the shared record is unreachable: ${out.error}`);
      const rep = out.state === 'attached' ? out.forHost.find((r) => r.header.sha256.startsWith(id)) : undefined;
      if (rep) return rep;
    }
    return null;
  };

  const verify = async (id: string, res: ServerResponse) => {
    const rep = await findRecord(id);
    if (!rep) return json(res, 404, { error: `no record ${id.slice(0, 16)} in the shared record` });
    const anchor = await h.chain.findAnchor({ packageId: h.anchorPackageId, evidenceSha256: rep.header.sha256, reporter: rep.header.reporter });
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' });
    // Without an anchor there is nothing to compare the hash with; the format check still runs on the bytes.
    const a: Anchor = anchor ?? { evidenceSha256: '', sender: '', payTxDigest: '', verdict: 'burned' };
    for await (const st of verifyEvidenceSteps(rep.evidenceBytes, a, h.chain, { maxBytes: h.maxEvidenceBytes })) {
      res.write(JSON.stringify(!anchor && st.name === 'hash' ? { ...st, detail: NO_ANCHOR } : st) + '\n');
    }
    res.end();
  };

  // "What would agent B decide about the flaky merchant right now, with the shared record in this state?" One probe agent
  // is reused so what it verified is cached (each verification costs Tatum requests), and probes run one at a time
  // because the unreachable state switches the record off for everyone. It never pays and never reports.
  let probeAgent: ReturnType<Harness['makeAgent']> | null = null;
  let probeQueue: Promise<unknown> = Promise.resolve();
  const probe = (state: ProbeState): Promise<unknown> => {
    const run = async () => {
      probeAgent ??= h.makeAgent('B', () => false);
      const fides = probeAgent.fides;
      const st = await h.merchants.flaky.state();
      const input = { ownerId: 'B', merchantHost: h.merchants.flaky.host, payTo: st.payTo, amount: st.price, asset: 'x', network: 'sui', resource: '/' };
      if (state === 'unreachable' && !h.setMemoryDown(true)) {
        throw new ProbeUnavailable('the shared record cannot be switched off here: this server uses the real Walrus Memory relayer');
      }
      try {
        fides.setSharedRecord(state === 'detached' ? 'detached' : 'attached');
        return { state, checkedAt: new Date().toISOString(), check: plain(await fides.check(input)) };
      } finally {
        fides.setSharedRecord('attached');
        if (state === 'unreachable') h.setMemoryDown(false);
      }
    };
    const next = probeQueue.then(run, run);
    probeQueue = next.catch(() => undefined);
    return next;
  };

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (req.method !== 'GET') return json(res, 405, { error: 'GET only' });
      const path = new URL(req.url ?? '/', 'http://x').pathname;
      if (path === '/api/info') return json(res, 200, { honesty: data.honesty });
      if (path === '/api/demo') return json(res, 200, data.demo);
      if (path === '/api/sim') return json(res, 200, data.sim);
      const pr = /^\/api\/probe\/(attached|detached|unreachable)$/.exec(path);
      if (pr) {
        try {
          return json(res, 200, await probe(pr[1] as ProbeState));
        } catch (e) {
          if (e instanceof ProbeUnavailable) return json(res, 501, { error: e.message });
          throw e;
        }
      }
      const m = /^\/api\/verify\/([0-9a-f]{8,64})$/.exec(path);
      if (m) return await verify(m[1]!, res);
      return json(res, 404, { error: 'not found: the endpoints are /api/info, /api/demo, /api/sim and /api/verify/<evidence id> and /api/probe/<attached|detached|unreachable>' });
    } catch (e) {
      // A failed lookup is an error, never "no record".
      if (!res.headersSent) json(res, 502, { error: (e as Error).message });
      else res.end();
    }
  });
}
