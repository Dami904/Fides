// The Gemini adapter against the real Gemini API (generateContent): the model is given the Fides tools, calls
// fides_check, gets the answer through executeGemini, and replies with it. Fides itself runs on the in-memory test
// world, so nothing is paid. Runs only with FIDES_LIVE=1 and GEMINI_API_KEY (from the environment or .env).
// GEMINI_MODEL picks the model; default gemini-3.1-flash-lite.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { testing } from '@fides/sdk';
import { FIDES_AGENT_PROMPT, executeGemini, fidesTools, forGemini, type GeminiFunctionCall } from '../src/index.js';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
const fromFile = (name: string) => (existsSync(envFile) ? new RegExp(`^${name}=(.*)$`, 'm').exec(readFileSync(envFile, 'utf8'))?.[1]?.trim() : undefined);
const key = process.env.GEMINI_API_KEY ?? fromFile('GEMINI_API_KEY');
const model = process.env.GEMINI_MODEL ?? fromFile('GEMINI_MODEL') ?? 'gemini-3.1-flash-lite';
const run = process.env.FIDES_LIVE === '1' && !!key;

interface Part { text?: string; functionCall?: GeminiFunctionCall; functionResponse?: unknown; thoughtSignature?: string }
interface Content { role: string; parts: Part[] }

async function generate(contents: Content[], tools: ReturnType<typeof fidesTools>): Promise<Content> {
  // A 503 ("high demand") is the vendor's, not ours: retry a few times with a pause, then fail.
  for (let attempt = 1; ; attempt++) {
    let r: Response;
    let j: { candidates?: { content: Content }[]; error?: { message: string } };
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key! },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({ systemInstruction: { parts: [{ text: FIDES_AGENT_PROMPT }] }, contents, tools: forGemini(tools) }),
      });
      j = (await r.json()) as typeof j;
    } catch (e) {
      if ((e as Error).name !== 'TimeoutError' || attempt >= 6) throw e;
      console.error(`Gemini did not answer in 45 s, retry ${attempt}`);
      continue;
    }
    if (r.status === 503 && attempt < 6) {
      console.error(`Gemini 503 (high demand), retry ${attempt}`);
      await new Promise((ok) => setTimeout(ok, 5_000 * attempt));
      continue;
    }
    if (!r.ok || !j.candidates?.[0]) throw new Error(`Gemini HTTP ${r.status}: ${j.error?.message ?? JSON.stringify(j).slice(0, 300)}`);
    return j.candidates[0].content;
  }
}

describe.skipIf(!run)(`Gemini (${model}) calls the Fides tools for real`, () => {
  it('calls fides_check, takes the answer, and reports the decision', async () => {
    const world = testing.newWorld();
    const a = testing.makeAgent(world, 'A');
    const tools = fidesTools(a.fides, { ownerId: 'A' });
    const ask = `Before paying, check this merchant with Fides and tell me the decision in one line. Merchant host ${testing.MERCHANT_HOST}, pay to ${testing.PAYTO}, amount 0.01, asset ${testing.USDC}.`;
    const contents: Content[] = [{ role: 'user', parts: [{ text: ask }] }];

    const first = await generate(contents, tools);
    console.error('Gemini turn 1:', JSON.stringify(first.parts.map((p) => p.functionCall ?? p.text)).slice(0, 400));
    const calls = first.parts.filter((p) => p.functionCall).map((p) => p.functionCall!);
    expect(calls.map((c) => c.name)).toContain('fides_check');

    // The model's turn goes back exactly as it came (thought signatures included), then one response per call.
    contents.push(first, { role: 'user', parts: await executeGemini(tools, calls) });
    const second = await generate(contents, tools);
    const text = second.parts.map((p) => p.text ?? '').join('');
    console.error('Gemini turn 2:', text.slice(0, 400));
    // A merchant with no history: Fides says ASK, and the model passes that on.
    expect(text).toMatch(/\bASK\b|ask|approv|cannot say|no history|not enough/i);
  }, 540_000);
});
