// The registry (SPEC section 9): a read-only, verifying view of the shared record that anyone can query. It holds no
// keys that can pay and writes nothing to the chain or to memory. It recalls reports, checks every one the same way an
// agent does (signature, Sui anchor, payment through Tatum), keeps a content-addressed copy of the bytes, and lets
// anyone re-run the checks. It never fetches a URL taken from chain or memory data: it talks only to the configured
// Tatum gateway and Walrus Memory relayer.
import { assessMerchant, type Assessment, type FidesConfig } from '@fides/core';
import { verifyEvidenceSteps, type VerifyStep } from '@fides/evidence';
import { buildSituationQuery, type SharedRecord } from '@fides/memory';
import { ReportVerifier, NO_ANCHOR, type ChainApi } from '@fides/sdk';
import type { EvidenceRow, FidesState } from '@fides/state';

export interface RegistryDeps {
  state: FidesState;
  shared: SharedRecord;
  chain: ChainApi;
  anchorPackageId: string;
  config: FidesConfig;
  now?: () => number;
  /** How long a merchant's refresh is reused. Protects the Tatum and relayer budgets. Default 60 s. */
  refreshTtlMs?: number;
  /** Pages of anchor events (50 each, newest first, all merchants) scanned per refresh for reports recall missed. Default 3. */
  anchorScanPages?: number;
}

/** A report anchored on Sui for this merchant whose signed record recall did not return. Shown, never counted. */
export interface AnchoredOnly {
  evidenceId: string;
  reporter: string;
  verdict: 'clean' | 'burned';
  anchorTx: string;
  paymentTx: string;
  anchoredAt: string;
}

export interface AnchorScan {
  /** complete: every anchor event was read. partial: only the newest pages were. failed: the lookup failed. unavailable: the chain client cannot list events. */
  state: 'complete' | 'partial' | 'failed' | 'unavailable';
  notRecalled: AnchoredOnly[];
  error?: string;
}

export interface RefreshResult {
  sharedRecord: 'attached' | 'unreachable';
  verified: number;
  rejected: number;
  /** Reports that could not be checked yet (a lookup failed). */
  pending: number;
  /** Memories in the shared namespace that were not well formed Fides reports. */
  malformed: number;
  fromCache: boolean;
  error?: string;
  refreshedAt: number;
  /**
   * Recall is fuzzy and can miss a record. The anchors on Sui are exact, so they are scanned too: an anchor for this
   * merchant whose record recall did not return is listed here. It is not counted, because without the signed record
   * neither the signature nor the payment can be checked.
   */
  anchors?: AnchorScan;
}

export interface EvidenceView {
  evidenceId: string;
  reporter: string;
  verdict: 'clean' | 'burned';
  burnKind: string | null;
  status: 'verified' | 'rejected';
  rejectReason: string | null;
  anchorTx: string | null;
  paymentTx: string;
  issuedAt: string;
  payTo: string | null;
  amountRaw: string | null;
}

export interface MerchantView {
  host: string;
  assessment: Pick<Assessment, 'tier' | 'cleanCount' | 'burnCount' | 'wilson' | 'confidence' | 'cannotSay'>;
  /** The payout address most recently paid in verified clean reports. */
  knownPayTo: string | null;
  evidence: EvidenceView[];
  refresh: RefreshResult | null;
  /** True when the shared record could not be reached on the last try and this is an older answer. */
  stale: boolean;
}

const toView = (r: EvidenceRow): EvidenceView => ({
  evidenceId: r.evidenceId,
  reporter: r.reporter,
  verdict: r.verdict,
  burnKind: r.burnKind,
  status: r.status,
  rejectReason: r.rejectReason,
  anchorTx: r.anchorTx,
  paymentTx: r.txDigest,
  issuedAt: new Date(r.issuedAtMs).toISOString(),
  payTo: r.payTo ?? null,
  amountRaw: r.amountRaw ?? null,
});

export class Registry {
  private verifier: ReportVerifier;
  private last = new Map<string, RefreshResult>();
  private inflight = new Map<string, Promise<RefreshResult>>();
  private now: () => number;
  private ttl: number;

  constructor(private d: RegistryDeps) {
    this.now = d.now ?? (() => Date.now());
    this.ttl = d.refreshTtlMs ?? 60_000;
    this.verifier = new ReportVerifier({ state: d.state, chain: d.chain, anchorPackageId: d.anchorPackageId, maxEvidenceBytes: d.config.maxEvidenceBytes, keepBytes: true });
  }

  /** Recall the merchant's reports and verify every new one. Cached for the TTL; concurrent calls share one run. */
  refresh(hostIn: string): Promise<RefreshResult> {
    const host = hostIn.toLowerCase();
    const cached = this.last.get(host);
    if (cached && cached.sharedRecord === 'attached' && this.now() - cached.refreshedAt < this.ttl) return Promise.resolve({ ...cached, fromCache: true });
    const running = this.inflight.get(host);
    if (running) return running;
    const p = this.doRefresh(host).finally(() => this.inflight.delete(host));
    this.inflight.set(host, p);
    return p;
  }

