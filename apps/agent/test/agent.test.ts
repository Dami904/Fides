import { afterEach, describe, expect, it } from 'vitest';
import type { Fides } from '@fides/sdk';
import { PayingAgent, type AgentEvent } from '../src/agent.js';
import { digestOfCredential, PaymentNotSentError, readChallenge } from '../src/mpp.js';
import { runDemo } from '../src/demo.js';
import { simHarness, type Harness } from '../src/harness.js';

const open: Harness[] = [];
afterEach(async () => {
  while (open.length) await open.pop()!.close();
});
const sim = async (o: Parameters<typeof simHarness>[0] = {}) => {
  const h = await simHarness(o);
  open.push(h);
  return h;
};
const yes = () => true;

describe('the whole demo, simulated', () => {
  it('meets every expectation of SPEC section 17', async () => {
    const h = await sim();
    const lines: string[] = [];
    const r = await runDemo(h, { log: (l) => lines.push(l) });
    const failed = r.steps.flatMap((s) => s.expectations.filter((e) => !e.ok).map((e) => `step ${s.id}: ${e.label} ${e.detail ?? ''}`));
    expect(failed).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.steps.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const unreachable = lines.filter((l) => l.includes('shared record unreachable')).join('\n');
    expect(unreachable).toMatch(/shared record unreachable: ASK/); // told the record is unreachable, and asked rather than paid
    // B stayed whole while attached and lost the same as the others once detached
    expect(r.lost).toEqual({ A: 10_000n, B: 10_000n, C: 10_000n });
    expect(lines.join('\n')).not.toMatch(/â€”/); // no em dashes in user-facing copy
  }, 60_000);
});

describe('buy: one purchase', () => {
  it('an ASK that nobody approves is not paid, and spends nothing', async () => {
    const h = await sim();
    const a = h.makeAgent('A', () => false);
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r).toMatchObject({ decision: 'ASK', approved: false, paid: false, error: 'asked, not approved' });
    expect((await h.merchants.good.state()).paidCalls).toBe(0);
  });

  it('the default policy declines an ASK: an agent never pays on its own authority', async () => {
    const h = await sim();
    const a = h.makeAgent('A', undefined as never);
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r.paid).toBe(false);
  });

  it('an approved ASK pays, judges the answer, reports it, and emits its events in order', async () => {
    const h = await sim();
    const events: AgentEvent[] = [];
    const a = h.makeAgent('A', yes, (e) => events.push(e));
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r).toMatchObject({ decision: 'ASK', approved: true, paid: true, status: 200 });
    expect(Object.values(r.exchange!.checks).every(Boolean)).toBe(true);
    expect(r.receipt?.status).toBe('complete');
    expect(events.map((e) => e.type)).toEqual(['challenge', 'check', 'asked', 'paid', 'response', 'reported']);
    expect(a.fides.lookup(h.merchants.good.host).assessment.cleanCount).toBe(1);
  });

  it('something that is not a 402 is not paid for', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes);
    const r = await a.agent.buy(h.merchants.good.url + '/health');
    expect(r).toMatchObject({ paid: false, status: 200 });
    expect(r.error).toMatch(/no payment requested/);
  });

  it('a merchant that publishes no schema is not paid: its answer could not be checked', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes);
    const real = globalThis.fetch;
    const agent = new PayingAgent({ name: 'A', fides: a.fides, payer: { pay: async () => { throw new Error('must not pay'); } }, askPolicy: yes, fetchImpl: (async (u: string, i?: RequestInit) => (String(u).includes('fides-schema') ? new Response('nope', { status: 404 }) : real(u, i))) as typeof fetch });
    const r = await agent.buy(h.merchants.good.resource);
    expect(r.paid).toBe(false);
    expect(r.error).toMatch(/publishes no schema/);
  });

  it('a payment that certainly was not sent releases the reserved spend and reports an error', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes, undefined, { payer: { pay: async () => { throw new PaymentNotSentError('insufficient funds'); } } });
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r.paid).toBe(false);
    expect(r.error).toMatch(/payment failed: insufficient funds/);
    expect(a.fides.lookup(h.merchants.good.host).evidence).toEqual([]); // nothing was paid, so nothing is reported
    // the reservation was released: asking again gets the same answer, not a budget refusal from phantom spend
    const again = await a.agent.buy(h.merchants.good.resource);
    expect(again.check?.verdict.rulesFired).not.toContain('budget');
    expect(again.error).toMatch(/payment failed/);
  });

  it('a payment that fails in an unknown way (a timeout after broadcast) keeps its spend for reconciliation', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes, undefined, { payer: { pay: async () => { throw new Error('deadline exceeded'); } } });
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r.paid).toBe(false);
    expect(r.error).toMatch(/payment outcome unknown, spend kept until reconciled: deadline exceeded/);
    expect(a.fides.unknownPayments()).toHaveLength(1);
  });

  it('a merchant whose schema names a different host than the one called is not paid', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes);
    const real = globalThis.fetch;
    const target = new URL(h.merchants.good.resource);
    // The agent calls evil.test; the request reaches the good merchant, whose schema says it is good's host.
    const viaEvil = (async (u: string, i?: RequestInit) => {
      const x = new URL(String(u));
      x.protocol = target.protocol; x.host = target.host;
      return real(x, i);
    }) as typeof fetch;
    const agent = new PayingAgent({ name: 'A', fides: a.fides, payer: { pay: async () => { throw new Error('must not pay'); } }, askPolicy: yes, fetchImpl: viaEvil });
    const r = await agent.buy(`http://evil.test${target.pathname}`);
    expect(r.paid).toBe(false);
    expect(r.error).toBe(`merchant at evil.test claims to be ${h.merchants.good.host}: not paid`);
  });

  it('a report that is only partly written (memory down) is queued so the retry finishes it', async () => {
    const h = await sim();
    const a = h.makeAgent('A', yes);
    h.setMemoryDown(true);
    const r = await a.agent.buy(h.merchants.good.resource);
    expect(r.paid).toBe(true);
    expect(r.receipt?.status).toBe('partial');
    expect(a.fides.unreported()).toHaveLength(1);
  });

  it('a merchant that takes the money and answers too late is a burn: no_delivery', async () => {
    const h = await sim({ flakyTimeoutMs: 1500 });
    await h.merchants.flaky.admin('/admin/flaky', { force: 'timeout' });
    const a = h.makeAgent('A', yes, undefined, { maxLatencyMs: 300 });
    const r = await a.agent.buy(h.merchants.flaky.resource);
    expect(r.paid).toBe(true);
    expect(r.exchange!.checks).toMatchObject({ onTime: false, schemaValid: false });
    expect(r.receipt?.status).toBe('complete');
    const ev = a.fides.lookup(h.merchants.flaky.host).evidence[0]!;
    expect(ev).toMatchObject({ verdict: 'burned', burnKind: 'no_delivery' });
  });

  it('REFUSE is never overridden by a person: two own burns, then it will not pay', async () => {
    const h = await sim();
    await h.merchants.flaky.admin('/admin/flaky', { force: 'junk' });
    const a = h.makeAgent('A', yes);
    await a.agent.buy(h.merchants.flaky.resource);
    await a.agent.buy(h.merchants.flaky.resource);
    const r = await a.agent.buy(h.merchants.flaky.resource);
    expect(r).toMatchObject({ decision: 'REFUSE', paid: false, error: 'refused' });
    expect((await h.merchants.flaky.state()).paidCalls).toBe(2);
  });

});

