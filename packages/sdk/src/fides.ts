// The Fides SDK (SPEC sections 6, 8, 9): fides.check() before paying, fides.report() after.
// It ties the engine (core), exact state, evidence, the shared record (Walrus Memory) and Sui/Tatum together.
//
//  check():  gather facts -> verify every new shared report at read time -> decide() -> optionally reserve the spend.
//  report(): verify the payment through Tatum and past finality -> sign evidence -> anchor on Sui -> write to Walrus Memory.
//
// Fail loudly: a failed lookup is an error or a pending state, never "no reports". Anything the engine cannot be
// sure about turns a PAY into an ASK.
import type { Signer } from '@mysten/sui/cryptography';
import {
  assessMerchant,
  decide,
  parseAmount,
  type Assessment,
  type BurnKind,
  type CheckInput,
  type DecisionContext,
  type EvidenceItem,
  type FidesConfig,
  type Verdict,
} from '@fides/core';
import { signEvidence, verifyEvidence, type ChainReader, type EvidenceBody } from '@fides/evidence';
import { buildSituationQuery, type RecalledReport, type SharedRecord, type SharedMode } from '@fides/memory';
import type { AnchorEvent } from '@fides/chain';
import type { EvidenceRow, FidesState } from '@fides/state';
import type { Anchorer } from './anchor.js';
import { ReportVerifier, reportTimeMs, type ChainApi, type IngestResult } from './verifier.js';

export type { ChainApi } from './verifier.js';

export interface FidesDeps {
  config: FidesConfig;
  state: FidesState;
  shared: SharedRecord;
  chain: ChainApi;
  anchorer: Anchorer;
  /** This agent's Sui key. It signs evidence and pays the anchor gas. */
  signer: Signer;
  agentId: string;
  anchorPackageId: string;
  /** Written into evidence as payment.network, for example "sui-mainnet". */
  networkName: string;
  now?: () => number;
}

export interface Outcome {
  merchantHost: string;
  payTo: string;
  /** The payment transaction digest. */
  txDigest: string;
  /** Raw units actually paid, integer string. */
  amount: string;
  /** Raw units the merchant quoted, integer string. */
  quotedAmount: string;
  /** Full coin type, for example 0x...::usdc::USDC. */
  asset: string;
  requestHash: string;
  responseHash: string;
  responseBytes: number;
  latencyMs: number;
  checks: EvidenceBody['checks'];
  /** Optional. Derived from the failed checks when left out. */
  burnKind?: BurnKind;
  /** Pass the same value when retrying a partly finished report, so the evidence bytes (and digest) stay identical. */
  issuedAt?: string;
  /** The claim key given to check(). Settles the reserved spend as paid. Without it the payment is registered under its digest. */
  idempotencyKey?: string;
  /** Whose daily cap this payment counts against. Defaults to the agent id; use the same value as check()'s ownerId. */
  ownerId?: string;
  /** Memory pattern tags. Derived from the merchant's history when left out. */
  patterns?: string[];
}

export interface RejectedReport {
  blobId?: string;
  evidenceId?: string;
  reason: string;
}

export interface CheckResult {
  verdict: Verdict;
  decisionId: number;
  /** Set when an idempotency key was given and the decision allows payment. */
  claim?: { key: string; status: 'reserved' | 'duplicate' };
  sharedState: 'attached' | 'detached' | 'unreachable';
  /** Shared reports that failed verification or were not Fides reports. Shown, never believed. */
  rejected: RejectedReport[];
  /** Shared reports that could not be checked yet (a lookup failed or the payment is not final). */
  pending: number;
}

export interface ReportReceipt {
  evidenceId: string;
  status: 'complete' | 'partial';
  steps: {
    anchor: { ok: boolean; txDigest?: string; skipped?: 'already anchored'; error?: string };
    memory: { ok: boolean; blobId?: string; skipped?: 'detached' | 'anchor failed'; error?: string };
  };
}

