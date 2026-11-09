import type { FidesApi } from '../api';
import { Icon, Loading, NextStep, PageHead, Pill, Stamp, useLoad } from '../components';
import { href } from '../lib';

export function Merchants({ api }: { api: FidesApi }) {
  const { data, error } = useLoad(async () => Promise.all((await api.listMerchants()).map((h) => api.getMerchant(h))), [api]);
  return (
    <>
      <PageHead title="Sources and their records">
        What the shared record says about each paid source the agents met. Open one for how its tier moved from attempt to attempt, its reports, and the checks behind each record.
      </PageHead>
      {error && <div className="notice bad">The merchants could not be loaded: {error}. This is an error, not an empty record.</div>}
      {!error && !data && <Loading />}
      {data && (
        <div className="kpis" aria-label="Totals across the merchants">
          <div><b>{data.length}</b><span>merchants met</span></div>
          <div><b>{data.reduce((n, m) => n + m.clean + m.burned, 0)}</b><span>verified reports</span></div>
          <div><b>{data.reduce((n, m) => n + m.burned, 0)}</b><span><i className="d bad" />verified burns</span></div>
          <div><b>{data.reduce((n, m) => n + m.rejectedCount, 0)}</b><span><i className="d bad" />forged records caught</span></div>
        </div>
      )}
      <div className="mcards">
        {data?.map((m) => (
          <a key={m.host} className="mcard" href={href.merchant(m.host)}>
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
            <span className="go">Open record <Icon name="arrow" size={15} /></span>
          </a>
        ))}
      </div>
      <NextStep to={href.simulation} label="Simulation" hint="Twenty agents, six merchants, twelve rounds. Where the burns land." />
    </>
  );
}
