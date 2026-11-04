export const DECIMALS = 6;

/** "0.05" to 50000n. Rejects anything that is not a plain non-negative decimal with at most 6 places. */
export function parseAmount(s: string, decimals: number = DECIMALS): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s.trim());
  if (!m) throw new Error(`invalid amount "${s}"`);
  const frac = m[2] ?? '';
  if (frac.length > decimals) throw new Error(`amount "${s}" has more than ${decimals} decimal places`);
  return BigInt(m[1]! + frac.padEnd(decimals, '0'));
}

export function formatAmount(raw: bigint, decimals: number = DECIMALS): string {
  const neg = raw < 0n;
  const s = (neg ? -raw : raw).toString().padStart(decimals + 1, '0');
  const whole = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).replace(/0+$/, '');
  return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
}

export function median(values: bigint[]): bigint | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2n;
}