export interface MerchantRecord {
  host: string;
  pinnedPayTo: string | null;
  assessment: Pick<Assessment, 'tier' | 'cleanCount' | 'burnCount' | 'wilson' | 'confidence' | 'cannotSay'>;
  /** Verified and rejected, so rejections stay visible. */
  evidence: EvidenceRow[];
  openAlerts: { id: number; kind: string; createdAt: number }[];
}

export class ReportError extends Error {}


/** Which burn a set of failed checks means. Priority: address, price, delivery, junk. */
export function classifyBurn(checks: EvidenceBody['checks'], override?: BurnKind): BurnKind | null {
  const failed = Object.values(checks).some((v) => !v);
  if (!failed) {
    if (override) throw new ReportError(`burnKind ${override} given but every check passed`);
    return null;
  }
  if (override) return override;
  if (!checks.payToMatchesPinned) return 'address_changed';
  if (!checks.amountMatchesQuote) return 'price_changed';
  if (!checks.onTime) return 'no_delivery';
  return 'junk';
}

/** Pattern tags for a burn, from what the merchant looked like before it burned (matched by the engine's rule 6). */
export function derivePatterns(prior: Assessment, burnKind: BurnKind | null): string[] {
  if (!burnKind) return [];
  const tags = new Set<string>();
  if (prior.tier === 'new') tags.add('new_merchant');
  if (prior.cleanCount >= 3 && prior.burnCount === 0) tags.add('clean_streak');
  if (burnKind === 'price_changed' && prior.cleanCount >= 3) tags.add('price_up_after_clean_streak');
  return [...tags];
}

const toItem = (r: EvidenceRow): EvidenceItem => ({
  id: r.evidenceId,
  reporter: r.reporter,
  verdict: r.verdict,
  burnKind: r.burnKind as EvidenceItem['burnKind'],
  issuedAtMs: r.issuedAtMs,
});

const sameAddress = (a: string, b: string) => a.toLowerCase().replace(/^0x0*/, '') === b.toLowerCase().replace(/^0x0*/, '');

/**
 * The payout address verified clean reports agree on: the one the most distinct reporters paid, newest report breaking a
 * tie. One reporter paying a wallet of their own cannot outvote several who paid the real merchant.
 */
export function agreedPayTo(cleanRows: EvidenceRow[]): string | null {
  const by = new Map<string, { addr: string; reporters: Set<string>; latest: number }>();
  for (const r of cleanRows) {
    if (!r.payTo) continue;
    const k = r.payTo.toLowerCase();
    const cur = by.get(k) ?? { addr: r.payTo, reporters: new Set<string>(), latest: 0 };
    cur.reporters.add(r.reporter.toLowerCase());
    cur.latest = Math.max(cur.latest, r.issuedAtMs);
    by.set(k, cur);
  }
  const best = [...by.values()].sort((x, y) => y.reporters.size - x.reporters.size || y.latest - x.latest)[0];
  return best?.addr ?? null;
}

export class Fides {
  private d: FidesDeps;
  private now: () => number;
  private verifier: ReportVerifier;

  constructor(deps: FidesDeps) {
    this.d = deps;
    this.now = deps.now ?? (() => Date.now());
    this.verifier = new ReportVerifier({ state: deps.state, chain: deps.chain, anchorPackageId: deps.anchorPackageId, maxEvidenceBytes: deps.config.maxEvidenceBytes });
  }

  get address(): string {
    return this.d.signer.toSuiAddress();
  }

  getSharedRecord(): SharedMode {
    return this.d.shared.getMode();
  }

  /** The demo's "detach shared memory". Nothing is deleted: this agent stops reading and writing the shared record. */
  setSharedRecord(mode: SharedMode): void {
    this.d.shared.setMode(mode);
  }

