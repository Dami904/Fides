// Canonical JSON for fides.evidence/v1 (SPEC section 8): UTF-8, sorted keys, no insignificant whitespace,
// no floats. The digest is the sha256 of the canonical bytes, hex.
import { createHash } from 'node:crypto';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isInteger(value)) throw new Error('floats are not allowed in evidence');
      if (!Number.isSafeInteger(value)) throw new Error('integer too large: use a string');
      return String(value);
    case 'object': {
      if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
      const obj = value as Record<string, unknown>;
      return (
        '{' +
        Object.keys(obj)
          .filter((k) => obj[k] !== undefined)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k]))
          .join(',') +
        '}'
      );
    }
    default:
      throw new Error(`unsupported value of type ${typeof value}`);
  }
}

export const toBytes = (s: string): Uint8Array => new TextEncoder().encode(s);

/** sha256 of the bytes as given. Hash the fetched bytes, never a re-serialised object. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
