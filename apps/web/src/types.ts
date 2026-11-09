// Shapes the UI works with. They mirror what the engine produces (apps/agent AgentEvent, packages/sdk CheckResult), so the
// same screens run on recorded fixtures now and on live data later.

export type Decision = 'PAY' | 'PAY_CAPPED' | 'ASK' | 'REFUSE';
export type Tier = 'new' | 'established' | 'trusted' | 'burned';
export type SharedState = 'attached' | 'detached' | 'unreachable';
export type CheckName = 'schemaValid' | 'fresh' | 'onTime' | 'amountMatchesQuote' | 'payToMatchesPinned';

export type AgentEvent =
  | { type: 'challenge'; agent: string; url: string; host: string; amount: string; recipient: string }
  | { type: 'check'; agent: string; host: string; decision: Decision; rules: string[]; reasons: string[]; evidenceIds: string[]; memoryBlobIds: string[]; recalled?: RecalledMemory[]; sharedState: SharedState; rejected: number; pending: number; tier: Tier; confidence: number; cannotSay: boolean }
  | { type: 'asked'; agent: string; host: string; approved: boolean }
  | { type: 'paid'; agent: string; host: string; txDigest: string }
  | { type: 'response'; agent: string; host: string; status: number | null; latencyMs: number; checks: Record<CheckName, boolean>; problems: string[] }
  | { type: 'reported'; agent: string; host: string; status: 'complete' | 'partial'; evidenceId: string; verdict: 'clean' | 'burned' }
  | { type: 'skipped'; agent: string; host: string | null; why: string }
  | { type: 'error'; agent: string; host: string | null; message: string };

export interface Verdict {
  decision: Decision;
  reasons: string[];
  rulesFired: string[];
  citations: { evidenceIds: string[]; memoryBlobIds: string[] };
  tier: Tier;
  confidence: number;
  cannotSay: boolean;
  alerts: { kind: string; merchant: string }[];
}
export interface CheckResult { verdict: Verdict; sharedState: SharedState; rejected: unknown[]; pending: number }
export interface BuyResult {
  agent: string; host: string | null; decision: Decision | null; approved: boolean | null; paid: boolean;
  check?: CheckResult; receipt?: { evidenceId: string; status: string };
  exchange?: { problems: string[]; checks: Record<CheckName, boolean> };
}
export interface DemoStep { id: number; title: string; results: BuyResult[]; checks: { label: string; check: CheckResult }[]; notes: string[] }
export interface DemoFixture {
  generatedAt: string; mode: string; network: string; ok: boolean;
  lost: Record<string, string>; merchants: { good: string; flaky: string; malicious: string };
  steps: DemoStep[]; events: AgentEvent[];
}

export interface SimEvent { round: number; agent: string; merchant: string; kind: 'good' | 'flaky' | 'malicious'; decision: Decision | null; tier?: Tier | null; rules: string[]; paid: boolean; burned: boolean }
export interface SimRun { config: { agents: number; rounds: number; seed: number }; burns: number; paid: number; refused: number; asked: number; rules: Record<string, number>; events: SimEvent[] }
export interface SimFixture { generatedAt: string; seed: number; shared: SimRun; detached: SimRun }

// ---- what the screens receive
export interface Attempt {
  agent: string; host: string; amount: string; recipient: string;
  check?: Extract<AgentEvent, { type: 'check' }>;
  asked?: Extract<AgentEvent, { type: 'asked' }>;
  paid?: Extract<AgentEvent, { type: 'paid' }>;
  response?: Extract<AgentEvent, { type: 'response' }>;
  reported?: Extract<AgentEvent, { type: 'reported' }>;
  skipped?: Extract<AgentEvent, { type: 'skipped' }>;
}
export interface VerifyStep { name: string; ok: boolean; detail: string }
export interface EvidenceItem {
  id: string; agent: string; verdict: 'clean' | 'burned'; problems: string[]; status: 'verified' | 'rejected'; rejectReason?: string;
  /** Set when the record was written in the research run: the session it came from and the payment it describes. */
  research?: { session: number; title: string; txDigest: string | null };
}
export interface MerchantView {
  host: string; tier: Tier; decision?: Decision; cannotSay: boolean;
  clean: number; burned: number; reporters: number; rejectedCount: number;
  firstPaidAt?: string; quotedNow?: string; addressAlert: boolean;
  evidence: EvidenceItem[];
  /** Every attempt on this merchant, oldest first, with the tier the deciding agent saw at that moment. */
  timeline: TimelineStep[];
}
export interface TimelineStep {
  /** Position in the run's decision feed, for linking. */
  index: number; agent: string; tier: Tier | null; decision: Decision | null; cannotSay: boolean;
  sharedState: SharedState | null; outcome: 'clean' | 'burned' | 'not paid';
}
export interface SplitView {
  host: string;
  earlier: { agent: string; label: string; result: string; ok: boolean; evidenceId: string }[];
  /** check is null when the run has no answer for that state: a run on the real relayer cannot switch it off. */
  states: Record<SharedState, { check: CheckResult | null; loss: number; says: string; next: string }>;
  lossOthers: { A: number; C: number };
}
export interface Honesty { items: { key: string; value: string; real: boolean }[] }

/** The research agent's brief, one per session. Mirrors apps/agent/src/research.ts: the UI never imports the engine. */
export type SectionOutcome = 'used' | 'burned' | 'refused' | 'declined' | 'error';
export interface BriefSection {
  topic: string; label: string; host: string | null; outcome: SectionOutcome;
  decision: Decision | null; tier: string | null; cannotSay: boolean; rules: string[]; reasons: string[];
  evidenceIds: string[]; memoryBlobIds: string[]; recalled?: RecalledMemory[]; sharedState: string | null; approved: boolean | null;
  amountUsdc: string | null; txDigest: string | null; reportedEvidenceId: string | null;
  /** What a burned response failed. Recordings made before this field existed lack it. */
  problems?: string[];
  findings: string[]; asOf: string | null; note: string;
}
export interface Brief { question: string; agent: string; sections: BriefSection[]; usedCount: number; spentUsdc: string; lostUsdc: string; summary: string }
export interface ResearchSession { id: number; title: string; agent: string; question: string;
  /** What changed in the world just before this session, done by no agent (the signal source swapping its address). */
  before?: string;
  brief: Brief; expectations: { label: string; ok: boolean; detail?: string }[]; notes: string[] }
export interface ResearchFixture { generatedAt: string; mode: string; network: string; question: string; sessions: ResearchSession[]; lostUsdc: Record<string, string>; ok: boolean }

/** A memory a verdict cited (rule 6) and how close it was to the question. Recordings made before this field existed lack it. */
export interface RecalledMemory { blobId: string; distance: number; merchantHost: string; patterns: string[] }
