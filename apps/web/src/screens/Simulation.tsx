import { useEffect, useMemo, useRef, useState } from 'react';
import type { FidesApi } from '../api';
import { PageHead, Pill } from '../components';
import { boardAt, gradeAt, merchantOrder, type CellState, type GradeLine } from '../lib';
import type { SimFixture, SimRun } from '../types';

const TIERS = ['trusted', 'established', 'new', 'burned'] as const;
const rate = (l?: GradeLine) => (!l || !l.graded ? 'nothing to grade' : `${Math.round((100 * l.clean) / l.graded)}% clean`);
const count = (l?: GradeLine) => (!l || !l.graded ? '' : `${l.clean} of ${l.graded}`);

const GLYPH: Record<CellState, string> = { clean: '✓', burn: '✕', asked: '?', refuse: '', none: '' };

function Board({ title, tone, run, merchants, agents, round, prev }: { title: string; tone: 'ok' | 'warn'; run: SimRun; merchants: string[]; agents: string[]; round: number; prev: React.MutableRefObject<Map<string, CellState>> }) {
  const { cells, totals } = useMemo(() => boardAt(run.events, round), [run, round]);
  const kindOf = (m: string) => (m.startsWith('good') ? 'good' : 'bad');
  const label = (m: string) => m.split('.')[0]!.replace('good', 'good ').replace('malicious', 'malic.');
  const flashed = new Set<string>();
  for (const [k, v] of cells) if (prev.current.has(k) && prev.current.get(k) !== v) flashed.add(k);
  useEffect(() => { prev.current = new Map(cells); });
  return (
    <section className={`slip board ${tone === 'ok' ? 'with' : 'without'}`} aria-label={title}>
      <h2><Pill state tone={tone}>{tone === 'ok' ? 'with' : 'without'}</Pill> the shared record</h2>
      <div className="counters">
        <div className="burns"><b>{totals.burns}</b><span>burns</span></div>
        <div><b>{totals.paid}</b><span>paid</span></div>
        <div><b>{totals.refused}</b><span>refused</span></div>
        <div><b>{totals.asked}</b><span>asked</span></div>
      </div>
      <div className="grid">
        <span />
        {merchants.map((m) => <div key={m} className={`colh${kindOf(m) === 'good' ? '' : ' bad'}`} title={m}>{label(m)}</div>)}
        {agents.flatMap((a) => [
          <span key={a} className="rowh">{a}</span>,
          ...merchants.map((m) => {
            const k = `${a}|${m}`; const s = cells.get(k) ?? 'none';
            return <div key={k} className={`cell ${s}${flashed.has(k) ? ' flash' : ''}`} role="img" aria-label={`${a} and ${m}: ${s}`} title={`${a} and ${m}: ${s}`}>{GLYPH[s]}</div>;
          }),
        ])}
      </div>
    </section>
  );
}

