import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { FidesApi } from './api';
import { glyphCells, href, short, type Route } from './lib';
import type { Decision, RecalledMemory, VerifyStep } from './types';

// ---------- icons: one stroke set, drawn on a 20 pixel grid ----------
const ICONS = {
  split: 'M4 4h5v12H4zM11 4h5v12h-5z',
  feed: 'M4 5h12M4 10h12M4 15h8',
  merchants: 'M3.5 8 5 4h10l1.5 4M4.5 8v8h11V8M3.5 8a2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.4 0 2.2 2.2 0 0 0 4.3 0M8 16v-4h4v4',
  simulation: 'M4 16V10M10 16V4M16 16V7',
  arrow: 'M4 10h12M11 5l5 5-5 5',
  back: 'M16 10H4M9 5l-5 5 5 5',
  check: 'M4.5 10.5 8.5 14.5 15.5 6',
  cross: 'M5.5 5.5l9 9M14.5 5.5l-9 9',
  sun: 'M10 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10 2.5v1.5M10 16v1.5M2.5 10H4M16 10h1.5M4.7 4.7l1 1M14.3 14.3l1 1M4.7 15.3l1-1M14.3 5.7l1-1',
  moon: 'M16.5 12A7 7 0 0 1 8 3.5 7 7 0 1 0 16.5 12z',
  play: 'M6 4.5v11l9-5.5z',
  pause: 'M7 4.5v11M13 4.5v11',
  replay: 'M4 10a6 6 0 1 0 2-4.5M4 3.5v3h3',
  link: 'M8 12l4-4M9 5.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M11 14.5l-1 1a3.5 3.5 0 0 1-5-5l1-1',
  unlink: 'M9 5.5l1-1a3.5 3.5 0 0 1 5 5l-1 1M11 14.5l-1 1a3.5 3.5 0 0 1-5-5l1-1M3 3l14 14',
  shield: 'M10 2.5 16 5v4.5c0 4-2.5 6.7-6 8-3.5-1.3-6-4-6-8V5zM7.2 10l2 2 3.6-4',
  scale: 'M10 3v14M6 17h8M4 6h12M4 6l-2 5a2.5 2.5 0 0 0 4 0zM16 6l-2 5a2.5 2.5 0 0 0 4 0z',
  signal: 'M3 10a7 7 0 0 1 14 0M6 10a4 4 0 0 1 8 0M3 3l14 14',
  research: 'M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM13 13l3.5 3.5M6.5 9h5M9 6.5v5',
} as const;

export function Icon({ name, size = 18 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <path d="M11 24V10.5A2.5 2.5 0 0 1 13.5 8H22M11 16h8" fill="none" stroke="var(--brand-ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="21.5" cy="22.5" r="2.5" fill="var(--brand-ink)" />
    </svg>
  );
}

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
        <polygon points={hex} fill={`color-mix(in srgb, ${col} 12%, var(--surface))`} stroke={col} strokeWidth="1.8" strokeLinejoin="round" strokeDasharray={status === 'pending' ? '3 2.5' : undefined} />
        <g fill={col}>{glyphCells(id || '0000000000000000').map(([c, r]) => <rect key={`${c}${r}`} x={9.2 + c * 4.3} y={9.2 + r * 4.3} width="3.5" height="3.5" rx="0.7" />)}</g>
        {status === 'rejected' && <path d="M5 35 L35 5" stroke="var(--red)" strokeWidth="2.6" strokeLinecap="round" />}
      </svg>
    </span>
  );
}

export function Chip({ id, status = 'verified' }: { id: string; status?: SealStatus }) {
  return (
    <span className={`chip${status === 'rejected' ? ' rejected' : ''}`} title={id}>
      <Seal id={id} status={status} size={18} />
      {short(id)}
    </span>
  );
}

// ---------- verdict badge: an icon, a word and a colour, never colour alone ----------
const STAMP: Record<Decision, [string, string, keyof typeof ICONS]> = {
  PAY: ['pay', 'Pay', 'check'],
  PAY_CAPPED: ['capped', 'Pay, capped', 'check'],
  ASK: ['ask', 'Ask', 'feed'],
  REFUSE: ['refuse', 'Refuse', 'cross'],
};
export const flagOf = (d: Decision) => (d === 'REFUSE' ? 'flag-red' : d === 'ASK' ? 'flag-ochre' : 'flag-green');

