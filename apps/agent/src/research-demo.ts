// The research agent, scripted over five sessions (SPEC section 17's story, told as research).
//
//  1  Agent A researches the question for the first time. It has no history with any source, so Fides asks a person
//     about each one; the person approves; all three deliver.
//  2  A asks the news source for fresh headlines. It returns junk. A pays, throws the junk away, and reports a signed burn.
//  3  Agent C, another session, asks the news source too. Stale this time. A second independent burn.
//     Between sessions 3 and 4, the signal source swaps its payout address and quotes four times the price.
//  4  Agent B, a new session that has never met any of them, researches the same question. It reads the shared record:
//     it uses the price source, refuses the news source (two independent burns) and the signal source (the payout address
//     changed). It loses nothing.
//  5  B loses access to the shared record (detached: nothing is deleted). Same question to the news source: nobody
//     can warn it, so it asks a person, and gets burned. That is what the memory was worth.
import type { AgentEvent, AskPolicy } from './agent.js';
import type { Expectation } from './demo.js';
import type { Harness } from './harness.js';
import { renderBrief, research, type Brief, type Source } from './research.js';

export const QUESTION = 'What is happening with SUI right now, and is it worth acting on?';

export interface ResearchSession {
  id: number;
  title: string;
  agent: string;
  /** What the agent asked. */
  question: string;
  /** Something that changed in the world just before this session, not done by any agent. */
  before?: string;
  brief: Brief;
  expectations: Expectation[];
  notes: string[];
}

export interface ResearchReport {
  generatedAt: string;
  mode: string;
  network: string;
  question: string;
  sessions: ResearchSession[];
  /** USDC lost to burns per agent. */
  lostUsdc: Record<string, string>;
  ok: boolean;
  events: AgentEvent[];
}

export function sourcesOf(h: Harness): Record<'prices' | 'news' | 'signal', Source> {
  const m = h.merchants;
  return {
    prices: { topic: 'prices', label: 'Market prices', resource: m.good.resource },
    news: { topic: 'news', label: 'Headlines', resource: m.flaky.resource },
    signal: { topic: 'signal', label: 'Trading signal', resource: m.malicious.resource },
  };
}

type Expect = (label: string, ok: boolean, detail?: string) => void;

