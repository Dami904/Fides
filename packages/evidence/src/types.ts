export const EVIDENCE_SCHEMA = 'fides.evidence/v1';

export type BurnKind = 'junk' | 'no_delivery' | 'price_changed' | 'address_changed';

export interface EvidenceBody {
  schema: typeof EVIDENCE_SCHEMA;
  issuedAt: string;
  reporter: { agentId: string; suiAddress: string };
  merchant: { host: string; payTo: string };
  payment: { txDigest: string; amount: string; asset: string; quotedAmount: string; network: string };
  exchange: { requestHash: string; responseHash: string; responseBytes: number; latencyMs: number };
  checks: {
    schemaValid: boolean;
    fresh: boolean;
    onTime: boolean;
    amountMatchesQuote: boolean;
    payToMatchesPinned: boolean;
  };
  verdict: 'clean' | 'burned';
  burnKind: BurnKind | null;
  finality: { checkpoint: string; verifiedVia: 'tatum' };
}

export interface Evidence extends EvidenceBody {
  /** base64 Sui serialized signature over the canonical bytes of the body (this object without the signature). */
  signature: string;
}

/** What the Sui anchor event says about a piece of evidence. Read through Tatum. */
export interface Anchor {
  evidenceSha256: string;
  /** Sender of the transaction that emitted the event. */
  sender: string;
  payTxDigest: string;
  verdict: 'clean' | 'burned';
}

/** Facts about a payment transaction, read through Tatum (packages/chain). */
export interface PaymentFacts {
  sender: string;
  status: string;
  /** null means not yet final. */
  checkpoint: string | number | null;
  changes: { owner: string | undefined; amount: bigint; coinType: string }[];
}

export interface ChainReader {
  /** Returns null when the transaction does not exist. Throws on any lookup failure (never treat that as "not found"). */
  getPayment(digest: string): Promise<PaymentFacts | null>;
}

export interface VerifyStep {
  name: 'format' | 'hash' | 'signature' | 'anchor-sender' | 'payment';
  ok: boolean;
  detail: string;
}

export interface VerifyResult {
  ok: boolean;
  /** The step that failed, if any. */
  rejectedAt?: VerifyStep['name'];
  reason?: string;
  steps: VerifyStep[];
  evidence?: Evidence;
  /** sha256 of the fetched bytes, also the evidence id. */
  digest: string;
}
