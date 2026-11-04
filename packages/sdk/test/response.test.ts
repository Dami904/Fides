import { describe, expect, it } from 'vitest';
import { sha256Hex, toBytes } from '@fides/evidence';
import { checkResponse, evaluateExchange, hashRequest, type SchemaDoc } from '../src/response.js';

const NOW = Date.UTC(2026, 9, 28, 12, 0, 0);
const doc: SchemaDoc = { host: 'good.fides-demo.test', schema: 'fides.prices/v1', maxAgeSeconds: 60, data: { prices: 'object' } };
const PAYTO = '0x' + 'ab'.repeat(32);
const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ schema: 'fides.prices/v1', asOf: new Date(NOW - 5000).toISOString(), data: { prices: { SUI: 1.2 } }, ...over });

describe('checkResponse', () => {
  it('a response that matches the schema and is fresh passes', () => {
    expect(checkResponse(doc, body(), NOW)).toEqual({ schemaValid: true, fresh: true, problems: [] });
  });
  it('no response at all fails both', () => {
    expect(checkResponse(doc, null, NOW)).toMatchObject({ schemaValid: false, fresh: false });
  });
  it('not JSON, or not an object', () => {
    expect(checkResponse(doc, '<html>', NOW).problems).toEqual(['response is not JSON']);
    expect(checkResponse(doc, '[1,2]', NOW).problems).toEqual(['response is not a JSON object']);
  });
  it('wrong schema id: junk', () => {
    const r = checkResponse(doc, body({ schema: 'wrong/v0' }), NOW);
    expect(r.schemaValid).toBe(false);
    expect(r.fresh).toBe(true);
  });
  it('missing or mistyped data keys: junk', () => {
    expect(checkResponse(doc, body({ data: {} }), NOW).schemaValid).toBe(false);
    expect(checkResponse(doc, body({ data: { prices: 'x' } }), NOW).problems[0]).toMatch(/data\.prices is string, expected object/);
    expect(checkResponse(doc, body({ data: null }), NOW).problems[0]).toMatch(/data is missing/);
  });
  it('stale asOf fails freshness only', () => {
    const r = checkResponse(doc, body({ asOf: new Date(NOW - 3_600_000).toISOString() }), NOW);
    expect(r).toMatchObject({ schemaValid: true, fresh: false });
    expect(r.problems[0]).toMatch(/3600 s old/);
  });
  it('exactly the maximum age is still fresh; one second more is not', () => {
    expect(checkResponse(doc, body({ asOf: new Date(NOW - 60_000).toISOString() }), NOW).fresh).toBe(true);
    expect(checkResponse(doc, body({ asOf: new Date(NOW - 61_000).toISOString() }), NOW).fresh).toBe(false);
  });
  it('a missing or future asOf is not fresh', () => {
    expect(checkResponse(doc, body({ asOf: undefined }), NOW).fresh).toBe(false);
    expect(checkResponse(doc, body({ asOf: new Date(NOW + 60_000).toISOString() }), NOW).problems[0]).toMatch(/future/);
  });
});

describe('evaluateExchange', () => {
  const base = { doc, nowMs: NOW, latencyMs: 300, maxLatencyMs: 5000, quotedRaw: 10_000n, paidRaw: 10_000n, payTo: PAYTO, pinnedPayTo: PAYTO };
  it('a clean exchange passes all five checks and hashes the response bytes', () => {
    const b = body();
    const e = evaluateExchange({ ...base, bodyText: b });
    expect(e.checks).toEqual({ schemaValid: true, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true });
    expect(e.responseHash).toBe(sha256Hex(toBytes(b)));
    expect(e.responseBytes).toBe(toBytes(b).length);
    expect(e.problems).toEqual([]);
  });
  it('a timeout (no body) fails schema, freshness and timeliness', () => {
    const e = evaluateExchange({ ...base, bodyText: null, latencyMs: 5000 });
    expect(e.checks).toMatchObject({ schemaValid: false, fresh: false, onTime: false });
    expect(e.problems.join(' ')).toMatch(/no response within 5000 ms/);
    expect(e.responseBytes).toBe(0);
  });
  it('a response that arrives too late is not on time even if valid', () => {
    expect(evaluateExchange({ ...base, bodyText: body(), latencyMs: 15_000 }).checks.onTime).toBe(false);
  });
  it('paid more than quoted fails the amount check', () => {
    const e = evaluateExchange({ ...base, bodyText: body(), paidRaw: 40_000n });
    expect(e.checks.amountMatchesQuote).toBe(false);
  });
  it('a different payout address fails the pinned check, ignoring case and padding', () => {
    expect(evaluateExchange({ ...base, bodyText: body(), payTo: '0x' + 'cd'.repeat(32) }).checks.payToMatchesPinned).toBe(false);
    expect(evaluateExchange({ ...base, bodyText: body(), payTo: PAYTO.toUpperCase().replace('0X', '0x') }).checks.payToMatchesPinned).toBe(true);
  });
  it('hashRequest is stable', () => {
    expect(hashRequest('GET', 'http://x/y')).toBe(sha256Hex(toBytes('GET http://x/y')));
  });
});
