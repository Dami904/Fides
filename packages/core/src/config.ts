// All thresholds live here (SPEC section 21). They are starting values to calibrate with the simulation.

export interface FidesConfig {
  /** Required, no default. The engine refuses to start without it. Decimal string in USD. */
  dailyCapUsd: string;
  spikeFactor: { new: number; established: number; trusted: number };
  tiers: {
    establishedMinClean: number;
    establishedWilsonLb: number;
    trustedMinClean: number;
    trustedWilsonLb: number;
  };
  wilsonZ: number;
  windowDays: number;
  /** Evidence dated this far ahead of our clock still counts: agents' clocks differ by seconds, not days. */
  maxClockSkewMs: number;
  decayHalfLifeDays: number;
  /** Verified reports at which a reporter reaches full weight. */
  reporterWeightSaturation: number;
  /** Most weighted outcomes a single reporter may contribute to one merchant. */
  reporterInfluenceCap: number;
  burnRefuseMinReporters: number;
  /** Weighted burn mass at which a merchant's tier drops to "burned". */
  burnedTierMinWeight: number;
  /** Largest payment allowed (PAY_CAPPED) after one verified burn from another reporter, decimal string. */
  burnCapAmount: string;
  /** Own burns at which the merchant is refused outright (one burn is ASK). */
  ownBurnRefuseCount: number;
  /** Recall distance below which an incident counts as strongly similar. Calibrate on real recall distances. */
  similarityMaxDistance: number;
  maxEvidenceBytes: number;
  fetchTimeoutMs: number;
  allowedFetchHosts: string[];
}

export const DEFAULTS: Omit<FidesConfig, 'dailyCapUsd'> = {
  spikeFactor: { new: 3, established: 2, trusted: 1.5 },
  tiers: { establishedMinClean: 3, establishedWilsonLb: 0.6, trustedMinClean: 10, trustedWilsonLb: 0.8 },
  wilsonZ: 1.96,
  windowDays: 30,
  maxClockSkewMs: 300_000,
  decayHalfLifeDays: 14,
  reporterWeightSaturation: 20,
  reporterInfluenceCap: 3,
  burnRefuseMinReporters: 2,
  burnedTierMinWeight: 0.5,
  burnCapAmount: '0.05',
  ownBurnRefuseCount: 2,
  // Measured on the mainnet relayer (docs/ASSUMPTIONS.md): situation-shaped query vs Fides reports 0.36 to 0.37,
  // loose question 0.50 to 0.52, unrelated text 0.89 to 0.95. Only valid for queries built with buildSituationQuery.
  similarityMaxDistance: 0.45,
  maxEvidenceBytes: 524288,
  fetchTimeoutMs: 20000,
  allowedFetchHosts: [],
};

export function loadConfig(overrides: Partial<FidesConfig> & { dailyCapUsd?: string }): FidesConfig {
  const cap = overrides.dailyCapUsd;
  if (cap === undefined || cap.trim() === '') {
    throw new Error('dailyCapUsd is required: refusing to start without a daily spending cap');
  }
  return {
    ...DEFAULTS,
    ...overrides,
    dailyCapUsd: cap,
    spikeFactor: { ...DEFAULTS.spikeFactor, ...overrides.spikeFactor },
    tiers: { ...DEFAULTS.tiers, ...overrides.tiers },
  };
}

export function configFromEnv(env: Record<string, string | undefined>): FidesConfig {
  return loadConfig({ dailyCapUsd: env.FIDES_DAILY_CAP_USD });
}
