// Rule 6 (SPEC section 7), shown once, start to finish: a recalled memory about a DIFFERENT merchant turns a PAY into an ASK.
//
//  1  A pays the steady merchant (good) and the one that will betray (flaky) three times each. All clean.
//  2  B has never met either. It reads the shared record and would pay the steady merchant on its own: PAY.
//  3  Flaky betrays A after its clean streak. A reports the burn, tagged with the pattern it followed (clean_streak).
//  4  B asks about the steady merchant again. Nothing is wrong with it. But B now recalls that another merchant did
//     this exact thing after a clean streak, so it asks a person first, and cites that memory.
//  5  Detached, B never hears about it: it has no history and asks without any warning.
//
// B never pays anything here: it only checks. Thresholds are eased (one clean report is enough to be "established")
// because with the defaults a merchant needs several independent reporters, which a short script cannot give it.
// That is the one thing that is not the shipped setting, and the run says so.
import type { FidesConfig } from '@fides/core';
import type { CheckResult } from '@fides/sdk';
import type { AgentEvent, AskPolicy } from './agent.js';
import { describeBuy, type Expectation } from './demo.js';
import type { Harness } from './harness.js';

export const EASY: Partial<FidesConfig> = {
  tiers: { establishedMinClean: 1, establishedWilsonLb: 0.1, trustedMinClean: 10, trustedWilsonLb: 0.8 },
  reporterWeightSaturation: 1,
  reporterInfluenceCap: 5,
};

export interface Rule6Report {
  mode: string;
  network: string;
  before: CheckResult;
  after: CheckResult;
  detached: CheckResult;
  /** The memories the changed decision cites, with their recall distance from the question. */
  cited: { blobId: string; distance: number; pattern: string; merchantHost: string }[];
  expectations: Expectation[];
  ok: boolean;
  events: AgentEvent[];
}

export async function runRule6(h: Harness, o: { log?: (line: string) => void } = {}): Promise<Rule6Report> {
  const log = o.log ?? ((l: string) => console.log(l));
  const events: AgentEvent[] = [];
  const onEvent = (e: AgentEvent) => events.push(e);
  const yes: AskPolicy = () => true;
  const A = h.makeAgent('A', yes, onEvent, undefined, EASY);
  const B = h.makeAgent('B', () => false, onEvent, undefined, EASY);
  const m = h.merchants;
  const expectations: Expectation[] = [];
  const expect = (label: string, ok: boolean, detail?: string) => {
    expectations.push({ label, ok, ...(detail ? { detail } : {}) });
    log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok || !detail ? '' : ` (${detail})`}`);
  };
  const probe = async () => {
    const st = await m.good.state();
    return { ownerId: 'B', merchantHost: m.good.host, payTo: st.payTo, amount: st.price, asset: 'x', network: 'sui', resource: '/' };
  };
  const line = (c: CheckResult) => `${c.verdict.decision} [${c.verdict.rulesFired.join(', ')}] ${c.verdict.reasons.join('; ')}`;

  log(`Rule 6 on ${h.network} (${h.mode}). Thresholds are eased so a short script can make a merchant "established". B never pays.`);

  log('\n== Step 1: A pays the steady merchant and the one that will betray, three times each');
  await m.flaky.admin('/admin/flaky', { force: 'ok' });
  for (let i = 0; i < 3; i++) {
    for (const n of ['good', 'flaky'] as const) {
      const r = await A.agent.buy(m[n].resource);
      log('  ' + describeBuy(r));
      if (!(r.paid && r.exchange && Object.values(r.exchange.checks).every(Boolean) && r.receipt?.status === 'complete')) expect(`A's payment ${i + 1} to ${n} delivered and was reported`, false, r.error ?? r.reportError ?? '');
    }
  }

  log('\n== Step 2: B, who has never met either merchant, asks about the steady one');
  const before = await B.fides.check(await probe());
  log('  ' + line(before));
  expect('B would pay the steady merchant on its own, from the shared record alone', before.verdict.decision === 'PAY' && before.verdict.rulesFired.includes('tier'), line(before));

  log('\n== Step 3: the other merchant betrays after its clean streak');
  await m.flaky.admin('/admin/flaky', { force: 'junk' });
  const burn = await A.agent.buy(m.flaky.resource);
  log('  ' + describeBuy(burn));
  expect('A is burned by the merchant it had trusted, and reports it', burn.paid && burn.receipt?.status === 'complete' && !Object.values(burn.exchange!.checks).every(Boolean));

  log('\n== Step 4: B asks about the steady merchant again. Nothing has changed about it.');
  const after = await B.fides.check(await probe());
  log('  ' + line(after));
  const v = after.verdict;
  expect('the decision changes from PAY to ASK', v.decision === 'ASK', v.decision);
  expect('rule 6 made it: similar-incident', v.rulesFired.includes('similar-incident'), v.rulesFired.join(', '));
  expect('it cites the recalled memory', v.citations.memoryBlobIds.length >= 1, `${v.citations.memoryBlobIds.length} memories`);
  expect('the reason names the pattern that was recalled', /clean_streak/.test(v.reasons.join(' ')));
  // The distances behind the citation come from the decision itself, not from asking again.
  const cited = after.recalled.map((s) => ({ blobId: s.blobId, distance: s.distance, pattern: s.patterns.join(', '), merchantHost: s.merchantHost }));
  for (const c of cited) log(`  cites memory ${c.blobId.slice(0, 10)} about ${c.merchantHost}, pattern ${c.pattern}, recall distance ${c.distance.toFixed(3)} (limit 0.45)`);
  expect('every cited memory is about the other merchant', cited.length > 0 && cited.every((c) => c.merchantHost !== m.good.host), cited.map((c) => c.merchantHost).join(', '));

  log('\n== Step 5: B detaches the shared record: it cannot see the memory');
  B.fides.setSharedRecord('detached');
  const detached = await B.fides.check(await probe());
  log('  ' + line(detached));
  expect('detached, rule 6 does not fire and no memory is cited', !detached.verdict.rulesFired.includes('similar-incident') && detached.verdict.citations.memoryBlobIds.length === 0);
  B.fides.setSharedRecord('attached');

  const ok = expectations.every((e) => e.ok);
  log(`\n${ok ? 'All expectations met.' : 'SOME EXPECTATIONS FAILED.'}`);
  return { mode: h.mode, network: h.network, before, after, detached, cited, expectations, ok, events };
}
