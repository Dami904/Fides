// Adapters from the Fides tools to the tool-calling formats of the big model APIs. Plain data in, plain data out:
// no vendor SDK is needed, so they work with fetch, the official SDKs, or a gateway such as OpenRouter.
//
// Each provider has two functions:
//   forX(tools)                 the `tools` parameter to send with every request
//   executeX(tools, calls)      runs the calls the model made and returns the messages to send back
//
// Formats checked against the providers' documentation on 2026-10-28: OpenAI Responses, Anthropic Messages, OpenRouter
// (OpenAI-compatible chat). Not checked against a live API (no keys here): all of them. Gemini's generateContent shapes
// are from the documented format; Gemini's page now documents a newer Interactions API, which has its own functions.
import { z } from 'zod';
import { callTool, type FidesTool, type ToolResult } from './tools.js';

/** JSON Schema for a tool's input, without the `$schema` marker some providers reject. */
export function jsonSchemaOf(tool: FidesTool): Record<string, unknown> {
  const { $schema: _drop, ...schema } = z.toJSONSchema(z.object(tool.shape), { target: 'draft-7', io: 'input' }) as Record<string, unknown>;
  return schema;
}

/** Gemini's schema is an OpenAPI subset: drop the JSON Schema keywords it does not take. Our servers validate anyway. */
function geminiSchema(s: unknown): unknown {
  if (Array.isArray(s)) return s.map(geminiSchema);
  if (s && typeof s === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
      if (['$schema', 'additionalProperties', 'pattern', 'default', 'propertyNames', 'maxLength', 'minLength'].includes(k)) continue;
      out[k] = geminiSchema(v);
    }
    return out;
  }
  return s;
}

// ------------------------------------------------------------------ OpenAI Chat Completions, and OpenRouter

export interface OpenAIChatTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}
/** The `tools` array for Chat Completions. OpenRouter takes the same shape, and wants it on every request. */
export const forOpenAIChat = (tools: FidesTool[]): OpenAIChatTool[] =>
  tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: jsonSchemaOf(t) } }));
export const forOpenRouter = forOpenAIChat;

export interface OpenAIChatToolCall {
  id: string;
  type?: 'function';
  function: { name: string; arguments: string };
}
/** Messages to append after the assistant message that carried `tool_calls`. */
export async function executeOpenAIChat(tools: FidesTool[], calls: OpenAIChatToolCall[]) {
  return Promise.all(
    calls.map(async (c) => ({ role: 'tool' as const, tool_call_id: c.id, content: (await callTool(tools, c.function.name, c.function.arguments)).text })),
  );
}
export const executeOpenRouter = executeOpenAIChat;

// ------------------------------------------------------------------ OpenAI Responses API

export interface OpenAIResponsesTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: false;
}
/** strict is false on purpose: strict mode needs every property required, and some Fides inputs are optional. */
export const forOpenAIResponses = (tools: FidesTool[]): OpenAIResponsesTool[] =>
  tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: jsonSchemaOf(t), strict: false }));

export interface OpenAIResponsesItem {
  type: string;
  call_id?: string;
  name?: string;
  arguments?: string;
}
/** Items to add to `input` for the next request: one function_call_output per function_call in the response output. */
export async function executeOpenAIResponses(tools: FidesTool[], output: OpenAIResponsesItem[]) {
  const calls = output.filter((i) => i.type === 'function_call' && i.call_id && i.name);
  return Promise.all(
    calls.map(async (c) => ({ type: 'function_call_output' as const, call_id: c.call_id!, output: (await callTool(tools, c.name!, c.arguments)).text })),
  );
}

// ------------------------------------------------------------------ Anthropic Messages API

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}
export const forAnthropic = (tools: FidesTool[]): AnthropicTool[] =>
  tools.map((t) => ({ name: t.name, description: t.description, input_schema: jsonSchemaOf(t) }));

export interface AnthropicBlock {
  type: string;
  id?: string;
  name?: string;
  input?: unknown;
}
/** The content of the next user message: one tool_result per tool_use block in the assistant response. */
export async function executeAnthropic(tools: FidesTool[], content: AnthropicBlock[]) {
  const uses = content.filter((b) => b.type === 'tool_use' && b.id && b.name);
  return Promise.all(
    uses.map(async (b) => {
      const r: ToolResult = await callTool(tools, b.name!, b.input);
      return { type: 'tool_result' as const, tool_use_id: b.id!, content: r.text, ...(r.isError ? { is_error: true } : {}) };
    }),
  );
}

// ------------------------------------------------------------------ Gemini, generateContent

export interface GeminiTool {
  functionDeclarations: { name: string; description: string; parameters: unknown }[];
}
/** The `tools` field for generateContent. */
export const forGemini = (tools: FidesTool[]): GeminiTool[] => [
  { functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(jsonSchemaOf(t)) })) },
];

export interface GeminiFunctionCall {
  name: string;
  args?: unknown;
  id?: string;
}
/** Parts for the next user turn: one functionResponse per functionCall the model made. */
export async function executeGemini(tools: FidesTool[], calls: GeminiFunctionCall[]) {
  return Promise.all(
    calls.map(async (c) => {
      const r = await callTool(tools, c.name, c.args);
      const response = r.isError ? { error: r.text } : (JSON.parse(r.text) as Record<string, unknown>);
      return { functionResponse: { name: c.name, ...(c.id ? { id: c.id } : {}), response } };
    }),
  );
}

// ------------------------------------------------------------------ Gemini, Interactions API

export interface GeminiInteractionsTool {
  type: 'function';
  name: string;
  description: string;
  parameters: unknown;
}
export const forGeminiInteractions = (tools: FidesTool[]): GeminiInteractionsTool[] =>
  tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: geminiSchema(jsonSchemaOf(t)) }));

export interface GeminiInteractionStep {
  type: string;
  id?: string;
  name?: string;
  arguments?: unknown;
}
/** function_result steps for the function_call steps of an interaction. */
export async function executeGeminiInteractions(tools: FidesTool[], steps: GeminiInteractionStep[]) {
  const calls = steps.filter((s) => s.type === 'function_call' && s.name);
  return Promise.all(
    calls.map(async (s) => ({
      type: 'function_result' as const,
      name: s.name!,
      ...(s.id ? { call_id: s.id } : {}),
      result: [{ type: 'text' as const, text: (await callTool(tools, s.name!, s.arguments)).text }],
    })),
  );
}
