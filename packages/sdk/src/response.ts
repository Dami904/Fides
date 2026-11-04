// Turning "what the merchant returned" into the five evidence checks (SPEC sections 8 and 10).
// Deterministic: the merchant publishes /.well-known/fides-schema.json (expected shape, maximum age), and the
// agent compares the response with it. No LLM, no guessing.
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { sha256Hex, toBytes, type EvidenceBody } from '@fides/evidence';

export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

/** The merchant's published description of what a good response looks like. */
export interface SchemaDoc {
  /** The merchant's logical host, the name Fides records it under. */
  host: string;
  /** Expected value of the response's `schema` field, for example "fides.prices/v1". */
  schema: string;
  /** A response older than this (by its `asOf`) is stale. */
  maxAgeSeconds: number;
  /** Required keys of `data` and their types. */
  data: Record<string, FieldType>;
}

const kindOf = (v: unknown): FieldType | 'null' =>
  v === null ? 'null' : Array.isArray(v) ? 'array' : (typeof v as FieldType);

export interface ResponseCheck {
  schemaValid: boolean;
  fresh: boolean;
  /** Why a check failed, for logs and the narrative. */
  problems: string[];
}

/** Compare a response body with the merchant's published schema. */
export function checkResponse(doc: SchemaDoc, bodyText: string | null, nowMs: number): ResponseCheck {
  const problems: string[] = [];
  if (bodyText === null) return { schemaValid: false, fresh: false, problems: ['no response'] };
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return { schemaValid: false, fresh: false, problems: ['response is not JSON'] };
  }
  let schemaValid = true;
  let fresh = true;
  if (kindOf(body) !== 'object') {
    return { schemaValid: false, fresh: false, problems: ['response is not a JSON object'] };
  }
  const b = body as Record<string, unknown>;
  if (b.schema !== doc.schema) {
    schemaValid = false;
    problems.push(`schema is ${JSON.stringify(b.schema)}, expected ${doc.schema}`);
  }
  if (kindOf(b.data) !== 'object') {
    schemaValid = false;
    problems.push('data is missing or not an object');
  } else {
    for (const [k, t] of Object.entries(doc.data)) {
      const got = kindOf((b.data as Record<string, unknown>)[k]);
      if (got !== t) {
        schemaValid = false;
        problems.push(`data.${k} is ${got}, expected ${t}`);
      }
    }
  }
  const asOf = typeof b.asOf === 'string' ? Date.parse(b.asOf) : NaN;
  if (Number.isNaN(asOf)) {
    fresh = false;
    problems.push('asOf is missing or not a date');
  } else if (nowMs - asOf > doc.maxAgeSeconds * 1000) {
    fresh = false;
    problems.push(`asOf is ${Math.round((nowMs - asOf) / 1000)} s old, maximum is ${doc.maxAgeSeconds} s`);
  } else if (asOf - nowMs > 5000) {
    fresh = false;
    problems.push('asOf is in the future');
  }
  return { schemaValid, fresh, problems };
}

export interface ExchangeInput {
  doc: SchemaDoc;
  /** The response body, or null when nothing arrived in time. */
  bodyText: string | null;
  nowMs: number;
  latencyMs: number;
  /** The longest the agent waits for a paid response. */
  maxLatencyMs: number;
  /** Raw units the 402 quoted, and what was actually paid. */
  quotedRaw: bigint;
  paidRaw: bigint;
  /** Where the payment went, and the address pinned for this merchant. */
  payTo: string;
  pinnedPayTo: string;
}

export interface Exchange {
  checks: EvidenceBody['checks'];
  problems: string[];
  /** sha256 of the response bytes (empty string hashed when there was none). */
  responseHash: string;
  responseBytes: number;
}

/** The five checks of SPEC section 8, plus the response hash and size for the evidence record. */
export function evaluateExchange(i: ExchangeInput): Exchange {
  const r = checkResponse(i.doc, i.bodyText, i.nowMs);
  const bytes = toBytes(i.bodyText ?? '');
  const onTime = i.bodyText !== null && i.latencyMs <= i.maxLatencyMs;
  const problems = [...r.problems];
  if (!onTime) problems.push(`no response within ${i.maxLatencyMs} ms (took ${i.latencyMs} ms)`);
  const amountMatchesQuote = i.paidRaw === i.quotedRaw;
  if (!amountMatchesQuote) problems.push(`paid ${i.paidRaw}, quoted ${i.quotedRaw}`);
  const payToMatchesPinned = normalizeSuiAddress(i.payTo) === normalizeSuiAddress(i.pinnedPayTo);
  if (!payToMatchesPinned) problems.push('payout address differs from the pinned address');
  return {
    checks: { schemaValid: r.schemaValid, fresh: r.fresh, onTime, amountMatchesQuote, payToMatchesPinned },
    problems,
    responseHash: sha256Hex(bytes),
    responseBytes: bytes.length,
  };
}

/** sha256 of a request description, for evidence.exchange.requestHash. */
export const hashRequest = (method: string, url: string): string => sha256Hex(toBytes(`${method} ${url}`));
