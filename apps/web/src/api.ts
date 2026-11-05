// The one interface the UI talks to (SPEC section 21). Two implementations: fixtures (recorded from the engine, no network)
// and live (the registry and a demo server). The screens never know which one they have.
import demoJson from '../fixtures/demo.json';
import demoMainnetJson from '../fixtures/demo-mainnet.json';
import simJson from '../fixtures/sim.json';
import { attempts, parseSteps } from './lib';
import type { Attempt, CheckResult, DemoFixture, Honesty, MerchantView, SharedState, SimFixture, SplitView, Tier, VerifyStep, EvidenceItem } from './types';

export interface FidesApi {
  mode: 'fixtures' | 'live';
  honesty(): Honesty;
  /** Where to see a payment on a public explorer. Undefined when the run was simulated: there is nothing on chain to show. */
  explorerTx?(digest: string): string;
  /** Every attempt an agent made, oldest first. */
  listDecisions(): Promise<Attempt[]>;
  /** A and C on one merchant, and B's verdict with the shared record attached, detached and unreachable. */
  getSplit(): Promise<SplitView>;
  /**
   * Live only: ask the engine now what B would decide with the shared record in this state, instead of replaying the
   * recorded decision. Rejects when the engine cannot do it (for example it cannot switch the real relayer off).
   */
  probeSplit?(state: SharedState): Promise<{ check: CheckResult; checkedAt: string }>;
  listMerchants(): Promise<string[]>;
  getMerchant(host: string): Promise<MerchantView>;
  /** One record and the merchant it is about. Rejects when no merchant holds it: an unknown id is an error, not an empty page. */
  getEvidence(evidenceId: string): Promise<{ merchant: MerchantView; item: EvidenceItem }>;
  /** The section 8 checks, one step at a time, so a screen can animate them. */
  verifyEvidence(evidenceId: string): AsyncIterable<VerifyStep>;
  getSimulation(): Promise<SimFixture>;
}

export interface ApiSource {
  mode: FidesApi['mode'];
  honesty: Honesty;
  /** Re-verify for real (live). Without it, the checks recorded in the demo are replayed (fixtures). */
  verify?: (evidenceId: string) => AsyncIterable<VerifyStep>;
  /** The slowest the Re-verify animation goes: each step waits at least this long after the one before. */
  stepDelayMs?: number;
  /** Live only: run B's check now with the shared record in the given state. */
  probe?: (state: SharedState) => Promise<{ check: CheckResult; checkedAt: string }>;
}

/**
 * The recordings. `sim` is the demo run on the simulated ledger (the default: no network, used by `pnpm web` and the tests).
 * `mainnet` is a real run on Sui mainnet, recorded from the live server, which is what the hosted site shows. Either way
 * this is a recording: Re-verify replays the recorded checks instead of running them.
 */
export type Recording = 'sim' | 'mainnet';

export function fixturesApi(o: { stepDelayMs?: number; recording?: Recording } = {}): FidesApi {
  const mainnet = o.recording === 'mainnet';
  const demo = (mainnet ? demoMainnetJson : demoJson) as unknown as DemoFixture;
  return apiFrom(demo, simJson as unknown as SimFixture, {
    mode: 'fixtures',
    honesty: {
      items: mainnet
        ? [
            { key: 'Data', value: `recorded run, ${demo.generatedAt.slice(0, 10)}`, real: false },
            { key: 'Settlement', value: 'Sui mainnet, real USDC', real: true },
            { key: 'Memory', value: 'Walrus Memory', real: true },
            { key: 'Re-verify', value: 'replays the recorded checks', real: false },
            { key: 'Simulation board', value: 'simulated settlement', real: false },
            { key: 'Engine and signatures', value: 'real', real: true },
          ]
        : [
            { key: 'Data', value: 'recorded demo run', real: false },
            { key: 'Settlement', value: 'simulated', real: false },
            { key: 'Memory', value: 'in-process', real: false },
            { key: 'Engine and signatures', value: 'real', real: true },
          ],
    },
    ...(o.stepDelayMs !== undefined ? { stepDelayMs: o.stepDelayMs } : {}),
  });
}

