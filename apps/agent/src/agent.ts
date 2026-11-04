// A paying agent (SPEC section 6): request a resource, read the 402, ask Fides whether to pay, pay, check what came
// back against the merchant's published schema, and report the outcome. One call, `buy(url)`, does the whole loop.
//
// The agent never pays on its own authority when Fides says ASK: it hands the question to `askPolicy` (a human in real
// life, a script in the demo). REFUSE is never overridden.
import { parseAmount } from '@fides/core';
import {
  evaluateExchange,
  hashRequest,
  type CheckResult,
  type Exchange,
  type Fides,
  type ReportReceipt,
  type SchemaDoc,
} from '@fides/sdk';
import { PaymentNotSentError, readChallenge, type Payer } from './mpp.js';

export type DecisionName = 'PAY' | 'PAY_CAPPED' | 'ASK' | 'REFUSE';

export interface AskContext {
  agent: string;
  host: string;
  url: string;
  amount: string;
  check: CheckResult;
}
/** Decide an ASK. A person in real life; a script in the demo. The default declines. */
export type AskPolicy = (ctx: AskContext) => boolean | Promise<boolean>;

export type AgentEvent =
  | { type: 'challenge'; agent: string; url: string; host: string; amount: string; recipient: string }
  | { type: 'check'; agent: string; host: string; decision: DecisionName; rules: string[]; reasons: string[]; evidenceIds: string[]; memoryBlobIds: string[]; sharedState: string; rejected: number; pending: number; tier: string; confidence: number; cannotSay: boolean }
  | { type: 'asked'; agent: string; host: string; approved: boolean }
  | { type: 'paid'; agent: string; host: string; txDigest: string }
  | { type: 'response'; agent: string; host: string; status: number | null; latencyMs: number; checks: Exchange['checks']; problems: string[] }
  | { type: 'reported'; agent: string; host: string; status: 'complete' | 'partial'; evidenceId: string; verdict: 'clean' | 'burned' }
  | { type: 'skipped'; agent: string; host: string | null; why: string }
  | { type: 'error'; agent: string; host: string | null; message: string };

export interface BuyResult {
  agent: string;
  url: string;
  host: string | null;
  decision: DecisionName | null;
  /** The answer to an ASK, null when nothing was asked. */
  approved: boolean | null;
  paid: boolean;
  txDigest?: string;
  status?: number | null;
  exchange?: Exchange;
  check?: CheckResult;
  receipt?: ReportReceipt;
  /** The payment happened but reporting it failed. It is queued: call retryUnreported(). */
  reportError?: string;
  /** Why nothing was paid, or what went wrong. */
  error?: string;
}

export interface AgentOptions {
  name: string;
  fides: Fides;
  payer: Payer;
  askPolicy?: AskPolicy;
  fetchImpl?: typeof fetch;
  /** The longest the agent waits for a paid response before calling it a failure to deliver. Default 5 s. */
  maxLatencyMs?: number;
  now?: () => number;
  onEvent?: (e: AgentEvent) => void;
  /** Finality lags the payment by a moment: reporting is retried this many times, this far apart. Defaults 6 and 2 s. */
  reportAttempts?: number;
  reportDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const TRANSIENT = /does not exist|not final/;
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

export class PayingAgent {
  private o: Required<Omit<AgentOptions, 'onEvent' | 'askPolicy'>> & Pick<AgentOptions, 'onEvent' | 'askPolicy'>;
  private seq = 0;
  readonly events: AgentEvent[] = [];

  constructor(opts: AgentOptions) {
    this.o = {
      fetchImpl: fetch,
      maxLatencyMs: 5000,
      now: () => Date.now(),
      reportAttempts: 6,
      reportDelayMs: 2000,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      ...opts,
    };
  }

  get name(): string {
    return this.o.name;
  }
  get fides(): Fides {
    return this.o.fides;
  }

  private emit(e: AgentEvent): void {
    this.events.push(e);
    this.o.onEvent?.(e);
  }

