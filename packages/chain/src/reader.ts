// Reads from Sui through Tatum: payment and finality facts for evidence verification (SPEC section 8, check 4),
// anchor events (the exact public index), balances. A failed lookup throws; it is never turned into "not found".
import type { Anchor, ChainReader, PaymentFacts } from '@fides/evidence';
import type { TatumGraphql } from './tatum.js';

const DIGEST = /^[A-Za-z0-9]{1,100}$/;
const ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;
const TYPE = /^0x[0-9a-fA-F]+::[A-Za-z0-9_]+::[A-Za-z0-9_]+$/;

export interface AnchorEvent extends Anchor {
  /** The merchant string the reporter put in the event. */
  merchant: string;
  /** Digest of the transaction that emitted the event. */
  eventTxDigest: string;
  timestamp: string;
}

interface TxData {
  transaction: null | {
    sender: { address: string } | null;
    effects: {
      status: string;
      checkpoint: { sequenceNumber: number } | null;
      balanceChanges: { nodes: { owner: { address: string } | null; amount: string; coinType: { repr: string } }[] };
    };
  };
}

const b64 = (s: string) => Buffer.from(s, 'base64');

export class TatumChainReader implements ChainReader {
  /** Final transactions never change, so they are cached for the life of the process (saves the 3 req/s budget). */
  private finalCache = new Map<string, PaymentFacts>();

  constructor(private client: TatumGraphql) {}

  async getPayment(digest: string): Promise<PaymentFacts | null> {
    if (!DIGEST.test(digest)) throw new Error(`invalid transaction digest "${digest.slice(0, 20)}"`);
    const hit = this.finalCache.get(digest);
    if (hit) return hit;
    const d = await this.client.query<TxData>(
      `query($d: String!) { transaction(digest: $d) { sender { address } effects { status checkpoint { sequenceNumber } balanceChanges { nodes { owner { address } amount coinType { repr } } } } } }`,
      { d: digest },
    );
    const t = d.transaction;
    if (!t) return null;
    const facts: PaymentFacts = {
      sender: t.sender?.address ?? '',
      status: t.effects.status,
      checkpoint: t.effects.checkpoint?.sequenceNumber ?? null,
      changes: t.effects.balanceChanges.nodes.map((n) => ({ owner: n.owner?.address, amount: BigInt(n.amount), coinType: n.coinType.repr })),
    };
    if (facts.checkpoint !== null) this.finalCache.set(digest, facts); // only a checkpointed transaction is final
    return facts;
  }

  async latestCheckpoint(): Promise<number> {
    const d = await this.client.query<{ checkpoint: { sequenceNumber: number } }>('{ checkpoint { sequenceNumber } }');
    return d.checkpoint.sequenceNumber;
  }

  /** Raw balances by coin type. */
  async getBalances(address: string): Promise<Record<string, bigint>> {
    if (!ADDRESS.test(address)) throw new Error('invalid address');
    const d = await this.client.query<{ address: { balances: { nodes: { coinType: { repr: string }; totalBalance: string }[] } } | null }>(
      `query($a: SuiAddress!) { address(address: $a) { balances { nodes { coinType { repr } totalBalance } } } }`,
      { a: address },
    );
    return Object.fromEntries((d.address?.balances.nodes ?? []).map((n) => [n.coinType.repr, BigInt(n.totalBalance)]));
  }

  /**
   * One page of anchor events, newest first. Filter by the reporter's address when it is known, which is the
   * normal case (the evidence names its reporter).
   */
  async listAnchors(o: { packageId: string; sender?: string; pageSize?: number; before?: string }): Promise<{ anchors: AnchorEvent[]; cursor: string | null; hasMore: boolean }> {
    const type = `${o.packageId}::anchor::Report`;
    if (!TYPE.test(type)) throw new Error('invalid anchor package id');
    if (o.sender && !ADDRESS.test(o.sender)) throw new Error('invalid sender address');
    const d = await this.client.query<{
      events: {
        pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
        nodes: { timestamp: string; transaction: { digest: string }; sender: { address: string } | null; contents: { json: { merchant: string; evidence_sha256: string; pay_tx_digest: string; verdict: number } } }[];
      };
    }>(
      `query($f: EventFilter, $n: Int, $b: String) { events(last: $n, before: $b, filter: $f) { pageInfo { hasPreviousPage startCursor } nodes { timestamp transaction { digest } sender { address } contents { json } } } }`,
      { f: { type, ...(o.sender ? { sender: o.sender } : {}) }, n: o.pageSize ?? 50, b: o.before ?? null },
    );
    const anchors = d.events.nodes.map((n): AnchorEvent => ({
      evidenceSha256: b64(n.contents.json.evidence_sha256).toString('hex'),
      sender: n.sender?.address ?? '',
      payTxDigest: b64(n.contents.json.pay_tx_digest).toString('utf8'),
      verdict: n.contents.json.verdict === 0 ? 'clean' : 'burned',
      merchant: n.contents.json.merchant,
      eventTxDigest: n.transaction.digest,
      timestamp: n.timestamp,
    }));
    return { anchors: anchors.reverse(), cursor: d.events.pageInfo.startCursor, hasMore: d.events.pageInfo.hasPreviousPage };
  }

  /**
   * Find the anchor for an evidence digest by scanning events newest first (events cannot be filtered by field).
   * The local evidence index is the fast path; this is the public, tamper-evident one. Returns null only after
   * scanning every page up to `maxPages`; a lookup failure throws.
   */
  async findAnchor(o: { packageId: string; evidenceSha256: string; reporter?: string; pageSize?: number; maxPages?: number }): Promise<AnchorEvent | null> {
    const want = o.evidenceSha256.toLowerCase();
    let before: string | undefined;
    for (let page = 0; page < (o.maxPages ?? 10); page++) {
      const r = await this.listAnchors({ packageId: o.packageId, ...(o.reporter ? { sender: o.reporter } : {}), ...(o.pageSize ? { pageSize: o.pageSize } : {}), ...(before ? { before } : {}) });
      const hit = r.anchors.find((a) => a.evidenceSha256 === want);
      if (hit) return hit;
      if (!r.hasMore || !r.cursor) return null;
      before = r.cursor;
    }
    throw new Error(`anchor for ${want.slice(0, 12)} not found within ${o.maxPages ?? 10} pages: scan not exhaustive, not the same as "no anchor"`);
  }
}
