import { useEffect, useMemo, useRef, useState } from 'react';
import type { FidesApi } from '../api';
import { Icon, Loading, NextStep, PageHead, Pill } from '../components';
import { boardAt, gradeAt, href, merchantOrder, type CellState, type GradeLine } from '../lib';
import type { SimFixture, SimRun } from '../types';

const TIERS = ['trusted', 'established', 'new', 'burned'] as const;
const rate = (l?: GradeLine) => (!l || !l.graded ? 'nothing to grade' : `${Math.round((100 * l.clean) / l.graded)}% clean`);
const count = (l?: GradeLine) => (!l || !l.graded ? '' : `${l.clean} of ${l.graded}`);

const GLYPH: Record<CellState, string> = { clean: '✓', burn: '✕', asked: '?', refuse: '–', none: '' };

/** Burns so far, round by round, for both runs on one axis. The line stops at the round being shown. */
function BurnChart({ sim, rounds, round }: { sim: SimFixture; rounds: number; round: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(760);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!box.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => { if (e && e.contentRect.width > 0) setW(e.contentRect.width); });
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  const series = useMemo(() => {
    const at = (run: SimRun) => Array.from({ length: rounds + 1 }, (_, r) => boardAt(run.events, r).totals.burns);
    return { with: at(sim.shared), without: at(sim.detached) };
  }, [sim, rounds]);
  const h = 230, m = { t: 14, r: 34, b: 28, l: 34 };
  const top = Math.max(1, ...series.without, ...series.with);
  const yMax = Math.ceil(top / 5) * 5;
  const x = (r: number) => m.l + (r / rounds) * (w - m.l - m.r);
  const y = (v: number) => h - m.b - (v / yMax) * (h - m.t - m.b);
  const path = (vals: number[]) => vals.slice(0, round + 1).map((v, r) => `${r ? 'L' : 'M'}${x(r).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const ticks = [0, yMax / 2, yMax].filter((t) => Number.isInteger(t));
  const pick = (clientX: number, el: Element) => {
    const px = clientX - el.getBoundingClientRect().left;
    setHover(Math.max(0, Math.min(rounds, Math.round(((px - m.l) / (w - m.l - m.r)) * rounds))));
  };
  const hv = hover !== null && hover <= round ? hover : null;

  return (
    <div className="chart" ref={box}>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="sw with" />with the record</span>
        <span><i className="sw without" />without</span>
      </div>
      <svg width={w} height={h} role="img" aria-label={`Burns so far by round. At round ${round}: ${series.with[round]} with the shared record, ${series.without[round]} without.`}
        onMouseMove={(e) => pick(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'base' : 'grid'} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        {Array.from({ length: rounds + 1 }, (_, r) => r).filter((r) => r % 2 === 0).map((r) => <text key={r} x={x(r)} y={h - 8} textAnchor="middle" className="axis">{r}</text>)}
        <path d={path(series.without)} className="line without" />
        <path d={path(series.with)} className="line with" />
        <circle cx={x(round)} cy={y(series.without[round]!)} r="4.5" className="pt without" />
        <circle cx={x(round)} cy={y(series.with[round]!)} r="4.5" className="pt with" />
        <text x={x(round) + 9} y={y(series.without[round]!) + 4} className="end">{series.without[round]}</text>
        <text x={x(round) + 9} y={y(series.with[round]!) + 4} className="end">{series.with[round]}</text>
        {hv !== null && <line x1={x(hv)} x2={x(hv)} y1={m.t} y2={h - m.b} className="cross" />}
      </svg>
      {hv !== null && (
        <div className="chart-tip" style={{ left: Math.min(x(hv) + 10, w - 170), top: 34 }}>
          <b>Round {hv}</b>
          <span><i className="sw with" />with the record<b>{series.with[hv]}</b></span>
          <span><i className="sw without" />without<b>{series.without[hv]}</b></span>
        </div>
      )}
      <details className="as-table">
        <summary>Show as a table</summary>
        <table className="ledger">
          <thead><tr><th>round</th><th className="num">with the record</th><th className="num">without</th></tr></thead>
          <tbody>{series.with.map((v, r) => <tr key={r}><td>{r}</td><td className="num">{v}</td><td className="num">{series.without[r]}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

function Board({ title, tone, run, merchants, agents, round, prev }: { title: string; tone: 'ok' | 'warn'; run: SimRun; merchants: string[]; agents: string[]; round: number; prev: React.MutableRefObject<Map<string, CellState>> }) {
  const { cells, totals } = useMemo(() => boardAt(run.events, round), [run, round]);
  const kindOf = (m: string) => (m.startsWith('good') ? 'good' : 'bad');
  const label = (m: string) => m.split('.')[0]!.replace('good', 'good ').replace('malicious', 'malic.');
  const flashed = new Set<string>();
  for (const [k, v] of cells) if (prev.current.has(k) && prev.current.get(k) !== v) flashed.add(k);
  useEffect(() => { prev.current = new Map(cells); });
  return (
    <section className="panel board" aria-label={title}>
      <div className="panel-head"><h2>{tone === 'ok' ? 'With' : 'Without'} the shared record</h2><Pill state tone={tone}>{tone === 'ok' ? 'attached' : 'detached'}</Pill></div>
      <div className="counters">
        <div className="burns"><b>{totals.burns}</b><span>burns</span></div>
        <div><b>{totals.paid}</b><span>paid</span></div>
        <div><b>{totals.refused}</b><span>refused</span></div>
        <div><b>{totals.asked}</b><span>asked</span></div>
      </div>
      <div className="grid-scroll">
        <div className="grid" style={{ gridTemplateColumns: `46px repeat(${merchants.length}, minmax(0, 1fr))` }}>
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
  if (!sim) return <Loading />;

  const agents = Array.from({ length: sim.shared.config.agents }, (_, i) => `agent${i + 1}`);
  const merchants = merchantOrder(sim.shared.events);
  const a = boardAt(sim.shared.events, round).totals, b = boardAt(sim.detached.events, round).totals;
  const avoided = b.burns - a.burns;
  const goodRefused = sim.shared.events.filter((e) => e.round <= round && e.kind === 'good' && e.decision === 'REFUSE').length;
  const gWith = gradeAt(sim.shared.events, round), gWithout = gradeAt(sim.detached.events, round);
  const ruleNames = [...new Set([...Object.keys(sim.shared.rules), ...Object.keys(sim.detached.rules)])].sort((x, y) => (sim.shared.rules[y] ?? 0) - (sim.shared.rules[x] ?? 0));

  return (
    <>
      <PageHead title="Simulation board">
        Twenty agents, six merchants, two of them bad. The same world twice: with the shared record and without. Press play and watch where the burns land.
      </PageHead>

      <div className="kpis">
        {/* Early on the world with the record can take a burn first. Say that plainly instead of a negative count. */}
        {avoided >= 0
          ? <div><b>{avoided}<small> of {b.burns}</small></b><span>burns avoided so far</span></div>
          : <div><b>{-avoided}</b><span>{-avoided === 1 ? 'more burn' : 'more burns'} with the record so far</span></div>}
        {avoided > 0
          ? <div><b>{Math.round((100 * avoided) / b.burns)}%</b><span>fewer burns with the record</span></div>
          : <div><b>{a.burns}<small> vs {b.burns}</small></b><span>burns with and without the record</span></div>}
        <div><b>{goodRefused}</b><span>times a good merchant was refused</span></div>
        <div><b>{round}<small> / {rounds}</small></b><span>round</span></div>
      </div>

      <section className="panel chart-panel" aria-label="Burns over the rounds">
        <div className="controls">
          <button className="btn primary small" type="button" onClick={() => { if (!playing && round >= rounds) setRound(0); setPlaying((p) => !p); }}><Icon name={playing ? 'pause' : 'play'} size={15} />{playing ? 'Pause' : 'Play'}</button>
          <input type="range" min={0} max={rounds} step={1} value={round} aria-label="Round" onChange={(e) => { setPlaying(false); setRound(Number(e.target.value)); }} />
          <span className={`live${playing ? ' on' : ''}`}><i /><span>{playing ? 'Replaying' : 'Paused'}</span></span>
        </div>
        <div className="panel-head tight"><h2>Burns so far, round by round</h2></div>
        <BurnChart sim={sim} rounds={rounds} round={round} />
      </section>

      <div className="boards">
        <Board title="With the shared record" tone="ok" run={sim.shared} merchants={merchants} agents={agents} round={round} prev={withPrev} />
        <Board title="Without the shared record" tone="warn" run={sim.detached} merchants={merchants} agents={agents} round={round} prev={withoutPrev} />
      </div>
      <div className="legend" aria-label="Legend">
        <span><span className="cell clean">{GLYPH.clean}</span>paid, delivered</span>
        <span><span className="cell burn">{GLYPH.burn}</span>paid, burned</span>
        <span><span className="cell refuse">{GLYPH.refuse}</span>refused</span>
        <span><span className="cell asked">?</span>asked a person, not paid</span>
        <span><span className="cell none" />not visited yet</span>
      </div>

      <details className="panel more" aria-label="Which rule decided">
        <summary><h2>Which rule decided each check</h2><span className="muted small">{ruleNames.length} rules</span></summary>
        <table className="ledger">
          <thead><tr><th>rule</th><th className="num">with the record</th><th className="num">without</th></tr></thead>
          <tbody>{ruleNames.map((r) => <tr key={r}><td>{r}</td><td className="num">{sim.shared.rules[r] ?? 0}</td><td className="num">{sim.detached.rules[r] ?? 0}</td></tr>)}</tbody>
        </table>
      </details>
      <details className="panel more" aria-label="Self-grade">
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
      <p className="note">{api.mode === 'live' ? 'Simulation run when this server started' : 'Recorded simulation'}, seed {sim.seed}. Settlement is simulated; the engine, the signed evidence and the checks are real. Over three seeds (<code>pnpm sim</code>) the totals are 6 burns with the shared record and 44 without, and no good merchant refused.</p>

      <NextStep to={href.home} label="For builders" hint="Two calls around every payment: the SDK, LLM tools and MCP, on the overview page." />
    </>
  );
}
