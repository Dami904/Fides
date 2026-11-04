// Read-time verification of one evidence record (SPEC section 8). A report that fails any check is
// rejected with the reason, never silently dropped and never believed. A failed lookup is an error,
// not "not found". Steps are yielded one by one so the UI can animate Re-verify.
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { canonicalize, sha256Hex, toBytes } from './canonical.js';
import {
  EVIDENCE_SCHEMA,
  type Anchor,
  type ChainReader,
  type Evidence,
  type PaymentFacts,
  type VerifyResult,
  type VerifyStep,
} from './types.js';

const BURN_KINDS = ['junk', 'no_delivery', 'price_changed', 'address_changed'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isRaw = (v: unknown): v is string => typeof v === 'string' && /^\d+$/.test(v);
const isAddr = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-fA-F]{1,64}$/.test(v);

/** Throws with a precise message if the parsed value is not a well formed fides.evidence/v1 record. */
export function parseEvidence(value: unknown): Evidence {
  if (!isObj(value)) throw new Error('not an object');
  const need = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
  };
  need(value.schema === EVIDENCE_SCHEMA, `schema must be ${EVIDENCE_SCHEMA}`);
  need(isStr(value.issuedAt) && !Number.isNaN(Date.parse(value.issuedAt as string)), 'issuedAt must be an ISO date');
  const r = value.reporter;
  need(isObj(r) && isStr(r.agentId) && isAddr(r.suiAddress), 'reporter is malformed');
  const m = value.merchant;
  need(isObj(m) && isStr(m.host) && isAddr(m.payTo), 'merchant is malformed');
  const p = value.payment;
  need(
    isObj(p) && isStr(p.txDigest) && isRaw(p.amount) && isStr(p.asset) && isRaw(p.quotedAmount) && isStr(p.network),
    'payment is malformed',
  );
  const x = value.exchange;
  need(
    isObj(x) && isStr(x.requestHash) && isStr(x.responseHash) && isInt(x.responseBytes) && isInt(x.latencyMs),
    'exchange is malformed',
  );
  const c = value.checks;
  need(
    isObj(c) &&
      ['schemaValid', 'fresh', 'onTime', 'amountMatchesQuote', 'payToMatchesPinned'].every((k) => typeof c[k] === 'boolean'),
    'checks are malformed',
  );
  need(value.verdict === 'clean' || value.verdict === 'burned', 'verdict must be clean or burned');
  need(
    value.burnKind === null || (typeof value.burnKind === 'string' && BURN_KINDS.includes(value.burnKind)),
    'burnKind is malformed',
  );
  need((value.verdict === 'burned') === (value.burnKind !== null), 'burnKind must be set exactly when the verdict is burned');
  const f = value.finality;
  need(isObj(f) && isStr(f.checkpoint) && f.verifiedVia === 'tatum', 'finality is malformed');
  need(isStr(value.signature), 'signature is missing');
  return value as unknown as Evidence;
}

const sameAddr = (a: string, b: string) => normalizeSuiAddress(a) === normalizeSuiAddress(b);

