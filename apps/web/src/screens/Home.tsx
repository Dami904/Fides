import { useState, type CSSProperties } from 'react';
import type { FidesApi } from '../api';
import { Chip, Stamp, useLoad } from '../components';
import { href, short, usd } from '../lib';

const STEPS: [string, string, string][] = [
  ['01', 'Check', 'Before an agent pays a merchant, it asks Fides. Seven rules weigh its own history and the shared record: budget, payout address, price spikes, burns other agents reported, its own burns, similar incidents at other merchants, and tier.'],
  ['02', 'Pay, ask or refuse', 'The answer comes with its reasons and the exact records it relied on. Too little history is "cannot say", and the agent asks a person instead of guessing.'],
  ['03', 'Report', 'After paying, the agent signs what it got. The hash is anchored on Sui, the payment is checked through Tatum, and the record joins the shared memory on Walrus.'],
];

const GUARANTEES: [string, string][] = [
  ['Unreachable is not empty', 'If the shared record cannot be reached, Fides says so and the agent will not pay on its own.'],
  ['Every record is re-checked on read', 'Format, hash, signature, anchor sender and payment. A record that fails one is shown, never counted.'],
  ['One reporter cannot sink a merchant', 'Influence is capped per reporter and weighted by their own track record.'],
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

const SCREENS: [string, string, string][] = [
  [href.split, 'A / B split', 'The same merchant, with and without the shared record. Flip it and watch the verdict change.'],
  [href.feed, 'Decision feed', 'Every payment attempt in the run, with the verdict and why.'],
  [href.merchants, 'Merchant records', 'Tier, reports and the forged record that was caught. Re-verify any of them.'],
  [href.simulation, 'Simulation', 'Twenty agents, six merchants, twelve rounds. Where the burns land.'],
];

export function Home({ api }: { api: FidesApi }) {
  const split = useLoad(() => api.getSplit(), [api]);
  const sim = useLoad(() => api.getSimulation(), [api]);
  const v = split.data?.states.attached.check.verdict;
  const s = sim.data;
  const avoided = s ? s.detached.burns - s.shared.burns : 0;
  const goodRefused = s ? s.shared.events.filter((e) => e.kind === 'good' && e.decision === 'REFUSE').length : 0;
  const [tab, setTab] = useState('SDK');
  const line = (i: number): CSSProperties => ({ '--d': `${0.35 + i * 0.55}s` } as CSSProperties);

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Credit bureau for machine payments</div>
          <h1 className="display">Know the merchant before your agent pays.</h1>
          <p className="lede">AI agents now pay for APIs on their own, one cent at a time. Fides gives every agent the shared, signed history of what happened to the agents that paid before, and turns it into a plain answer: pay, ask a person, or refuse.</p>
          <div className="cta">
            <a className="btn primary" href={href.split}>See it decide</a>
            <a className="btn ghost" href={href.feed}>Browse the run</a>
          </div>
        </div>

        <div className="term" aria-label="An example check">
          <div className="term-bar"><i /><i /><i /><span>fides.check</span></div>
          {split.data && v ? (
            <div className="term-body">
              <div className="ln cmd" style={line(0)}><span className="p">$</span> check {split.data.host} {usd(0.01)} USDC</div>
              <div className="ln" style={line(1)}><span className="k">shared record</span><span className="g">attached</span></div>
              <div className="ln" style={line(2)}><span className="k">records verified</span><span className="g">{v.citations.evidenceIds.length} of {v.citations.evidenceIds.length}</span></div>
              <div className="ln" style={line(3)}><span className="k">rule</span><span>{v.rulesFired.join(', ')}</span></div>
              <div className="ln" style={line(4)}><span className="k">reason</span><span className="wrap">{v.reasons[0]}</span></div>
              <div className="ln verdict" style={line(5)}>
                <Stamp decision={v.decision} big />
                <span className="cites">{v.citations.evidenceIds.map((id) => <Chip key={id} id={id} />)}</span>
              </div>
            </div>
          ) : <div className="term-body muted">{split.error ? `Could not load the example: ${split.error}` : 'Loading.'}</div>}
        </div>
      </section>

      <section className="stack" aria-label="Built on">
        <span className="eyebrow">Built on</span>
        {STACK.map(([n, d]) => <div key={n}><b>{n}</b><span>{d}</span></div>)}
      </section>

      {s && (
        <section className="figures" aria-label="Results from the recorded simulation">
          <div><b>{s.shared.burns}<span> vs {s.detached.burns}</span></b><span>burns with and without the shared record</span></div>
          <div><b className="green">{s.detached.burns ? Math.round((100 * avoided) / s.detached.burns) : 0}%</b><span>of burns avoided in this run</span></div>
          <div><b>{goodRefused}</b><span>times a good merchant was refused</span></div>
          <div><b>5</b><span>checks on every record, at read time</span></div>
        </section>
      )}
      {sim.error && <div className="notice bad">The simulation could not be loaded: {sim.error}.</div>}

      <section className="block">
        <div className="block-head"><span className="eyebrow">How it works</span><h2>Three moves, every payment</h2></div>
        <div className="steps3">
          {STEPS.map(([n, t, d]) => <article key={n} className="card"><span className="n">{n}</span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><span className="eyebrow">Fails closed</span><h2>Built to be wrong loudly, not quietly</h2></div>
        <div className="guarantees">
          {GUARANTEES.map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="block">
        <div className="block-head"><span className="eyebrow">Explore</span><h2>Four views of one run</h2></div>
        <div className="explore">
          {SCREENS.map(([to, t, d]) => <a key={to} className="card link" href={to}><h3>{t}<span aria-hidden="true">→</span></h3><p>{d}</p></a>)}
        </div>
      </section>

      <section className="block dev">
        <div className="block-head"><span className="eyebrow">For builders</span><h2>Two calls around every payment</h2>
          <p className="muted">Call check before paying and report after. Use the SDK directly, hand the tools to OpenAI, Claude, Gemini or OpenRouter models, or connect any MCP client.</p></div>
        <div className="code">
          <div className="tabs" role="tablist" aria-label="Integration">
            {Object.keys(CODE).map((k) => <button key={k} type="button" role="tab" aria-selected={k === tab} onClick={() => setTab(k)}>{k}</button>)}
          </div>
          <pre role="tabpanel"><code>{CODE[tab]}</code></pre>
        </div>
      </section>

      <section className="block">
        <div className="block-head"><span className="eyebrow">Questions</span><h2>Frequently asked</h2></div>
        <div className="faq">
          {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="block honest">
        <div className="block-head"><span className="eyebrow">What you are looking at</span><h2>{api.mode === 'live' ? 'A fresh run, labelled as such' : 'Recorded, and labelled as such'}</h2></div>
        <p className="muted">
          {api.mode === 'live'
            ? `These pages show the run the engine made when this server started, and Re-verify checks records now. Settlement in this run: ${api.honesty().items.find((i) => i.key === 'Settlement')?.value ?? 'see the label'}.`
            : "These pages replay a recorded run of the real engine: the verdicts, signatures and checks are the engine's own output. Settlement in this run is simulated."}{' '}
          The same engine has also run on Sui testnet and Sui mainnet with real USDC payments. The label at the top right says what is real on each page.
        </p>
        {s && <p className="muted tiny mono">simulation seed {s.seed} · {s.shared.config.agents} agents · {s.shared.config.rounds} rounds · run {short(s.generatedAt, 10)}</p>}
      </section>

      <section className="final-cta">
        <h2>Watch one agent learn from another's loss.</h2>
        <p className="muted">Agents A and C get burned. Agent B has never met the merchant, reads their signed records, and refuses.</p>
        <div className="cta"><a className="btn primary" href={href.split}>Open the A / B split</a><a className="btn ghost" href={href.simulation}>See the simulation</a></div>
      </section>
    </main>
  );
}
