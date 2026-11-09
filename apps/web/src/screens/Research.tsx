import { useState } from 'react';
import type { FidesApi } from '../api';
import { Chip, Icon, Loading, NextStep, PageHead, Pill, Recalled, Stamp, useLoad } from '../components';
import { href, recallChangedDecision } from '../lib';
import type { BriefSection, ResearchSession, SectionOutcome } from '../types';

const OUTCOME: Record<SectionOutcome, { label: string; tone: 'ok' | 'bad' | 'warn' }> = {
  used: { label: 'Used', tone: 'ok' },
  burned: { label: 'Burned: paid, content thrown away', tone: 'bad' },
  refused: { label: 'Not paid: refused', tone: 'warn' },
  declined: { label: 'Not paid: not approved', tone: 'warn' },
  error: { label: 'Could not be used', tone: 'bad' },
};

function Source({ s, explorerTx }: { s: BriefSection; explorerTx: FidesApi['explorerTx'] }) {
  const o = OUTCOME[s.outcome];
  return (
    <article className={`src ${s.outcome}`} aria-label={`${s.label}: ${o.label}`}>
      <header className="src-head">
        <div>
          <h3>{s.label}</h3>
          <div className="mono tiny muted">{s.host ?? 'unknown source'}</div>
        </div>
        <Pill state tone={o.tone}>{o.label}</Pill>
      </header>

      {s.outcome === 'used' ? (
        <ul className="findings" aria-label={`What ${s.label.toLowerCase()} delivered`}>
          {s.findings.map((f) => <li key={f}>{f}</li>)}
        </ul>
      ) : (
        <div className="gap" role="note">
          <Icon name={s.outcome === 'refused' ? 'shield' : 'cross'} size={16} />
          <span>{s.outcome === 'burned' ? 'Nothing from this source is in the brief.' : 'A gap in the brief: nothing was bought, so nothing is claimed.'}</span>
        </div>
      )}

      <p className="src-note">{s.note}</p>

      <div className="src-why">
        {s.decision && <Stamp decision={s.decision} />}
        {s.tier && <Pill state>tier: {s.tier}</Pill>}
        {s.cannotSay && <Pill state tone="warn">cannot say: not enough history</Pill>}
        {s.sharedState && s.sharedState !== 'attached' && <Pill state tone="warn">shared record {s.sharedState}</Pill>}
        {s.rules.map((r) => <Pill key={r} title="the rule that decided">rule: {r}</Pill>)}
      </div>

      {s.outcome !== 'used' && s.reasons.length > 0 && (
        <ul className="reasons small">{s.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}

      {(s.memoryBlobIds.length > 0 || (s.recalled?.length ?? 0) > 0) && (
        <div className="src-cites">
          <span className="lab">Recalled</span>
          <Recalled memories={s.recalled} ids={s.memoryBlobIds} changed={recallChangedDecision(s.rules, s.tier)} />
        </div>
      )}

      {s.evidenceIds.length > 0 && (
        <div className="src-cites">
          <span className="lab">Relied on {s.evidenceIds.length} signed report{s.evidenceIds.length > 1 ? 's' : ''}</span>
          <span className="row-pills">{s.evidenceIds.map((id) => <a key={id} href={href.evidence(id)} title="Open this record and re-run its checks"><Chip id={id} /></a>)}</span>
        </div>
      )}

      <footer className="src-foot muted tiny">
        {s.amountUsdc && <span>{s.txDigest ? 'paid' : 'quoted'} {s.amountUsdc} USDC</span>}
        {s.txDigest && explorerTx && <a className="ext mono" href={explorerTx(s.txDigest)} target="_blank" rel="noopener noreferrer" title={s.txDigest}>tx …{s.txDigest.slice(-8)} on Sui ↗</a>}
        {s.asOf && <span>as of {s.asOf.slice(11, 19)} UTC</span>}
        {s.reportedEvidenceId && <a className="mono" href={href.evidence(s.reportedEvidenceId)} title="The signed record this agent wrote about the exchange">reported as {s.reportedEvidenceId.slice(0, 8)} →</a>}
      </footer>
    </article>
  );
}

function SessionList({ sessions, selected, onPick }: { sessions: ResearchSession[]; selected: number; onPick: (id: number) => void }) {
  return (
    <nav className="sessions" aria-label="Research sessions">
      <ol>
        {sessions.map((s, n) => (
          <li key={s.id}>
            {s.before && <p className="s-event" role="note"><Icon name="cross" size={13} />{s.before}</p>}
            <button type="button" aria-pressed={s.id === selected} onClick={() => onPick(s.id)}>
              <span className="who" title={`session ${n + 1}, agent ${s.agent}`}>{s.agent}</span>
              <span className="s-body">
                <b>{s.title}</b>
                <span className="dots" aria-hidden="true">
                  {s.brief.sections.map((x) => <i key={x.topic} className={x.outcome} />)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Research({ api }: { api: FidesApi }) {
  const { data, error } = useLoad(() => api.getResearch(), [api]);
  const [picked, setPicked] = useState<number | null>(null);
  if (error) return <div className="notice bad">The research run could not be loaded: {error}. This is an error, not an empty brief.</div>;
  if (!data) return <Loading />;

  const first = data.sessions.find((s) => s.agent === 'B' && s.brief.sections.length > 1) ?? data.sessions[0]!;
  const sel = data.sessions.find((s) => s.id === (picked ?? first.id)) ?? first;
  const b = sel.brief;
  const met = data.sessions.every((s) => s.expectations.every((e) => e.ok));

  return (
    <>
      <PageHead title="A research agent that knows which sources to trust">
        Ask a question and the agent buys from paid sources. Fides decides each purchase first, from what other agents reported. The brief shows what each source delivered, or why nothing was bought.
      </PageHead>

      <div className="rs">
        <SessionList sessions={data.sessions} selected={sel.id} onPick={setPicked} />

        <div className="rs-main">
          <section className="panel brief" aria-label={`Brief by agent ${sel.agent}`}>
            <div className="brief-top">
              <span className="eyebrow">Agent {sel.agent} asks</span>
              <p className="brief-q">{b.question}</p>
              <p className="muted small">{sel.title}</p>
            </div>
            <div className="kpis three" aria-label="This brief in numbers">
              <div><b>{b.usedCount}<small> of {b.sections.length}</small></b><span>sources used</span></div>
              <div><b>{b.spentUsdc}<small> USDC</small></b><span>spent</span></div>
              <div><b className={b.lostUsdc !== '0.00' ? 'red' : ''}>{b.lostUsdc}<small> USDC</small></b><span><i className={`d ${b.lostUsdc !== '0.00' ? 'bad' : 'ok'}`} />lost to burns</span></div>
            </div>
            <p className="brief-sum">{b.summary}</p>
            {sel.before && <p className="notice alert small"><b>Before this session: </b>{sel.before}</p>}
            {sel.notes.map((n) => <p key={n} className="muted small">{n}</p>)}
            <div className="srcs">
              {b.sections.map((s) => <Source key={s.topic} s={s} explorerTx={api.explorerTx} />)}
            </div>
          </section>

          <aside className="notice neutral" aria-label="What this does not judge">
            <strong>What a trust score means here.</strong>
            <p>Fides judges whether a source delivered what it promised: the published format, fresh data, the quoted price, the expected payout address. It cannot judge whether the content is true, so the brief says "delivered as advertised", never "correct". The three sources are mock servers we run.</p>
            <p className="muted small">{data.mode === 'live' ? `Recorded on Sui ${data.network} with real USDC and the Walrus Memory relayer.` : 'Recorded on a simulated ledger.'} {met ? `All ${data.sessions.reduce((n, s) => n + s.expectations.length, 0)} expectations of the run were met.` : 'Some expectations of the run were NOT met.'}</p>
          </aside>
        </div>
      </div>

      <NextStep to={href.merchants} label="Sources" hint="What the shared record says about each source, and the signed reports behind it." />
    </>
  );
}
