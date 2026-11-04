import { describe, expect, it } from 'vitest';
import { testing } from '@fides/sdk';
import {
  FIDES_AGENT_PROMPT, callTool, executeAnthropic, executeGemini, executeGeminiInteractions, executeOpenAIChat, executeOpenAIResponses,
  executeOpenRouter, fidesTools, forAnthropic, forGemini, forGeminiInteractions, forOpenAIChat, forOpenAIResponses, forOpenRouter, jsonSchemaOf,
} from '../src/index.js';

const { newWorld, makeAgent, MERCHANT_HOST, PAYTO, USDC } = testing;

function setup() {
  const world = newWorld();
  const a = makeAgent(world, 'A');
  return { world, a, tools: fidesTools(a.fides, { ownerId: 'A' }) };
}
const checkArgs = (over: Record<string, unknown> = {}) => ({ merchantHost: MERCHANT_HOST, payTo: PAYTO, amount: '0.01', asset: USDC, ...over });

describe('the tools', () => {
  it('there are three, with names every provider accepts', () => {
    const { tools } = setup();
    expect(tools.map((t) => t.name)).toEqual(['fides_check', 'fides_report', 'fides_lookup']);
    for (const t of tools) {
      expect(t.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/); // Anthropic allows 128, OpenAI 64
      expect(t.description.length).toBeGreaterThan(80);
    }
    expect(tools.find((t) => t.name === 'fides_lookup')!.readOnly).toBe(true);
  });

  it('fides_check answers with a verdict, reasons and citations', async () => {
    const { tools } = setup();
    const r = await callTool(tools, 'fides_check', checkArgs());
    expect(r.isError).toBe(false);
    expect(r.data).toMatchObject({ decision: 'ASK', cannotSay: true, sharedRecord: 'attached', citations: { evidenceIds: [], memoryBlobIds: [] } });
    expect(JSON.parse(r.text).summary).toMatch(/^ASK for /);
  });

  it('accepts arguments as an object or as the JSON string OpenAI sends', async () => {
    const { tools } = setup();
    expect((await callTool(tools, 'fides_check', checkArgs())).isError).toBe(false);
    expect((await callTool(tools, 'fides_check', JSON.stringify(checkArgs()))).isError).toBe(false);
  });

  it('a full loop: check, report a burn, look it up with citations', async () => {
    const { a, tools } = setup();
    const o = a.pay(10_000n, { checks: { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true } });
    const { issuedAt, patterns: _p, ...rest } = o;
    const rep = await callTool(tools, 'fides_report', { ...rest, issuedAt });
    expect(rep.isError).toBe(false);
    expect(rep.data).toMatchObject({ status: 'complete', citations: { evidenceIds: [expect.any(String)] } });
    const look = await callTool(tools, 'fides_lookup', { merchantHost: MERCHANT_HOST });
    expect(look.data!.citations).toMatchObject({ evidenceIds: [(rep.data as { evidenceId: string }).evidenceId], rejectedEvidenceIds: [] });
  });
});

describe('errors are loud and never an empty result', () => {
  it('bad input names the field and says what is expected', async () => {
    const { tools } = setup();
    const r = await callTool(tools, 'fides_check', checkArgs({ amount: 'ten', payTo: 'nope' }));
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/amount: a decimal amount/);
    expect(r.text).toMatch(/payTo: a Sui address/);
  });
  it('not JSON, an unknown tool, and a failing backend', async () => {
    const { world, a, tools } = setup();
    expect((await callTool(tools, 'fides_check', '{not json')).text).toMatch(/not valid JSON/);
    expect((await callTool(tools, 'fides_nope', {})).text).toMatch(/unknown tool "fides_nope". Available: fides_check/);
    const o = a.pay();
    world.ledger.failPayments = true;
    const r = await callTool(tools, 'fides_report', o);
    expect(r.isError).toBe(true);
    expect(r.text).toMatch(/not an absence of reports/);
  });
  it('a rejected host with a scheme or port is refused before any lookup', async () => {
    const { tools } = setup();
    expect((await callTool(tools, 'fides_lookup', { merchantHost: 'https://x.example:8080/' })).isError).toBe(true);
  });
});

