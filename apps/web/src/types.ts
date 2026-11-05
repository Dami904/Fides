// Shapes the UI works with. They mirror what the engine produces (apps/agent AgentEvent, packages/sdk CheckResult), so the
// same screens run on recorded fixtures now and on live data later.

export type Decision = 'PAY' | 'PAY_CAPPED' | 'ASK' | 'REFUSE';
export type Tier = 'new' | 'established' | 'trusted' | 'burned';
export type SharedState = 'attached' | 'detached' | 'unreachable';
export type CheckName = 'schemaValid' | 'fresh' | 'onTime' | 'amountMatchesQuote' | 'payToMatchesPinned';

export type AgentEvent =
  | { type: 'challenge'; agent: string; url: string; host: string; amount: string; recipient: string }
  | { type: 'check'; agent: string; host: string; decision: Decision; rules: string[]; reasons: string[]; evidenceIds: string[]; memoryBlobIds: string[]; sharedState: SharedState; rejected: number; pending: number; tier: Tier; confidence: number; cannotSay: boolean }
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
export interface EvidenceItem { id: string; agent: string; verdict: 'clean' | 'burned'; problems: string[]; status: 'verified' | 'rejected'; rejectReason?: string }
export interface MerchantView {
  host: string; tier: Tier; decision?: Decision; cannotSay: boolean;
  clean: number; burned: number; reporters: number; rejectedCount: number;
  firstPaidAt?: string; quotedNow?: string; addressAlert: boolean;
  evidence: EvidenceItem[];
}
export interface SplitView {
  host: string;
  earlier: { agent: string; label: string; result: string; ok: boolean; evidenceId: string }[];
  /** check is null when the run has no answer for that state: a run on the real relayer cannot switch it off. */
  states: Record<SharedState, { check: CheckResult | null; loss: number; says: string; next: string }>;
  lossOthers: { A: number; C: number };
}
export interface Honesty { items: { key: string; value: string; real: boolean }[] }
