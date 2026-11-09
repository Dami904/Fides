// Export real data for the UI: the scripted demo (agent events, decisions with their citations) and the simulation
// (every purchase of every agent), with and without the shared record. Nothing here is written by hand: it is what the
// engine produced. The UI is built against these fixtures first and against live data later (the FidesApi interface).
//   pnpm --filter @fides/web fixtures
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runDemo, runResearchDemo, simHarness } from '@fides/agent';
import { runSimulation } from '@fides/sim';

const dir = fileURLToPath(new URL('../fixtures/', import.meta.url));
mkdirSync(dir, { recursive: true });

// bigint becomes a string, bytes are dropped: fixtures are plain JSON.
const plain = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x instanceof Uint8Array ? undefined : x), 2);
const write = (name: string, global: string, data: unknown) => {
  const json = plain(data);
  writeFileSync(dir + `${name}.json`, json + '\n');
  // the same data as a script, so a mockup can be opened straight from disk
  writeFileSync(dir + `${name}.js`, `window.${global} = ${json};\n`);
};

const h = await simHarness();
const report = await runDemo(h, { log: () => undefined });
await h.close();
write('demo', 'FIDES_DEMO', {
  generatedAt: new Date().toISOString(),
  mode: report.mode,
  network: report.network,
  ok: report.ok,
  lost: report.lost,
  merchants: { good: 'good.fides-demo.test', flaky: 'flaky.fides-demo.test', malicious: 'malicious.fides-demo.test' },
  steps: report.steps,
  events: report.events,
});

// The research agent's briefs on the simulated ledger. The mainnet recording (research-mainnet.json) is saved by
// "pnpm research -- --live --memory=live --json=apps/web/fixtures/research-mainnet.json" and is never overwritten here.
const rh = await simHarness();
const research = await runResearchDemo(rh, { log: () => undefined });
await rh.close();
writeFileSync(dir + 'research.json', plain({ generatedAt: research.generatedAt, mode: research.mode, network: research.network, question: research.question, sessions: research.sessions, lostUsdc: research.lostUsdc, ok: research.ok }) + '\n');

const shared = await runSimulation({ seed: 1, mode: 'shared' });
const detached = await runSimulation({ seed: 1, mode: 'detached' });
const slim = (r: typeof shared) => ({ config: r.config, burns: r.burns, paid: r.paid, refused: r.refused, refusedGood: r.refusedGood, asked: r.asked, lostRaw: r.lostRaw, burnsByMerchant: r.burnsByMerchant, rules: r.rules, events: r.events });
write('sim', 'FIDES_SIM', { generatedAt: new Date().toISOString(), seed: 1, shared: slim(shared), detached: slim(detached) });

console.log(`research: ${research.sessions.length} sessions, expectations ${research.ok ? 'all met' : 'NOT all met'}`);
console.log(`demo: ${report.steps.length} steps, ${report.events.length} events, expectations ${report.ok ? 'all met' : 'NOT all met'}`);
console.log(`sim:  shared ${shared.burns} burns, detached ${detached.burns} burns, ${shared.events.length} events each`);