  /**
   * A human said yes to an ASK. Reserves the spend under the same idempotency rules as check(), but as a deliberate override:
   * the daily cap does not block a payment a person approved (it still counts toward today's spend).
   */
  approve(input: CheckInput, idempotencyKey: string): { status: 'reserved' | 'duplicate' } {
    const now = this.now();
    const r = this.d.state.reserve({
      idempotencyKey,
      owner: input.ownerId,
      merchant: input.merchantHost.toLowerCase(),
      amountRaw: parseAmount(input.amount),
      capRaw: 2n ** 62n,
      utcDate: new Date(now).toISOString().slice(0, 10),
      nowMs: now,
    });
    return { status: r.status === 'duplicate' ? 'duplicate' : 'reserved' };
  }

  /**
   * Remember a payment that was made but could not be reported (Tatum down, relayer failing), so it is not forgotten.
   * Nothing is lost: the spend is already counted. Evidence for it exists only once retryUnreported() succeeds.
   */
  queueUnreported(o: Outcome, error: string): void {
    this.d.state.queueUnreported(o.idempotencyKey ?? `tx:${o.txDigest}`, JSON.stringify(o), error, this.now());
  }

  /** Payments waiting to be reported. */
  unreported(): { key: string; outcome: Outcome; error: string; attempts: number; firstFailedAt: number }[] {
    return this.d.state.listUnreported().map((r) => ({ key: r.key, outcome: JSON.parse(r.outcomeJson) as Outcome, error: r.error, attempts: r.attempts, firstFailedAt: r.firstFailedAt }));
  }

  /** Try again to report every queued payment. Call it on a timer or at start up; one pass, no loop. */
  async retryUnreported(): Promise<{ key: string; reported: boolean; error?: string }[]> {
    const out: { key: string; reported: boolean; error?: string }[] = [];
    for (const q of this.unreported()) {
      try {
        const r = await this.report(q.outcome);
        if (r.status !== 'complete') {
          // Still not anchored or not shared: keep it queued, with the step that failed.
          const why = [r.steps.anchor.error, r.steps.memory.error, r.steps.memory.skipped].filter(Boolean).join('; ') || 'report only partly written';
          this.d.state.queueUnreported(q.key, JSON.stringify(q.outcome), why, this.now());
          out.push({ key: q.key, reported: false, error: why });
          continue;
        }
        this.d.state.clearUnreported(q.key);
        out.push({ key: q.key, reported: true });
      } catch (e) {
        const msg = (e as Error).message;
        this.d.state.queueUnreported(q.key, JSON.stringify(q.outcome), msg, this.now());
        out.push({ key: q.key, reported: false, error: msg });
      }
    }
    return out;
  }

  /** Release a reserved spend whose payment certainly never happened. */
  release(idempotencyKey: string): void {
    this.d.state.settle(idempotencyKey, 'failed');
  }

  /**
   * The payment call failed in a way that does not prove nothing was sent (a timeout, a dropped connection after broadcast).
   * The spend stays counted. Reporting the payment later settles it as paid; release() settles it as failed once the chain
   * shows no transfer.
   */
  markUnknown(idempotencyKey: string): void {
    this.d.state.settle(idempotencyKey, 'unknown');
  }

  /** Payments whose outcome is not known yet, oldest first: reconcile each against the chain. */
  unknownPayments() {
    return this.d.state.listClaims('unknown');
  }

  // ------------------------------------------------------------------ check