/**
 * The live implementation: the demo server (apps/web/server) ran the real engine when it started and verifies records
 * on request. Everything is loaded first, and this throws if the server cannot be reached: the caller shows that as an
 * error, never as fixtures in disguise.
 */
export async function liveApi(base: string, fetchImpl: typeof fetch = fetch): Promise<FidesApi> {
  const get = async <T,>(path: string): Promise<T> => {
    const r = await fetchImpl(base + path);
    if (!r.ok) throw new Error(`${base}${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    return (await r.json()) as T;
  };
  const [info, demo, sim] = await Promise.all([get<{ honesty: Honesty }>('/info'), get<DemoFixture>('/demo'), get<SimFixture>('/sim')]);
  return apiFrom(demo, sim, {
    mode: 'live',
    honesty: info.honesty,
    async probe(state) {
      const r = await fetchImpl(`${base}/probe/${state}`);
      const body = (await r.json().catch(() => ({}))) as { error?: string; check?: CheckResult; checkedAt?: string };
      if (!r.ok || !body.check || !body.checkedAt) throw new Error(body.error ?? `live check failed: HTTP ${r.status}`);
      return { check: body.check, checkedAt: body.checkedAt };
    },
    async *verify(id) {
      const r = await fetchImpl(`${base}/verify/${encodeURIComponent(id)}`);
      if (!r.ok || !r.body) throw new Error(`re-verify failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      // One JSON step per line, sent as each check finishes.
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        buf += dec.decode(value ?? new Uint8Array(), { stream: !done });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) yield JSON.parse(line) as VerifyStep;
        }
        if (done) break;
      }
    },
  });
}

