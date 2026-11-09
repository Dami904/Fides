import { useEffect, useMemo, useRef, useState } from 'react';
import type { FidesApi } from '../api';
import { Chip, Icon, Loading, NextStep, PageHead, Pill, Recalled, Stamp, useLoad } from '../components';
import { href, recallChangedDecision } from '../lib';
import type { BriefSection, ResearchFixture, ResearchSession, SectionOutcome } from '../types';

const OUTCOME: Record<SectionOutcome, { label: string; tone: 'ok' | 'bad' | 'warn'; icon: 'check' | 'cross' | 'shield' }> = {
  used: { label: 'Used', tone: 'ok', icon: 'check' },
  burned: { label: 'Burned', tone: 'bad', icon: 'cross' },
  refused: { label: 'Refused', tone: 'warn', icon: 'shield' },
  declined: { label: 'Not approved', tone: 'warn', icon: 'shield' },
  error: { label: 'Could not be used', tone: 'bad', icon: 'cross' },
};

/** One plain sentence per source, built from what was bought and what Fides decided. Nothing is added that the run did not record. */
function sentence(s: BriefSection): string {
  switch (s.outcome) {
    case 'used': return `${s.findings.join(', ')}.`;
    case 'burned': return `paid ${s.amountUsdc ?? '?'} USDC, and the response failed a check, so nothing from it is used.`;
    case 'refused': return `not bought. ${s.reasons[0] ? `${s.reasons[0][0]!.toUpperCase()}${s.reasons[0].slice(1)}.` : 'Fides refused it.'}`;
    case 'declined': return 'not bought. A person was asked and did not approve.';
    case 'error': return `could not be used. ${s.note}`;
  }
}

/** Where each signed report in the run was written: evidence id to the step (1-based) and agent. */
function writtenAt(data: ResearchFixture): Map<string, { step: number; agent: string }> {
  const m = new Map<string, { step: number; agent: string }>();
  data.sessions.forEach((s, n) => s.brief.sections.forEach((x) => { if (x.reportedEvidenceId) m.set(x.reportedEvidenceId, { step: n + 1, agent: s.agent }); }));
  return m;
}

