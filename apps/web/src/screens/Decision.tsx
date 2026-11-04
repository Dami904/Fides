import type { ReactNode } from 'react';
import type { FidesApi } from '../api';
import { Chip, flagOf, Meter, PageHead, Pill, Seal, Stamp, useLoad } from '../components';
import { href, shortAddr, usd } from '../lib';
import type { Attempt, CheckName, Decision as Verdict } from '../types';

export const CHECK_LABEL: Record<CheckName, string> = { schemaValid: 'matches schema', fresh: 'fresh', onTime: 'on time', amountMatchesQuote: 'price as quoted', payToMatchesPinned: 'pay-to as pinned' };
const WORD: Record<Verdict, string> = { PAY: 'pay', PAY_CAPPED: 'pay, capped', ASK: 'ask a person', REFUSE: 'refuse' };

type Tone = 'ok' | 'bad' | 'warn' | 'plain';

/** The verdict and why: what Fides said before any money moved. */
function VerdictCard({ a }: { a: Attempt }) {
  const c = a.check;
  if (!c) return <section className="slip"><p className="muted">No check was recorded for this attempt.</p></section>;
  return (
    <section className={`slip ${flagOf(c.decision)}`} aria-label="Verdict">
      <div className="slip-head">
        <h2>Fides said</h2>
        <div className="right"><Stamp decision={c.decision} big press /></div>
      </div>
      <div className="body">
        <div className="lab">Why</div>
        <div>
          <ul className="reasons">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          <div className="row-pills">
            {c.rules.map((r) => <Pill key={r} title="the rule that decided">rule: {r}</Pill>)}
            <Pill state>tier: {c.tier}</Pill>
            {c.cannotSay && <Pill state tone="warn">cannot say: not enough history</Pill>}
          </div>
        </div>
        <div className="lab">Cites</div>
        <div>{c.evidenceIds.length ? c.evidenceIds.map((id) => <a key={id} href={href.evidence(id)}><Chip id={id} /></a>) : <span className="muted small">no signed records for this merchant</span>}</div>
        <div className="lab">Shared record</div>
        <div className="row-pills">
          <Pill state tone={c.sharedState === 'attached' ? 'ok' : 'warn'}>{c.sharedState}</Pill>
          {c.rejected > 0 && <Pill state tone="bad">{c.rejected} rejected</Pill>}
          {c.pending > 0 && <Pill state tone="warn">{c.pending} pending</Pill>}
        </div>
        <div className="lab">Evidence</div>
        <div className="small muted"><Meter value={c.confidence} /> <span className="gap-l">how much history stands behind it</span></div>
      </div>
    </section>
  );
}

/** What happened, in order, from the 402 challenge to the signed report. */
function Timeline({ a }: { a: Attempt }) {
  const steps: [string, Tone, ReactNode][] = [
    ['402 challenge', 'plain', <>The merchant asked for <b>{usd(a.amount)} USDC</b> to <span className="mono" title={a.recipient}>{shortAddr(a.recipient)}</span>.</>],
  ];
  if (a.check) steps.push(['Fides check', a.check.decision === 'REFUSE' ? 'bad' : a.check.decision === 'ASK' ? 'warn' : 'ok', <>Verdict: <b>{WORD[a.check.decision]}</b>.</>]);
  if (a.asked) steps.push(['Asked a person', a.asked.approved ? 'ok' : 'bad', a.asked.approved ? 'A person approved the payment.' : 'Nobody approved. Nothing was paid.']);
  if (a.skipped) steps.push(['Not paid', 'plain', <>{a.skipped.why}.</>]);
  if (a.paid) steps.push(['Paid', 'ok', <>Payment made <span className="mono tiny muted" title={a.paid.txDigest}>tx …{a.paid.txDigest.slice(-8)}</span></>]);
  if (a.response) {
    const failed = Object.values(a.response.checks).some((ok) => !ok);
    steps.push(['Response checked', failed ? 'bad' : 'ok', (
      <>
        <div className="checks">{(Object.entries(a.response.checks) as [CheckName, boolean][]).map(([k, ok]) => <Pill key={k} state tone={ok ? 'ok' : 'bad'}>{ok ? '✓ ' : '✕ '}{CHECK_LABEL[k]}</Pill>)}</div>
        {a.response.problems.length > 0 && <div className="red small gap-t">{a.response.problems.join('; ')}</div>}
      </>
    )]);
  }
  if (a.reported) steps.push(['Reported', a.reported.verdict === 'burned' ? 'bad' : 'ok', (
    <a className="reported" href={href.evidence(a.reported.evidenceId)}>
      <Seal id={a.reported.evidenceId} size={24} />
      <span>Signed and anchored as <b className={a.reported.verdict === 'burned' ? 'red' : 'green'}>{a.reported.verdict}</b> <span className="mono tiny muted">{a.reported.evidenceId.slice(0, 8)} →</span></span>
    </a>
  )]);
  return (
    <section className="slip" aria-label="What happened">
      <h2>What happened</h2>
      <ol className="timeline">
        {steps.map(([t, tone, body]) => <li key={t} className={tone}><b>{t}</b><div>{body}</div></li>)}
      </ol>
    </section>
  );
}

export function Decision({ api, index }: { api: FidesApi; index: number }) {
  const { data: all, error } = useLoad(() => api.listDecisions(), [api]);
  if (error) return <div className="notice bad">The run could not be loaded: {error}. This is an error, not an empty run.</div>;
  if (!all) return <p className="muted pad">Loading.</p>;
  const a = all[index];
  if (!a) return <div className="notice bad">There is no attempt {index + 1} in this run. <a href={href.feed}>Back to the feed</a>.</div>;
  return (
    <>
      <PageHead crumbs={[['Feed', href.feed], [`Attempt ${index + 1}`]]} title={<>Agent {a.agent} at <a className="title-link" href={href.merchant(a.host)}>{a.host}</a></>}
        aside={
          <div className="pager">
            {index > 0 ? <a className="btn" href={href.decision(index - 1)}>← Previous</a> : <span className="btn" aria-disabled="true">← Previous</span>}
            <span className="mono tiny muted">{index + 1} / {all.length}</span>
            {index < all.length - 1 ? <a className="btn" href={href.decision(index + 1)}>Next →</a> : <span className="btn" aria-disabled="true">Next →</span>}
          </div>}>
        One payment attempt, from the 402 challenge to the signed report.
      </PageHead>
      <main className="two-col" key={index}>
        <VerdictCard a={a} />
        <Timeline a={a} />
      </main>
    </>
  );
}
