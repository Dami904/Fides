import { useState, type ReactNode } from 'react';
import type { FidesApi } from '../api';
import { Chip, Icon, Loading, Seal, Stamp, useLoad } from '../components';
import { href, short, usd } from '../lib';

const GUARANTEES: [string, string, 'signal' | 'shield' | 'scale'][] = [
  ['Unreachable is not empty', 'If the shared record cannot be reached, Fides says so and the agent will not pay on its own.', 'signal'],
  ['Every record is re-checked on read', 'Format, hash, signature, anchor sender and payment. A record that fails one is shown, never counted.', 'shield'],
  ['One reporter cannot sink a merchant', 'Influence is capped per reporter and weighted by their own track record.', 'scale'],
];

const STACK: [string, string][] = [
  ['Sui', 'payments and the evidence anchor'],
  ['Walrus Memory', 'the shared record and recall'],
  ['Tatum', 'reads payments and anchors'],
  ['MPP', 'HTTP 402 machine payments'],
];

const CODE: Record<string, string> = {
  SDK: `import { fidesFromEnv } from '@fides/sdk';

const fides = fidesFromEnv(process.env, 'agent-a');

const { verdict } = await fides.check({
  ownerId, merchantHost, payTo, amount: '0.01',
  asset, network, resource,
});
if (verdict.decision === 'REFUSE') return;
// pay, check what came back, then:
await fides.report(outcome);`,
  'LLM tools': `import { fidesTools, forAnthropic, forOpenAIChat,
  forGemini, forOpenRouter, FIDES_AGENT_PROMPT } from '@fides/tools';

const tools = fidesTools(fides);
// fides_check, fides_report, fides_lookup
const anthropicTools = forAnthropic(tools);
const openaiTools = forOpenAIChat(tools);`,
  MCP: `# any MCP client, over stdio
pnpm --filter @fides/mcp start

# or over HTTP with a bearer token
FIDES_MCP_TOKEN=... pnpm --filter @fides/mcp start -- --http`,
};

const FAQ: [string, string][] = [
  ['What counts as a burn?', 'The agent paid and the response failed a check it can prove: wrong schema, stale data, too slow, a price other than the quote, or a payout address other than the one pinned.'],
  ['Can a merchant fake good reports, or a rival fake bad ones?', 'Every record must be signed by its reporter, anchored on Sui by the same key, and backed by a real payment. Each reporter\'s influence is capped. Forged records are shown and never counted.'],
  ['What happens to a new merchant with no history?', 'Fides says "cannot say" and the agent asks a person. It never turns missing data into a guess in either direction.'],
  ['What if the shared record is down?', 'That is reported as unreachable, not as "no reports". The agent falls back to its own history and will not pay on its own.'],
  ['Is any data deleted when an agent is detached?', 'No. Detaching removes the agent\'s access to the shared record. Nothing is deleted. What it reports while detached is kept, and written to the shared record once it is attached again.'],
];

const SCREENS: [string, string, string, 'split' | 'feed' | 'merchants' | 'simulation'][] = [
  [href.split, 'A / B split', 'The same merchant, with and without the shared record. Flip it and watch the verdict change.', 'split'],
  [href.feed, 'Decision feed', 'Every payment attempt in the run, with the verdict and why.', 'feed'],
  [href.merchants, 'Merchant records', 'Tier, reports and the forged record that was caught. Re-verify any of them.', 'merchants'],
  [href.simulation, 'Simulation', 'Twenty agents, six merchants, twelve rounds. Where the burns land.', 'simulation'],
];

