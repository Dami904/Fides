// The demo (SPEC section 17), scripted against a Harness and self-checking: every step states what it expects.
//
//  1  Agent A, cold start, asks about every merchant, a person approves, A pays each once.
//  2  A pays the flaky merchant again and gets junk. A reports a signed, anchored burn.
//  3  Agent C also gets burned by flaky. Agent B, fresh, has never met flaky: it reads the shared record and refuses. Nothing lost.
//  4  The malicious merchant swaps its payout address and quotes 4x. A and B both refuse (B inherits the pinned address from the record).
//  5  B detaches the shared memory (it loses access; nothing is deleted). B must ask a person, who approves, and B is burned.
//  6  Re-verify a real record step by step, then a forged one is rejected.
//  7  The shared record becomes unreachable: B fails closed (it will not pay), and recovers when the record is back.
//
// Step 3 uses a third reporter because one burn from another agent only caps the payment; refusing takes two
// independent reporters (SPEC section 7, rule 4).
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { signEvidence, verifyEvidenceSteps, type EvidenceBody } from '@fides/evidence';
import { formatMemory } from '@fides/memory';
import type { MerchantName } from '@fides/merchants';
import type { CheckResult } from '@fides/sdk';
import { PayingAgent, type AgentEvent, type BuyResult, type AskPolicy } from './agent.js';
import type { AgentHandle, Harness } from './harness.js';

export interface Expectation {
  label: string;
  ok: boolean;
  detail?: string;
}
export interface StepReport {
  id: number;
  title: string;
  results: BuyResult[];
  /** Checks that were made without buying, such as the same question asked in different states of the shared record. */
  checks: { label: string; check: CheckResult }[];
  notes: string[];
  expectations: Expectation[];
}
export interface DemoReport {
  mode: string;
  network: string;
  steps: StepReport[];
  /** Raw USDC lost to burns, per agent. */
  lost: Record<string, bigint>;
  ok: boolean;
  events: AgentEvent[];
}

const short = (s: string | undefined, n = 8) => (s ? s.slice(0, n) : '-');

/** One line per purchase, plain words. */
export function describeBuy(r: BuyResult): string {
  const who = `${r.agent} -> ${r.host ?? r.url}`;
  if (r.decision === null) return `${who}: ${r.error}`;
  const v = r.check!.verdict;
  const head = `${who}: ${r.decision}${v.cannotSay ? ' (cannot say: not enough history)' : ''} [${v.rulesFired.join(', ')}]`;
  const cites = v.citations.evidenceIds.length ? ` citing ${v.citations.evidenceIds.map((x) => short(x)).join(', ')}` : '';
  const shared = r.check!.sharedState !== 'attached' ? ` (shared record ${r.check!.sharedState})` : '';
  if (!r.paid) return `${head}${cites}${shared}: not paid${r.approved === false ? ' (not approved)' : ''}`;
  const ex = r.exchange!;
  const burned = !Object.values(ex.checks).every(Boolean);
  const asked = r.approved ? ' -> person approves' : '';
  const outcome = burned ? `BURNED (${ex.problems.join('; ')})` : 'delivered as advertised';
  const rep = r.receipt ? ` -> reported ${burned ? 'burn' : 'clean'} ${short(r.receipt.evidenceId)} (${r.receipt.status})` : ` -> NOT reported: ${r.reportError}`;
  return `${head}${cites}${shared}${asked} -> paid -> ${outcome}${rep}`;
}

