import type { FidesApi } from '../api';
import { PageHead, Pill, Seal, Stamp, useLoad } from '../components';
import { href, shortAddr } from '../lib';
import type { EvidenceItem, Tier } from '../types';

function EvidenceRow({ e }: { e: EvidenceItem }) {
  const rejected = e.status === 'rejected';
  return (
    <a className={`row ev-row${rejected ? ' rej' : ''}`} href={href.evidence(e.id)}>
      <Seal id={e.id} status={rejected ? 'rejected' : 'verified'} size={28} />
      <b className={rejected || e.verdict === 'burned' ? 'red' : 'green'}>{rejected ? 'burned (claimed)' : e.verdict}</b>
      <Pill state tone={rejected ? 'bad' : 'ok'}>{rejected ? 'rejected' : 'verified'}</Pill>
      <span className="why">{rejected ? e.rejectReason : e.problems[0] ?? 'Delivered as advertised.'}</span>
      <span className="muted small">{rejected ? 'unknown reporter' : `agent ${e.agent}`}</span>
      <span className="mono tiny muted">{e.id.slice(0, 8)}</span>
      <span className="go" aria-hidden="true">→</span>
    </a>
  );
}

const TIERS: [Tier, string][] = [['new', 'New'], ['established', 'Established'], ['trusted', 'Trusted']];

export function Merchant({ api, host }: { api: FidesApi; host: string }) {
  const { data: m, error } = useLoad(() => api.getMerchant(host), [api, host]);
  const verified = m?.evidence.filter((e) => e.status === 'verified') ?? [];
  const rejected = m?.evidence.filter((e) => e.status === 'rejected') ?? [];
  return (
    <>
      <PageHead crumbs={[['Merchants', href.merchants], [host]]} title={host} aside={m?.decision && <Stamp decision={m.decision} big sub="current verdict" />}>
        {m && <span className="row-pills">
          <Pill state tone={m.tier === 'burned' ? 'bad' : m.tier === 'new' ? 'warn' : 'ok'}>tier: {m.tier}</Pill>
          {m.cannotSay && <Pill state tone="warn">cannot say: not enough history</Pill>}
          <span className="muted small">paid at <code title={m.firstPaidAt}>{m.firstPaidAt ? shortAddr(m.firstPaidAt) : 'unknown'}</code></span>
        </span>}
      </PageHead>
      {error && <div className="notice bad">This merchant could not be loaded: {error}. This is an error, not an empty record.</div>}
      {!error && !m && <p className="muted pad">Loading.</p>}
      {m && (
        <main>
          {m.addressAlert && m.firstPaidAt && m.quotedNow && (
            <div className="notice bad"><b>The payout address changed. </b>Quoted now: {shortAddr(m.quotedNow)}, not the address agents paid before ({shortAddr(m.firstPaidAt)}). The alert stays open until a person clears it.</div>
          )}

          <div className="merchant-top">
            <div className="kpis two">
              <div><b className="green">{m.clean}</b><span>verified clean</span></div>
              <div><b className={m.burned ? 'red' : ''}>{m.burned}</b><span>verified burns</span></div>
              <div><b>{m.reporters}</b><span>independent reporters</span></div>
              <div><b className={m.rejectedCount ? 'red' : ''}>{m.rejectedCount}</b><span>rejected records</span></div>
            </div>

            <section className="slip tier-card" aria-label="Tier">
              <h2>Tier</h2>
              <ol className="ladder">
                {TIERS.map(([k, label]) => <li key={k} className={m.tier === k ? 'here' : ''}><i />{label}</li>)}
                <li className={`burned${m.tier === 'burned' ? ' here' : ''}`}><i />Burned</li>
              </ol>
              <div className="seq">
                <span className="lab">Reports, in order</span>
                <div className="seq-row">
                  {verified.map((r) => <a key={r.id} className={`seq-dot ${r.verdict}`} href={href.evidence(r.id)} title={`${r.verdict}, reported by agent ${r.agent}`}><Seal id={r.id} status="verified" size={22} /></a>)}
                  {!verified.length && <span className="muted small">No verified reports yet.</span>}
                </div>
              </div>
              <p className="muted tiny">One verified burn drops a merchant to burned at once. Recovery is slow.</p>
            </section>
          </div>

          <section aria-label="Evidence">
            <div className="section-row"><h2>Evidence</h2><span className="muted small">Open a record to re-run its five checks.</span></div>
            <div className="table">
              {verified.map((e) => <EvidenceRow key={e.id} e={e} />)}
              {!verified.length && <p className="empty">No reports for this merchant yet. That is an honest cold start, not an error.</p>}
            </div>
            {rejected.length > 0 && (
              <>
                <div className="section-row"><h3>Shown, never counted</h3><span className="muted small">Records that failed a check.</span></div>
                <div className="table">{rejected.map((e) => <EvidenceRow key={e.id} e={e} />)}</div>
              </>
            )}
          </section>
        </main>
      )}
    </>
  );
}
