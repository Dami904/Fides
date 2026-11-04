import type { FidesApi } from '../api';
import { PageHead, Pill, Stamp, useLoad } from '../components';
import { href } from '../lib';

export function Merchants({ api }: { api: FidesApi }) {
  const { data, error } = useLoad(async () => Promise.all((await api.listMerchants()).map((h) => api.getMerchant(h))), [api]);
  return (
    <>
      <PageHead title="Merchant records">
        What the shared record says about each merchant the agents met. Open one for its reports, its tier over time and the checks behind each record.
      </PageHead>
      {error && <div className="notice bad">The merchants could not be loaded: {error}. This is an error, not an empty record.</div>}
      {!error && !data && <p className="muted pad">Loading.</p>}
      <main className="mcards">
        {data?.map((m) => (
          <a key={m.host} className={`card link mcard ${m.tier === 'burned' || m.addressAlert ? 'hot' : ''}`} href={href.merchant(m.host)}>
            <div className="mtop">
              <span className="host mono">{m.host}</span>
              {m.decision && <Stamp decision={m.decision} />}
            </div>
            <div className="row-pills">
              <Pill state tone={m.tier === 'burned' ? 'bad' : m.tier === 'new' ? 'warn' : 'ok'}>tier: {m.tier}</Pill>
              {m.addressAlert && <Pill state tone="bad">payout address changed</Pill>}
              {m.rejectedCount > 0 && <Pill state tone="bad">{m.rejectedCount} forged record caught</Pill>}
            </div>
            <div className="mini">
              <div><b>{m.clean}</b><span>clean</span></div>
              <div><b className={m.burned ? 'red' : ''}>{m.burned}</b><span>burns</span></div>
              <div><b>{m.reporters}</b><span>reporters</span></div>
            </div>
            <span className="more">Open record →</span>
          </a>
        ))}
      </main>
    </>
  );
}