/** Everything the screens need, derived from one demo run and one simulation run. */
export function apiFrom(demo: DemoFixture, sim: SimFixture, src: ApiSource): FidesApi {
  const all = attempts(demo.events);
  const capturedSteps = parseSteps(demo.steps[5]!.notes);
  const capturedSha = /sha256 ([0-9a-f]{64})/.exec(capturedSteps[1]?.detail ?? '')?.[1];
  const forged = (() => {
    const m = /^forged record (\w+): REJECTED, (.*)$/.exec(demo.steps[5]!.notes.find((n) => n.startsWith('forged record')) ?? '');
    return m ? { id: m[1]!, reason: m[2]! } : null;
  })();
  const stepDelay = src.stepDelayMs ?? 380; // the pace of the Re-verify animation
  return {
    mode: src.mode,
    honesty: () => src.honesty,
    ...(demo.mode === 'live' ? { explorerTx: (digest: string) => `https://suiscan.xyz/${encodeURIComponent(demo.network)}/tx/${encodeURIComponent(digest)}` } : {}),
    ...(src.probe ? { probeSplit: src.probe } : {}),
    listDecisions: async () => all,
    listMerchants: async () => [demo.merchants.flaky, demo.merchants.malicious, demo.merchants.good],

    async getSplit() {
      const host = demo.merchants.flaky;
      const aClean = demo.steps[0]!.results.find((r) => r.host === host)!;
      const aBurn = demo.steps[1]!.results[0]!;
      const cBurn = demo.steps[2]!.results[0]!;
      const bDetached = demo.steps[4]!.results[0]!;
      const chk = Object.fromEntries(demo.steps[6]!.checks.map((c) => [c.label, c.check]));
      const states: SplitView['states'] = {
        // B's own check in step 3, before B was ever burned: the record alone made it refuse.
        attached: { check: demo.steps[2]!.results.find((r) => r.agent === 'B')?.check ?? chk.attached!, loss: 0, says: 'B reads the signed records, verifies each against Sui and Tatum, and sees the independent burns.', next: 'B pays nothing. Nobody has to be asked.' },
        detached: { check: bDetached.check!, loss: 0.01, says: 'B has lost access to the shared record. Nothing was deleted: B simply cannot see it.', next: 'B has no history, so it asks a person. The person approves, B pays 0.01 USDC, and the merchant returns junk.' },
        unreachable: { check: chk.unreachable ?? null, loss: 0, says: 'The shared record cannot be reached. That is not the same as "no reports", and B does not treat it that way.', next: 'B answers from its own history only, and will not pay on its own.' },
      };
      return {
        host,
        earlier: [
          { agent: 'A', label: 'Agent A, first visit', result: 'delivered as advertised', ok: true, evidenceId: aClean.receipt!.evidenceId },
          { agent: 'A', label: 'Agent A, second visit: burned', result: `${aBurn.exchange!.problems[0]}.`, ok: false, evidenceId: aBurn.receipt!.evidenceId },
          { agent: 'C', label: 'Agent C: burned', result: `${cBurn.exchange!.problems[0]}.`, ok: false, evidenceId: cBurn.receipt!.evidenceId },
        ],
        states,
        lossOthers: { A: 0.01, C: 0.01 },
      };
    },

    async getMerchant(host) {
      const mine = all.filter((a) => a.host === host);
      const reports: EvidenceItem[] = mine
        .filter((a) => a.reported)
        .map((a) => ({ id: a.reported!.evidenceId, agent: a.agent, verdict: a.reported!.verdict, problems: a.response?.problems ?? [], status: 'verified' as const }));
      // What the whole record says: the latest check made with the record attached, not one made while an agent was cut off.
      const attached = mine.filter((a) => a.check?.sharedState === 'attached').map((a) => a.check!);
      const recovered = host === demo.merchants.flaky ? demo.steps.flatMap((s) => s.checks).filter((c) => c.label === 'recovered').map((c) => ({ decision: c.check.verdict.decision, tier: c.check.verdict.tier as Tier, cannotSay: c.check.verdict.cannotSay })) : [];
      const last = [...attached, ...recovered].pop();
      const evidence = [...reports];
      const isFlaky = host === demo.merchants.flaky;
      if (isFlaky && forged) evidence.push({ id: forged.id, agent: '?', verdict: 'burned', problems: [], status: 'rejected', rejectReason: forged.reason });
      const alert = demo.steps.flatMap((s) => s.results).some((r) => r.host === host && (r.check?.verdict.alerts.length ?? 0) > 0);
      return {
        host,
        tier: last?.tier ?? 'new',
        decision: last?.decision,
        cannotSay: last?.cannotSay ?? true,
        clean: reports.filter((r) => r.verdict === 'clean').length,
        burned: reports.filter((r) => r.verdict === 'burned').length,
        reporters: new Set(reports.map((r) => r.agent)).size,
        rejectedCount: isFlaky && forged ? 1 : 0,
        firstPaidAt: mine[0]?.recipient,
        quotedNow: mine[mine.length - 1]?.recipient,
        addressAlert: alert,
        evidence,
      };
    },

    async getEvidence(id) {
      for (const host of await this.listMerchants()) {
        const merchant = await this.getMerchant(host);
        const item = merchant.evidence.find((e) => e.id === id);
        if (item) return { merchant, item };
      }
      throw new Error(`no record ${id.slice(0, 16)} in the shared record`);
    },

    async *verifyEvidence(id) {
      const wait = () => new Promise((r) => setTimeout(r, stepDelay));
      if (src.verify) {
        let last = Date.now();
        for await (const s of src.verify(id)) {
          const left = stepDelay - (Date.now() - last);
          if (left > 0) await new Promise((r) => setTimeout(r, left));
          last = Date.now();
          yield s;
        }
        return;
      }
      const steps: VerifyStep[] =
        forged && id === forged.id
          ? [capturedSteps[0]!, { name: 'hash', ok: false, detail: 'no anchor event found for this evidence: there is nothing on Sui to compare the hash with' }]
          : capturedSteps.map((s) => ({ ...s, detail: s.name === 'hash' && id !== capturedSha ? `sha256 ${id} matches the Sui anchor` : s.detail }));
      for (const s of steps) {
        await wait();
        yield s;
      }
    },

    getSimulation: async () => sim,
  };
}

export type { SharedState };
