# Using Fides from any model

Fides gives an agent three tools: `fides_check` (should I pay this merchant?), `fides_report` (record what happened after paying) and `fides_lookup` (what is known about a merchant). They are defined once in `packages/tools` and offered two ways, so the model vendor does not matter.

| Route | Works with | Code |
|---|---|---|
| MCP server (HTTP) | clients that need a URL: hosted connectors, agents on another machine | `packages/mcp` (`--http`) |
| MCP server (stdio) | Claude Desktop and Claude Code, OpenAI Agents SDK, Gemini CLI, most agent frameworks | `packages/mcp` |
| Tool-calling adapters | OpenAI (Chat Completions, Responses), Anthropic Messages, Gemini, OpenRouter, anything OpenAI-compatible | `packages/tools` |

Put `FIDES_AGENT_PROMPT` (from `@fides/tools`) in the model's system prompt. It tells the model to check before paying, never pay on REFUSE or on an error, and report afterwards.

## What is verified and what is not

- **Verified:** the MCP server over a real MCP client, in memory and as a stdio subprocess (handshake, tool list, a tool call). The adapters produce the shapes below and execute calls end to end in tests.
- **Checked against the vendors' documentation on 2026-10-28:** OpenAI Responses (tool, `function_call`, `function_call_output`), Anthropic (`input_schema`, name rules), OpenRouter (OpenAI chat shape, `tools` sent on every request).
- **Not verified against a live API** for any vendor: no model API keys were available. Treat the adapters as correct to the documented format, not as tested with each vendor.
- **Gemini:** its current page documents a newer Interactions API; the older `generateContent` format is also supported here, from the format as documented earlier. Both are unverified live.
- **MCP over HTTP** (`pnpm --filter @fides/mcp start -- --http`, needs `FIDES_MCP_TOKEN` of 16+ characters): verified with a real MCP client in tests. Closed by default: bearer token, loopback bind, Host and Origin checks, POST only, 1 MB body limit, 60 requests a minute (bursts of 20, then 429 with Retry-After), and a 504 after 120 s. A 504 does not cancel the work behind it. Not tested behind a real proxy or with a vendor's hosted connector. Put TLS in front of it before exposing it.

## MCP (stdio)

Run: `pnpm --filter @fides/mcp start` (agent `A` from `.env`; `FIDES_AGENT=B` for another). Needs `FIDES_DAILY_CAP_USD` and the agent's keys in `.env`. All logging goes to stderr; stdout is the protocol.

Claude Code:

```bash
claude mcp add fides -- node C:/path/to/fides/node_modules/tsx/dist/cli.mjs C:/path/to/fides/packages/mcp/src/bin.ts
```

Claude Desktop, Gemini CLI and most other clients take the same three parts in their JSON config (`claude_desktop_config.json`, `~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "fides": {
      "command": "node",
      "args": ["C:/path/to/fides/node_modules/tsx/dist/cli.mjs", "C:/path/to/fides/packages/mcp/src/bin.ts"],
      "env": { "FIDES_DAILY_CAP_USD": "5", "FIDES_NETWORK": "mainnet" }
    }
  }
}
```

Keep keys in `.env` (the server reads it), not in this config.

## Tool-calling APIs

```ts
import { fidesFromEnv } from '@fides/sdk';
import { fidesTools, FIDES_AGENT_PROMPT } from '@fides/tools';

const fides = fidesFromEnv(env, 'A');
const tools = fidesTools(fides, { ownerId: 'A' });
```

**OpenAI, Chat Completions, and OpenRouter** (same shape; OpenRouter wants `tools` on every request, including the follow-up):

```ts
import { forOpenAIChat, executeOpenAIChat } from '@fides/tools';
// request: { model, messages, tools: forOpenAIChat(tools) }
// when message.tool_calls is present:
messages.push(message, ...(await executeOpenAIChat(tools, message.tool_calls)));
```

**OpenAI, Responses API** (`strict` is off: some inputs are optional):

```ts
import { forOpenAIResponses, executeOpenAIResponses } from '@fides/tools';
// request: { model, input, tools: forOpenAIResponses(tools) }
input.push(...response.output, ...(await executeOpenAIResponses(tools, response.output)));
```

**Anthropic (Claude), Messages API:**

```ts
import { forAnthropic, executeAnthropic } from '@fides/tools';
// request: { model, max_tokens, system: FIDES_AGENT_PROMPT, tools: forAnthropic(tools), messages }
messages.push({ role: 'assistant', content: response.content }, { role: 'user', content: await executeAnthropic(tools, response.content) });
```

**Gemini, generateContent** (and `forGeminiInteractions` / `executeGeminiInteractions` for the Interactions API):

```ts
import { forGemini, executeGemini } from '@fides/tools';
// request: { contents, tools: forGemini(tools), systemInstruction: { parts: [{ text: FIDES_AGENT_PROMPT }] } }
const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);
contents.push({ role: 'user', parts: await executeGemini(tools, calls) });
```

## Behaviour every route shares

- Every answer carries its citations: signed evidence ids and memory ids.
- A failure is an error result with the cause. The text says an error is not an absence of reports, and the system prompt says not to pay on an error.
- Bad input is rejected before anything happens, with the field and what was expected.
- A model never overrides REFUSE: the tools only advise. Whether the agent can actually pay is decided by the code that holds the wallet, so keep the payment step in your own code and gate it on the verdict (see `apps/agent`).
