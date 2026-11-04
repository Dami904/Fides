// The shared record on Walrus Memory (SPEC section 5): one shared Fides Registry account, a delegate key per agent,
// namespace "merchants". This wrapper only moves text in and out and sorts what comes back. It decides nothing.
//
//  - Write rule: only evidence for a payment verified through Tatum and past finality may be written.
//  - Recall is fuzzy: results are post-filtered in code by exact merchant host. Exact lookups come from the
//    Sui anchor events and the local evidence index, never from recall alone.
//  - Recalled text is untrusted. It is returned with the stored evidence bytes so the caller can run the
//    section 8 verification. Malformed or mismatched entries are reported, not silently dropped.
//  - absent is not empty: an unreachable record is a distinct state (the engine answers ASK), a detached or
//    empty record is an honest cold start.
import type { SimilarIncident } from '@fides/core';
import { sha256Hex, type SealedEvidence } from '@fides/evidence';
import { formatMemory, parseMemory, type MemoryHeader } from './format.js';

export interface MemoryBackend {
  remember(text: string, opts: { idempotencyKey: string }): Promise<{ job_id: string }>;
  waitForRememberJob(jobId: string, opts: { timeoutMs: number }): Promise<{ blob_id: string }>;
  recall(p: { query: string; limit: number; maxDistance?: number; timeoutMs?: number }): Promise<{
    results: { blob_id: string; text: string; distance: number; created_at?: string }[];
    total: number;
  }>;
  health(): Promise<unknown>;
}

export type SharedMode = 'attached' | 'detached';

export interface RecalledReport {
  blobId: string;
  distance: number;
  createdAt?: string;
  header: MemoryHeader;
  narrative: string;
  /** The evidence exactly as stored. NOT yet trusted: verify with verifyEvidence against the Sui anchor. */
  evidenceBytes: Uint8Array;
}

export interface RejectedMemory {
  blobId: string;
  reason: string;
}

export type RecallOutcome =
  | {
      state: 'attached';
      /** Reports about exactly this merchant host. */
      forHost: RecalledReport[];
      /** Burn narratives of OTHER merchants, one entry per pattern tag, for the engine's rule 6. */
      similar: SimilarIncident[];
      /** Memories that were not well formed Fides reports or did not match their own evidence. Shown, never believed. */
      rejected: RejectedMemory[];
      total: number;
    }
  | { state: 'detached'; forHost: []; similar: []; rejected: []; total: 0 }
  | { state: 'unreachable'; error: string };

export class WriteRuleError extends Error {}

export interface SharedRecordOptions {
  maxEvidenceBytes: number;
  writeTimeoutMs?: number;
  recallTimeoutMs?: number;
}

export class SharedRecord {
  private mode: SharedMode = 'attached';

  constructor(
    private backend: MemoryBackend,
    private opts: SharedRecordOptions,
  ) {}

  getMode(): SharedMode {
    return this.mode;
  }

  /** The demo's "detach shared memory": stop reading and writing the shared record. Nothing is deleted. */
  setMode(mode: SharedMode): void {
    this.mode = mode;
  }

  async health(): Promise<'ok' | 'unreachable'> {
    try {
      await this.backend.health();
      return 'ok';
    } catch {
      return 'unreachable';
    }
  }

