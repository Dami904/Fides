// Trust scoring (SPEC section 7): verified outcomes, reporter weighted, decayed, with a cap on any one reporter.
import type { FidesConfig } from './config.js';
import type { EvidenceItem, Tier } from './types.js';

const DAY_MS = 86_400_000;

/** weight = min(1, log2(1 + verifiedReports) / log2(1 + saturation)). A reporter with no history still counts a little. */
export function reporterWeight(verifiedReports: number, saturation: number): number {
  if (verifiedReports < 0) throw new Error('verifiedReports must not be negative');
  return Math.min(1, Math.log2(1 + verifiedReports) / Math.log2(1 + saturation));
}

/** Half-life decay: 1 now, 0.5 after one half-life. */
export function decayFactor(ageDays: number, halfLifeDays: number): number {
  return Math.pow(0.5, Math.max(0, ageDays) / halfLifeDays);
}

/** Lower bound of the Wilson score interval for a rate. n may be fractional (weighted counts). */
export function wilsonLowerBound(successes: number, n: number, z: number): number {
  if (n <= 0) return 0;
  const p = successes / n;
  const z2 = z * z;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (centre - margin) / (1 + z2 / n));
}

/** Evidence inside the window, not dated in the future beyond the allowed clock skew. */
export function inWindow(items: EvidenceItem[], nowMs: number, cfg: FidesConfig): EvidenceItem[] {
  return items.filter((e) => e.issuedAtMs <= nowMs + cfg.maxClockSkewMs && nowMs - e.issuedAtMs <= cfg.windowDays * DAY_MS);
}

export interface Assessment {
  tier: Tier;
  /** Raw verified clean outcomes inside the window. */
  cleanCount: number;
  /** Raw verified burns inside the window. */
  burnCount: number;
  /** Distinct reporters with a verified burn inside the window. */
  burnReporters: string[];
  weightedClean: number;
  weightedBurn: number;
  wilson: number;
  /** Not enough history to classify. The caller must ASK, never guess. */
  cannotSay: boolean;
  confidence: number;
  /** Evidence ids that counted (inside the window). */
  usedIds: string[];
  burnIds: string[];
}

/**
 * Classify a merchant from verified evidence. Every item must already have passed the section 8 checks.
 * `now` is passed in so the result is deterministic.
 */
export function assessMerchant(
  items: EvidenceItem[],
  reporterCounts: Record<string, number>,
  nowMs: number,
  cfg: FidesConfig,
): Assessment {
  const recent = inWindow(items, nowMs, cfg);

  // Per reporter: decayed, reporter-weighted mass, scaled down so one reporter cannot exceed the influence cap.
  const byReporter = new Map<string, { clean: number; burn: number }>();
  for (const e of recent) {
    const w =
      reporterWeight(reporterCounts[e.reporter] ?? 0, cfg.reporterWeightSaturation) *
      decayFactor((nowMs - e.issuedAtMs) / DAY_MS, cfg.decayHalfLifeDays);
    const cur = byReporter.get(e.reporter) ?? { clean: 0, burn: 0 };
    if (e.verdict === 'clean') cur.clean += w;
    else cur.burn += w;
    byReporter.set(e.reporter, cur);
  }
  let weightedClean = 0;
  let weightedBurn = 0;
  for (const { clean, burn } of byReporter.values()) {
    const total = clean + burn;
    const scale = total > cfg.reporterInfluenceCap ? cfg.reporterInfluenceCap / total : 1;
    weightedClean += clean * scale;
    weightedBurn += burn * scale;
  }

  const burns = recent.filter((e) => e.verdict === 'burned');
  const cleanCount = recent.length - burns.length;
  const burnReporters = [...new Set(burns.map((e) => e.reporter))];
  const effN = weightedClean + weightedBurn;
  const wilson = wilsonLowerBound(weightedClean, effN, cfg.wilsonZ);

  let tier: Tier = 'new';
  if (weightedBurn >= cfg.burnedTierMinWeight) tier = 'burned';
  else if (burns.length === 0 && cleanCount >= cfg.tiers.trustedMinClean && wilson > cfg.tiers.trustedWilsonLb) tier = 'trusted';
  else if (cleanCount >= cfg.tiers.establishedMinClean && wilson > cfg.tiers.establishedWilsonLb) tier = 'established';

  // Too little history to classify, and no burn evidence either: say so instead of guessing.
  const cannotSay = burns.length === 0 && cleanCount < cfg.tiers.establishedMinClean;
  const confidence = effN / (effN + 3);

  return {
    tier,
    cleanCount,
    burnCount: burns.length,
    burnReporters,
    weightedClean,
    weightedBurn,
    wilson,
    cannotSay,
    confidence,
    usedIds: recent.map((e) => e.id),
    burnIds: burns.map((e) => e.id),
  };
}