describe('reporting retries only while finality lags', () => {
  const stub = (errors: string[]) => {
    let calls = 0;
    const queued: string[] = [];
    const fides = {
      check: async () => ({ verdict: { decision: 'PAY', rulesFired: ['tier'], reasons: [], citations: { evidenceIds: [], memoryBlobIds: [] }, tier: 'established', cannotSay: false, confidence: 1, alerts: [] }, sharedState: 'attached', rejected: [], pending: 0, decisionId: 1 }),
      approve: () => ({ status: 'reserved' }),
      release: () => undefined,
      queueUnreported: (_o: unknown, e: string) => queued.push(e),
      lookup: () => ({ pinnedPayTo: null }),
      report: async () => {
        const e = errors[calls++];
        if (e) throw new Error(e);
        return { evidenceId: 'e'.repeat(64), status: 'complete', steps: { anchor: { ok: true }, memory: { ok: true } } };
      },
    } as unknown as Fides;
    return { fides, calls: () => calls, queued };
  };
  const run = async (errors: string[], attempts = 3) => {
    const h = await sim();
    const s = stub(errors);
    const a = h.makeAgent('A', yes, undefined, { fides: s.fides, reportAttempts: attempts });
    const r = await a.agent.buy(h.merchants.good.resource);
    return { r, calls: s.calls(), queued: s.queued };
  };

  it('retries "not final yet" and then succeeds', async () => {
    const { r, calls } = await run(['payment is not final yet', 'payment transaction X does not exist']);
    expect(calls).toBe(3);
    expect(r.receipt?.status).toBe('complete');
  });
  it('gives up after the attempts and says the payment was made but not reported', async () => {
    const { r, calls, queued } = await run(['payment is not final yet', 'payment is not final yet', 'payment is not final yet']);
    expect(calls).toBe(3);
    expect(r.paid).toBe(true);
    expect(r.reportError).toMatch(/not final/);
    expect(r.receipt).toBeUndefined();
    expect(queued).toHaveLength(1); // not forgotten: queued for a later retry
  });
  it('does not retry any other error', async () => {
    const { r, calls } = await run(['payment was not sent by this agent']);
    expect(calls).toBe(1);
    expect(r.reportError).toMatch(/not sent by this agent/);
  });
});

describe('mpp helpers', () => {
  it('reads the amount, currency and recipient from a 402', () => {
    const request = Buffer.from(JSON.stringify({ amount: '0.01', currency: '0xabc::usdc::USDC', recipient: '0x1' })).toString('base64url');
    const res = new Response('', { status: 402, headers: { 'www-authenticate': `Payment id="x", request="${request}"` } });
    expect(readChallenge(res)).toEqual({ amount: '0.01', currency: '0xabc::usdc::USDC', recipient: '0x1' });
  });
  it('rejects a 402 without a payment request or with missing fields', () => {
    expect(() => readChallenge(new Response('', { status: 402 }))).toThrow(/no payment request/);
    const bad = Buffer.from(JSON.stringify({ amount: '0.01' })).toString('base64url');
    expect(() => readChallenge(new Response('', { headers: { 'www-authenticate': `Payment request="${bad}"` } }))).toThrow(/missing/);
  });
  it('reads the payment digest out of a credential', () => {
    const cred = Buffer.from(JSON.stringify({ challenge: {}, payload: { digest: 'DIGEST1', signature: 's' } })).toString('base64url');
    expect(digestOfCredential(`Payment ${cred}`)).toBe('DIGEST1');
    expect(() => digestOfCredential('Payment ' + Buffer.from('{}').toString('base64url'))).toThrow(/no payment digest/);
  });
});