  private async doRefresh(host: string): Promise<RefreshResult> {
    const now = this.now();
    const recall = await this.d.shared.recallForMerchant(host, buildSituationQuery({ host, payTo: '0x0', amount: '0.01', tier: 'new', notes: ['clean report', 'burn report'] }), { limit: 50 });
    if (recall.state !== 'attached') {
      const r: RefreshResult = { sharedRecord: 'unreachable', verified: 0, rejected: 0, pending: 0, malformed: 0, fromCache: false, refreshedAt: now, ...(recall.state === 'unreachable' ? { error: recall.error } : {}) };
      this.last.set(host, r);
      return r;
    }
    const known = new Map(this.d.state.listEvidence(host).map((e) => [e.evidenceId, e]));
    let pending = 0;
    for (const rep of recall.forHost) {
      const r = await this.verifier.ingest(rep, host, known.get(rep.header.sha256), now);
      if (r.kind === 'pending') pending++;
    }
    const rows = this.d.state.listEvidence(host);
    const anchors = await this.scanAnchors(host, new Set(rows.map((r) => r.evidenceId)));
    const result: RefreshResult = {
      sharedRecord: 'attached',
      verified: rows.filter((r) => r.status === 'verified').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      pending,
      malformed: recall.rejected.length,
      fromCache: false,
      refreshedAt: now,
      anchors,
    };
    this.last.set(host, result);
    return result;
  }

  /** Read the newest anchor events and keep those for this merchant that recall did not bring back. A failure is reported, not hidden. */
  private async scanAnchors(host: string, known: Set<string>): Promise<AnchorScan> {
    const list = this.d.chain.listAnchors?.bind(this.d.chain);
    if (!list) return { state: 'unavailable', notRecalled: [] };
    const notRecalled: AnchoredOnly[] = [];
    let before: string | undefined;
    try {
      for (let page = 0; page < (this.d.anchorScanPages ?? 3); page++) {
        const r = await list({ packageId: this.d.anchorPackageId, pageSize: 50, ...(before ? { before } : {}) });
        for (const a of r.anchors) {
          if (a.merchant.toLowerCase() !== host || known.has(a.evidenceSha256)) continue;
          known.add(a.evidenceSha256);
          notRecalled.push({ evidenceId: a.evidenceSha256, reporter: a.sender, verdict: a.verdict, anchorTx: a.eventTxDigest, paymentTx: a.payTxDigest, anchoredAt: a.timestamp });
        }
        if (!r.hasMore || !r.cursor) return { state: 'complete', notRecalled };
        before = r.cursor;
      }
      return { state: 'partial', notRecalled };
    } catch (e) {
      return { state: 'failed', notRecalled, error: (e as Error).message };
    }
  }

  /** The merchant as it stands. Pass the refresh this answer follows, so the view reports that one (cached or fresh). */
  view(hostIn: string, refreshed?: RefreshResult): MerchantView {
    const host = hostIn.toLowerCase();
    const rows = this.d.state.listEvidence(host);
    const items = rows.filter((r) => r.status === 'verified').map((r) => ({
      id: r.evidenceId, reporter: r.reporter, verdict: r.verdict, burnKind: r.burnKind as never, issuedAtMs: r.issuedAtMs,
    }));
    const a = assessMerchant(items, this.d.state.verifiedCounts(), this.now(), this.d.config);
    const clean = rows.filter((r) => r.status === 'verified' && r.verdict === 'clean' && r.payTo).sort((x, y) => y.issuedAtMs - x.issuedAtMs);
    const refresh = refreshed ?? this.last.get(host) ?? null;
    return {
      host,
      assessment: { tier: a.tier, cleanCount: a.cleanCount, burnCount: a.burnCount, wilson: a.wilson, confidence: a.confidence, cannotSay: a.cannotSay },
      knownPayTo: clean[0]?.payTo ?? null,
      evidence: rows.map(toView).reverse(),
      refresh,
      stale: refresh?.sharedRecord === 'unreachable',
    };
  }

  /** Whether anything has ever been learned about this merchant. A failed attempt to look does not count. */
  hasMerchant(host: string): boolean {
    return this.d.state.listEvidence(host).length > 0 || this.last.get(host.toLowerCase())?.sharedRecord === 'attached';
  }

  /** The stored bytes of a record, re-hashed on the way out. Null if unknown; throws if the stored copy is corrupted. */
  evidenceBytes(sha256: string): Uint8Array | null {
    return this.d.state.getEvidenceBytes(sha256);
  }

  /**
   * Run the section 8 checks again, now, against the stored bytes, the Sui anchor and the payment through Tatum.
   * Yielded step by step so a page can animate it.
   */
  async *reverify(sha256: string): AsyncGenerator<VerifyStep> {
    const bytes = this.evidenceBytes(sha256);
    const row = this.d.state.getEvidence(sha256);
    if (!bytes || !row) {
      yield { name: 'format', ok: false, detail: 'this registry holds no copy of that record' };
      return;
    }
    const anchor = await this.d.chain.findAnchor({ packageId: this.d.anchorPackageId, evidenceSha256: sha256, reporter: row.reporter });
    if (!anchor) {
      yield { name: 'hash', ok: false, detail: `${NO_ANCHOR}: there is nothing on Sui to compare the hash with` };
      return;
    }
    yield* verifyEvidenceSteps(bytes, anchor, this.d.chain, { maxBytes: this.d.config.maxEvidenceBytes });
  }
}
