import { useEffect, useState } from 'react';
import type { FidesApi } from '../api';
import { Chip, flagOf, Meter, PageHead, Pill, Seg, Stamp } from '../components';
import { href, usd } from '../lib';
import type { SharedState, SplitView } from '../types';

const LABEL: Record<SharedState, string> = { attached: 'Attached', detached: 'Detached', unreachable: 'Unreachable' };
const ORDER: SharedState[] = ['attached', 'detached', 'unreachable'];

export function Split({ api }: { api: FidesApi }) {
  const [data, setData] = useState<SplitView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SharedState>('attached');
  const [pressed, setPressed] = useState(false);

  useEffect(() => { api.getSplit().then(setData, (e: Error) => setError(e.message)); }, [api]);
  if (error) return <div className="notice bad">The split view could not be loaded: {error}.</div>;
  if (!data) return <p className="muted">Loading.</p>;

  const s = data.states[state];
  const v = s.check.verdict;
  const cited = new Set(v.citations.evidenceIds);
  const loss: Record<string, number> = { A: data.lossOthers.A, B: s.loss, C: data.lossOthers.C };

  return (
    <>
      <PageHead title="A and B, side by side">
        The same merchant, the same price, the same agent logic. The only thing that changes is whether B can reach the shared record. Flip it and watch the verdict.
      </PageHead>

      <div className="switch-row">
        <div className="switch-ctl">
          <span className="what">Agent B's shared record</span>
          <Seg radio label="State of the shared record for Agent B" value={LABEL[state]} options={ORDER.map((k) => LABEL[k])} onChange={(l) => { setState(ORDER.find((k) => LABEL[k] === l)!); setPressed(true); }} />
        </div>
        <div className="says" aria-live="polite">{s.says}</div>
      </div>

      <div className="split">
        <section aria-label="Who got there first">
          <div className="col-title">Who got there first</div>
          <div className="slip" id="hist">
            <div className="slip-head"><span className="host">{data.host}</span><Pill state>signed, anchored records</Pill></div>
            <hr className="rule-line" />
            {data.earlier.map((e) => (
              <div key={e.evidenceId} className={`item${cited.has(e.evidenceId) ? ' cited' : ''}`}>
                <span className="who">{e.agent}</span>
                <div>
                  <div className="item-head"><b>{e.label}</b><span className="muted small">paid {usd(0.01)} USDC</span>{cited.has(e.evidenceId) && <Pill state tone="warn">cited by B</Pill>}</div>
                  <div className={`small ${e.ok ? 'green' : 'red'}`}>{e.result}</div>
                  <div className="gap-t"><a href={href.evidence(e.evidenceId)}><Chip id={e.evidenceId} /></a></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={`spine${state !== 'attached' ? ' cut' : ''}`} aria-hidden="true"><span className="tag">{state === 'attached' ? 'shared record' : state}</span></div>

        <section aria-label="Agent B now">
          <div className="col-title">Agent B, about to pay</div>
          <article className={`slip ${flagOf(v.decision)}`}>
            <div className="slip-head">
              <span className="who">B</span><span className="host">{data.host}</span><span className="price">{usd(0.01)} USDC</span>
              <div className="right"><Stamp decision={v.decision} big press={pressed} sub={v.cannotSay ? 'cannot say' : undefined} /></div>
            </div>
            <div className="body">
              <div className="lab">Why</div>
              <div>
                <ul className="reasons">{v.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                <div className="row-pills">{v.rulesFired.map((r) => <Pill key={r}>rule: {r}</Pill>)}<Pill state>tier: {v.tier}</Pill></div>
              </div>
              <div className="lab">Cites</div>
              <div>{v.citations.evidenceIds.length ? v.citations.evidenceIds.map((id) => <Chip key={id} id={id} />) : <span className="muted small">nothing: it cannot see the shared record</span>}</div>
              <div className="lab">Shared record</div>
              <div><Pill state tone={s.check.sharedState === 'attached' ? 'ok' : 'warn'}>{s.check.sharedState}</Pill><span className="muted small gap-l">evidence behind it <Meter value={v.confidence} /></span></div>
              <div className="lab">Next</div>
              <div>{s.next}</div>
            </div>
          </article>
        </section>
      </div>

      <section className="losses" aria-label="What each agent lost to this merchant">
        <div className="losses-head"><h2>What each agent lost to {data.host.split('.')[0]}</h2><span className="muted small">USDC, in this run</span></div>
        <div className="losses-row">
          {(['A', 'B', 'C'] as const).map((n) => (
            <div key={n} className={`tile ${loss[n]! > 0 ? 'hot' : 'ok'}${n === 'B' ? ' focus' : ''}`}>
              <span className="who">{n}</span>
              <div className="val">{usd(loss[n]!)}</div>
              <div className="muted small">{n === 'B' ? (s.loss > 0 ? 'paid, then burned' : 'nothing paid') : 'paid, then burned'}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
