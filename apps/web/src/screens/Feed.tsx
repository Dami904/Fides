import { useEffect, useMemo, useRef, useState } from 'react';
import type { FidesApi } from '../api';
import { Icon, Loading, NextStep, PageHead, Seg, Stamp, useLoad } from '../components';
import { href, usd } from '../lib';
import type { Attempt } from '../types';

const AGENTS = ['All', 'A', 'B', 'C'] as const;
const DECISIONS = ['All', 'Pay', 'Ask', 'Refuse'] as const;

function outcome(a: Attempt): [string, string] {
  if (a.reported?.verdict === 'burned') return ['burned', 'bad'];
  if (a.reported) return ['delivered', 'ok'];
  if (a.paid) return ['paid', 'ok'];
  return ['not paid', 'none'];
}

function Row({ a, n, fresh }: { a: Attempt; n: number; fresh: boolean }) {
  const c = a.check;
  const [what, tone] = outcome(a);
  return (
    <a className={`row${fresh ? ' enter' : ''}`} href={href.decision(n)}>
      <span className="c-n mono">{String(n + 1).padStart(2, '0')}</span>
      <span className="who">{a.agent}</span>
      <span className="c-host mono">{a.host}</span>
      <span className="c-price mono">{usd(a.amount)}</span>
      <span className="c-v">{c && <Stamp decision={c.decision} />}</span>
      <span className="c-why">{c?.reasons[0] ?? a.skipped?.why ?? ''}</span>
      <span className={`c-out ${tone}`}><i />{what}</span>
      <span className="c-go" aria-hidden="true"><Icon name="arrow" size={15} /></span>
    </a>
  );
}

export function Feed({ api }: { api: FidesApi }) {
  const { data: all, error } = useLoad(() => api.listDecisions(), [api]);
  const [agent, setAgent] = useState<(typeof AGENTS)[number]>('All');
  const [decision, setDecision] = useState<(typeof DECISIONS)[number]>('All');
  const [shown, setShown] = useState<number | null>(null); // null: everything; a number: replaying
  const timer = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => clearInterval(timer.current), []);

  const visible = useMemo(() => (all ?? []).filter((a) => (agent === 'All' || a.agent === agent) && (decision === 'All' || (a.check && (decision === 'Pay' ? a.check.decision.startsWith('PAY') : a.check.decision.toLowerCase() === decision.toLowerCase())))), [all, agent, decision]);
  const totals = useMemo(() => {
    const xs = all ?? [];
    return {
      attempts: xs.length,
      paid: xs.filter((a) => a.paid).length,
      asked: xs.filter((a) => a.check?.decision === 'ASK').length,
      refused: xs.filter((a) => a.check?.decision === 'REFUSE').length,
      burned: xs.filter((a) => a.reported?.verdict === 'burned').length,
    };
  }, [all]);

  const stop = () => { clearInterval(timer.current); setShown(null); };
  const replay = () => {
    clearInterval(timer.current);
    setShown(0);
    let n = 0;
    timer.current = setInterval(() => { n++; setShown(n); if (n >= visible.length) { clearInterval(timer.current); setShown(null); } }, 700);
  };
  const list = shown === null ? visible : visible.slice(0, shown);

  return (
    <>
      <PageHead title="Decision feed" aside={<button className="btn" type="button" onClick={replay}><Icon name="replay" size={16} />{shown !== null ? 'Replaying…' : 'Replay the run'}</button>}>
        Every time an agent was about to pay, Fides answered. Open any row for the full reasoning and the records it cites.
      </PageHead>

      {all && (
        <div className="kpis five" aria-label="Totals for the run">
          <div><b>{totals.attempts}</b><span>attempts</span></div>
          <div><b>{totals.paid}</b><span><i className="d ok" />paid</span></div>
          <div><b>{totals.asked}</b><span><i className="d warn" />asked a person</span></div>
          <div><b>{totals.refused}</b><span><i className="d bad" />refused</span></div>
          <div><b>{totals.burned}</b><span><i className="d bad" />burns reported</span></div>
        </div>
      )}

      <div className="toolbar">
        <div className="filter"><span>Agent</span><Seg label="Agent" value={agent} options={AGENTS} onChange={(v) => { stop(); setAgent(v); }} /></div>
        <div className="filter"><span>Verdict</span><Seg label="Verdict" value={decision} options={DECISIONS} onChange={(v) => { stop(); setDecision(v); }} /></div>
        <span className={`live${shown !== null ? ' on' : ''}`}><i /><span>{shown !== null ? 'Replaying' : api.mode === 'live' ? 'This server\'s run' : 'Recorded run'}</span></span>
      </div>

      <div className="table feed-table" aria-live="polite">
        <div className="row head" aria-hidden="true"><span>#</span><span>agent</span><span>merchant</span><span>usdc</span><span>verdict</span><span>why</span><span>outcome</span><span /></div>
        {error && <div className="notice bad">The feed could not be loaded: {error}. This is an error, not an empty feed.</div>}
        {!error && all === null && <Loading />}
        {all !== null && list.length === 0 && <p className="empty">{shown !== null ? 'Starting.' : 'Nothing matches these filters.'}</p>}
        {list.map((a, i) => <Row key={all!.indexOf(a)} a={a} n={all!.indexOf(a)} fresh={shown !== null && i === list.length - 1} />)}
      </div>

      <NextStep to={href.merchants} label="Sources" hint="What all of this adds up to for each source." />
    </>
  );
}