export function Stamp({ decision, big, sub, press }: { decision: Decision; big?: boolean; sub?: string; press?: boolean }) {
  const [cls, label, icon] = STAMP[decision];
  return (
    <span key={decision} className={`stamp ${cls}${big ? ' big' : ''}${press ? ' press' : ''}`} role="img" aria-label={`verdict: ${label}${sub ? `, ${sub}` : ''}`}>
      {decision === 'ASK' ? <b className="q" aria-hidden="true">?</b> : <Icon name={icon} size={big ? 18 : 13} />}
      <span>{label}</span>
      {sub && <small>{sub}</small>}
    </span>
  );
}

/** The engine's default similarityMaxDistance. A recalled memory only counts when its distance is below this. */
export const SIMILARITY_MAX = 0.45;

/**
 * The memories a verdict cited (rule 6): what they are about, which pattern matched, and how close they were to the
 * question. A recording made before distances were kept has only the ids, and says so.
 */
export function Recalled({ memories, ids, changed }: { memories?: RecalledMemory[] | undefined; ids: string[]; changed?: boolean | null }) {
  // Rule 6 can decide without changing the outcome: a merchant that is not established would be asked about anyway.
  const same = changed === false && <p className="muted small recalled-same">These memories are cited, but they did not change the decision: this merchant is not established, so a person would have been asked anyway.</p>;
  if (memories && memories.length) {
    return (
      <>
      <ul className="recalled">
        {memories.map((m) => (
          <li key={m.blobId}>
            <span className="mono tiny" title={m.blobId}>{short(m.blobId, 10)}</span>
            <span>a burn at <b className="mono">{m.merchantHost}</b>, pattern {m.patterns.join(', ')}</span>
            <span className="dist" title={`Lower is closer. A memory counts below ${SIMILARITY_MAX}.`}>distance <b className="mono">{m.distance.toFixed(3)}</b> <span className="muted">(limit {SIMILARITY_MAX})</span></span>
          </li>
        ))}
      </ul>
      {same}
      </>
    );
  }
  if (ids.length) return <><span className="muted small">{ids.length} recalled memor{ids.length > 1 ? 'ies' : 'y'}, distance not recorded in this run</span>{same}</>;
  return <span className="muted small">none: no memory of another merchant changed this decision</span>;
}

export function Meter({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return <span className="meter" role="img" aria-label={`evidence behind it: ${pct} percent`}><i style={{ width: `${pct}%` }} /></span>;
}

export function Pill({ tone, state, title, children }: { tone?: 'ok' | 'bad' | 'warn'; state?: boolean; title?: string; children: ReactNode }) {
  return <span className={`pill${state ? ' state' : ''}${tone ? ` ${tone}` : ''}`} title={title}>{children}</span>;
}

/** A screen that throws shows the error instead of blanking the whole page. Keyed by route, so moving on clears it. */
export class ScreenBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  override render() {
    if (this.state.error) return <div className="notice bad">This screen hit an error: {this.state.error}. This is a fault in the page, not a result from Fides. <a href={href.home}>Back to the overview</a>.</div>;
    return this.props.children;
  }
}

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