  /**
   * Should I pay this merchant? Pass an idempotency key to also reserve the spend atomically when the answer is PAY.
   * Without a key this is advisory and reserves nothing.
   */
  async check(input: CheckInput, o: { idempotencyKey?: string } = {}): Promise<CheckResult> {
    const { state, config, shared } = this.d;
    const now = this.now();
    const host = input.merchantHost.toLowerCase();
    const amount = parseAmount(input.amount);
    const capRaw = parseAmount(config.dailyCapUsd);
    const utcDate = new Date(now).toISOString().slice(0, 10);

    const local = state.listEvidence(host, 'verified').map(toItem);
    const counts = state.verifiedCounts();
    const prior = assessMerchant(local, counts, now, config);

    const recall = await shared.recallForMerchant(
      host,
      buildSituationQuery({ host, payTo: input.payTo, amount: input.amount, tier: prior.tier }),
    );

    const rejected: RejectedReport[] = [];
    let pending = 0;
    if (recall.state === 'attached') {
      rejected.push(...recall.rejected);
      const known = new Map(state.listEvidence(host).map((r) => [r.evidenceId, r]));
      for (const rep of recall.forHost) {
        const r = await this.ingest(rep, host, known.get(rep.header.sha256), now);
        if (r.kind === 'rejected') rejected.push({ blobId: rep.blobId, evidenceId: rep.header.sha256, reason: r.reason });
        else if (r.kind === 'pending') pending++;
      }
    }

    // The payout address to compare with. Order: what this agent pinned earlier; else what verified clean reports from the
    // shared record say the merchant was paid at (so an agent that has never met the merchant still catches a swap); else trust
    // on first use. A later change is an alert, never a silent update. Detached or unreachable: own reports only.
    const usable = state
      .listEvidence(host, 'verified')
      .filter((r) => recall.state === 'attached' || r.reporter.toLowerCase() === this.address.toLowerCase());
    const cleanRows = usable.filter((r) => r.verdict === 'clean');
    const localPin = state.getMerchant(host)?.pinnedPayTo ?? null;
    const inheritedPin = localPin ? null : agreedPayTo(cleanRows);
    const pinned = state.pinPayToIfNew(host, localPin ?? inheritedPin ?? input.payTo, now);

    // A burn only counts against this merchant if the reporter paid the merchant's address. Otherwise anyone could pay a
    // wallet of their own, name any host, and file a verified burn for the price of gas.
    const allVerified = state.listEvidence(host, 'verified');
    const offAddress = allVerified.filter((r) => r.verdict === 'burned' && r.payTo && !sameAddress(r.payTo, pinned));
    const counted = allVerified.filter((r) => !offAddress.includes(r));

    // Typical price: what this agent paid; if it never paid, what verified clean shared reports say others paid.
    const own = state.pastPaid(input.ownerId, host);
    const sharedAmounts = cleanRows.filter((r) => r.amountRaw).map((r) => BigInt(r.amountRaw!));

    const ctx: DecisionContext = {
      nowMs: now,
      selfAddress: this.address,
      spentTodayRaw: state.spentToday(input.ownerId, utcDate),
      pinnedPayTo: pinned,
      pastPaidRaw: own.length ? own : sharedAmounts,
      evidence: counted.map(toItem),
      reporterVerifiedCounts: state.verifiedCounts(),
      sharedRecord: recall.state,
      similar: recall.state === 'attached' ? recall.similar : [],
    };
    let verdict = decide(input, ctx, config);
    if (verdict.alerts.length && inheritedPin) {
      verdict = { ...verdict, reasons: [...verdict.reasons, 'the pinned address comes from verified reports in the shared record'] };
    }
    if (offAddress.length) {
      verdict = { ...verdict, reasons: [...verdict.reasons, `${offAddress.length} burn report(s) paid an address other than this merchant's: not counted`] };
    }

    // Reports we could not check yet might hold a burn: do not pay on a partial picture.
    if (pending > 0 && (verdict.decision === 'PAY' || verdict.decision === 'PAY_CAPPED')) {
      verdict = {
        ...verdict,
        decision: 'ASK',
        capAmount: undefined,
        rulesFired: [...verdict.rulesFired, 'unverified-reports'],
        reasons: [...verdict.reasons, `${pending} shared report(s) could not be verified yet: cannot rule out a burn`],
      };
      delete verdict.capAmount;
    }

    let claim: CheckResult['claim'];
    if ((verdict.decision === 'PAY' || verdict.decision === 'PAY_CAPPED') && o.idempotencyKey) {
      const r = state.reserve({ idempotencyKey: o.idempotencyKey, owner: input.ownerId, merchant: host, amountRaw: amount, capRaw, utcDate, nowMs: now });
      if (r.status === 'over_cap') {
        // Lost a race with another payment: the budget rule decides, not the earlier answer.
        verdict = { ...verdict, decision: 'ASK', rulesFired: ['budget'], reasons: ['daily cap reached by a concurrent payment'] };
        delete verdict.capAmount;
      } else {
        claim = { key: o.idempotencyKey, status: r.status };
      }
    }

    const decisionId = state.recordDecision({
      owner: input.ownerId,
      merchant: host,
      decision: verdict.decision,
      rules: verdict.rulesFired,
      citations: verdict.citations,
      confidence: verdict.confidence,
      nowMs: now,
    });
    for (const a of verdict.alerts) state.openAlert(a.merchant, a.kind, now);

    return { verdict, decisionId, ...(claim ? { claim } : {}), sharedState: recall.state, rejected, pending };
  }

