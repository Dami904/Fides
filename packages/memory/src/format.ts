// Memory text format for the shared record. Recall is fuzzy and the text is written by any delegate,
// so it is UNTRUSTED: the header is only a lookup aid, the exact host and payTo are in it so recall
// results can be post-filtered in code, and nothing here is believed until the evidence inside it
// passes verification (SPEC section 8).
import { canonicalize, sha256Hex, toBytes, type Evidence } from '@fides/evidence';

export const MEMORY_TAG = '[fides.memory/v1]';
const BURN_KINDS = ['junk', 'no_delivery', 'price_changed', 'address_changed'];

export interface MemoryHeader {
  host: string;
  payTo: string;
  verdict: 'clean' | 'burned';
  burnKind: string | null;
  reporter: string;
  sha256: string;
  tx: string;
  patterns: string[];
}

export interface ParsedMemory {
  header: MemoryHeader;
  /** Short human text for display only. Never used in a decision. */
  narrative: string;
  /** The evidence JSON exactly as stored. Verify before use. */
  evidenceBytes: Uint8Array;
}

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/i;
const ADDR = /^0x[0-9a-f]{1,64}$/i;
const HEX64 = /^[0-9a-f]{64}$/i;
const TX = /^[A-Za-z0-9]{1,100}$/;
const PATTERNS = /^[a-z0-9_]+(,[a-z0-9_]+)*$/;

/** One sentence for people and for semantic search: what happened, in plain words. */
export function describeReport(e: Evidence): string {
  const failed = Object.entries(e.checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  const ok = e.verdict === 'clean';
  return (
    `Agent ${e.reporter.agentId} paid ${e.merchant.host} ${e.payment.amount} raw ${e.payment.asset.split('::').pop()} ` +
    (ok
      ? `and the merchant delivered as advertised in ${e.exchange.latencyMs} ms.`
      : `and was burned (${e.burnKind}): failed checks ${failed.join(', ') || 'none recorded'}, response took ${e.exchange.latencyMs} ms.`)
  );
}

export function formatMemory(e: Evidence, patterns: string[]): { text: string; digest: string } {
  for (const p of patterns) if (!/^[a-z0-9_]+$/.test(p)) throw new Error(`invalid pattern tag "${p}"`);
  const evidenceJson = canonicalize(e);
  const digest = sha256Hex(toBytes(evidenceJson));
  const header =
    `${MEMORY_TAG} host=${e.merchant.host.toLowerCase()} | payTo=${e.merchant.payTo} | verdict=${e.verdict} | ` +
    `burnKind=${e.burnKind ?? 'none'} | reporter=${e.reporter.suiAddress} | sha256=${digest} | tx=${e.payment.txDigest} | ` +
    `patterns=${patterns.length ? patterns.join(',') : 'none'}`;
  return { text: `${header}\n${describeReport(e)}\nEVIDENCE ${evidenceJson}`, digest };
}

/** Strict parse. Returns null for anything that is not a well formed Fides memory (foreign or malformed text is ignored, not trusted). */
export function parseMemory(text: string, maxEvidenceBytes: number): ParsedMemory | null {
  if (text.length > maxEvidenceBytes + 8192) return null;
  const lines = text.split('\n');
  if (lines.length < 3) return null;
  const head = lines[0]!;
  const last = lines[lines.length - 1]!;
  if (!head.startsWith(MEMORY_TAG + ' ') || !last.startsWith('EVIDENCE ')) return null;

  const kv = new Map<string, string>();
  for (const part of head.slice(MEMORY_TAG.length + 1).split(' | ')) {
    const i = part.indexOf('=');
    if (i <= 0) return null;
    const k = part.slice(0, i);
    if (kv.has(k)) return null;
    kv.set(k, part.slice(i + 1));
  }
  const g = (k: string) => kv.get(k);
  const host = g('host'), payTo = g('payTo'), verdict = g('verdict'), burnKind = g('burnKind');
  const reporter = g('reporter'), sha256 = g('sha256'), tx = g('tx'), patterns = g('patterns');
  if (!host || !payTo || !verdict || !burnKind || !reporter || !sha256 || !tx || !patterns) return null;
  if (!HOST.test(host) || !ADDR.test(payTo) || !ADDR.test(reporter) || !HEX64.test(sha256) || !TX.test(tx)) return null;
  if (verdict !== 'clean' && verdict !== 'burned') return null;
  if (burnKind !== 'none' && !BURN_KINDS.includes(burnKind)) return null;
  if ((verdict === 'burned') === (burnKind === 'none')) return null;
  if (patterns !== 'none' && !PATTERNS.test(patterns)) return null;

  const evidenceBytes = toBytes(last.slice('EVIDENCE '.length));
  if (evidenceBytes.length > maxEvidenceBytes) return null;
  const narrative = lines
    .slice(1, -1)
    .join(' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .slice(0, 500);

  return {
    header: {
      host: host.toLowerCase(),
      payTo,
      verdict,
      burnKind: burnKind === 'none' ? null : burnKind,
      reporter,
      sha256: sha256.toLowerCase(),
      tx,
      patterns: patterns === 'none' ? [] : patterns.split(','),
    },
    narrative,
    evidenceBytes,
  };
}

/** The query used to find similar incidents. Plain words plus the exact host and address, so recall can be post-filtered. */
export function buildSituationQuery(s: { host: string; payTo: string; amount: string; tier: string; notes?: string[] }): string {
  return (
    `Merchant ${s.host.toLowerCase()} payTo ${s.payTo} price ${s.amount} tier ${s.tier}. ` +
    (s.notes?.length ? s.notes.join('. ') + '. ' : '') +
    'Burned after a clean streak, address changed, price jumped, junk response.'
  );
}
