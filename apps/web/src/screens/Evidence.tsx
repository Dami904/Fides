import type { FidesApi } from '../api';
import { Loading, PageHead, Pill, Seal, useLoad, useVerify } from '../components';
import { href } from '../lib';

const CHECKS: [string, string][] = [
  ['format', 'The record parses as canonical JSON in the evidence format, with no floats.'],
  ['hash', 'The sha256 of the fetched bytes equals the hash anchored on Sui.'],
  ['signature', 'The reporter signed exactly these bytes.'],
  ['anchor-sender', 'The anchor transaction was sent by the same key that signed.'],
  ['payment', 'The payment it describes exists, read through Tatum, and is final.'],
];

export function Evidence({ api, id }: { api: FidesApi; id: string }) {
  const { data, error } = useLoad(() => api.getEvidence(id), [api, id]);
  const { steps, running, done, run } = useVerify(api);
  if (error) return <div className="notice bad">This record could not be loaded: {error}. <a href={href.merchants}>Back to the merchants</a>.</div>;
  if (!data) return <Loading />;
  const { merchant, item: e } = data;
  const explorer = api.explorerTx;
  const rejected = e.status === 'rejected';
  const rs = e.research;
  // A failure outside the five checks (the server could not be reached, say) is shown as its own line.
  const outside = steps.filter((s) => !CHECKS.some(([n]) => n === s.name));
  return (
    <>
      <PageHead crumbs={rs ? [['Research', href.research], [`Session ${rs.session}`, href.research], [`Record ${e.id.slice(0, 8)}`]] : [['Sources', href.merchants], [merchant.host, href.merchant(merchant.host)], [`Record ${e.id.slice(0, 8)}`]]}
        title={<span className="ev-title"><Seal id={e.id} status={rejected ? 'rejected' : 'verified'} size={40} />{rejected ? 'Rejected record' : `A ${e.verdict} report`}</span>}>
        {rejected ? 'Someone published this claiming a burn. It failed a check, so it is shown here and never counted.' : `Agent ${e.agent} paid ${merchant.host}, checked what came back, signed this record and anchored its hash on Sui.${rs ? ` Written in the research run: ${rs.title.toLowerCase()}.` : ''}`}
      </PageHead>
      <div className="ev-grid">
        <section className="panel" aria-label="The record">
          <h2>The record</h2>
          <dl className="facts">
            <dt>status</dt><dd><Pill state tone={rejected ? 'bad' : 'ok'}>{rejected ? 'rejected' : 'verified'}</Pill></dd>
            <dt>verdict</dt><dd className={rejected || e.verdict === 'burned' ? 'red' : 'green'}>{rejected ? 'burned (claimed)' : e.verdict}</dd>
            <dt>reporter</dt><dd>{rejected ? 'unknown' : `agent ${e.agent}`}</dd>
            <dt>merchant</dt><dd>{rs ? <span className="mono">{merchant.host}</span> : <a href={href.merchant(merchant.host)}>{merchant.host}</a>}</dd>
            {rs && <><dt>from</dt><dd><a href={href.research}>research session {rs.session}</a></dd></>}
            {rs?.txDigest && explorer && <><dt>payment</dt><dd><a className="ext mono" href={explorer(rs.txDigest)} target="_blank" rel="noopener noreferrer" title={rs.txDigest}>tx …{rs.txDigest.slice(-8)} on Sui ↗</a></dd></>}
            <dt>{rejected ? 'reason' : 'found'}</dt><dd>{rejected ? e.rejectReason : e.problems.length ? e.problems.join('; ') : 'Delivered as advertised.'}</dd>
            <dt>evidence id</dt><dd className="mono tiny break">{e.id}</dd>
          </dl>
        </section>
        <section className="panel" aria-label="The five checks">
          <div className="panel-head">
            <h2>The five checks</h2>
            <button className="btn primary small" type="button" disabled={running} onClick={() => void run(e.id)}>{running ? 'Checking…' : steps.length ? 'Run again' : 'Re-verify'}</button>
          </div>
          <ol className="explain" aria-live="polite">
            {CHECKS.map(([n, d], i) => {
              const s = steps.find((x) => x.name === n);
              const stopped = done !== null && !s;
              return (
                <li key={n} className={s ? (s.ok ? 'pass' : 'fail') : stopped ? 'skip' : ''}>
                  <span className="mk" aria-hidden="true">{s ? (s.ok ? '✓' : '✕') : i + 1}</span>
                  <div>
                    <b>{n}</b>
                    <span>{s ? s.detail : stopped ? 'Not reached: an earlier check failed.' : d}</span>
                  </div>
                </li>
              );
            })}
          </ol>
          {outside.map((s) => <div key={s.name} className="notice alert">{s.detail}</div>)}
          {done !== null && <div className={`verdict-line ${done ? 'pass' : 'fail'}`}>{done ? 'Passes every check. It counts.' : 'Fails a check. It is not counted.'}</div>}
          <p className="muted tiny">The checks run again every time a record is read. Nothing is trusted because it was trusted before.</p>
        </section>
      </div>
    </>
  );
}