describe('adapters produce each provider\'s documented shapes', () => {
  const { tools } = setup();

  it('JSON Schema: object with required fields, no $schema marker', () => {
    const s = jsonSchemaOf(tools[0]!) as { type: string; required: string[]; properties: Record<string, unknown>; $schema?: string };
    expect(s.type).toBe('object');
    expect(s.$schema).toBeUndefined();
    expect(s.required).toEqual(expect.arrayContaining(['merchantHost', 'payTo', 'amount', 'asset']));
    expect(s.required).not.toContain('idempotencyKey');
    expect(Object.keys(s.properties)).toContain('idempotencyKey');
  });

  it('OpenAI chat and OpenRouter: type function with a function object', () => {
    const t = forOpenAIChat(tools);
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ type: 'function', function: { name: 'fides_check', parameters: { type: 'object' } } });
    expect(forOpenRouter(tools)).toEqual(t);
  });

  it('OpenAI Responses: flat function tools, strict off because some inputs are optional', () => {
    const t = forOpenAIResponses(tools);
    expect(t[0]).toMatchObject({ type: 'function', name: 'fides_check', strict: false, parameters: { type: 'object' } });
  });

  it('Anthropic: name, description, input_schema', () => {
    expect(forAnthropic(tools)[0]).toMatchObject({ name: 'fides_check', input_schema: { type: 'object' } });
  });

  it('Gemini: functionDeclarations, with the JSON Schema keywords it does not take removed', () => {
    const g = forGemini(tools);
    expect(g).toHaveLength(1);
    expect(g[0]!.functionDeclarations.map((d) => d.name)).toEqual(['fides_check', 'fides_report', 'fides_lookup']);
    const text = JSON.stringify(g);
    for (const k of ['additionalProperties', '"pattern"', '$schema', '"default"']) expect(text).not.toContain(k);
    expect(forGeminiInteractions(tools)[0]).toMatchObject({ type: 'function', name: 'fides_check' });
  });

  it('every schema is valid enough to be serialised and sent', () => {
    for (const x of [forOpenAIChat(tools), forOpenAIResponses(tools), forAnthropic(tools), forGemini(tools), forGeminiInteractions(tools)]) {
      expect(JSON.parse(JSON.stringify(x))).toEqual(x);
    }
  });
});

describe('executing the calls a model made', () => {
  const args = JSON.stringify(checkArgs());

  it('OpenAI chat and OpenRouter: tool messages keyed by tool_call_id', async () => {
    const { tools } = setup();
    const calls = [{ id: 'call_1', type: 'function' as const, function: { name: 'fides_check', arguments: args } }];
    const out = await executeOpenAIChat(tools, calls);
    expect(out).toEqual([{ role: 'tool', tool_call_id: 'call_1', content: expect.stringContaining('"decision":"ASK"') }]);
    expect(await executeOpenRouter(tools, calls)).toHaveLength(1);
  });

  it('OpenAI Responses: function_call_output for each function_call, other items ignored', async () => {
    const { tools } = setup();
    const out = await executeOpenAIResponses(tools, [
      { type: 'reasoning' },
      { type: 'function_call', call_id: 'call_9', name: 'fides_check', arguments: args },
      { type: 'message' },
    ]);
    expect(out).toEqual([{ type: 'function_call_output', call_id: 'call_9', output: expect.stringContaining('"decision":"ASK"') }]);
  });

  it('Anthropic: tool_result per tool_use, with is_error on a failure', async () => {
    const { tools } = setup();
    const out = await executeAnthropic(tools, [
      { type: 'text' },
      { type: 'tool_use', id: 'toolu_1', name: 'fides_check', input: checkArgs() },
      { type: 'tool_use', id: 'toolu_2', name: 'fides_check', input: { merchantHost: 'x' } },
    ]);
    expect(out[0]).toEqual({ type: 'tool_result', tool_use_id: 'toolu_1', content: expect.stringContaining('"decision":"ASK"') });
    expect(out[1]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_2', is_error: true });
  });

  it('Gemini: functionResponse parts, an error as an error field', async () => {
    const { tools } = setup();
    const out = await executeGemini(tools, [{ name: 'fides_check', args: checkArgs(), id: 'g1' }, { name: 'fides_check', args: {} }]);
    expect(out[0]).toMatchObject({ functionResponse: { name: 'fides_check', id: 'g1', response: { decision: 'ASK' } } });
    expect(out[1]!.functionResponse.response).toHaveProperty('error');
  });

  it('Gemini Interactions: function_result steps', async () => {
    const { tools } = setup();
    const out = await executeGeminiInteractions(tools, [{ type: 'function_call', id: 's1', name: 'fides_check', arguments: checkArgs() }]);
    expect(out[0]).toMatchObject({ type: 'function_result', name: 'fides_check', call_id: 's1', result: [{ type: 'text', text: expect.stringContaining('ASK') }] });
  });

  it('parallel calls all run', async () => {
    const { tools } = setup();
    const out = await executeOpenAIChat(tools, [
      { id: 'a', function: { name: 'fides_check', arguments: args } },
      { id: 'b', function: { name: 'fides_lookup', arguments: JSON.stringify({ merchantHost: MERCHANT_HOST }) } },
    ]);
    expect(out.map((m) => m.tool_call_id)).toEqual(['a', 'b']);
  });
});

describe('the system prompt', () => {
  it('tells a model the order, never to pay on REFUSE or an error, and has no em dashes', () => {
    expect(FIDES_AGENT_PROMPT).toMatch(/fides_check/);
    expect(FIDES_AGENT_PROMPT).toMatch(/REFUSE: do not pay/);
    expect(FIDES_AGENT_PROMPT).toMatch(/Do not pay on an error/);
    expect(FIDES_AGENT_PROMPT).not.toMatch(/—/);
  });
});