export async function runDemo(h: Harness, o: { log?: (line: string) => void } = {}): Promise<DemoReport> {
  const log = o.log ?? ((l: string) => console.log(l));
  const events: AgentEvent[] = [];
  const onEvent = (e: AgentEvent) => events.push(e);
  const approve: AskPolicy = () => true;
  const A = h.makeAgent('A', approve, onEvent);
  const B = h.makeAgent('B', approve, onEvent);
  const C = h.makeAgent('C', approve, onEvent);
  const steps: StepReport[] = [];
  const lost: Record<string, bigint> = { A: 0n, B: 0n, C: 0n };
  const m = h.merchants;
  const flaky = (force: string | null) => m.flaky.admin('/admin/flaky', { force });

  const step = async (id: number, title: string, body: (s: StepReport) => Promise<void>) => {
    const s: StepReport = { id, title, results: [], checks: [], notes: [], expectations: [] };
    log(`\n== Step ${id}: ${title}`);
    await body(s);
    for (const r of s.results) log('  ' + describeBuy(r));
    for (const n of s.notes) log('  ' + n);
    for (const e of s.expectations) log(`  [${e.ok ? 'ok' : 'FAIL'}] ${e.label}${e.ok || !e.detail ? '' : ` (${e.detail})`}`);
    steps.push(s);
  };
  const buy = async (s: StepReport, who: AgentHandle, name: MerchantName) => {
    const r = await who.agent.buy(m[name].resource);
    s.results.push(r);
    if (r.paid && r.exchange && !Object.values(r.exchange.checks).every(Boolean)) lost[who.name] = (lost[who.name] ?? 0n) + 10_000n;
    return r;
  };
  const expect = (s: StepReport, label: string, ok: boolean, detail?: string) => s.expectations.push({ label, ok, ...(detail ? { detail } : {}) });
  const decisionOf = (r: BuyResult) => `${r.decision}${r.error && !r.paid ? ` (${r.error})` : ''}`;

  log(`Fides demo on ${h.network} (${h.mode}). Agents: A, B, C. Merchants: good, flaky, malicious.`);

  await step(1, 'Agent A, cold start, meets every merchant', async (s) => {
    await flaky('ok'); // the first flaky call goes fine, which is how a flaky merchant earns trust
    for (const n of ['good', 'flaky', 'malicious'] as const) {
      const r = await buy(s, A, n);
      expect(s, `A asks about ${n} and cannot say yet`, r.decision === 'ASK' && r.check!.verdict.cannotSay, decisionOf(r));
      expect(s, `A pays ${n} once and it delivers`, r.paid && !!r.exchange && Object.values(r.exchange.checks).every(Boolean));
    }
  });

  let aBurn = '';
  await step(2, 'A pays the flaky merchant again and gets junk', async (s) => {
    await flaky('junk');
    const r = await buy(s, A, 'flaky');
    aBurn = r.receipt?.evidenceId ?? '';
    expect(s, 'A is burned and reports a signed burn', r.paid && r.receipt?.status === 'complete' && !Object.values(r.exchange!.checks).every(Boolean));
    expect(s, 'the burn is anchored on Sui and written to the shared record', !!r.receipt?.steps.anchor.txDigest && r.receipt!.steps.memory.ok);
  });

  await step(3, 'C is burned too; B, who has never met flaky, reads the shared record and refuses', async (s) => {
    await flaky('stale');
    const c = await buy(s, C, 'flaky');
    expect(s, 'C is burned by the same merchant', c.paid && !Object.values(c.exchange!.checks).every(Boolean));
    const r = await buy(s, B, 'flaky');
    expect(s, 'B refuses, citing both signed burns', r.decision === 'REFUSE' && r.check!.verdict.citations.evidenceIds.length === 2, decisionOf(r));
    expect(s, 'B pays nothing', !r.paid);
    expect(s, 'A\'s burn is one of the cited records', r.check!.verdict.citations.evidenceIds.includes(aBurn));
  });

  await step(4, 'The malicious merchant swaps its payout address and quotes 4x', async (s) => {
    await m.malicious.admin('/admin/turn-malicious');
    const a = await buy(s, A, 'malicious');
    expect(s, 'A refuses: address changed from the one it paid, price jumped', a.decision === 'REFUSE' && !a.paid, decisionOf(a));
    const b = await buy(s, B, 'malicious');
    expect(s, 'B refuses too, though it never paid this merchant: the pinned address comes from the shared record', b.decision === 'REFUSE' && !b.paid, decisionOf(b));
    expect(s, 'both raised an address alert', a.check!.verdict.alerts.length > 0 && b.check!.verdict.alerts.length > 0);
  });

  await step(5, 'B detaches the shared memory: no access to it, nothing deleted', async (s) => {
    B.fides.setSharedRecord('detached');
    await flaky('junk');
    const r = await buy(s, B, 'flaky');
    expect(s, 'B no longer sees the burns: it can only ask a person', r.check!.sharedState === 'detached' && r.decision === 'ASK', decisionOf(r));
    expect(s, 'B cites no shared records', r.check!.verdict.citations.evidenceIds.length === 0);
    expect(s, 'the person approves and B is burned: the same loss A and C had', r.paid && !Object.values(r.exchange!.checks).every(Boolean));
    s.notes.push('Detaching removes B\'s access to the shared record. Nothing was deleted from it.');
    B.fides.setSharedRecord('attached');
    // B's burn could not reach the shared record while detached. It was kept, and is written now.
    const retried = await B.agent.retryUnreported();
    expect(s, "once attached again, B's held burn is written to the shared record", retried.length === 1 && retried[0]!.reported, retried.map((x) => x.error).join('; '));
  });

  await step(6, 'Re-verify a real record, then reject a forged one', async (s) => {
    const reader = h.sharedReader();
    const host = m.flaky.host;
    const out = await reader.recallForMerchant(host, `Merchant ${host} burned`, { limit: 20 });
    if (out.state !== 'attached' || out.forHost.length === 0) {
      expect(s, 'the shared record has reports to re-verify', false, out.state);
      return;
    }
    const rep = out.forHost[0]!;
    const anchor = await h.chain.findAnchor({ packageId: h.anchorPackageId, evidenceSha256: rep.header.sha256, reporter: rep.header.reporter });
    expect(s, 'the anchor event for the record is found on Sui', !!anchor);
    if (anchor) {
      let allOk = true;
      for await (const st of verifyEvidenceSteps(rep.evidenceBytes, anchor, h.chain, { maxBytes: h.maxEvidenceBytes })) {
        s.notes.push(`re-verify ${st.name.padEnd(13)} ${st.ok ? 'ok  ' : 'FAIL'} ${st.detail}`);
        allOk &&= st.ok;
      }
      expect(s, 'a real record passes every step of the re-verify', allOk);
    }

    // A forged burn: signed by someone else, written into the shared record, never anchored.
    const evil = Ed25519Keypair.generate();
    const st = await m.flaky.state();
    const body: EvidenceBody = {
      schema: 'fides.evidence/v1', issuedAt: new Date().toISOString(),
      reporter: { agentId: 'forger', suiAddress: evil.toSuiAddress() },
      merchant: { host, payTo: st.payTo },
      payment: { txDigest: 'FORGEDTX1', amount: '10000', asset: 'forged', quotedAmount: '10000', network: 'sui' },
      exchange: { requestHash: 'cc'.repeat(32), responseHash: 'dd'.repeat(32), responseBytes: 1, latencyMs: 1 },
      checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
      verdict: 'burned', burnKind: 'junk', finality: { checkpoint: '1', verifiedVia: 'tatum' },
    };
    const forged = await signEvidence(body, evil);
    const probe = { ownerId: 'B', merchantHost: host, payTo: st.payTo, amount: st.price, asset: 'x', network: 'sui', resource: '/' };
    const before = await B.fides.check(probe);
    await h.injectMemory(formatMemory(forged.evidence, []).text);
    const chk = await B.fides.check(probe);
    const rej = chk.rejected.find((x) => x.evidenceId === forged.digest);
    s.notes.push(`forged record ${short(forged.digest)}: ${rej ? `REJECTED, ${rej.reason}` : 'not rejected'}`);
    expect(s, 'the forged record is rejected and shown', !!rej);
    const same = JSON.stringify([...before.verdict.citations.evidenceIds].sort()) === JSON.stringify([...chk.verdict.citations.evidenceIds].sort());
    expect(s, 'it changes nothing: B cites the same signed records and reaches the same decision', same && before.verdict.decision === chk.verdict.decision, `${before.verdict.decision} -> ${chk.verdict.decision}`);
  });

  await step(7, 'The shared record cannot be reached: B fails closed', async (s) => {
    const st = await m.flaky.state();
    const probe = { ownerId: 'B', merchantHost: m.flaky.host, payTo: st.payTo, amount: st.price, asset: 'x', network: 'sui', resource: '/' };
    const before = await B.fides.check(probe);
    s.checks.push({ label: 'attached', check: before });
    expect(s, 'while it is reachable B refuses flaky, citing the signed burns', before.verdict.decision === 'REFUSE' && before.verdict.citations.evidenceIds.length >= 2, before.verdict.decision);
    if (!h.setMemoryDown(true)) {
      s.notes.push('This run uses the real Walrus Memory relayer, which cannot be switched off here: the outage is covered by the simulated demo and the tests.');
      return;
    }
    try {
      const out = await B.fides.check(probe);
      s.checks.push({ label: 'unreachable', check: out });
      s.notes.push(`shared record ${out.sharedState}: ${out.verdict.decision} [${out.verdict.rulesFired.join(', ')}] cites ${out.verdict.citations.evidenceIds.length} record(s)`);
      expect(s, 'B is told the record is unreachable, not that there are no reports', out.sharedState === 'unreachable', out.sharedState);
      expect(s, 'it will not pay: unreachable never softens a decision into a payment', out.verdict.decision !== 'PAY' && out.verdict.decision !== 'PAY_CAPPED', out.verdict.decision);
    } finally {
      h.setMemoryDown(false);
    }
    const after = await B.fides.check(probe);
    s.checks.push({ label: 'recovered', check: after });
    expect(s, 'when the record comes back B refuses again, citing the same burns', after.sharedState === 'attached' && after.verdict.decision === 'REFUSE');
  });

  log('\n== Cost of the burns (USDC)');
  for (const n of ['A', 'B', 'C']) log(`  ${n}: ${(Number(lost[n] ?? 0n) / 1e6).toFixed(2)}`);
  log('  B lost nothing to flaky while attached (step 3), and lost the same as A and C once it detached (step 5).');

  await Promise.all([A, B, C].map(() => undefined));
  const ok = steps.every((s) => s.expectations.every((e) => e.ok));
  log(`\n${ok ? 'All expectations met.' : 'SOME EXPECTATIONS FAILED.'}`);
  return { mode: h.mode, network: h.network, steps, lost, ok, events };
}
