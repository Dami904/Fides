// The three Fides tools, defined once (SPEC section 9). The MCP server and the adapters for OpenAI, Anthropic, Gemini
// and OpenRouter all build on this, so every model sees the same names, the same inputs and the same behaviour.
//   fides_check   should I pay this merchant?      -> verdict with reasons, rules, citations
//   fides_report  record what happened             -> receipt (evidence id, Sui anchor, shared memory write)
//   fides_lookup  what is known about a merchant   -> tier, evidence (verified and rejected), alerts
// Every answer carries its citations. A failure is an error result with the cause, never an empty "no ratings".
import { z } from 'zod';
import type { Fides } from '@fides/sdk';

const HOST = z.string().min(1).max(253).regex(/^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/, 'a plain hostname, no scheme or port');
const ADDRESS = z.string().regex(/^0x[0-9a-fA-F]{1,64}$/, 'a Sui address');
const DECIMAL = z.string().regex(/^\d+(\.\d{1,6})?$/, 'a decimal amount with up to 6 places, for example "0.01"');
const RAW = z.string().regex(/^\d+$/, 'an integer in raw units');
const HEX = z.string().regex(/^[0-9a-fA-F]{64}$/, '64 hex characters (a sha256)');

export interface ToolOutput {
  /** One line a person or a model can read at a glance. */
  summary: string;
  data: Record<string, unknown>;
}

export interface FidesTool {
  name: string;
  title: string;
  description: string;
  /** Input as a zod shape. MCP registers it directly; the adapters turn it into JSON Schema. */
  shape: z.ZodRawShape;
  readOnly: boolean;
  run(args: Record<string, unknown>): Promise<ToolOutput>;
}

export interface FidesToolsOptions {
  /** Whose daily cap checks count against. Default "agent". */
  ownerId?: string;
}

export function fidesTools(fides: Fides, o: FidesToolsOptions = {}): FidesTool[] {
  const ownerId = o.ownerId ?? 'agent';

  const checkShape = {
    merchantHost: HOST.describe("the merchant's host, as the merchant publishes it, with no scheme or port"),
    payTo: ADDRESS.describe('the payout address in the 402 challenge'),
    amount: DECIMAL.describe('the price in the 402 challenge, in USDC, for example "0.01"'),
    asset: z.string().min(1).describe('the coin type in the 402 challenge'),
    network: z.string().default('sui').describe('network name'),
    resource: z.string().default('/').describe('the path being bought'),
    idempotencyKey: z.string().min(1).max(200).optional().describe('reserve the spend under this key if payment is allowed'),
  };

  const reportShape = {
    merchantHost: HOST,
    payTo: ADDRESS.describe('the address that was actually paid'),
    txDigest: z.string().regex(/^[A-Za-z0-9]{20,100}$/, 'the payment transaction digest').describe('the payment transaction digest'),
    amount: RAW.describe('raw units actually paid (USDC has 6 decimals: 0.01 is "10000")'),
    quotedAmount: RAW.describe('raw units the merchant quoted'),
    asset: z.string().min(1).describe('full coin type'),
    requestHash: HEX.describe('sha256 of the request, hex'),
    responseHash: HEX.describe('sha256 of the response bytes, hex'),
    responseBytes: z.number().int().min(0),
    latencyMs: z.number().int().min(0),
    checks: z
      .object({
        schemaValid: z.boolean().describe("the response matched the merchant's published schema"),
        fresh: z.boolean().describe('the response was recent enough'),
        onTime: z.boolean().describe("it arrived within the agent's deadline"),
        amountMatchesQuote: z.boolean().describe('the amount paid equals the quote'),
        payToMatchesPinned: z.boolean().describe('the payout address is the one pinned for this merchant'),
      })
      .describe('whether each check held; any false check makes the report a burn'),
    issuedAt: z.string().optional().describe('ISO time; pass the same value to retry a partly finished report'),
    idempotencyKey: z.string().optional().describe('the key given to fides_check'),
  };

  return [
    {
      name: 'fides_check',
      title: 'Check a merchant before paying',
      description:
        'Call this before paying a merchant that answered 402 Payment Required. Returns PAY, PAY_CAPPED (pay no more than capAmount), ASK (ask a human) or REFUSE, ' +
        'with the reasons, the rules that decided it, and citations (signed evidence ids and memory ids). Never pay on REFUSE. A merchant with too little history ' +
        'returns ASK with cannotSay true. Pass an idempotencyKey to reserve the spend against the daily cap when the answer allows payment.',
      shape: checkShape,
      readOnly: false,
      async run(raw) {
        const a = z.object(checkShape).parse(raw);
        const r = await fides.check(
          { ownerId, merchantHost: a.merchantHost, payTo: a.payTo, amount: a.amount, asset: a.asset, network: a.network, resource: a.resource },
          a.idempotencyKey ? { idempotencyKey: a.idempotencyKey } : {},
        );
        const v = r.verdict;
        return {
          summary: `${v.decision}${v.capAmount ? ` up to ${v.capAmount}` : ''} for ${a.merchantHost}: ${v.reasons.join('; ')}`,
          data: {
            decision: v.decision,
            ...(v.capAmount ? { capAmount: v.capAmount } : {}),
            reasons: v.reasons,
            rulesFired: v.rulesFired,
            citations: v.citations,
            tier: v.tier,
            confidence: v.confidence,
            cannotSay: v.cannotSay,
            alerts: v.alerts,
            sharedRecord: r.sharedState,
            rejectedReports: r.rejected,
            pendingReports: r.pending,
            ...(r.claim ? { claim: r.claim } : {}),
            decisionId: r.decisionId,
          },
        };
      },
    },
    {
      name: 'fides_report',
      title: 'Report what happened after a payment',
      description:
        'Call this after paying and receiving (or not receiving) the response. Fides first verifies the payment through Tatum and past finality, then signs the evidence, ' +
        'anchors it on Sui and writes it to the shared record. Set each check to whether it held; any false check makes it a burn.',
      shape: reportShape,
      readOnly: false,
      async run(raw) {
        const a = z.object(reportShape).parse(raw);
        const r = await fides.report({ ...a, ownerId });
        return {
          summary: `${r.status === 'complete' ? 'Reported' : 'Partly reported'}: evidence ${r.evidenceId.slice(0, 12)}`,
          data: {
            evidenceId: r.evidenceId,
            status: r.status,
            steps: r.steps,
            citations: { evidenceIds: [r.evidenceId], anchorTx: r.steps.anchor.txDigest ?? null, memoryBlobId: r.steps.memory.blobId ?? null },
          },
        };
      },
    },
    {
      name: 'fides_lookup',
      title: 'Look up a merchant',
      description:
        'What this client knows about a merchant: tier, how much evidence backs it, the pinned payout address, every evidence record with its status ' +
        '(verified, or rejected with the reason), and open alerts. Read only.',
      shape: { merchantHost: HOST },
      readOnly: true,
      async run(raw) {
        const a = z.object({ merchantHost: HOST }).parse(raw);
        const m = fides.lookup(a.merchantHost);
        return {
          summary: `${m.host}: ${m.assessment.tier}${m.assessment.cannotSay ? ' (cannot say: not enough history)' : ''}, ${m.evidence.length} evidence record(s)`,
          data: {
            ...m,
            citations: {
              evidenceIds: m.evidence.filter((e) => e.status === 'verified').map((e) => e.evidenceId),
              rejectedEvidenceIds: m.evidence.filter((e) => e.status === 'rejected').map((e) => e.evidenceId),
            },
          },
        };
      },
    },
  ];
}

