// Writes the evidence anchor to Sui (packages/move: anchor::report). The chain records the transaction sender,
// which readers compare with the reporter's address in the signed evidence (SPEC section 8).
import type { Signer } from '@mysten/sui/cryptography';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

export interface AnchorRequest {
  /** The merchant host, as a string. */
  merchant: string;
  /** sha256 of the evidence bytes, hex. */
  evidenceSha256: string;
  /** The payment transaction digest. Stored as its UTF-8 bytes. */
  payTxDigest: string;
  verdict: 'clean' | 'burned';
}

export interface Anchorer {
  /** Emits the Report event. Resolves once the transaction succeeded on chain; rejects otherwise. */
  report(a: AnchorRequest): Promise<{ txDigest: string }>;
}

export class SuiAnchorer implements Anchorer {
  private client: SuiGrpcClient;

  constructor(
    private o: { signer: Signer; packageId: string; network: 'mainnet' | 'testnet'; fullnodeUrl: string },
  ) {
    this.client = new SuiGrpcClient({ network: o.network, baseUrl: o.fullnodeUrl });
  }

  async report(a: AnchorRequest): Promise<{ txDigest: string }> {
    if (!/^[0-9a-f]{64}$/i.test(a.evidenceSha256)) throw new Error('evidenceSha256 must be 64 hex characters');
    const tx = new Transaction();
    tx.setSender(this.o.signer.toSuiAddress());
    tx.moveCall({
      target: `${this.o.packageId}::anchor::report`,
      arguments: [
        tx.pure.string(a.merchant),
        tx.pure.vector('u8', [...Buffer.from(a.evidenceSha256, 'hex')]),
        tx.pure.vector('u8', [...Buffer.from(a.payTxDigest, 'utf8')]),
        tx.pure.u8(a.verdict === 'burned' ? 1 : 0),
      ],
    });
    const res = await this.client.signAndExecuteTransaction({ transaction: tx, signer: this.o.signer, include: { effects: true } });
    const t = res.Transaction ?? res.FailedTransaction;
    if (!t.status.success) throw new Error(`anchor transaction failed: ${JSON.stringify(t.status).slice(0, 200)}`);
    await this.client.waitForTransaction({ digest: t.digest });
    return { txDigest: t.digest };
  }
}
