// Fides as an MCP server (SPEC section 9). The tools themselves live in @fides/tools, shared with the OpenAI, Anthropic,
// Gemini and OpenRouter adapters, so every route gives a model the same three tools:
//   fides_check, fides_report, fides_lookup.
// Over MCP any client that speaks it can use them: Claude (Desktop, Code, the API's MCP connector), OpenAI's Agents SDK,
// Gemini CLI, and most agent frameworks.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callTool, fidesTools } from '@fides/tools';
import type { Fides } from '@fides/sdk';

export interface FidesMcpOptions {
  /** Whose daily cap checks count against. Default "mcp". */
  ownerId?: string;
  name?: string;
  version?: string;
}

export function createFidesMcp(fides: Fides, o: FidesMcpOptions = {}): McpServer {
  const tools = fidesTools(fides, { ownerId: o.ownerId ?? 'mcp' });
  const server = new McpServer({ name: o.name ?? 'fides', version: o.version ?? '0.0.0' });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.shape,
        annotations: { readOnlyHint: tool.readOnly, openWorldHint: !tool.readOnly, ...(tool.readOnly ? {} : { idempotentHint: true }) },
      },
      async (args) => {
        const r = await callTool(tools, tool.name, args);
        return r.isError
          ? { isError: true, content: [{ type: 'text' as const, text: r.text }] }
          : { content: [{ type: 'text' as const, text: r.text }], structuredContent: r.data! };
      },
    );
  }
  return server;
}
