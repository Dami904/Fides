import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { testing } from '@fides/sdk';
import { createFidesMcp } from '../src/server.js';

const { newWorld, makeAgent, MERCHANT_HOST, PAYTO, USDC } = testing;
const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (closers.length) await closers.pop()!();
});

/** A real MCP client talking to the Fides server over a linked in-memory pair. */
async function connect(world = newWorld(), name = 'A') {
  const agent = makeAgent(world, name);
  const server = createFidesMcp(agent.fides, { ownerId: name });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return { client, agent, world };
}
const text = (r: unknown) => (r as { content: { type: string; text: string }[] }).content[0]!.text;
const checkArgs = (over: Record<string, unknown> = {}) => ({ merchantHost: MERCHANT_HOST, payTo: PAYTO, amount: '0.01', asset: USDC, ...over });

describe('Fides over MCP', () => {
  it('lists the three tools with descriptions, input schemas and the right hints', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['fides_check', 'fides_lookup', 'fides_report']);
    const check = tools.find((t) => t.name === 'fides_check')!;
    expect(check.description).toMatch(/Never pay on REFUSE/);
    expect(check.inputSchema.required).toEqual(expect.arrayContaining(['merchantHost', 'payTo', 'amount', 'asset']));
    expect(tools.find((t) => t.name === 'fides_lookup')!.annotations?.readOnlyHint).toBe(true);
  });

  it('fides_check returns a verdict with citations as structured content and as text', async () => {
    const { client } = await connect();
    const r = await client.callTool({ name: 'fides_check', arguments: checkArgs() });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({ decision: 'ASK', cannotSay: true, citations: { evidenceIds: [], memoryBlobIds: [] }, sharedRecord: 'attached' });
    expect(JSON.parse(text(r)).summary).toMatch(/^ASK for /);
  });

  it('bad input is an error result that says what was wrong, not an empty answer', async () => {
    const { client } = await connect();
    const r = await client.callTool({ name: 'fides_check', arguments: checkArgs({ amount: 'lots' }) });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/amount/);
  });

  it('a backend failure is reported as an error that is not "no ratings"', async () => {
    const { client, agent, world } = await connect();
    const o = agent.pay();
    world.ledger.failPayments = true;
    const r = await client.callTool({ name: 'fides_report', arguments: o as unknown as Record<string, unknown> });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/not an absence of reports/);
  });

  it('the whole loop across two MCP clients: A reports a burn, B\'s check cites it', async () => {
    const world = newWorld();
    const a = await connect(world, 'A');
    const b = await connect(world, 'B');
    const o = a.agent.pay(10_000n, { checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true } });
    const rep = await a.client.callTool({ name: 'fides_report', arguments: o as unknown as Record<string, unknown> });
    expect(rep.structuredContent).toMatchObject({ status: 'complete' });
    const id = (rep.structuredContent as { evidenceId: string }).evidenceId;

    const chk = await b.client.callTool({ name: 'fides_check', arguments: checkArgs() });
    expect(chk.structuredContent).toMatchObject({ decision: 'PAY_CAPPED', capAmount: '0.05', citations: { evidenceIds: [id] } });

    const look = await b.client.callTool({ name: 'fides_lookup', arguments: { merchantHost: MERCHANT_HOST } });
    expect(look.structuredContent).toMatchObject({ citations: { evidenceIds: [id] }, assessment: { burnCount: 1 } });
  });

  it('an idempotency key reserves the spend when the answer allows payment, and not otherwise', async () => {
    const { client } = await connect();
    const r = await client.callTool({ name: 'fides_check', arguments: checkArgs({ idempotencyKey: 'k1' }) });
    expect(r.structuredContent).not.toHaveProperty('claim'); // ASK: nothing reserved
  });
});