function Stepper({ sessions, at, onPick, playing, onPlay }: { sessions: ResearchSession[]; at: number; onPick: (n: number) => void; playing: boolean; onPlay: () => void }) {
  return (
    <nav className="steps" aria-label="Research sessions, in order">
      <div className="steps-ctl">
        <button type="button" className="btn small ghost" onClick={() => onPick(at - 1)} disabled={at === 0} aria-label="Previous session"><Icon name="back" size={15} /></button>
        <span className="steps-count mono">{at + 1} / {sessions.length}</span>
        <button type="button" className="btn small ghost" onClick={() => onPick(at + 1)} disabled={at === sessions.length - 1} aria-label="Next session"><Icon name="arrow" size={15} /></button>
        <button type="button" className="btn small" onClick={onPlay} aria-pressed={playing}><Icon name={playing ? 'pause' : 'play'} size={14} />{playing ? 'Pause' : 'Play the story'}</button>
      </div>
      <ol className="steps-track" onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); onPick(at + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onPick(at - 1); }
      }}>
        {sessions.map((s, n) => (
          <li key={s.id} className={`step${n === at ? ' here' : ''}${n < at ? ' past' : ''}`}>
            {s.before && <p className="s-event" role="note"><Icon name="cross" size={12} /><span>{s.before}</span></p>}
            <button type="button" aria-current={n === at ? 'step' : undefined} onClick={() => onPick(n)} title={s.title}>
              <span className="step-dot"><span className="who">{s.agent}</span></span>
              <span className="step-n mono">Step {n + 1}</span>
              <span className="step-t">{s.title}</span>
              <span className="dots" aria-hidden="true">{s.brief.sections.map((x) => <i key={x.topic} className={x.outcome} />)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Details({ s, explorerTx }: { s: BriefSection; explorerTx: FidesApi['explorerTx'] }) {
  return (
    <div className="tile-more">
      {s.outcome === 'used' ? (
        <ul className="findings" aria-label={`What ${s.label.toLowerCase()} delivered`}>{s.findings.map((f) => <li key={f}>{f}</li>)}</ul>
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
      {s.outcome !== 'used' && s.reasons.length > 0 && <ul className="reasons small">{s.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      {(s.memoryBlobIds.length > 0 || (s.recalled?.length ?? 0) > 0) && (
        <div className="src-cites col">
          <span className="lab">Recalled memories of other sources</span>
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
    </div>
  );
}

function Tile({ s, open, onToggle, explorerTx }: { s: BriefSection; open: boolean; onToggle: () => void; explorerTx: FidesApi['explorerTx'] }) {
  const o = OUTCOME[s.outcome];
  const id = `tile-${s.topic}`;
  return (
    <article id={id} className={`src ${s.outcome}${open ? ' open' : ''}`} aria-label={`${s.label}: ${o.label}`}>
      <button type="button" className="tile-head" aria-expanded={open} aria-controls={`${id}-more`} onClick={onToggle}>
        <span className={`tile-icon ${o.tone}`}><Icon name={o.icon} size={17} /></span>
        <span className="tile-name">
          <b>{s.label}</b>
          <span className="mono tiny muted">{s.host ?? 'unknown source'}</span>
        </span>
        <span className="tile-state">
          {s.decision && <Stamp decision={s.decision} />}
          <Pill state tone={o.tone}>{o.label}</Pill>
        </span>
        <span className="tile-caret" aria-hidden="true"><Icon name="arrow" size={14} /></span>
      </button>
      <div id={`${id}-more`} hidden={!open}>{open && <Details s={s} explorerTx={explorerTx} />}</div>
    </article>
  );
}

export function Research({ api }: { api: FidesApi }) {
  const { data, error } = useLoad(() => api.getResearch(), [api]);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const written = useMemo(() => (data ? writtenAt(data) : new Map()), [data]);

  // The story plays one step every few seconds and stops at the end.
  const count = data?.sessions.length ?? 0;
  const first = data ? Math.max(0, data.sessions.findIndex((s) => s.agent === 'B' && s.brief.sections.length > 1)) : 0;
  const at = Math.min(Math.max(picked ?? first, 0), Math.max(count - 1, 0));
  useEffect(() => {
    if (!playing) return;
    if (at >= count - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setPicked(at + 1), 4200);
    return () => clearTimeout(t);
  }, [playing, at, count]);

  if (error) return <div className="notice bad">The research run could not be loaded: {error}. This is an error, not an empty brief.</div>;
  if (!data) return <Loading />;

  const sel = data.sessions[at]!;
  const b = sel.brief;
  const met = data.sessions.every((s) => s.expectations.every((e) => e.ok));
  const pick = (n: number) => { if (n >= 0 && n < count) { setPicked(n); setOpen(new Set()); } };
  const toggle = (topic: string) => setOpen((o) => { const n = new Set(o); if (n.has(topic)) n.delete(topic); else n.add(topic); return n; });
  const reveal = (topic: string) => { setOpen((o) => new Set(o).add(topic)); requestAnimationFrame(() => document.getElementById(`tile-${topic}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })); };

  // What this decision rested on from earlier steps: the signed reports it cited, and where each was written.
  const cited = [...new Set(b.sections.flatMap((x) => x.evidenceIds))].map((id) => ({ id, from: written.get(id) })).filter((c) => c.from && c.from.step < at + 1);
  const fromSteps = [...new Map(cited.map((c) => [c.from!.step, c.from!])).values()].sort((x, y) => x.step - y.step);
  const detached = b.sections.find((x) => x.sharedState && x.sharedState !== 'attached')?.sharedState;
  const lost = b.lostUsdc !== '0.00';

  return (
    <>
      <PageHead title="A research agent that knows which sources to trust">
        Ask a question and the agent buys from paid sources. Fides decides each purchase first, from what other agents reported. The brief shows what each source delivered, or why nothing was bought.
      </PageHead>

      <Stepper sessions={data.sessions} at={at} onPick={pick} playing={playing} onPlay={() => { if (!playing && at >= count - 1) setPicked(0); setPlaying(!playing); }} />

      <div className="rs" ref={top}>
        <section className="panel answer" aria-label={`Brief by agent ${sel.agent}`} aria-live="polite">
          <div className="ask">
            <span className="who big">{sel.agent}</span>
            <div>
              <span className="eyebrow">Agent {sel.agent} asks</span>
              <p className="brief-q">{b.question}</p>
            </div>
          </div>
          <p className="muted small step-title">Step {at + 1}: {sel.title}</p>

          {sel.before && <p className="notice alert small"><b>Before this step: </b>{sel.before}</p>}
          {detached ? (
            <p className="knew warn"><Icon name="unlink" size={16} /><span>The shared record was <b>{detached}</b>, so agent {sel.agent} decided from its own history only. Nobody could warn it.</span></p>
          ) : fromSteps.length > 0 ? (
            <p className="knew"><Icon name="link" size={16} /><span>Agent {sel.agent} rested on {cited.length} signed report{cited.length > 1 ? 's' : ''} written by other agents:{' '}
              {fromSteps.map((f, i) => <span key={f.step}>{i > 0 && (i === fromSteps.length - 1 ? ' and ' : ', ')}<button type="button" className="linkish" onClick={() => pick(f.step - 1)}>agent {f.agent} in step {f.step}</button></span>)}.
              {sel.agent !== 'A' && ' It never met these sources itself.'}</span></p>
          ) : null}

          <div className="reply">
            <span className="eyebrow">The brief</span>
            <ul className="prose">
              {b.sections.map((s) => (
                <li key={s.topic} className={s.outcome}>
                  <button type="button" className={`src-chip ${OUTCOME[s.outcome].tone}`} onClick={() => reveal(s.topic)} title={`${s.label}: ${OUTCOME[s.outcome].label}. Show why.`}>
                    <Icon name={OUTCOME[s.outcome].icon} size={12} />{s.label}
                  </button>{' '}
                  <span>{sentence(s)}</span>
                </li>
              ))}
            </ul>
            <p className="brief-sum">{b.summary}</p>
          </div>

          <div className="ledger" aria-label="This brief in numbers">
            <div><b>{b.usedCount}<small> of {b.sections.length}</small></b><span>sources used</span></div>
            <div><b>{b.spentUsdc}<small> USDC</small></b><span>spent</span></div>
            <div className={lost ? 'bad' : 'ok'}><b>{b.lostUsdc}<small> USDC</small></b><span><i className={`d ${lost ? 'bad' : 'ok'}`} />lost to burns</span></div>
          </div>
          {sel.notes.map((n) => <p key={n} className="muted small">{n}</p>)}
        </section>

        <section className="tiles" aria-label="Sources">
          <div className="section-row"><h2>Sources</h2><span className="muted small">Open one to see why.</span></div>
          {b.sections.map((s) => <Tile key={s.topic} s={s} open={open.has(s.topic)} onToggle={() => toggle(s.topic)} explorerTx={api.explorerTx} />)}
          <details className="notice neutral meaning">
            <summary><strong>What a trust score means here</strong></summary>
            <p>Fides judges whether a source delivered what it promised: the published format, fresh data, the quoted price, the expected payout address. It cannot judge whether the content is true, so the brief says "delivered as advertised", never "correct". The three sources are mock servers we run.</p>
            <p className="muted small">{data.mode === 'live' ? `Recorded on Sui ${data.network} with real USDC and the Walrus Memory relayer.` : 'Recorded on a simulated ledger.'} {met ? `All ${data.sessions.reduce((n, s) => n + s.expectations.length, 0)} expectations of the run were met.` : 'Some expectations of the run were NOT met.'}</p>
          </details>
        </section>
      </div>

      <NextStep to={href.merchants} label="Sources" hint="What the shared record says about each source, and the signed reports behind it." />
    </>
  );
}
