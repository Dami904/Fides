import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FidesApi } from './api';
import { glyphCells, href, short, type Route } from './lib';
import type { Decision, VerifyStep } from './types';

// ---------- hash seal: a hexagon with a glyph drawn from the hash ----------
export type SealStatus = 'verified' | 'rejected' | 'pending';

export function Seal({ id, status = 'verified', size = 30 }: { id: string; status?: SealStatus; size?: number }) {
  const col = status === 'rejected' ? 'var(--red)' : status === 'pending' ? 'var(--ochre)' : 'var(--green)';
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return `${(20 + Math.cos(a) * 18).toFixed(2)},${(20 + Math.sin(a) * 18).toFixed(2)}`;
  }).join(' ');
  return (
    <span className="seal" role="img" aria-label={`${status} record ${short(id)}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <polygon points={hex} fill={`color-mix(in srgb, ${col} 12%, var(--surface))`} stroke={col} strokeWidth="1.8" strokeDasharray={status === 'pending' ? '3 2.5' : undefined} />
        <g fill={col}>{glyphCells(id || '0000000000000000').map(([c, r]) => <rect key={`${c}${r}`} x={9.2 + c * 4.3} y={9.2 + r * 4.3} width="3.5" height="3.5" />)}</g>
        {status === 'rejected' && <path d="M5 35 L35 5" stroke="var(--red)" strokeWidth="2.6" strokeLinecap="square" />}
      </svg>
    </span>
  );
}

export function Chip({ id, status = 'verified' }: { id: string; status?: SealStatus }) {
  return (
    <span className={`chip${status === 'rejected' ? ' rejected' : ''}`} title={id}>
      <Seal id={id} status={status} size={22} />
      {short(id)}
    </span>
  );
}

// ---------- verdict badge ----------
const STAMP: Record<Decision, [string, string]> = { PAY: ['pay', 'Pay'], PAY_CAPPED: ['capped', 'Pay, capped'], ASK: ['ask', 'Ask'], REFUSE: ['refuse', 'Refuse'] };
export const flagOf = (d: Decision) => (d === 'REFUSE' ? 'flag-red' : d === 'ASK' ? 'flag-ochre' : 'flag-green');

export function Stamp({ decision, big, sub, press }: { decision: Decision; big?: boolean; sub?: string; press?: boolean }) {
  const [cls, label] = STAMP[decision];
  return (
    <span key={decision} className={`stamp ${cls}${big ? ' big' : ''}${press ? ' press' : ''}`} role="img" aria-label={`verdict: ${label}`}>
      {label}
      {sub && <small>{sub}</small>}
    </span>
  );
}

export function Meter({ value }: { value: number }) {
  const on = Math.round(Math.max(0, Math.min(1, value)) * 10);
  return (
    <span className="meter" role="img" aria-label={`evidence behind it: ${Math.round(value * 100)} percent`}>
      {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}
    </span>
  );
}

export function Pill({ tone, state, title, children }: { tone?: 'ok' | 'bad' | 'warn'; state?: boolean; title?: string; children: ReactNode }) {
  return <span className={`pill${state ? ' state' : ''}${tone ? ` ${tone}` : ''}`} title={title}>{children}</span>;
}

// ---------- page shell ----------
const NAV: [string, string, Route['name'][]][] = [
  [href.feed, 'Feed', ['feed', 'decision']],
  [href.split, 'A / B', ['split']],
  [href.merchants, 'Merchants', ['merchants', 'merchant', 'evidence']],
  [href.simulation, 'Simulation', ['simulation']],
];

/** Load once per key. A failure is kept as an error to show, never turned into an empty result. */
export function useLoad<T>(load: () => Promise<T>, key: unknown[]): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    let live = true;
    setState({ data: null, error: null });
    load().then((data) => live && setState({ data, error: null }), (e: Error) => live && setState({ data: null, error: e.message }));
    return () => { live = false; };
  }, key);
  return state;
}

export function Crumbs({ trail }: { trail: [string, string?][] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {trail.map(([label, to], i) => (
        <span key={label}>{to ? <a href={to}>{label}</a> : <span aria-current="page">{label}</span>}{i < trail.length - 1 && <span className="sep" aria-hidden="true">/</span>}</span>
      ))}
    </nav>
  );
}

function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('fides-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function Shell({ api, route, children }: { api: FidesApi; route: Route; children: ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = () => {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    try {
      localStorage.setItem('fides-theme', t); // only a choice made by the person is saved
    } catch { /* private window */ }
  };
  const honesty = api.honesty();
  const allReal = honesty.items.every((i) => i.real);
  return (
    <>
      <header className="top">
        <div className="top-in">
          <a className="brand" href={href.home} aria-current={route.name === 'home' ? 'page' : undefined}>
            <Seal id="fides1234567890ab" size={26} />
            <span>Fides</span>
          </a>
          <nav className="nav" aria-label="Screens">
            {NAV.map(([to, label, names]) => <a key={to} href={to} aria-current={names.includes(route.name) ? 'page' : undefined}>{label}</a>)}
          </nav>
          <details className="honesty">
            <summary><span className={`dot${allReal ? ' real' : ''}`} />{api.mode === 'fixtures' ? 'Recorded run' : 'Live'}</summary>
            <div className="pop" role="note" aria-label="What is real on this screen">
              <div className="lead">What is real here</div>
              {honesty.items.map((i) => <div key={i.key} className="row"><span className={`dot${i.real ? ' real' : ''}`} />{i.key}<b>{i.value}</b></div>)}
            </div>
          </details>
          <button className="theme" type="button" onClick={toggle} aria-label="Switch between the dark and light themes">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        </div>
      </header>
      <div className="frame">{children}</div>
      <footer className="site">
        <div className="frame">
          <div className="about">
            <a className="brand" href={href.home}><Seal id="fides1234567890ab" size={22} /><span>Fides</span></a>
            <p className="muted">A credit bureau for machine payments on Sui. Evidence anchored on Sui, read through Tatum, remembered in Walrus Memory.</p>
          </div>
          <div><h4>Explore</h4><a href={href.split}>A / B split</a><a href={href.feed}>Decision feed</a><a href={href.merchants}>Merchants</a><a href={href.simulation}>Simulation</a></div>
          <div><h4>Under the hood</h4><span>Seven decision rules</span><span>Five checks per record</span><span>SDK, LLM tools, MCP</span></div>
        </div>
      </footer>
    </>
  );
}

export function PageHead({ title, children, aside, crumbs }: { title: ReactNode; children?: ReactNode; aside?: ReactNode; crumbs?: [string, string?][] }) {
  return (
    <div className="page-head">
      <div>{crumbs && <Crumbs trail={crumbs} />}<h1>{title}</h1>{children && <p>{children}</p>}</div>
      {aside}
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label, radio }: { value: T; options: readonly T[]; onChange: (v: T) => void; label: string; radio?: boolean }) {
  return (
    <div className="seg" role={radio ? 'radiogroup' : 'group'} aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" {...(radio ? { role: 'radio', 'aria-checked': o === value } : { 'aria-pressed': o === value })} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

// ---------- re-verify: the steps appear one at a time, the way a clerk ticks a ledger ----------
export function useVerify(api: FidesApi) {
  const [steps, setSteps] = useState<VerifyStep[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = useCallback(async (id: string) => {
    setRunning(true); setSteps([]); setDone(null);
    const got: VerifyStep[] = [];
    try {
      for await (const s of api.verifyEvidence(id)) {
        if (!alive.current) return;
        got.push(s);
        setSteps([...got]);
      }
      setDone(got.length === 5 && got.every((s) => s.ok));
    } catch (e) {
      got.push({ name: 'error', ok: false, detail: (e as Error).message });
      setSteps([...got]);
      setDone(false);
    } finally {
      if (alive.current) setRunning(false);
    }
  }, [api]);
  return { steps, running, done, run };
}

export function StepLog({ steps, done }: { steps: VerifyStep[]; done: boolean | null }) {
  if (!steps.length) return null;
  return (
    <>
      <ol className="steps" aria-live="polite">
        {steps.map((s) => (
          <li key={s.name} className={`in ${s.ok ? 'pass' : 'fail'}`} aria-label={`${s.name}: ${s.ok ? 'passed' : 'failed'}`}>
            <span className="mark" aria-hidden="true">{s.ok ? '✓' : '✕'}</span>
            <span className="nm">{s.name}</span>
            <span className="dt">{s.detail}</span>
          </li>
        ))}
      </ol>
      {done !== null && <div className={`verdict-line ${done ? 'pass' : 'fail'}`}>{done ? 'Passes every check. It counts.' : 'Fails a check. It is not counted.'}</div>}
    </>
  );
}
