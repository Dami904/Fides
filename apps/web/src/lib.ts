// Pure logic the screens share. No React, no I/O: tested on its own.
import type { AgentEvent, Attempt, SimEvent, Tier } from './types';

/** Group the flat event stream into one record per attempt. An attempt starts at a 402 challenge. */
export function attempts(events: AgentEvent[]): Attempt[] {
  const out: Attempt[] = [];
  let cur: Attempt | null = null;
  for (const e of events) {
    if (e.type === 'challenge') {
      cur = { agent: e.agent, host: e.host, amount: e.amount, recipient: e.recipient };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    if (e.type === 'check') cur.check = e;
    else if (e.type === 'asked') cur.asked = e;
    else if (e.type === 'paid') cur.paid = e;
    else if (e.type === 'response') cur.response = e;
    else if (e.type === 'reported') cur.reported = e;
    else if (e.type === 'skipped') cur.skipped = e;
  }
  return out;
}

/** A mirrored five by five grid drawn from a hash: the same hash always looks the same, a different one never does. */
export function glyphCells(hex: string): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const on = (parseInt(hex[(r * 3 + c) % hex.length] || '0', 16) & 1) === 1;
      if (on) {
        cells.push([c, r]);
        if (c < 2) cells.push([4 - c, r]);
      }
    }
  }
  return cells;
}

export type CellState = 'none' | 'burn' | 'refuse' | 'clean' | 'asked';

export interface GradeLine { graded: number; clean: number }
/**
 * Self-grading as of a round: every paid attempt's verdict against what the merchant returned. "auto" is the payments
 * made without asking a person (PAY, PAY_CAPPED). Refusals and unapproved asks are never graded.
 */
export function gradeAt(events: SimEvent[], round: number): { auto: GradeLine; byTier: Partial<Record<Tier, GradeLine>> } {
  const auto: GradeLine = { graded: 0, clean: 0 };
  const byTier: Partial<Record<Tier, GradeLine>> = {};
  for (const e of events) {
    if (e.round > round || !e.paid || !e.decision) continue;
    const clean = e.burned ? 0 : 1;
    if (e.decision === 'PAY' || e.decision === 'PAY_CAPPED') { auto.graded++; auto.clean += clean; }
    if (e.tier) { const l = (byTier[e.tier] ??= { graded: 0, clean: 0 }); l.graded++; l.clean += clean; }
  }
  return { auto, byTier };
}

/** The state of every agent and merchant cell, and the counters, as of a given round. Worst outcome wins. */
export function boardAt(events: SimEvent[], round: number) {
  const cells = new Map<string, CellState>();
  const totals = { burns: 0, paid: 0, refused: 0, asked: 0 };
  const rank: Record<CellState, number> = { none: 0, asked: 1, clean: 2, refuse: 3, burn: 4 };
  for (const e of events) {
    if (e.round > round) continue;
    const s: CellState = e.burned ? 'burn' : e.decision === 'REFUSE' ? 'refuse' : e.paid ? 'clean' : 'asked';
    const k = `${e.agent}|${e.merchant}`;
    if (rank[s] > rank[cells.get(k) ?? 'none']) cells.set(k, s);
    if (e.burned) totals.burns++;
    if (e.paid) totals.paid++;
    if (e.decision === 'REFUSE') totals.refused++;
    if (e.decision === 'ASK') totals.asked++;
  }
  return { cells, totals };
}

/** Merchants in a stable order: good first, then flaky, then malicious. */
export function merchantOrder(events: SimEvent[]): string[] {
  const kind = (m: string) => (m.startsWith('good') ? 0 : m.startsWith('flaky') ? 1 : 2);
  return [...new Set(events.map((e) => e.merchant))].sort((a, b) => kind(a) - kind(b) || a.localeCompare(b));
}

export type Route =
  | { name: 'home' }
  | { name: 'feed' }
  | { name: 'decision'; index: number }
  | { name: 'split' }
  | { name: 'merchants' }
  | { name: 'merchant'; host: string }
  | { name: 'evidence'; id: string }
  | { name: 'simulation' };

/** Read a hash like "#/merchants/flaky.fides-demo.test". Anything unknown goes home rather than to a blank page. */
export function parseRoute(hash: string): Route {
  const [head = '', ...rest] = hash.replace(/^#\/?/, '').split('/').map((p) => { try { return decodeURIComponent(p); } catch { return p; } });
  const arg = rest.join('/');
  switch (head) {
    case 'feed': return /^\d+$/.test(arg) ? { name: 'decision', index: Number(arg) } : { name: 'feed' };
    case 'split': return { name: 'split' };
    case 'merchant': case 'merchants': return arg ? { name: 'merchant', host: arg } : { name: 'merchants' };
    case 'evidence': return arg ? { name: 'evidence', id: arg } : { name: 'merchants' };
    case 'simulation': return { name: 'simulation' };
    default: return { name: 'home' };
  }
}

export const href = {
  home: '#/', feed: '#/feed', split: '#/split', merchants: '#/merchants', simulation: '#/simulation',
  decision: (i: number) => `#/feed/${i}`,
  merchant: (host: string) => `#/merchants/${encodeURIComponent(host)}`,
  evidence: (id: string) => `#/evidence/${encodeURIComponent(id)}`,
};

export const short = (s: string | undefined, n = 8) => (s ? s.slice(0, n) : '');
export const shortAddr = (s: string) => (s.length > 20 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s);
export const usd = (n: number | string) => Number(n).toFixed(2);

/** Parse the re-verify lines the demo recorded: "re-verify <name>  ok|FAIL  <detail>". */
export function parseSteps(notes: string[]) {
  return notes.flatMap((n) => {
    const m = /^re-verify (\S+)\s+(ok|FAIL)\s+(.*)$/.exec(n);
    return m ? [{ name: m[1]!, ok: m[2] === 'ok', detail: m[3]! }] : [];
  });
}
