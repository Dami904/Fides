// A research agent (hackathon track "Smart Agents for Real Life": a research agent with source trust scores).
//
// It answers a question by buying from several paid sources. For each source Fides decides first: pay, ask a person,
// or refuse. The agent returns a brief that says, for every source, what it did and why, and which signed reports it
// relied on. A source it did not trust is a labelled gap in the brief, never filled with anything.
//
// What this does not do: judge whether a source's content is TRUE. Fides judges whether a source delivered what it
// promised (the published format, fresh, the quoted price, the expected payout address). There is no ground truth here,
// and the brief says "delivered as advertised", never "correct".
import { parseAmount } from '@fides/core';
import type { RecalledMemory } from '@fides/sdk';
import type { BuyResult, DecisionName, PayingAgent } from './agent.js';

export interface Source {
  /** What the source is for, for example "prices". */
  topic: string;
  /** How the brief names it. */
  label: string;
  /** The paid resource URL. */
  resource: string;
}

export type SectionOutcome =
  | 'used' // paid, delivered as advertised: its content is in the brief
  | 'burned' // paid, and the response failed a check: its content is thrown away
  | 'refused' // Fides said no: nothing was paid
  | 'declined' // Fides said ask, and the person did not approve: nothing was paid
  | 'error'; // could not be asked about or paid for (no schema, request failed, unknown payment)

export interface BriefSection {
  topic: string;
  label: string;
  host: string | null;
  outcome: SectionOutcome;
  /** What Fides said before any money moved. Null when the source could not be asked about. */
  decision: DecisionName | null;
  tier: string | null;
  cannotSay: boolean;
  rules: string[];
  reasons: string[];
  /** The signed, anchored reports this decision rested on. */
  evidenceIds: string[];
  /** The recalled memories of other merchants it rested on (rule 6). */
  memoryBlobIds: string[];
  /** The same memories with their recall distance and the pattern that matched. */
  recalled: RecalledMemory[];
  sharedState: string | null;
  /** A person was asked, and what they said. Null when nobody was asked. */
  approved: boolean | null;
  amountUsdc: string | null;
  txDigest: string | null;
  /** The report this agent wrote about the exchange, if it paid. */
  reportedEvidenceId: string | null;
  /** What the response failed, when it was paid for and burned. Empty otherwise. */
  problems: string[];
  /** Plain lines from what was delivered. Empty unless the outcome is "used". */
  findings: string[];
  asOf: string | null;
  /** One plain sentence about this source. */
  note: string;
}

export interface Brief {
  question: string;
  agent: string;
  sections: BriefSection[];
  usedCount: number;
  spentUsdc: string;
  /** Paid, then thrown away because the response failed a check. */
  lostUsdc: string;
  summary: string;
}

/**
 * Whether a rule 6 (similar-incident) ASK changed the outcome. Rule 6 is checked just before the tier rule, which pays only
 * an established or trusted merchant. For any other tier the tier rule would have asked a person too.
 */
export function recallChangedDecision(tier: string | null): boolean {
  return tier === 'established' || tier === 'trusted';
}

const usdc = (raw: bigint) => (Number(raw) / 1e6).toFixed(2);

/** Turn delivered data into plain lines. Known shapes get readable lines; anything else is shown as it came. */
export function findingsOf(topic: string, data: unknown): string[] {
  const d = (data ?? {}) as Record<string, unknown>;
  if (topic === 'prices' && d.prices && typeof d.prices === 'object') {
    return Object.entries(d.prices as Record<string, unknown>).map(([k, v]) => `${k} ${typeof v === 'number' ? `$${v.toLocaleString('en-US')}` : String(v)}`);
  }
  if (topic === 'news' && Array.isArray(d.headlines)) return d.headlines.map(String);
  if (topic === 'signal' && typeof d.signal === 'string') {
    const c = typeof d.confidence === 'number' ? `, confidence ${Math.round(d.confidence * 100)}%` : '';
    return [`signal: ${d.signal}${c}`];
  }
  return [JSON.stringify(data)];
}

function sectionFrom(src: Source, r: BuyResult, amount: string | null): BriefSection {
  const s = sectionCore(src, r, amount);
  // A decision made without the shared record rests on this agent's own history only. Say so, whatever the outcome.
  const shared = r.check?.sharedState;
  // Rule 6 comes before the tier rule. For a merchant that is not yet established the tier rule asks a person anyway,
  // so the recalled memories were cited without changing the outcome. Say so rather than let the citation overclaim.
  if (s.rules.includes('similar-incident') && !recallChangedDecision(s.tier)) {
    s.note += ' Recalled memories of other merchants are cited, but they did not change the decision: this source is new, so a person would have been asked anyway.';
  }
  if (shared && shared !== 'attached') s.note += ` The shared record was ${shared}, so this decision rested on this agent's own history only.`;
  return s;
}