export interface ToolResult {
  isError: boolean;
  /** What to hand back to a model: the summary and the data as JSON, or the error. */
  text: string;
  data?: Record<string, unknown>;
}

/**
 * Run a tool by name with arguments as a model produced them (an object, or a JSON string as OpenAI sends).
 * Never throws: bad input, unknown tools and failures come back as error results that say what happened and that
 * an error is not an absence of reports.
 */
export async function callTool(tools: FidesTool[], name: string, args: unknown): Promise<ToolResult> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { isError: true, text: `unknown tool "${name}". Available: ${tools.map((t) => t.name).join(', ')}` };
  let parsed: unknown = args ?? {};
  if (typeof parsed === 'string') {
    try {
      parsed = parsed.trim() === '' ? {} : JSON.parse(parsed);
    } catch {
      return { isError: true, text: `${name}: the arguments are not valid JSON` };
    }
  }
  try {
    const out = await tool.run(parsed as Record<string, unknown>);
    return { isError: false, text: JSON.stringify({ summary: out.summary, ...out.data }), data: out.data };
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') : (e as Error).message;
    return {
      isError: true,
      text: `${name} failed: ${msg}.${e instanceof z.ZodError ? '' : ' This is an error, not an absence of reports: do not treat it as "no ratings".'}`,
    };
  }
}

/** Guidance to put in a model's system prompt so it uses the tools in the right order. */
export const FIDES_AGENT_PROMPT = [
  'You can pay for resources that answer HTTP 402 Payment Required. Before every payment, call fides_check with the merchant host, the payout address, the price and the coin type from the 402 challenge.',
  '',
  '- PAY: you may pay.',
  '- PAY_CAPPED: you may pay, but no more than capAmount.',
  '- ASK: do not pay. Ask the person you work for, and tell them the reasons and the cited evidence. If cannotSay is true, say that there is not enough history to judge.',
  '- REFUSE: do not pay, and do not try to get around it.',
  '- An error from a Fides tool is not the same as "no ratings". Do not pay on an error: tell the person.',
  '',
  'After you have paid and received the response (or not received one), call fides_report with the payment transaction digest, what you paid, and whether each check held. Report honestly: a response that was junk, late, stale, or paid to a different address is a burn, and reporting it protects other agents.',
  'Use fides_lookup to see what is known about a merchant without paying.',
].join('\n');