function Head({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="sec-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Home({ api }: { api: FidesApi }) {
  const split = useLoad(() => api.getSplit(), [api]);
  const sim = useLoad(() => api.getSimulation(), [api]);
  const v = split.data?.states.attached.check?.verdict;
  const s = sim.data;
  const avoided = s ? s.detached.burns - s.shared.burns : 0;
  const goodRefused = s ? s.shared.events.filter((e) => e.kind === 'good' && e.decision === 'REFUSE').length : 0;
  const [tab, setTab] = useState('SDK');

  return (
    <div className="home">
      <section className="hero">
        <div className="wrap hero-copy">
          <span className="eyebrow pilled">Credit bureau for machine payments</span>
          <h1 className="display">Know the merchant before your agent <em>pays</em>.</h1>
          <p className="lede">AI agents now pay for APIs on their own, one cent at a time. Fides gives every agent the shared, signed history of what happened to the agents that paid before, and turns it into a plain answer: pay, ask a person, or refuse.</p>
          <div className="cta">
            <a className="btn primary" href={href.split}>See it decide <Icon name="arrow" size={16} /></a>
            <a className="btn" href={href.feed}>Browse the run</a>
          </div>
        </div>

        <div className="wrap">
          <div className="window" aria-label="An example check">
            <div className="window-bar"><i /><i /><i /><span>fides.check</span></div>
            {split.data && v ? (
              <div className="window-body">
                <div className="wb-left">
                  <div className="wb-title">Who got there first</div>
                  {split.data.earlier.map((e, i) => (
                    <div key={e.evidenceId} className="wb-item rise" style={{ '--d': `${0.05 + i * 0.1}s` } as React.CSSProperties}>
                      <span className={`tick ${e.ok ? 'ok' : 'bad'}`}><Icon name={e.ok ? 'check' : 'cross'} size={13} /></span>
                      <div><b>{e.label}</b><span>{e.result}</span></div>
                      <Seal id={e.evidenceId} size={24} />
                    </div>
                  ))}
                </div>
                <div className="wb-right rise" style={{ '--d': '0.35s' } as React.CSSProperties}>
                  <div className="wb-q">
                    <span className="wb-title">Agent B, about to pay</span>
                    <span className="mono wb-host">{split.data.host} · {usd(0.01)} USDC</span>
                  </div>
                  <Stamp decision={v.decision} big />
                  <p className="wb-reason">{v.reasons[0]}</p>
                  <dl className="wb-facts">
                    <div><dt>shared record</dt><dd>attached</dd></div>
                    <div><dt>records verified</dt><dd>{v.citations.evidenceIds.length} of {v.citations.evidenceIds.length}</dd></div>
                    <div><dt>rule</dt><dd>{v.rulesFired.join(', ')}</dd></div>
                  </dl>
                  <div className="cites">{v.citations.evidenceIds.map((id) => <Chip key={id} id={id} />)}</div>
                </div>
              </div>
            ) : <div className="window-body solo">{split.error ? <div className="notice bad">Could not load the example: {split.error}</div> : <Loading />}</div>}
          </div>
        </div>

        <div className="wrap stack" aria-label="Built on">
          <span className="eyebrow">Built on</span>
          {STACK.map(([n, d]) => <div key={n}><b>{n}</b><span>{d}</span></div>)}
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <Head eyebrow="How it works" title="Three moves, every payment" />
          <div className="moves">
            <article className="move">
              <div className="move-art art-rules" aria-hidden="true">
                {['budget', 'address', 'price spike', 'shared burns', 'own history', 'similar incident', 'tier'].map((r, i) => <span key={r} className={i === 3 ? 'on' : ''}>{r}</span>)}
              </div>
              <span className="n">01</span>
              <h3>Check</h3>
              <p>Before an agent pays a merchant, it asks Fides. Seven rules weigh its own history and the shared record: budget, payout address, price spikes, burns other agents reported, its own burns, similar incidents at other merchants, and tier.</p>
            </article>
            <article className="move">
              <div className="move-art art-verdicts" aria-hidden="true">
                <Stamp decision="PAY" /><Stamp decision="ASK" /><Stamp decision="REFUSE" />
              </div>
              <span className="n">02</span>
              <h3>Pay, ask or refuse</h3>
              <p>The answer comes with its reasons and the exact records it relied on. Too little history is "cannot say", and the agent asks a person instead of guessing.</p>
            </article>
            <article className="move">
              <div className="move-art art-record" aria-hidden="true">
                <Seal id="7c1e94a2d0b35f68" size={44} />
                <div><b>Signed report</b><span className="mono">anchored on Sui</span></div>
              </div>
              <span className="n">03</span>
              <h3>Report</h3>
              <p>After paying, the agent signs what it got. The hash is anchored on Sui, the payment is checked through Tatum, and the record joins the shared memory on Walrus.</p>
            </article>
          </div>
        </div>
      </section>

      {s && (
        <section className="band" aria-label="Results from the recorded simulation">
          <div className="wrap band-grid">
            <div className="band-lead">
              <span className="eyebrow">The same world, twice</span>
              <h2>What the shared record is worth</h2>
              <a className="btn on-band" href={href.simulation}>See the simulation <Icon name="arrow" size={16} /></a>
            </div>
            <div className="figures">
              <div><b>{s.shared.burns}<small> vs {s.detached.burns}</small></b><span>burns with and without the shared record</span></div>
              <div><b>{s.detached.burns ? Math.round((100 * avoided) / s.detached.burns) : 0}%</b><span>of burns avoided in this run</span></div>
              <div><b>{goodRefused}</b><span>times a good merchant was refused</span></div>
              <div><b>5</b><span>checks on every record, at read time</span></div>
            </div>
          </div>
        </section>
      )}
      {sim.error && <div className="wrap"><div className="notice bad">The simulation could not be loaded: {sim.error}.</div></div>}

      <section className="sec">
        <div className="wrap">
          <Head eyebrow="Fails closed" title="Built to be wrong loudly, not quietly" />
          <div className="guarantees">
            {GUARANTEES.map(([t, d, icon]) => <article key={t}><span className="g-icon"><Icon name={icon} size={20} /></span><h3>{t}</h3><p>{d}</p></article>)}
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap">
          <Head eyebrow="Explore" title="Four views of one run" />
          <div className="explore">
            {SCREENS.map(([to, t, d, icon]) => (
              <a key={to} className="ex-card" href={to}>
                <span className="g-icon"><Icon name={icon} size={20} /></span>
                <h3>{t}</h3>
                <p>{d}</p>
                <span className="go">Open <Icon name="arrow" size={15} /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap dev">
          <Head eyebrow="For builders" title="Two calls around every payment">
            Call check before paying and report after. Use the SDK directly, hand the tools to OpenAI, Claude, Gemini or OpenRouter models, or connect any MCP client.
          </Head>
          <div className="code">
            <div className="tabs" role="tablist" aria-label="Integration">
              {Object.keys(CODE).map((k) => <button key={k} type="button" role="tab" aria-selected={k === tab} onClick={() => setTab(k)}>{k}</button>)}
            </div>
            <pre role="tabpanel"><code>{CODE[tab]}</code></pre>
          </div>
        </div>
      </section>

      <section className="sec tint">
        <div className="wrap faq-grid">
          <Head eyebrow="Questions" title="Frequently asked" />
          <div className="faq">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap honest">
          <Head eyebrow="What you are looking at" title={api.mode === 'live' ? 'A fresh run, labelled as such' : 'Recorded, and labelled as such'} />
          <div>
            <p>
              {api.mode === 'live'
                ? `These pages show the run the engine made when this server started, and Re-verify checks records now. Settlement in this run: ${api.honesty().items.find((i) => i.key === 'Settlement')?.value ?? 'see the label'}.`
                : api.honesty().items.find((i) => i.key === 'Settlement')?.real
                  ? "These pages replay a recording of a real run of the engine on Sui mainnet: real USDC payments, Tatum verification and the Walrus Memory relayer. Re-verify here replays the checks recorded in that run; running it against the chain needs the live server (pnpm web:live)."
                  : "These pages replay a recorded run of the real engine: the verdicts, signatures and checks are the engine's own output. Settlement in this run is simulated."}{' '}
              The same engine has also run on Sui testnet, and on mainnet with real USDC payments. The label at the top right says what is real on each page.
            </p>
            {s && <p className="mono meta">simulation board: seed {s.seed} · {s.shared.config.agents} agents · {s.shared.config.rounds} rounds · run {short(s.generatedAt, 10)}</p>}
          </div>
        </div>
      </section>

      <section className="final">
        <div className="wrap">
          <h2>Watch one agent learn from another's loss.</h2>
          <p>Agents A and C get burned. Agent B has never met the merchant, reads their signed records, and refuses.</p>
          <div className="cta"><a className="btn on-band solid" href={href.split}>Open the A / B split <Icon name="arrow" size={16} /></a><a className="btn on-band" href={href.simulation}>See the simulation</a></div>
        </div>
      </section>
    </div>
  );
}