  /**
   * Write one verified, signed report. Idempotent: the evidence digest is the idempotency key, so a retry after a
   * timeout cannot create a second memory. Waits for the Walrus write to land (tens of seconds on mainnet).
   * Detached: nothing is written here (the caller keeps it in its local evidence index).
   */
  async writeReport(
    sealed: SealedEvidence,
    patterns: string[] = [],
  ): Promise<{ written: true; blobId: string; jobId: string; digest: string } | { written: false; reason: 'detached' }> {
    const e = sealed.evidence;
    // Write rule (SPEC section 5): nothing becomes memory from an intention.
    if (e.finality.verifiedVia !== 'tatum' || !/^\d+$/.test(e.finality.checkpoint)) {
      throw new WriteRuleError('refusing to write: the payment is not verified through Tatum and past finality');
    }
    if (sealed.bytes.length > this.opts.maxEvidenceBytes) {
      throw new WriteRuleError(`refusing to write: evidence is ${sealed.bytes.length} bytes, limit ${this.opts.maxEvidenceBytes}`);
    }
    if (sha256Hex(sealed.bytes) !== sealed.digest) throw new WriteRuleError('refusing to write: digest does not match the evidence bytes');
    if (this.mode === 'detached') return { written: false, reason: 'detached' };

    const { text, digest } = formatMemory(e, patterns);
    if (digest !== sealed.digest) throw new WriteRuleError('refusing to write: evidence is not in canonical form');
    const accepted = await this.backend.remember(text, { idempotencyKey: digest });
    const done = await this.backend.waitForRememberJob(accepted.job_id, { timeoutMs: this.opts.writeTimeoutMs ?? 120_000 });
    return { written: true, blobId: done.blob_id, jobId: accepted.job_id, digest };
  }

  /**
   * Recall by meaning, then sort by exact host in code. A failed lookup is reported as `unreachable`
   * (never as "no reports"), which the engine turns into ASK.
   */
  async recallForMerchant(host: string, query: string, o: { limit?: number; maxDistance?: number } = {}): Promise<RecallOutcome> {
    if (this.mode === 'detached') return { state: 'detached', forHost: [], similar: [], rejected: [], total: 0 };
    let res;
    try {
      res = await this.backend.recall({
        query,
        limit: o.limit ?? 20,
        ...(o.maxDistance !== undefined ? { maxDistance: o.maxDistance } : {}),
        timeoutMs: this.opts.recallTimeoutMs ?? 30_000,
      });
    } catch (e) {
      return { state: 'unreachable', error: (e as Error).message };
    }

    const want = host.toLowerCase();
    const forHost: RecalledReport[] = [];
    const similar: SimilarIncident[] = [];
    const rejected: RejectedMemory[] = [];
    for (const r of res.results) {
      const m = parseMemory(r.text, this.opts.maxEvidenceBytes);
      if (!m) {
        rejected.push({ blobId: r.blob_id, reason: 'not a well formed Fides memory' });
        continue;
      }
      if (sha256Hex(m.evidenceBytes) !== m.header.sha256) {
        rejected.push({ blobId: r.blob_id, reason: 'header sha256 does not match the stored evidence' });
        continue;
      }
      const mismatch = headerDisagreesWithEvidence(m.header, m.evidenceBytes);
      if (mismatch) {
        rejected.push({ blobId: r.blob_id, reason: mismatch });
        continue;
      }
      if (m.header.host === want) {
        forHost.push({ blobId: r.blob_id, distance: r.distance, ...(r.created_at ? { createdAt: r.created_at } : {}), header: m.header, narrative: m.narrative, evidenceBytes: m.evidenceBytes });
      } else if (m.header.verdict === 'burned') {
        for (const pattern of m.header.patterns) {
          similar.push({ blobId: r.blob_id, distance: r.distance, merchantHost: m.header.host, burnKind: m.header.burnKind as SimilarIncident['burnKind'], pattern });
        }
      }
    }
    return { state: 'attached', forHost, similar, rejected, total: res.total };
  }
}

/** The header is a lookup aid written by whoever wrote the memory: it must agree with the evidence it sits above. */
function headerDisagreesWithEvidence(h: MemoryHeader, bytes: Uint8Array): string | null {
  let e: any;
  try {
    e = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return 'stored evidence is not valid JSON';
  }
  const lc = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v);
  if (lc(e?.merchant?.host) !== h.host) return 'header host differs from the evidence';
  if (lc(e?.merchant?.payTo) !== h.payTo.toLowerCase()) return 'header payTo differs from the evidence';
  if (e?.verdict !== h.verdict) return 'header verdict differs from the evidence';
  if ((e?.burnKind ?? null) !== h.burnKind) return 'header burnKind differs from the evidence';
  if (lc(e?.reporter?.suiAddress) !== h.reporter.toLowerCase()) return 'header reporter differs from the evidence';
  if (e?.payment?.txDigest !== h.tx) return 'header tx differs from the evidence';
  return null;
}