function sectionCore(src: Source, r: BuyResult, amount: string | null): BriefSection {
  const v = r.check?.verdict;
  const failed = !!r.exchange && !Object.values(r.exchange.checks).every(Boolean);
  const base = {
    topic: src.topic,
    label: src.label,
    host: r.host,
    decision: r.decision,
    tier: v?.tier ?? null,
    cannotSay: v?.cannotSay ?? false,
    rules: v?.rulesFired ?? [],
    reasons: v?.reasons ?? [],
    evidenceIds: v?.citations.evidenceIds ?? [],
    memoryBlobIds: v?.citations.memoryBlobIds ?? [],
    recalled: r.check?.recalled ?? [],
    sharedState: r.check?.sharedState ?? null,
    approved: r.approved,
    amountUsdc: amount,
    txDigest: r.txDigest ?? null,
    reportedEvidenceId: r.receipt?.evidenceId ?? null,
    problems: failed ? r.exchange!.problems : [],
    findings: [] as string[],
    asOf: null as string | null,
  };
  if (r.decision === null) return { ...base, outcome: 'error', note: `Could not be used: ${r.error ?? 'unknown error'}.` };
  if (r.decision === 'REFUSE') return { ...base, outcome: 'refused', note: 'Not paid. Fides refused this source.' };
  if (!r.paid && r.approved === false) return { ...base, outcome: 'declined', note: 'Not paid. Fides asked a person and nobody approved.' };
  // Approved, or allowed without asking, and still not paid: the payment itself failed. That is an error, not a choice.
  if (!r.paid) return { ...base, outcome: 'error', note: `Not paid: ${r.error ?? 'the payment did not go through'}.` };
  if (failed || !r.delivered) {
    return { ...base, outcome: 'burned', note: `Paid ${amount ?? '?'} USDC and the response failed a check (${r.exchange?.problems.join('; ') ?? 'no usable response'}). Its content was thrown away and a signed burn report was written${r.receipt && r.receipt.status !== 'complete' ? ', held back from the shared record until it can be written' : ''}.` };
  }
  const who = r.approved ? 'A person approved the payment. ' : '';
  return { ...base, outcome: 'used', findings: findingsOf(src.topic, r.delivered.data), asOf: r.delivered.asOf || null, note: `${who}Delivered as advertised.` };
}

/** Answer one question from the given sources, one at a time. Fides decides each purchase before any money moves. */
export async function research(agent: PayingAgent, question: string, sources: Source[]): Promise<Brief> {
  const sections: BriefSection[] = [];
  let spent = 0n;
  let lost = 0n;
  for (const src of sources) {
    const r = await agent.buy(src.resource);
    const amount = r.amount ?? null;
    const s = sectionFrom(src, r, amount);
    if (r.paid && amount) {
      spent += parseAmount(amount);
      if (s.outcome === 'burned') lost += parseAmount(amount);
    }
    sections.push(s);
  }
  const used = sections.filter((s) => s.outcome === 'used');
  const skipped = sections.filter((s) => s.outcome === 'refused' || s.outcome === 'declined');
  const burned = sections.filter((s) => s.outcome === 'burned');
  const parts = [`Used ${used.length} of ${sections.length} sources.`];
  if (skipped.length) parts.push(`Did not pay ${skipped.map((s) => s.label.toLowerCase()).join(' and ')}.`);
  if (burned.length) parts.push(`Burned by ${burned.map((s) => s.label.toLowerCase()).join(' and ')}.`);
  parts.push(`Spent ${usdc(spent)} USDC, lost ${usdc(lost)}.`);
  return { question, agent: agent.name, sections, usedCount: used.length, spentUsdc: usdc(spent), lostUsdc: usdc(lost), summary: parts.join(' ') };
}

/** The brief as plain text, for a terminal. */
export function renderBrief(b: Brief): string {
  const out: string[] = [`Question: ${b.question}`, `Agent ${b.agent}. ${b.summary}`, ''];
  for (const s of b.sections) {
    const tag = { used: 'USED', burned: 'BURNED', refused: 'REFUSED', declined: 'DECLINED', error: 'ERROR' }[s.outcome];
    out.push(`  [${tag}] ${s.label} (${s.host ?? 'unknown source'}${s.tier ? `, tier ${s.tier}` : ''})`);
    out.push(`      ${s.note}`);
    for (const f of s.findings) out.push(`      - ${f}`);
    if (s.outcome !== 'used') for (const r of s.reasons.slice(0, 2)) out.push(`      why: ${r}`);
    if (s.evidenceIds.length) out.push(`      relied on ${s.evidenceIds.length} signed report(s): ${s.evidenceIds.map((e) => e.slice(0, 8)).join(', ')}`);
  }
  return out.join('\n');
}
