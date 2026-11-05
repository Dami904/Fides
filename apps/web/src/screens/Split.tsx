import { useEffect, useState } from 'react';
import type { FidesApi } from '../api';
import { Chip, flagOf, Icon, Loading, Meter, NextStep, PageHead, Pill, Seg, Stamp } from '../components';
import { href, usd } from '../lib';
import type { CheckResult, SharedState, SplitView } from '../types';

const LABEL: Record<SharedState, string> = { attached: 'Attached', detached: 'Detached', unreachable: 'Unreachable' };
const ORDER: SharedState[] = ['attached', 'detached', 'unreachable'];

export function Split({ api }: { api: FidesApi }) {
  const [data, setData] = useState<SplitView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SharedState>('attached');
  const [pressed, setPressed] = useState(false);
  // Live only: the engine's own answer for the chosen state, asked just now. Otherwise the recorded decision is shown.
  const [live, setLive] = useState<{ state: SharedState; check?: CheckResult; at?: string; error?: string } | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => { api.getSplit().then(setData, (e: Error) => setError(e.message)); }, [api]);
  useEffect(() => {
    if (!api.probeSplit || !data) return;
    let current = true;
    setAsking(true);
    api.probeSplit(state).then(
      (r) => current && (setLive({ state, check: r.check, at: r.checkedAt }), setAsking(false)),
      (e: Error) => current && (setLive({ state, error: e.message }), setAsking(false)),
    );
    return () => { current = false; };
  }, [api, state, data]);
  if (error) return <div className="notice bad">The split view could not be loaded: {error}.</div>;
  if (!data) return <Loading />;

  const recorded = data.states[state];
  const fresh = live && live.state === state && live.check ? live.check : null;
  const s = fresh ? { ...recorded, check: fresh } : recorded;
  const v = s.check?.verdict ?? null;
  // The recorded story only fits the recorded decision. If the live answer differs, do not describe a different outcome.
  const sameAsRecorded = !fresh || fresh.verdict.decision === recorded.check?.verdict.decision;
  const cited = new Set(v?.citations.evidenceIds ?? []);
  const loss: Record<string, number> = { A: data.lossOthers.A, B: s.loss, C: data.lossOthers.C };
  const probeNote = asking ? 'Asking the engine now...' : fresh ? `Live: the engine answered this just now (${live!.at!.slice(11, 19)} UTC), not a recording.` : live?.state === state && live.error ? `Live check not available for this state (${live.error}). ${recorded.check ? 'Showing the recorded decision.' : 'There is no recorded decision for this state either.'}` : '';

  return (
    <>
      <PageHead title="A and B, side by side">
        The same merchant, the same price, the same agent logic. The only thing that changes is whether B can reach the shared record. Flip it and watch the verdict.
      </PageHead>

      <div className="control">
        <div className="control-main">
          <span className="what">Agent B's shared record</span>
          <Seg radio label="State of the shared record for Agent B" value={LABEL[state]} options={ORDER.map((k) => LABEL[k])} onChange={(l) => { setState(ORDER.find((k) => LABEL[k] === l)!); setPressed(true); }} />
        </div>
        <div className="says" aria-live="polite">{s.check ? s.says : 'This state cannot be shown on this server.'}</div>
        {api.probeSplit && <p className={`probe${fresh ? ' on' : ''}`} aria-live="polite">{probeNote}</p>}
      </div>

      <div className="split">
        <section className="panel" aria-label="Who got there first">
          <div className="panel-head"><h2>Who got there first</h2><Pill state>signed, anchored records</Pill></div>
          <div className="mono split-host">{data.host}</div>
          <div className="hist">
            {data.earlier.map((e) => (
              <div key={e.evidenceId} className={`item${cited.has(e.evidenceId) ? ' cited' : ''}`}>
                <span className="who">{e.agent}</span>
                <div className="item-body">
                  <div className="item-head"><b>{e.label}</b>{cited.has(e.evidenceId) && <Pill state tone="warn">cited by B</Pill>}</div>
                  <div className={`small ${e.ok ? 'green' : 'red'}`}>{e.result}</div>
                  <div className="item-foot"><span className="muted small">paid {usd(0.01)} USDC</span><a href={href.evidence(e.evidenceId)}><Chip id={e.evidenceId} /></a></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={`spine${state !== 'attached' ? ' cut' : ''}`} aria-hidden="true">
          <span className="spine-dot"><Icon name={state === 'attached' ? 'link' : 'unlink'} size={18} /></span>
          <span className="tag">{state === 'attached' ? 'shared record' : state}</span>
        </div>

        {!v || !s.check ? (
          <section className="panel verdict" aria-label="Agent B now">
            <div className="verdict-top"><div><h2>Agent B, about to pay</h2><div className="mono split-host">{data.host} · {usd(0.01)} USDC</div></div><Pill state tone="warn">no answer to show</Pill></div>
            <p className="no-answer">This run uses the real Walrus Memory relayer, which cannot be switched off from here, so there is no honest answer for this state. The outage is covered by the simulated run (<code>pnpm web:live</code>) and the tests: B is told the record is unreachable and will not pay.</p>
          </section>
        ) : (
        <section className={`panel verdict ${flagOf(v.decision)}`} aria-label="Agent B now">
          <div className="verdict-top">
            <div>
              <h2>Agent B, about to pay</h2>
              <div className="mono split-host">{data.host} · {usd(0.01)} USDC</div>
            </div>
            <Stamp decision={v.decision} big press={pressed} sub={v.cannotSay ? 'cannot say' : undefined} />
          </div>
          <div className="facts-grid">
            <div className="lab">Why</div>
            <div>
              <ul className="reasons">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <div className="row-pills">{v.rulesFired.map((r) => <Pill key={r}>rule: {r}</Pill>)}<Pill state>tier: {v.tier}</Pill></div>
            </div>
            <div className="lab">Cites</div>
            <div className="row-pills">{v.citations.evidenceIds.length ? v.citations.evidenceIds.map((id) => <Chip key={id} id={id} />) : <span className="muted small">nothing: it cannot see the shared record</span>}</div>
            <div className="lab">Shared record</div>
            <div className="row-pills"><Pill state tone={s.check.sharedState === 'attached' ? 'ok' : 'warn'}>{s.check.sharedState}</Pill><span className="muted small meter-line">evidence behind it <Meter value={v.confidence} /></span></div>
            <div className="lab">Next</div>
            <div>{sameAsRecorded ? s.next : 'Follows from the decision above.'}</div>
          </div>
        </section>
        )}
      </div>

      <section className="losses" aria-label="What each agent lost to this merchant">
        <div className="panel-head"><h2>What each agent lost to {data.host.split('.')[0]}</h2><span className="muted small">USDC, in this run</span></div>
        <div className="losses-row">
          {(['A', 'B', 'C'] as const).map((n) => (
            <div key={n} className={`tile${n === 'B' ? ' focus' : ''}`}>
              <span className="who">{n}</span>
              <div>
                <div className={`val ${loss[n]! > 0 ? 'red' : 'green'}`}>{usd(loss[n]!)}</div>
                <div className="muted small">{n === 'B' ? (s.loss > 0 ? 'paid, then burned' : 'nothing paid') : 'paid, then burned'}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <NextStep to={href.feed} label="Decision feed" hint="Every payment attempt in the run, with the verdict and why." />
    </>
  );
}