  /** Fetch a merchant's published schema. Without one the agent cannot check a response, so it does not pay. */
  private async schemaFor(origin: string): Promise<SchemaDoc> {
    const res = await this.o.fetchImpl(`${origin}/.well-known/fides-schema.json`);
    if (!res.ok) throw new Error(`merchant publishes no schema (HTTP ${res.status})`);
    const d = (await res.json()) as Partial<SchemaDoc>;
    if (!d.host || !d.schema || typeof d.maxAgeSeconds !== 'number' || !d.data) throw new Error('merchant schema document is malformed');
    return d as SchemaDoc;
  }

  /** Report every payment that could not be reported earlier. One pass. */
  retryUnreported() {
    return this.o.fides.retryUnreported();
  }

  /** Settle payments whose outcome was unknown, from the chain. One pass. */
  reconcileUnknown(o?: { graceMs?: number }) {
    return this.o.fides.reconcileUnknown(o);
  }

  async buy(url: string): Promise<BuyResult> {
    const agent = this.name;
    const fail = (error: string, host: string | null, extra: Partial<BuyResult> = {}): BuyResult => {
      this.emit({ type: 'error', agent, host, message: error });
      return { agent, url, host, decision: null, approved: null, paid: false, error, ...extra };
    };

    // 1. Ask for the resource. Anything but a 402 is not something to pay for.
    let probe: Response;
    try {
      probe = await this.o.fetchImpl(url);
    } catch (e) {
      return fail(`request failed: ${(e as Error).message}`, null);
    }
    if (probe.status !== 402) {
      this.emit({ type: 'skipped', agent, host: null, why: `HTTP ${probe.status}, no payment requested` });
      return { agent, url, host: null, decision: null, approved: null, paid: false, status: probe.status, error: `no payment requested (HTTP ${probe.status})` };
    }

    // 2. What is being asked, and what a good answer looks like.
    let challenge, doc: SchemaDoc;
    try {
      challenge = readChallenge(probe);
      doc = await this.schemaFor(new URL(url).origin);
    } catch (e) {
      return fail((e as Error).message, null);
    }
    // Whose reputation is this? The host the agent actually connected to, never just the name the merchant gives itself.
    // Loopback is the one exception: the local mock merchants all run on 127.0.0.1 and name themselves in their schema.
    const urlHost = new URL(url).hostname.toLowerCase();
    const host = doc.host.toLowerCase();
    if (!LOOPBACK.has(urlHost) && host !== urlHost) {
      return fail(`merchant at ${urlHost} claims to be ${host}: not paid`, urlHost);
    }
    this.emit({ type: 'challenge', agent, url, host, amount: challenge.amount, recipient: challenge.recipient });

    // 3. Should I pay? Reserve the spend atomically when the answer is yes.
    const key = `${agent}:${host}:${this.o.now()}:${++this.seq}`;
    const input = { ownerId: agent, merchantHost: host, payTo: challenge.recipient, amount: challenge.amount, asset: challenge.currency, network: 'sui', resource: new URL(url).pathname };
    let check: CheckResult;
    try {
      check = await this.o.fides.check(input, { idempotencyKey: key });
    } catch (e) {
      return fail(`check failed: ${(e as Error).message}`, host);
    }
    const v = check.verdict;
    this.emit({
      type: 'check', agent, host, decision: v.decision, rules: v.rulesFired, reasons: v.reasons,
      evidenceIds: v.citations.evidenceIds, memoryBlobIds: v.citations.memoryBlobIds, sharedState: check.sharedState,
      rejected: check.rejected.length, pending: check.pending, tier: v.tier, confidence: v.confidence, cannotSay: v.cannotSay,
    });

    let approved: boolean | null = null;
    if (v.decision === 'REFUSE') {
      this.emit({ type: 'skipped', agent, host, why: 'refused' });
      return { agent, url, host, decision: v.decision, approved, paid: false, check, error: 'refused' };
    }
    if (v.decision === 'ASK') {
      approved = await (this.o.askPolicy ?? (() => false))({ agent, host, url, amount: challenge.amount, check });
      this.emit({ type: 'asked', agent, host, approved });
      if (!approved) return { agent, url, host, decision: v.decision, approved, paid: false, check, error: 'asked, not approved' };
      this.o.fides.approve(input, key);
    }

    // 4. Pay. The payment happens here, before anything is known about the answer.
    let authorization: string, txDigest: string;
    try {
      ({ authorization, txDigest } = await this.o.payer.pay(probe));
    } catch (e) {
      if (e instanceof PaymentNotSentError) {
        this.o.fides.release(key);
        return fail(`payment failed: ${e.message}`, host, { decision: v.decision, approved, check });
      }
      // The transfer may have reached the chain. Keep the spend counted and leave the claim for reconciliation.
      this.o.fides.markUnknown(key);
      return fail(`payment outcome unknown, spend kept until reconciled: ${(e as Error).message}`, host, { decision: v.decision, approved, check });
    }
    this.emit({ type: 'paid', agent, host, txDigest });
    this.o.fides.log({ level: 'info', op: 'payment.sent', msg: `${agent} paid ${challenge.amount}`, key, host, txDigest });

    // 5. The paid request, with a deadline. No answer in time is a failure to deliver, not an error.
    const t0 = this.o.now();
    let status: number | null = null;
    let bodyText: string | null = null;
    try {
      const res = await this.o.fetchImpl(url, { headers: { authorization }, signal: AbortSignal.timeout(this.o.maxLatencyMs) });
      status = res.status;
      const text = await res.text();
      bodyText = res.status === 200 ? text : null;
    } catch (e) {
      bodyText = null; // timed out or connection lost after paying: judged below as a failure to deliver
      this.o.fides.log({ level: 'warn', op: 'response.failed', msg: 'no answer after paying', key, host, txDigest, err: (e as Error).message });
    }
    const latencyMs = this.o.now() - t0;

    // 6. Judge the answer against what the merchant advertised.
    const quotedRaw = parseAmount(challenge.amount);
    const pinned = this.o.fides.lookup(host).pinnedPayTo ?? challenge.recipient;
    const ex = evaluateExchange({ doc, bodyText, nowMs: this.o.now(), latencyMs, maxLatencyMs: this.o.maxLatencyMs, quotedRaw, paidRaw: quotedRaw, payTo: challenge.recipient, pinnedPayTo: pinned });
    this.emit({ type: 'response', agent, host, status, latencyMs, checks: ex.checks, problems: ex.problems });

    // 7. Report it. Finality can lag the payment, so a not-final-yet answer is retried a few times, never polled forever.
    const issuedAt = new Date(this.o.now()).toISOString();
    const outcome = {
      merchantHost: host, payTo: challenge.recipient, txDigest, amount: quotedRaw.toString(), quotedAmount: quotedRaw.toString(),
      asset: challenge.currency, requestHash: hashRequest('GET', url), responseHash: ex.responseHash, responseBytes: ex.responseBytes,
      latencyMs, checks: ex.checks, issuedAt, idempotencyKey: key, ownerId: agent,
    };
    let receipt: ReportReceipt | undefined;
    let reportError: string | undefined;
    for (let attempt = 1; attempt <= this.o.reportAttempts; attempt++) {
      try {
        receipt = await this.o.fides.report(outcome);
        reportError = undefined;
        break;
      } catch (e) {
        reportError = (e as Error).message;
        if (!TRANSIENT.test(reportError) || attempt === this.o.reportAttempts) break;
        await this.o.sleep(this.o.reportDelayMs);
      }
    }
    if (receipt) {
      this.emit({ type: 'reported', agent, host, status: receipt.status, evidenceId: receipt.evidenceId, verdict: Object.values(ex.checks).every(Boolean) ? 'clean' : 'burned' });
      if (receipt.status !== 'complete') {
        // Signed, but not anchored or not shared yet. Others cannot see it until it is: queue it so the retry finishes the job.
        const why = [receipt.steps.anchor.error, receipt.steps.memory.error, receipt.steps.memory.skipped].filter(Boolean).join('; ') || 'report only partly written';
        this.o.fides.queueUnreported(outcome, why);
        this.emit({ type: 'error', agent, host, message: `report only partly written, queued for retry: ${why}` });
      }
    } else {
      // The payment happened and must not be forgotten: queue it so retryUnreported() reports it later.
      this.o.fides.queueUnreported(outcome, reportError ?? 'unknown error');
      this.emit({ type: 'error', agent, host, message: `payment made but not reported yet, queued for retry: ${reportError}` });
    }
    return { agent, url, host, decision: v.decision, approved, paid: true, txDigest, status, exchange: ex, check, ...(receipt ? { receipt } : {}), ...(reportError ? { reportError } : {}) };
  }
}