export async function* verifyEvidenceSteps(
  bytes: Uint8Array,
  anchor: Anchor,
  chain: ChainReader,
  opts: { maxBytes: number },
): AsyncGenerator<VerifyStep, { evidence: Evidence; payment: PaymentFacts } | undefined> {
  const step = (name: VerifyStep['name'], ok: boolean, detail: string): VerifyStep => ({ name, ok, detail });

  // 1. Format: size, UTF-8 JSON, well formed, and in canonical form (so the signed bytes are unambiguous).
  let evidence: Evidence;
  try {
    if (bytes.length > opts.maxBytes) throw new Error(`record is ${bytes.length} bytes, limit is ${opts.maxBytes}`);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(text);
    evidence = parseEvidence(parsed);
    if (canonicalize(parsed) !== text) throw new Error('bytes are not canonical JSON (sorted keys, no whitespace)');
  } catch (e) {
    yield step('format', false, (e as Error).message);
    return undefined;
  }
  yield step('format', true, `well formed, ${bytes.length} bytes, canonical`);

  // 2. Hash of the fetched bytes equals the digest anchored on Sui.
  const digest = sha256Hex(bytes);
  if (digest !== anchor.evidenceSha256.toLowerCase()) {
    yield step('hash', false, `sha256 of the fetched bytes is ${digest}, the Sui anchor says ${anchor.evidenceSha256}`);
    return undefined;
  }
  yield step('hash', true, `sha256 ${digest} matches the Sui anchor`);

  // 3. Signature by the reporter over the canonical bytes without the signature field.
  try {
    const { signature, ...body } = evidence;
    const signer = await verifyPersonalMessageSignature(toBytes(canonicalize(body)), signature);
    if (!sameAddr(signer.toSuiAddress(), evidence.reporter.suiAddress)) {
      yield step('signature', false, `signed by ${signer.toSuiAddress()}, not by the stated reporter ${evidence.reporter.suiAddress}`);
      return undefined;
    }
  } catch (e) {
    yield step('signature', false, `signature does not verify: ${(e as Error).message}`);
    return undefined;
  }
  yield step('signature', true, `signed by reporter ${evidence.reporter.suiAddress}`);

  // 4. The anchor event was sent by the reporter.
  if (!sameAddr(anchor.sender, evidence.reporter.suiAddress)) {
    yield step('anchor-sender', false, `anchor sent by ${anchor.sender}, not by the reporter ${evidence.reporter.suiAddress}`);
    return undefined;
  }
  yield step('anchor-sender', true, 'anchor event sender equals the reporter');

  // 5. The payment exists, is final, was sent by the reporter, and paid the stated amount to the merchant.
  let pay;
  try {
    pay = await chain.getPayment(evidence.payment.txDigest);
  } catch (e) {
    yield step('payment', false, `payment lookup failed (not the same as "not found"): ${(e as Error).message}`);
    return undefined;
  }
  if (!pay) {
    yield step('payment', false, `payment transaction ${evidence.payment.txDigest} does not exist`);
    return undefined;
  }
  if (pay.status !== 'SUCCESS') {
    yield step('payment', false, `payment transaction status is ${pay.status}`);
    return undefined;
  }
  if (pay.checkpoint === null || pay.checkpoint === undefined) {
    yield step('payment', false, 'payment transaction is not final yet');
    return undefined;
  }
  if (!sameAddr(pay.sender, evidence.reporter.suiAddress)) {
    yield step('payment', false, `payment was sent by ${pay.sender}, not by the reporter`);
    return undefined;
  }
  const received = pay.changes
    .filter((c) => c.owner !== undefined && sameAddr(c.owner, evidence.merchant.payTo) && c.coinType === evidence.payment.asset)
    .reduce((s, c) => s + (c.amount > 0n ? c.amount : 0n), 0n);
  if (received < BigInt(evidence.payment.amount)) {
    yield step('payment', false, `merchant payTo received ${received}, the report states ${evidence.payment.amount}`);
    return undefined;
  }
  yield step('payment', true, `final in checkpoint ${pay.checkpoint}, sender is the reporter, ${received} paid to ${evidence.merchant.payTo}`);
  return { evidence, payment: pay };
}

export async function verifyEvidence(
  bytes: Uint8Array,
  anchor: Anchor,
  chain: ChainReader,
  opts: { maxBytes: number },
): Promise<VerifyResult> {
  const steps: VerifyStep[] = [];
  const gen = verifyEvidenceSteps(bytes, anchor, chain, opts);
  let next = await gen.next();
  while (!next.done) {
    steps.push(next.value);
    next = await gen.next();
  }
  const failed = steps.find((s) => !s.ok);
  const digest = sha256Hex(bytes);
  if (failed || !next.value) {
    return { ok: false, rejectedAt: failed?.name, reason: failed?.detail, steps, digest };
  }
  return { ok: true, steps, evidence: next.value.evidence, payment: next.value.payment, digest };
}