  /** Read-time verification of one recalled report: see ReportVerifier. */
  private ingest(rep: RecalledReport, host: string, known: EvidenceRow | undefined, now: number): Promise<IngestResult> {
    return this.verifier.ingest(rep, host, known, now);
  }

  // ------------------------------------------------------------------ report

  /**
   * Record what happened after a payment. The payment must be verified through Tatum and past finality first
   * (the write rule); otherwise this throws and nothing is written anywhere. Then: local record, Sui anchor, Walrus Memory.
   * A step that fails is reported in the receipt (status "partial"); retry with the same Outcome (same issuedAt)
   * and only the missing steps run again.
   */
  async report(o: Outcome): Promise<ReportReceipt> {
    const { state, chain, shared, anchorer, config } = this.d;
    const now = this.now();
    const host = o.merchantHost.toLowerCase();
    if (!/^\d+$/.test(o.amount) || !/^\d+$/.test(o.quotedAmount)) throw new ReportError('amount and quotedAmount must be raw-unit integer strings');

    // 1. The write rule: nothing becomes evidence from an intention.
    const pay = await chain.getPayment(o.txDigest);
    if (!pay) throw new ReportError(`payment transaction ${o.txDigest} does not exist`);
    if (pay.status !== 'SUCCESS') throw new ReportError(`payment transaction status is ${pay.status}`);
    if (pay.checkpoint === null || pay.checkpoint === undefined) throw new ReportError('payment is not final yet (not in a checkpoint): try again shortly');
    if (pay.sender.toLowerCase() !== this.address.toLowerCase()) throw new ReportError('payment was not sent by this agent');
    const received = pay.changes
      .filter((c) => c.owner?.toLowerCase() === o.payTo.toLowerCase() && c.coinType === o.asset && c.amount > 0n)
      .reduce((s, c) => s + c.amount, 0n);
    if (received < BigInt(o.amount)) throw new ReportError(`payTo received ${received}, the outcome states ${o.amount}`);

    const issuedAt = o.issuedAt ?? new Date(now).toISOString();
    const dup = state.verifiedForPayment(this.address, o.txDigest);

    const burnKind = classifyBurn(o.checks, o.burnKind);
    const prior = assessMerchant(state.listEvidence(host, 'verified').map(toItem), state.verifiedCounts(), now, config);
    const patterns = o.patterns ?? derivePatterns(prior, burnKind);

    const body: EvidenceBody = {
      schema: 'fides.evidence/v1',
      issuedAt,
      reporter: { agentId: this.d.agentId, suiAddress: this.address },
      merchant: { host, payTo: o.payTo },
      payment: { txDigest: o.txDigest, amount: o.amount, asset: o.asset, quotedAmount: o.quotedAmount, network: this.d.networkName },
      exchange: { requestHash: o.requestHash, responseHash: o.responseHash, responseBytes: o.responseBytes, latencyMs: o.latencyMs },
      checks: o.checks,
      verdict: burnKind ? 'burned' : 'clean',
      burnKind,
      finality: { checkpoint: String(pay.checkpoint), verifiedVia: 'tatum' },
    };
    const sealed = await signEvidence(body, this.d.signer);
    const evidenceId = sealed.digest;
    // One payment, one report. A retry must pass the same Outcome (same issuedAt), which gives the same evidence id.
    if (dup && dup.evidenceId !== evidenceId) throw new ReportError(`payment ${o.txDigest} is already reported as evidence ${dup.evidenceId}: retry with the same issuedAt`);

    // 2. Local record first: our own exact state never depends on the network steps below.
    const existing = state.listEvidence(host).find((r) => r.evidenceId === evidenceId);
    const row = (anchorTx: string | null): EvidenceRow => ({
      evidenceId,
      merchant: host,
      reporter: this.address,
      sha256: evidenceId,
      txDigest: o.txDigest,
      anchorTx,
      verdict: body.verdict,
      burnKind: body.burnKind,
      issuedAtMs: reportTimeMs(body.issuedAt, pay),
      status: 'verified',
      rejectReason: null,
      verifiedAt: now,
      payTo: o.payTo,
      amountRaw: o.amount,
    });
    state.upsertEvidence(row(existing?.anchorTx ?? null));
    state.pinPayToIfNew(host, o.payTo, now); // the address we actually paid, if check() never pinned one

    // The payment really happened (verified above), so it counts toward today's spend and the typical-price history
    // whether or not check() reserved it. A reserved claim is settled; a missing one is created (the cap cannot undo a payment).
    const claimKey = o.idempotencyKey ?? `tx:${o.txDigest}`;
    state.reserve({
      idempotencyKey: claimKey,
      owner: o.ownerId ?? this.d.agentId,
      merchant: host,
      amountRaw: BigInt(o.amount),
      capRaw: 2n ** 62n,
      utcDate: new Date(now).toISOString().slice(0, 10),
      nowMs: now,
    });
    try {
      state.settle(claimKey, 'paid');
    } catch (e) {
      if (!/not reserved/.test((e as Error).message)) throw e; // already settled on an earlier attempt
    }

    // 3. Anchor on Sui. The anchor must exist before the memory does, so a reader never sees a memory it cannot check.
    const steps: ReportReceipt['steps'] = { anchor: { ok: false }, memory: { ok: false } };
    if (existing?.anchorTx) {
      steps.anchor = { ok: true, txDigest: existing.anchorTx, skipped: 'already anchored' };
    } else {
      try {
        const { txDigest } = await anchorer.report({ merchant: host, evidenceSha256: evidenceId, payTxDigest: o.txDigest, verdict: body.verdict });
        state.upsertEvidence(row(txDigest));
        steps.anchor = { ok: true, txDigest };
      } catch (e) {
        steps.anchor = { ok: false, error: (e as Error).message };
      }
    }

    // 4. Walrus Memory (the shared record).
    if (!steps.anchor.ok) {
      steps.memory = { ok: false, skipped: 'anchor failed' };
    } else {
      try {
        const w = await shared.writeReport(sealed, patterns);
        steps.memory = w.written ? { ok: true, blobId: w.blobId } : { ok: true, skipped: 'detached' };
      } catch (e) {
        steps.memory = { ok: false, error: (e as Error).message };
      }
    }
    return { evidenceId, status: steps.anchor.ok && steps.memory.ok ? 'complete' : 'partial', steps };
  }

  // ------------------------------------------------------------------ lookup

  /** Everything known locally about a merchant: tier, verified and rejected evidence, open alerts. */
  lookup(hostIn: string): MerchantRecord {
    const { state, config } = this.d;
    const host = hostIn.toLowerCase();
    const evidence = state.listEvidence(host);
    const a = assessMerchant(evidence.filter((r) => r.status === 'verified').map(toItem), state.verifiedCounts(), this.now(), config);
    return {
      host,
      pinnedPayTo: state.getMerchant(host)?.pinnedPayTo ?? null,
      assessment: { tier: a.tier, cleanCount: a.cleanCount, burnCount: a.burnCount, wilson: a.wilson, confidence: a.confidence, cannotSay: a.cannotSay },
      evidence,
      openAlerts: state.openAlerts(host).map((x) => ({ id: x.id, kind: x.kind, createdAt: x.createdAt })),
    };
  }
}
