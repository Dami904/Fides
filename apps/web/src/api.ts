// The one interface the UI talks to (SPEC section 21). Two implementations: fixtures (recorded from the engine, no network)
// and live (the registry and a demo server). The screens never know which one they have.
import demoJson from '../fixtures/demo.json';
import simJson from '../fixtures/sim.json';
import { attempts, parseSteps } from './lib';
import type { Attempt, DemoFixture, Honesty, MerchantView, SharedState, SimFixture, SplitView, Tier, VerifyStep, EvidenceItem } from './types';

export interface FidesApi {
  mode: 'fixtures' | 'live';
  honesty(): Honesty;
  /** Every attempt an agent made, oldest first. */
  listDecisions(): Promise<Attempt[]>;
  /** A and C on one merchant, and B's verdict with the shared record attached, detached and unreachable. */
  getSplit(): Promise<SplitView>;
  listMerchants(): Promise<string[]>;
  getMerchant(host: string): Promise<MerchantView>;
  /** One record and the merchant it is about. Rejects when no merchant holds it: an unknown id is an error, not an empty page. */
  getEvidence(evidenceId: string): Promise<{ merchant: MerchantView; item: EvidenceItem }>;
  /** The section 8 checks, one step at a time, so a screen can animate them. */
  verifyEvidence(evidenceId: string): AsyncIterable<VerifyStep>;
  getSimulation(): Promise<SimFixture>;
}

const demo = demoJson as unknown as DemoFixture;
const sim = simJson as unknown as SimFixture;
const all = attempts(demo.events);

const capturedSteps = parseSteps(demo.steps[5]!.notes);
const capturedSha = /sha256 ([0-9a-f]{64})/.exec(capturedSteps[1]?.detail ?? '')?.[1];
const forged = (() => {
  const m = /^forged record (\w+): REJECTED, (.*)$/.exec(demo.steps[5]!.notes.find((n) => n.startsWith('forged record')) ?? '');
  return m ? { id: m[1]!, reason: m[2]! } : null;
})();

export function fixturesApi(o: { stepDelayMs?: number } = {}): FidesApi {
  const stepDelay = o.stepDelayMs ?? 380; // the pace of the Re-verify animation
  return {
    mode: 'fixtures',
    honesty: () => ({
      items: [
        { key: 'Data', value: 'recorded demo run', real: false },
        { key: 'Settlement', value: 'simulated', real: false },
        { key: 'Memory', value: 'in-process', real: false },
        { key: 'Engine and signatures', value: 'real', real: true },
      ],
    }),
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
        attached: { check: chk.attached!, loss: 0, says: 'B reads the signed records, verifies each against Sui and Tatum, and sees two independent burns.', next: 'B pays nothing. Nobody has to be asked.' },
        detached: { check: bDetached.check!, loss: 0.01, says: 'B has lost access to the shared record. Nothing was deleted: B simply cannot see it.', next: 'B has no history, so it asks a person. The person approves, B pays 0.01 USDC, and the merchant returns junk.' },
        unreachable: { check: chk.unreachable!, loss: 0, says: 'The shared record cannot be reached. That is not the same as "no reports", and B does not treat it that way.', next: 'B answers from its own history only, and will not pay on its own.' },
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
