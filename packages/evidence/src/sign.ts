import type { Signer } from '@mysten/sui/cryptography';
import { canonicalize, sha256Hex, toBytes } from './canonical.js';
import { EVIDENCE_SCHEMA, type Evidence, type EvidenceBody } from './types.js';

export interface SealedEvidence {
  evidence: Evidence;
  /** The exact bytes to store and hash: canonical JSON of the signed object. */
  bytes: Uint8Array;
  /** sha256 of `bytes`, hex. This is what the Sui anchor records and what serves as the evidence id. */
  digest: string;
}

/** Sign with the reporter's Sui key (personal message signing) over the canonical bytes without the signature field. */
export async function signEvidence(body: EvidenceBody, signer: Signer): Promise<SealedEvidence> {
  if (body.schema !== EVIDENCE_SCHEMA) throw new Error(`schema must be ${EVIDENCE_SCHEMA}`);
  if (signer.toSuiAddress().toLowerCase() !== body.reporter.suiAddress.toLowerCase()) {
    throw new Error('signer does not match reporter.suiAddress');
  }
  const { signature } = await signer.signPersonalMessage(toBytes(canonicalize(body)));
  const evidence: Evidence = { ...body, signature };
  const bytes = toBytes(canonicalize(evidence));
  return { evidence, bytes, digest: sha256Hex(bytes) };
}
