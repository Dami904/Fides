// Read-time verification of recalled shared reports (SPEC section 8), with a local cache so each is checked once.
// Used by the SDK (every check) and by the registry service. A rejection is stored and shown. A transient failure
// (a lookup error, a payment not final yet) is neither believed nor rejected: it stays pending.
import { verifyEvidence, type ChainReader, type PaymentFacts } from '@fides/evidence';
import type { RecalledReport } from '@fides/memory';
import type { AnchorEvent } from '@fides/chain';
import type { EvidenceRow, FidesState } from '@fides/state';

export interface ChainApi extends ChainReader {
  findAnchor(o: { packageId: string; evidenceSha256: string; reporter?: string }): Promise<AnchorEvent | null>;
  /** Transactions an address sent since a time, newest first. Needed only to reconcile unknown payments. */
  sentSince?(sender: string, sinceMs: number): Promise<(PaymentFacts & { digest: string })[]>;
  /** Anchor events, newest first, one page at a time. Lets the registry see reports anchored on Sui that recall missed. */
  listAnchors?(o: { packageId: string; sender?: string; pageSize?: number; before?: string }): Promise<{ anchors: AnchorEvent[]; cursor: string | null; hasMore: boolean }>;
}

/** A report with no anchor yet may just be waiting for the index: it is checked again after this long. */
export const RECHECK_AFTER_MS = 5 * 60_000;
export const NO_ANCHOR = 'no anchor event found for this evidence (it may not be indexed yet)';

/**
 * When a report counts from, for decay and the window: its signed issuedAt, but never later than the payment's chain
 * time. issuedAt is the reporter's own claim, so without this an old payment could be reported as new.
 */
export function reportTimeMs(issuedAt: string, pay: Pick<PaymentFacts, 'timestamp'> | undefined): number {
  const signed = Date.parse(issuedAt);
  const paid = pay?.timestamp ? Date.parse(pay.timestamp) : NaN;
  return Number.isNaN(paid) ? signed : Math.min(signed, paid);
}

export const duplicateReason = (id: string) => `duplicate: this reporter already reported the same payment as evidence ${id}`;

export type IngestResult =
  | { kind: 'known' }
  | { kind: 'verified' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'pending'; reason: string };

export interface VerifierDeps {
  state: FidesState;
  chain: ChainApi;
  anchorPackageId: string;
  maxEvidenceBytes: number;
  /** Keep a content-addressed copy of every record that was fetched, so anyone can re-verify it from the bytes. */
  keepBytes?: boolean;
}

export class ReportVerifier {
  constructor(private d: VerifierDeps) {}

  async ingest(rep: RecalledReport, host: string, known: EvidenceRow | undefined, now: number): Promise<IngestResult> {
    const { state, chain } = this.d;
    if (known?.status === 'verified') return { kind: 'known' };
    if (known?.status === 'rejected') {
      const retry = known.rejectReason === NO_ANCHOR && now - known.verifiedAt > RECHECK_AFTER_MS;
      if (!retry) return { kind: 'rejected', reason: known.rejectReason ?? 'rejected earlier' };
    }

    const h = rep.header;
    const row = (over: Partial<EvidenceRow>): EvidenceRow => ({
      evidenceId: h.sha256,
      merchant: host,
      reporter: h.reporter,
      sha256: h.sha256,
      txDigest: h.tx,
      anchorTx: null,
      verdict: h.verdict,
      burnKind: h.burnKind,
      issuedAtMs: now,
      status: 'rejected',
      rejectReason: null,
      verifiedAt: now,
      ...over,
    });
    const keep = () => {
      if (this.d.keepBytes) state.putEvidenceBytes(h.sha256, rep.evidenceBytes, now);
    };

    let anchor: AnchorEvent | null;
    try {
      anchor = await chain.findAnchor({ packageId: this.d.anchorPackageId, evidenceSha256: h.sha256, reporter: h.reporter });
    } catch (e) {
      return { kind: 'pending', reason: `anchor lookup failed: ${(e as Error).message}` };
    }
    if (!anchor) {
      state.upsertEvidence(row({ rejectReason: NO_ANCHOR }));
      keep();
      return { kind: 'rejected', reason: NO_ANCHOR };
    }

    const res = await verifyEvidence(rep.evidenceBytes, anchor, chain, { maxBytes: this.d.maxEvidenceBytes });
    if (!res.ok) {
      const transient = res.rejectedAt === 'payment' && (/lookup failed/.test(res.reason ?? '') || /not final/.test(res.reason ?? ''));
      if (transient) return { kind: 'pending', reason: res.reason ?? 'payment not verifiable yet' };
      state.upsertEvidence(row({ rejectReason: `${res.rejectedAt}: ${res.reason}`, anchorTx: anchor.eventTxDigest }));
      keep();
      return { kind: 'rejected', reason: `${res.rejectedAt}: ${res.reason}` };
    }
    const e = res.evidence!;
    if (e.merchant.host.toLowerCase() !== host) {
      const reason = 'evidence is about a different merchant than the memory header says';
      state.upsertEvidence(row({ rejectReason: reason, anchorTx: anchor.eventTxDigest }));
      keep();
      return { kind: 'rejected', reason };
    }
    // One payment, one report: re-signing the same payment with a new issuedAt gives a new record, but it adds nothing.
    const dup = state.verifiedForPayment(h.reporter, e.payment.txDigest);
    if (dup && dup.evidenceId !== h.sha256) {
      const reason = duplicateReason(dup.evidenceId);
      state.upsertEvidence(row({ rejectReason: reason, anchorTx: anchor.eventTxDigest, txDigest: e.payment.txDigest }));
      keep();
      return { kind: 'rejected', reason };
    }
    state.upsertEvidence(
      row({
        status: 'verified',
        rejectReason: null,
        anchorTx: anchor.eventTxDigest,
        txDigest: e.payment.txDigest,
        issuedAtMs: reportTimeMs(e.issuedAt, res.payment),
        verdict: e.verdict,
        burnKind: e.burnKind,
        payTo: e.merchant.payTo,
        amountRaw: e.payment.amount,
      }),
    );
    keep();
    return { kind: 'verified' };
  }
}