export function Simulation({ api }: { api: FidesApi }) {
  const [sim, setSim] = useState<SimFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const withPrev = useRef(new Map<string, CellState>());
  const withoutPrev = useRef(new Map<string, CellState>());

  useEffect(() => { api.getSimulation().then((s) => { setSim(s); setRound(s.shared.config.rounds); }, (e: Error) => setError(e.message)); }, [api]);
  const rounds = sim?.shared.config.rounds ?? 12;
  useEffect(() => {
    if (!playing) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setInterval(() => setRound((r) => { if (r + 1 >= rounds) setPlaying(false); return Math.min(rounds, r + 1); }), reduce ? 120 : 800);
    return () => clearInterval(t);
  }, [playing, rounds]);

  if (error) return <div className="notice bad">The simulation could not be loaded: {error}.</div>;
  if (!sim) return <p className="muted">Loading.</p>;

  const agents = Array.from({ length: sim.shared.config.agents }, (_, i) => `agent${i + 1}`);
  const merchants = merchantOrder(sim.shared.events);
  const a = boardAt(sim.shared.events, round).totals, b = boardAt(sim.detached.events, round).totals;
  const goodRefused = sim.shared.events.filter((e) => e.round <= round && e.kind === 'good' && e.decision === 'REFUSE').length;
  const gWith = gradeAt(sim.shared.events, round), gWithout = gradeAt(sim.detached.events, round);
  const ruleNames =[...new Set([...Object.keys(sim.shared.rules), ...Object.keys(sim.detached.rules)])].sort((x, y) => (sim.shared.rules[y] ?? 0) - (sim.shared.rules[x] ?? 0));

  return (
    <>
      <PageHead title="Simulation board">
        Twenty agents, six merchants, two of them bad. The same world twice: with the shared record and without. Press play and watch where the burns land.
      </PageHead>
      <div className="kpis">
        <div><b className="green">{b.burns - a.burns}<span className="muted"> of {b.burns}</span></b><span>burns avoided so far</span></div>
        <div><b className="green">{b.burns ? `${Math.round((100 * (b.burns - a.burns)) / b.burns)}%` : '0%'}</b><span>fewer burns with the record</span></div>
        <div><b>{goodRefused}</b><span>good merchants refused</span></div>
        <div><b>{round}<span className="muted">/{rounds}</span></b><span>round</span></div>
      </div>
      <div className="controls">
        <button className="btn" type="button" onClick={() => { if (!playing && round >= rounds) setRound(0); setPlaying((p) => !p); }}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={rounds} step={1} value={round} aria-label="Round" onChange={(e) => { setPlaying(false); setRound(Number(e.target.value)); }} />
        <span className={`live${playing ? ' on' : ''}`}><i /><span>{playing ? 'Replaying' : 'Paused'}</span></span>
      </div>
      <div className="boards">
        <Board title="With the shared record" tone="ok" run={sim.shared} merchants={merchants} agents={agents} round={round} prev={withPrev} />
        <Board title="Without the shared record" tone="warn" run={sim.detached} merchants={merchants} agents={agents} round={round} prev={withoutPrev} />
      </div>
      <div className="legend" aria-label="Legend">
        <span><span className="cell clean">{GLYPH.clean}</span>paid, delivered</span>
        <span><span className="cell burn">{GLYPH.burn}</span>paid, burned</span>
        <span><span className="cell refuse" />refused</span>
        <span><span className="cell asked">?</span>asked a person, not paid</span>
        <span><span className="cell" />not visited yet</span>
      </div>
      <details className="slip more-detail" aria-label="Which rule decided">
        <summary><h2>Which rule decided each check</h2><span className="muted small">{ruleNames.length} rules</span></summary>
        <table className="ledger">
          <thead><tr><th>rule</th><th className="num">with the record</th><th className="num">without</th></tr></thead>
          <tbody>{ruleNames.map((r) => <tr key={r}><td>{r}</td><td className="num">{sim.shared.rules[r] ?? 0}</td><td className="num">{sim.detached.rules[r] ?? 0}</td></tr>)}</tbody>
        </table>
      </details>
      <details className="slip more-detail" aria-label="Self-grade">
        <summary><h2>How often Fides was right</h2><span className="muted small">paid without asking: {rate(gWith.auto)} with the record</span></summary>
        <p className="muted small">Every paid attempt's verdict, scored against what the merchant actually returned. Refusals are not graded: nobody learns what would have happened.</p>
        <table className="ledger">
          <thead><tr><th>when Fides said</th><th className="num">with the record</th><th className="num">without</th></tr></thead>
          <tbody>
            <tr><td>pay, without asking</td><td className="num">{rate(gWith.auto)} <span className="muted">{count(gWith.auto)}</span></td><td className="num">{rate(gWithout.auto)} <span className="muted">{count(gWithout.auto)}</span></td></tr>
            {TIERS.filter((t) => gWith.byTier[t] || gWithout.byTier[t]).map((t) => (
              <tr key={t}><td>tier {t}</td><td className="num">{rate(gWith.byTier[t])} <span className="muted">{count(gWith.byTier[t])}</span></td><td className="num">{rate(gWithout.byTier[t])} <span className="muted">{count(gWithout.byTier[t])}</span></td></tr>
            ))}
          </tbody>
        </table>
      </details>
      <footer className="note">Recorded simulation, seed {sim.seed}. Settlement is simulated; the engine, the signed evidence and the checks are real. Over three seeds the totals are 12 burns with the shared record and 44 without.</footer>
    </>
  );
}