export async function runResearchDemo(h: Harness, o: { log?: (line: string) => void } = {}): Promise<ResearchReport> {
  const log = o.log ?? ((l: string) => console.log(l));
  const events: AgentEvent[] = [];
  const onEvent = (e: AgentEvent) => events.push(e);
  const approve: AskPolicy = () => true;
  const A = h.makeAgent('A', approve, onEvent);
  const B = h.makeAgent('B', approve, onEvent);
  const C = h.makeAgent('C', approve, onEvent);
  const m = h.merchants;
  const src = sourcesOf(h);
  const flaky = (force: string | null) => m.flaky.admin('/admin/flaky', { force });
  const sessions: ResearchSession[] = [];
  const lost: Record<string, number> = { A: 0, B: 0, C: 0 };

  log(`Research agent on ${h.network} (${h.mode}). Agents A, B, C. Three paid sources: prices, headlines, trading signal.`);

  let before: string | undefined;
  const session = async (id: number, title: string, who: typeof A, question: string, sources: Source[], check: (b: Brief, s: ResearchSession, expect: Expect) => void) => {
    log(`\n== Session ${id}: ${title}`);
    const brief = await research(who.agent, question, sources);
    const s: ResearchSession = { id, title, agent: who.name, question, ...(before ? { before } : {}), brief, expectations: [], notes: [] };
    before = undefined;
    const expect: Expect = (label, ok, detail) => {
      s.expectations.push({ label, ok, ...(detail ? { detail } : {}) });
    };
    lost[who.name] = (lost[who.name] ?? 0) + Number(brief.lostUsdc);
    check(brief, s, expect);
    for (const line of renderBrief(brief).split('\n')) log('  ' + line);
    for (const n of s.notes) log('  ' + n);
    for (const e of s.expectations) log(`  [${e.ok ? 'ok' : 'FAIL'}] ${e.label}${e.ok || !e.detail ? '' : ` (${e.detail})`}`);
    sessions.push(s);
  };
  const sec = (b: Brief, topic: string) => b.sections.find((x) => x.topic === topic)!;

  await flaky('ok'); // the first flaky call goes fine: that is how it earns a little trust
  await session(1, 'Agent A researches for the first time', A, QUESTION, [src.prices, src.news, src.signal], (b, _s, expect) => {
    expect('A has no history with any source, so a person is asked about each, and all three deliver', b.usedCount === 3 && b.sections.every((x) => x.decision === 'ASK' && x.approved === true), b.sections.map((x) => `${x.topic}:${x.outcome}`).join(' '));
    expect('every section carries findings from what was delivered', b.sections.every((x) => x.findings.length > 0));
    expect('A reported all three exchanges as signed, anchored records', b.sections.every((x) => !!x.reportedEvidenceId));
  });

  await flaky('junk');
  await session(2, 'A asks the news source for fresh headlines: junk comes back', A, 'Any new headlines on SUI?', [src.news], (b, _s, expect) => {
    const n = sec(b, 'news');
    expect('A pays, the response fails its checks, and the junk is thrown away', n.outcome === 'burned' && n.findings.length === 0, n.outcome);
    expect('the burn is reported as a signed record', !!n.reportedEvidenceId);
  });

  await flaky('stale');
  await session(3, 'Agent C, another session, asks the same source: stale this time', C, 'Any new headlines on SUI?', [src.news], (b, _s, expect) => {
    const n = sec(b, 'news');
    expect('C is burned too: a second independent report', n.outcome === 'burned' && !!n.reportedEvidenceId, n.outcome);
  });

  await m.malicious.admin('/admin/turn-malicious');
  before = 'The signal source swapped its payout address and now quotes four times the price.';
  log(`\n== Between sessions: ${before}`);

  await session(4, 'Agent B, a new session, researches the same question', B, QUESTION, [src.prices, src.news, src.signal], (b, s, expect) => {
    const p = sec(b, 'prices');
    const n = sec(b, 'news');
    const g = sec(b, 'signal');
    expect('B uses the price source (a person is asked: nobody has reported a problem with it)', p.outcome === 'used' && p.decision === 'ASK', `${p.outcome} ${p.decision}`);
    expect('B refuses the news source, citing both burns it never saw happen', n.outcome === 'refused' && n.evidenceIds.length === 2, `${n.outcome} cites ${n.evidenceIds.length}`);
    expect('B refuses the signal source: the payout address changed and the price jumped', g.outcome === 'refused', g.outcome);
    expect('the refused sections are labelled gaps with no content', n.findings.length === 0 && g.findings.length === 0 && n.txDigest === null && g.txDigest === null);
    expect('B lost nothing', b.lostUsdc === '0.00', b.lostUsdc);
    s.notes.push('B has never met these sources. What it knows came from A and C through the shared record.');
  });

  B.fides.setSharedRecord('detached');
  await flaky('junk');
  await session(5, 'B loses access to the shared record and asks the news source again', B, 'Any new headlines on SUI?', [src.news], (b, s, expect) => {
    const n = sec(b, 'news');
    expect('detached, B cannot see the burns: it can only ask a person', n.sharedState === 'detached' && n.decision === 'ASK' && n.evidenceIds.length === 0, `${n.sharedState} ${n.decision}`);
    expect('the person approves and B is burned, as A and C were', n.outcome === 'burned', n.outcome);
    s.notes.push("Detaching removes B's access to the shared record. Nothing was deleted from it.");
  });
  B.fides.setSharedRecord('attached');
  const retried = await B.agent.retryUnreported();
  const written = retried.length === 1 && retried[0]!.reported;
  const last = sessions[sessions.length - 1]!;
  last.expectations.push({ label: "once attached again, B's held burn is written to the shared record", ok: written, ...(written ? {} : { detail: retried.map((x) => x.error).join('; ') }) });
  log(`  [${written ? 'ok' : 'FAIL'}] once attached again, B's held burn is written to the shared record`);

  const ok = sessions.every((s) => s.expectations.every((e) => e.ok));
  log(`\nCost of the burns (USDC): A ${lost.A!.toFixed(2)}, B ${lost.B!.toFixed(2)}, C ${lost.C!.toFixed(2)}. B lost nothing while attached (session 4) and the same as A and C once detached (session 5).`);
  log(ok ? 'All expectations met.' : 'SOME EXPECTATIONS FAILED.');
  return {
    generatedAt: new Date().toISOString(), mode: h.mode, network: h.network, question: QUESTION, sessions,
    lostUsdc: Object.fromEntries(Object.entries(lost).map(([k, v]) => [k, v.toFixed(2)])), ok, events,
  };
}