export function Loading() {
  return (
    <div className="skeleton" role="status">
      <span className="sr">Loading.</span>
      <i /><i /><i />
    </div>
  );
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

// ---------- the shell: a site header on the home page, a sidebar in the app ----------
const NAV: [string, string, keyof typeof ICONS, Route['name'][]][] = [
  [href.research, 'Research', 'research', ['research']],
  [href.split, 'A / B split', 'split', ['split']],
  [href.feed, 'Decision feed', 'feed', ['feed', 'decision']],
  [href.merchants, 'Sources', 'merchants', ['merchants', 'merchant', 'evidence']],
  [href.simulation, 'Simulation', 'simulation', ['simulation']],
];

function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem('fides-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function ThemeButton({ theme, toggle }: { theme: 'dark' | 'light'; toggle: () => void }) {
  return (
    <button className="icon-btn" type="button" onClick={toggle} aria-label={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`} title={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}

/** What is real on this screen: always one click away, on every page. */
function Honesty({ api }: { api: FidesApi }) {
  const honesty = api.honesty();
  const allReal = honesty.items.every((i) => i.real);
  const settlement = honesty.items.find((i) => i.key === 'Settlement');
  // Name the network only when the payments in this run were really on it.
  const label = api.mode === 'fixtures' ? 'Recorded run' : settlement?.real ? `Live on ${settlement.value}` : 'Live, simulated';
  return (
    <details className="honesty">
      <summary><span className={`dot${allReal || settlement?.real ? ' real' : ''}`} />{label}</summary>
      <div className="pop" role="note" aria-label="What is real on this screen">
        <div className="lead">What is real here</div>
        {honesty.items.map((i) => <div key={i.key} className="row"><span className={`dot${i.real ? ' real' : ''}`} /><span>{i.key}</span><b>{i.value}</b></div>)}
      </div>
    </details>
  );
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
  const brand = (
    <a className="brand" href={href.home} aria-current={route.name === 'home' ? 'page' : undefined}>
      <Mark />
      <span>Fides</span>
    </a>
  );

  if (route.name === 'home') {
    return (
      <div className="site">
        <a className="skip" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById('content')?.focus(); }}>Skip to content</a>
        <header className="site-head">
          <div className="site-head-in">
            {brand}
            <nav className="site-nav" aria-label="Screens">
              {NAV.map(([to, label]) => <a key={to} href={to}>{label}</a>)}
            </nav>
            <div className="site-tools">
              <Honesty api={api} />
              <ThemeButton theme={theme} toggle={toggle} />
              <a className="btn primary small" href={href.research}>Open the demo</a>
            </div>
          </div>
        </header>
        <main id="content" tabIndex={-1}>{children}</main>
        <footer className="site-foot">
          <div className="wrap foot-grid">
            <div className="about">
              {brand}
              <p>A credit bureau for machine payments on Sui. Evidence anchored on Sui, read through Tatum, remembered in Walrus Memory.</p>
            </div>
            <div><h4>Explore</h4>{NAV.map(([to, label]) => <a key={to} href={to}>{label}</a>)}</div>
            <div><h4>Under the hood</h4><span>Seven decision rules</span><span>Five checks per record</span><span>SDK, LLM tools, MCP</span></div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="side">
        {brand}
        <nav className="side-nav" aria-label="Screens">
          {NAV.map(([to, label, icon, names]) => (
            <a key={to} href={to} aria-current={names.includes(route.name) ? 'page' : undefined}><Icon name={icon} />{label}</a>
          ))}
        </nav>
        <div className="side-foot">
          <Honesty api={api} />
          <ThemeButton theme={theme} toggle={toggle} />
        </div>
      </aside>
      <div className="app-top">
        {brand}
        <div className="site-tools"><Honesty api={api} /><ThemeButton theme={theme} toggle={toggle} /></div>
      </div>
      <main className="app-main" id="content" tabIndex={-1}>
        <div className="app-in">{children}</div>
      </main>
      <nav className="tabbar" aria-label="Screens, phone layout">
        {NAV.map(([to, label, icon, names]) => (
          <a key={to} href={to} aria-current={names.includes(route.name) ? 'page' : undefined}><Icon name={icon} size={20} /><span>{label.replace('Decision feed', 'Feed').replace('A / B split', 'A / B')}</span></a>
        ))}
      </nav>
    </div>
  );
}

export function PageHead({ title, children, aside, crumbs }: { title: ReactNode; children?: ReactNode; aside?: ReactNode; crumbs?: [string, string?][] }) {
  return (
    <div className="page-head">
      <div className="page-head-copy">{crumbs && <Crumbs trail={crumbs} />}<h1>{title}</h1>{children && <div className="page-sub">{children}</div>}</div>
      {aside && <div className="page-aside">{aside}</div>}
    </div>
  );
}

/** Where to go from here, so nobody has to work out the order of the story. */
export function NextStep({ to, label, hint }: { to: string; label: string; hint: string }) {
  return (
    <a className="next-step" href={to}>
      <span><small>Next</small><b>{label}</b><span>{hint}</span></span>
      <Icon name="arrow" size={20} />
    </a>
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

// ---------- re-verify: the steps arrive one at a time ----------
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
