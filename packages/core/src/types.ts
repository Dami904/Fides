// Shared types (SPEC section 21). Money is a bigint of raw units (6 decimals, USDC), never a float.

export type Decision = 'PAY' | 'PAY_CAPPED' | 'ASK' | 'REFUSE';
export type Tier = 'new' | 'established' | 'trusted' | 'burned';
export type BurnKind = 'junk' | 'no_delivery' | 'price_changed' | 'address_changed';

export interface CheckInput {
  ownerId: string;
  merchantHost: string;
  payTo: string;
  /** Decimal string, for example "0.01". */
  amount: string;
  asset: string;
  network: string;
  resource: string;
}

export interface Alert {
  kind: 'address_changed';
  merchant: string;
}

export interface Verdict {
  decision: Decision;
  /** Set for PAY_CAPPED: the most this payment may be (decimal string). */
  capAmount?: string;
  reasons: string[];
  rulesFired: string[];
  citations: { evidenceIds: string[]; memoryBlobIds: string[] };
  tier: Tier;
  /** How much evidence backs the tier, 0 to 1. Logged for self-grading (SPEC section 11). */
  confidence: number;
  cannotSay: boolean;
  alerts: Alert[];
}

/** A report that passed every check in SPEC section 8. Rejected reports never reach the engine. */
export interface EvidenceItem {
  id: string;
  /** Reporter Sui address. */
  reporter: string;
  verdict: 'clean' | 'burned';
  burnKind: BurnKind | null;
  issuedAtMs: number;
}

/** A recalled narrative from Walrus Memory. Recall is fuzzy, so the engine post-filters it. */
export interface SimilarIncident {
  blobId: string;
  /** Lower is more similar. */
  distance: number;
  merchantHost: string;
  burnKind: BurnKind | null;
  /** Short pattern tag such as "address_changed_after_clean_streak". */
  pattern: string;
}

/** absent (unreachable) and empty are different: unreachable fails closed, detached/empty is honest. */
export type SharedRecordState = 'attached' | 'detached' | 'unreachable';

export interface DecisionContext {
  nowMs: number;
  /** This agent's Sui address. */
  selfAddress: string;
  spentTodayRaw: bigint;
  pinnedPayTo: string | null;
  /** Amounts this agent actually paid this merchant, raw units. */
  pastPaidRaw: bigint[];
  /** Verified evidence for this exact merchant host, shared plus own. */
  evidence: EvidenceItem[];
  /** Verified reports each reporter has made, for reporter weighting. */
  reporterVerifiedCounts: Record<string, number>;
  sharedRecord: SharedRecordState;
  similar: SimilarIncident[];
}
