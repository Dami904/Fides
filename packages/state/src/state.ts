// Exact, atomic local state (SPEC section 5 and 21). Walrus Memory is semantic recall, not keyed lookup,
// so anything that must be exact lives here: caps, claims, pinned addresses, the evidence index, alerts.
// Uses Node's built-in node:sqlite (no native build). Amounts are raw-unit integers stored as text.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// Loaded through require so bundlers and Vitest (Vite does not know node:sqlite yet) leave it alone.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

export type ReserveResult =
  | { status: 'reserved'; spentRaw: bigint }
  | { status: 'duplicate'; claimStatus: string; spentRaw: bigint }
  | { status: 'over_cap'; spentRaw: bigint };

export interface EvidenceRow {
  evidenceId: string;
  merchant: string;
  reporter: string;
  sha256: string;
  txDigest: string;
  anchorTx: string | null;
  verdict: 'clean' | 'burned';
  burnKind: string | null;
  issuedAtMs: number;
  status: 'verified' | 'rejected';
  rejectReason: string | null;
  verifiedAt: number;
  /** The address the reporter paid, from verified evidence. Lets a new agent inherit the merchant's pinned address. */
  payTo?: string | null;
  /** Raw units the reporter paid. Lets a new agent inherit the typical price. */
  amountRaw?: string | null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS merchants (
  host TEXT PRIMARY KEY, pinned_pay_to TEXT, first_seen INTEGER NOT NULL, local_tier TEXT
);
CREATE TABLE IF NOT EXISTS claims (
  idempotency_key TEXT PRIMARY KEY, owner TEXT NOT NULL, merchant TEXT NOT NULL,
  amount TEXT NOT NULL, utc_date TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS spend (
  owner TEXT NOT NULL, utc_date TEXT NOT NULL, total TEXT NOT NULL, PRIMARY KEY (owner, utc_date)
);
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner TEXT NOT NULL, merchant TEXT NOT NULL, decision TEXT NOT NULL,
  rules_json TEXT NOT NULL, citations_json TEXT NOT NULL, confidence REAL NOT NULL, created_at INTEGER NOT NULL,
  outcome_json TEXT
);
CREATE TABLE IF NOT EXISTS evidence_index (
  evidence_id TEXT PRIMARY KEY, merchant TEXT NOT NULL, reporter TEXT NOT NULL, sha256 TEXT NOT NULL,
  tx_digest TEXT NOT NULL, anchor_tx TEXT, verdict TEXT NOT NULL, burn_kind TEXT, issued_at INTEGER NOT NULL,
  status TEXT NOT NULL, reject_reason TEXT, verified_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS evidence_by_merchant ON evidence_index (merchant);
CREATE TABLE IF NOT EXISTS evidence_blobs (
  sha256 TEXT PRIMARY KEY, bytes BLOB NOT NULL, stored_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS unreported (
  idempotency_key TEXT PRIMARY KEY, outcome_json TEXT NOT NULL, error TEXT NOT NULL, attempts INTEGER NOT NULL, first_failed_at INTEGER NOT NULL, last_tried_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, merchant TEXT NOT NULL, kind TEXT NOT NULL, open INTEGER NOT NULL, created_at INTEGER NOT NULL
);
`;

export class FidesState {
  private db: DatabaseSyncType;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    // Several connections to one file serialize their writers: wait instead of failing.
    this.db.exec('PRAGMA busy_timeout = 10000');
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(SCHEMA);
    // Columns added after the first version of the schema.
    const cols = (this.db.prepare('PRAGMA table_info(evidence_index)').all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes('pay_to')) this.db.exec('ALTER TABLE evidence_index ADD COLUMN pay_to TEXT');
    if (!cols.includes('amount')) this.db.exec('ALTER TABLE evidence_index ADD COLUMN amount TEXT');
  }

  close(): void {
    this.db.close();
  }

  /** Run fn inside BEGIN IMMEDIATE, so two writers cannot both read the old total and both pass the cap. */
  private tx<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn();
      this.db.exec('COMMIT');
      return r;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  // ---- merchants
  getMerchant(host: string): { host: string; pinnedPayTo: string | null; firstSeen: number; localTier: string | null } | null {
    const r = this.db.prepare('SELECT * FROM merchants WHERE host = ?').get(host.toLowerCase()) as
      | { host: string; pinned_pay_to: string | null; first_seen: number; local_tier: string | null }
      | undefined;
    return r ? { host: r.host, pinnedPayTo: r.pinned_pay_to, firstSeen: r.first_seen, localTier: r.local_tier } : null;
  }

  /** Pin the payout address on first sight. Never overwrites an existing pin: a change must go through an alert and a human. */
  pinPayToIfNew(host: string, payTo: string, nowMs: number): string {
    return this.tx(() => {
      const h = host.toLowerCase();
      const cur = this.getMerchant(h);
      if (cur?.pinnedPayTo) return cur.pinnedPayTo;
      if (cur) this.db.prepare('UPDATE merchants SET pinned_pay_to = ? WHERE host = ?').run(payTo, h);
      else this.db.prepare('INSERT INTO merchants (host, pinned_pay_to, first_seen) VALUES (?, ?, ?)').run(h, payTo, nowMs);
      return payTo;
    });
  }

  /** A human accepted the new address. */
  repinPayTo(host: string, payTo: string): void {
    this.db.prepare('UPDATE merchants SET pinned_pay_to = ? WHERE host = ?').run(payTo, host.toLowerCase());
  }

  // ---- spend and claims
  spentToday(owner: string, utcDate: string): bigint {
    const r = this.db.prepare('SELECT total FROM spend WHERE owner = ? AND utc_date = ?').get(owner, utcDate) as { total: string } | undefined;
    return r ? BigInt(r.total) : 0n;
  }

  /**
   * Claim a payment and reserve its spend in one transaction, keyed by an idempotency key.
   * Same key again returns "duplicate" and reserves nothing more. Over the cap reserves nothing.
   */
  reserve(p: { idempotencyKey: string; owner: string; merchant: string; amountRaw: bigint; capRaw: bigint; utcDate: string; nowMs: number }): ReserveResult {
    return this.tx(() => {
      const existing = this.db.prepare('SELECT status FROM claims WHERE idempotency_key = ?').get(p.idempotencyKey) as { status: string } | undefined;
      const spent = this.spentToday(p.owner, p.utcDate);
      if (existing) return { status: 'duplicate', claimStatus: existing.status, spentRaw: spent };
      if (spent + p.amountRaw > p.capRaw) return { status: 'over_cap', spentRaw: spent };
      this.db
        .prepare('INSERT INTO claims (idempotency_key, owner, merchant, amount, utc_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(p.idempotencyKey, p.owner, p.merchant.toLowerCase(), p.amountRaw.toString(), p.utcDate, 'reserved', p.nowMs);
      const total = spent + p.amountRaw;
      this.db
        .prepare('INSERT INTO spend (owner, utc_date, total) VALUES (?, ?, ?) ON CONFLICT (owner, utc_date) DO UPDATE SET total = excluded.total')
        .run(p.owner, p.utcDate, total.toString());
      return { status: 'reserved', spentRaw: total };
    });
  }

  /**
   * paid keeps the spend. failed releases it. unknown keeps it: the payment may have gone through, so the cap must assume it
   * did until someone reconciles it. A reserved claim can move to any of the three; an unknown one only to paid or failed.
   */
  settle(idempotencyKey: string, outcome: 'paid' | 'failed' | 'unknown'): void {
    this.tx(() => {
      const c = this.db.prepare('SELECT owner, amount, utc_date, status FROM claims WHERE idempotency_key = ?').get(idempotencyKey) as
        | { owner: string; amount: string; utc_date: string; status: string }
        | undefined;
      if (!c) throw new Error(`unknown claim ${idempotencyKey}`);
      const movable = c.status === 'reserved' || (c.status === 'unknown' && outcome !== 'unknown');
      if (!movable) throw new Error(`claim ${idempotencyKey} is ${c.status}, not reserved`);
      this.db.prepare('UPDATE claims SET status = ? WHERE idempotency_key = ?').run(outcome, idempotencyKey);
      if (outcome === 'failed') {
        const total = this.spentToday(c.owner, c.utc_date) - BigInt(c.amount);
        this.db.prepare('UPDATE spend SET total = ? WHERE owner = ? AND utc_date = ?').run(total.toString(), c.owner, c.utc_date);
      }
    });
  }

  /** Claims in one status, oldest first. "unknown" ones are payments to reconcile against the chain. */
  listClaims(status: 'reserved' | 'paid' | 'failed' | 'unknown'): { key: string; owner: string; merchant: string; amountRaw: bigint; createdAt: number }[] {
    const rows = this.db
      .prepare('SELECT idempotency_key, owner, merchant, amount, created_at FROM claims WHERE status = ? ORDER BY created_at')
      .all(status) as { idempotency_key: string; owner: string; merchant: string; amount: string; created_at: number }[];
    return rows.map((r) => ({ key: r.idempotency_key, owner: r.owner, merchant: r.merchant, amountRaw: BigInt(r.amount), createdAt: r.created_at }));
  }

  /** Amounts this owner actually paid this merchant, oldest first. Input for the typical-price median. */
  pastPaid(owner: string, merchant: string): bigint[] {
    const rows = this.db
      .prepare("SELECT amount FROM claims WHERE owner = ? AND merchant = ? AND status = 'paid' ORDER BY created_at")
      .all(owner, merchant.toLowerCase()) as { amount: string }[];
    return rows.map((r) => BigInt(r.amount));
  }

  // ---- decisions
  recordDecision(d: { owner: string; merchant: string; decision: string; rules: string[]; citations: unknown; confidence: number; nowMs: number }): number {
    const r = this.db
      .prepare('INSERT INTO decisions (owner, merchant, decision, rules_json, citations_json, confidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(d.owner, d.merchant.toLowerCase(), d.decision, JSON.stringify(d.rules), JSON.stringify(d.citations), d.confidence, d.nowMs);
    return Number(r.lastInsertRowid);
  }

  setDecisionOutcome(id: number, outcome: unknown): void {
    this.db.prepare('UPDATE decisions SET outcome_json = ? WHERE id = ?').run(JSON.stringify(outcome), id);
  }

  listDecisions(filter: { owner?: string; merchant?: string } = {}): { id: number; owner: string; merchant: string; decision: string; rules: string[]; confidence: number; createdAt: number; outcome: unknown }[] {
    const rows = this.db
      .prepare('SELECT * FROM decisions WHERE (? IS NULL OR owner = ?) AND (? IS NULL OR merchant = ?) ORDER BY id')
      .all(filter.owner ?? null, filter.owner ?? null, filter.merchant?.toLowerCase() ?? null, filter.merchant?.toLowerCase() ?? null) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as number,
      owner: r.owner as string,
      merchant: r.merchant as string,
      decision: r.decision as string,
      rules: JSON.parse(r.rules_json as string) as string[],
      confidence: r.confidence as number,
      createdAt: r.created_at as number,
      outcome: r.outcome_json ? JSON.parse(r.outcome_json as string) : null,
    }));
  }

  // ---- evidence index (verified and rejected, both are kept so rejections stay visible)
  upsertEvidence(e: EvidenceRow): void {
    this.db
      .prepare(
        `INSERT INTO evidence_index (evidence_id, merchant, reporter, sha256, tx_digest, anchor_tx, verdict, burn_kind, issued_at, status, reject_reason, verified_at, pay_to, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (evidence_id) DO UPDATE SET status = excluded.status, issued_at = excluded.issued_at, tx_digest = excluded.tx_digest, verdict = excluded.verdict, burn_kind = excluded.burn_kind, reject_reason = excluded.reject_reason, verified_at = excluded.verified_at, anchor_tx = excluded.anchor_tx, pay_to = excluded.pay_to, amount = excluded.amount`,
      )
      .run(e.evidenceId, e.merchant.toLowerCase(), e.reporter, e.sha256, e.txDigest, e.anchorTx, e.verdict, e.burnKind, e.issuedAtMs, e.status, e.rejectReason, e.verifiedAt, e.payTo ?? null, e.amountRaw ?? null);
  }

  listEvidence(merchant: string, status?: 'verified' | 'rejected'): EvidenceRow[] {
    const rows = this.db
      .prepare('SELECT * FROM evidence_index WHERE merchant = ? AND (? IS NULL OR status = ?) ORDER BY issued_at')
      .all(merchant.toLowerCase(), status ?? null, status ?? null) as Record<string, unknown>[];
    return rows.map((r) => ({
      evidenceId: r.evidence_id as string,
      merchant: r.merchant as string,
      reporter: r.reporter as string,
      sha256: r.sha256 as string,
      txDigest: r.tx_digest as string,
      anchorTx: (r.anchor_tx as string | null) ?? null,
      verdict: r.verdict as 'clean' | 'burned',
      burnKind: (r.burn_kind as string | null) ?? null,
      issuedAtMs: r.issued_at as number,
      status: r.status as 'verified' | 'rejected',
      rejectReason: (r.reject_reason as string | null) ?? null,
      verifiedAt: r.verified_at as number,
      payTo: (r.pay_to as string | null) ?? null,
      amountRaw: (r.amount as string | null) ?? null,
    }));
  }

  /** The verified record a reporter already has for a payment, or null. One payment counts once, whatever the host. */
  verifiedForPayment(reporter: string, txDigest: string): EvidenceRow | null {
    const r = this.db
      .prepare("SELECT evidence_id FROM evidence_index WHERE status = 'verified' AND lower(reporter) = lower(?) AND tx_digest = ? ORDER BY issued_at LIMIT 1")
      .get(reporter, txDigest) as { evidence_id: string } | undefined;
    return r ? this.getEvidence(r.evidence_id) : null;
  }

  /** One evidence row by its id (the sha256 of its bytes), or null. */
  getEvidence(evidenceId: string): EvidenceRow | null {
    const r = this.db.prepare('SELECT merchant FROM evidence_index WHERE evidence_id = ?').get(evidenceId.toLowerCase()) as { merchant: string } | undefined;
    return r ? (this.listEvidence(r.merchant).find((e) => e.evidenceId === evidenceId.toLowerCase()) ?? null) : null;
  }

  /** How many verified reports each reporter has made, for reporter weighting. */
  verifiedCounts(): Record<string, number> {
    const rows = this.db.prepare("SELECT reporter, COUNT(*) AS n FROM evidence_index WHERE status = 'verified' GROUP BY reporter").all() as { reporter: string; n: number }[];
    return Object.fromEntries(rows.map((r) => [r.reporter, Number(r.n)]));
  }

  // ---- content-addressed evidence copies (for the registry: anyone can re-verify from the bytes)
  /** Store evidence bytes under their sha256. Refuses bytes that do not hash to the given digest. */
  putEvidenceBytes(sha256: string, bytes: Uint8Array, nowMs: number): void {
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== sha256.toLowerCase()) throw new Error(`bytes hash to ${actual}, not ${sha256}`);
    this.db.prepare('INSERT OR IGNORE INTO evidence_blobs (sha256, bytes, stored_at) VALUES (?, ?, ?)').run(actual, bytes, nowMs);
  }

  /** The stored bytes, re-hashed on the way out: a corrupted copy is an error, never served. */
  getEvidenceBytes(sha256: string): Uint8Array | null {
    const r = this.db.prepare('SELECT bytes FROM evidence_blobs WHERE sha256 = ?').get(sha256.toLowerCase()) as { bytes: Uint8Array } | undefined;
    if (!r) return null;
    const bytes = new Uint8Array(r.bytes);
    if (createHash('sha256').update(bytes).digest('hex') !== sha256.toLowerCase()) throw new Error(`stored evidence ${sha256.slice(0, 12)} is corrupted`);
    return bytes;
  }

  // ---- payments that were made but could not be reported yet
  queueUnreported(key: string, outcomeJson: string, error: string, nowMs: number): void {
    this.db
      .prepare(
        `INSERT INTO unreported (idempotency_key, outcome_json, error, attempts, first_failed_at, last_tried_at) VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT (idempotency_key) DO UPDATE SET error = excluded.error, attempts = attempts + 1, last_tried_at = excluded.last_tried_at`,
      )
      .run(key, outcomeJson, error, nowMs, nowMs);
  }
  listUnreported(): { key: string; outcomeJson: string; error: string; attempts: number; firstFailedAt: number }[] {
    const rows = this.db.prepare('SELECT * FROM unreported ORDER BY first_failed_at').all() as Record<string, unknown>[];
    return rows.map((r) => ({ key: r.idempotency_key as string, outcomeJson: r.outcome_json as string, error: r.error as string, attempts: Number(r.attempts), firstFailedAt: Number(r.first_failed_at) }));
  }
  clearUnreported(key: string): void {
    this.db.prepare('DELETE FROM unreported WHERE idempotency_key = ?').run(key);
  }

  // ---- alerts: stay open until a human clears them
  openAlert(merchant: string, kind: string, nowMs: number): number {
    const m = merchant.toLowerCase();
    return this.tx(() => {
      const ex = this.db.prepare('SELECT id FROM alerts WHERE merchant = ? AND kind = ? AND open = 1').get(m, kind) as { id: number } | undefined;
      if (ex) return Number(ex.id);
      const r = this.db.prepare('INSERT INTO alerts (merchant, kind, open, created_at) VALUES (?, ?, 1, ?)').run(m, kind, nowMs);
      return Number(r.lastInsertRowid);
    });
  }

  closeAlert(id: number): void {
    this.db.prepare('UPDATE alerts SET open = 0 WHERE id = ?').run(id);
  }

  openAlerts(merchant?: string): { id: number; merchant: string; kind: string; createdAt: number }[] {
    const rows = this.db.prepare('SELECT * FROM alerts WHERE open = 1 AND (? IS NULL OR merchant = ?) ORDER BY id').all(merchant?.toLowerCase() ?? null, merchant?.toLowerCase() ?? null) as Record<string, unknown>[];
    return rows.map((r) => ({ id: r.id as number, merchant: r.merchant as string, kind: r.kind as string, createdAt: r.created_at as number }));
  }
}

export const openState = (path: string): FidesState => new FidesState(path);
