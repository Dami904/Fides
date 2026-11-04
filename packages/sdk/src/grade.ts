// Self-grading (SPEC section 11): every verdict is kept with the tier and confidence it had, and once the payment's
// outcome is known it is scored against it. "When Fides paid on its own, the answer was clean X% of the time."
// Only paid attempts have an outcome; a refusal or an unapproved ASK is never graded, because nobody learns what
// would have happened.

export interface GradedVerdict {
  decision: string;
  tier: string;
  outcome: 'clean' | 'burned';
}

export interface GradeLine {
  graded: number;
  clean: number;
  /** clean / graded, or null when nothing was graded: too little to say. */
  cleanRate: number | null;
}

export interface SelfGrade {
  graded: number;
  /** PAY and PAY_CAPPED: the payments Fides made without asking a person. */
  autoPaid: GradeLine;
  byDecision: Record<string, GradeLine>;
  byTier: Record<string, GradeLine>;
}

const line = (rows: GradedVerdict[]): GradeLine => {
  const clean = rows.filter((r) => r.outcome === 'clean').length;
  return { graded: rows.length, clean, cleanRate: rows.length ? clean / rows.length : null };
};
const groupBy = (rows: GradedVerdict[], key: (r: GradedVerdict) => string): Record<string, GradeLine> => {
  const groups: Record<string, GradedVerdict[]> = {};
  for (const r of rows) (groups[key(r)] ??= []).push(r);
  return Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, line(v)]));
};

export function selfGrade(rows: GradedVerdict[]): SelfGrade {
  return {
    graded: rows.length,
    autoPaid: line(rows.filter((r) => r.decision === 'PAY' || r.decision === 'PAY_CAPPED')),
    byDecision: groupBy(rows, (r) => r.decision),
    byTier: groupBy(rows, (r) => r.tier),
  };
}
