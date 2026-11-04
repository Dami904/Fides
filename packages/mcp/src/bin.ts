// Run Fides as an MCP server.
//   pnpm --filter @fides/mcp start                    stdio, agent A from .env, network from FIDES_NETWORK
//   FIDES_AGENT=B pnpm --filter @fides/mcp start      another agent
//   pnpm --filter @fides/mcp start -- --http          streamable HTTP on 127.0.0.1:4300/mcp, needs FIDES_MCP_TOKEN
// Over stdio, stdout carries the protocol, so everything we print goes to stderr.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { fidesFromEnv } from '@fides/sdk';
import { createFidesMcp } from './server.js';
import { createFidesMcpHttp } from './http.js';

const env: Record<string, string | undefined> = { ...process.env };
const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envPath)) {
  for (const l of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]!] === undefined) env[m[1]!] = m[2]!.trim();
  }
}

const agent = env.FIDES_AGENT ?? 'A';
const fides = fidesFromEnv(env, agent);

if (process.argv.includes('--http')) {
  const port = Number(env.FIDES_MCP_PORT ?? 4300);
  const host = env.FIDES_MCP_HOST ?? '127.0.0.1';
  const allowedHosts = env.FIDES_MCP_ALLOWED_HOSTS?.split(',').map((s) => s.trim()).filter(Boolean);
  const server = createFidesMcpHttp(fides, { token: env.FIDES_MCP_TOKEN ?? '', ownerId: agent, ...(allowedHosts ? { allowedHosts } : {}) });
  server.listen(port, host, () => console.error(`fides-mcp (http) ready: http://${host}:${port}/mcp, agent ${agent}, network ${env.FIDES_NETWORK ?? 'testnet'}`));
} else {
  const server = createFidesMcp(fides, { ownerId: agent });
  await server.connect(new StdioServerTransport());
  console.error(`fides-mcp ready: agent ${agent}, network ${env.FIDES_NETWORK ?? 'testnet'}, address ${fides.address}`);
}
