// What the demo runs against. Two implementations of one interface:
//   simHarness   everything simulated in memory (payments on a fake ledger, fake memory). Fast, free, repeatable.
//                Real HTTP between agents and merchants, real signatures, real engine. For tests and the simulation.
//   liveHarness  real MPP payments, real Tatum reads, real Sui anchors on the network in FIDES_NETWORK.
//                Memory is an in-process store by default (rehearsals must not write permanent memories) or the real relayer.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { chainFromEnv, getNetwork, anchorPackageId } from '@fides/chain';
import { parseAmount, type FidesConfig } from '@fides/core';
import { createMemwalBackend, memwalConfigFromEnv, SharedRecord, type MemoryBackend } from '@fides/memory';
import { fidesFromEnv, testing, type ChainApi, type Fides } from '@fides/sdk';
import { MERCHANTS, mppGate, Merchant, seededRandom, walletsFromEnv, type Gate, type MerchantName, type MerchantState } from '@fides/merchants';
import { PayingAgent, type AgentEvent, type AgentOptions, type AskPolicy } from './agent.js';
import { mppPayer, readChallenge, type Payer } from './mpp.js';

export interface MerchantHandle {
  name: MerchantName;
  host: string;
  url: string;
  /** The paid resource URL. */
  resource: string;
  admin(path: string, body?: unknown): Promise<unknown>;
  state(): Promise<MerchantState>;
}

export interface AgentHandle {
  name: string;
  address: string;
  agent: PayingAgent;
  fides: Fides;
}

export interface Harness {
  mode: 'sim' | 'live';
  network: string;
  merchants: Record<MerchantName, MerchantHandle>;
  makeAgent(name: string, ask: AskPolicy, onEvent?: (e: AgentEvent) => void, extra?: Partial<AgentOptions>, config?: Partial<FidesConfig>): AgentHandle;
  /** Write arbitrary text into the shared memory, as anyone holding a delegate key could. */
  injectMemory(text: string): Promise<void>;
  /** A read-only view of the shared record, for Re-verify. */
  sharedReader(): SharedRecord;
  /** Take the shared memory offline or bring it back. False when this harness cannot (the real relayer). */
  setMemoryDown(down: boolean): boolean;
  chain: ChainApi;
  anchorPackageId: string;
  maxEvidenceBytes: number;
  close(): Promise<void>;
}

async function startMerchants(gate: Gate, wallets: ReturnType<typeof walletsFromEnv>, seed: number, goodCalls: number, flakyTimeoutMs?: number) {
  const out = {} as Record<MerchantName, MerchantHandle>;
  const closers: (() => Promise<void>)[] = [];
  for (const name of ['good', 'flaky', 'malicious'] as const) {
    const def = MERCHANTS[name];
    const m = new Merchant({ def, gate, wallets, goodCalls, random: seededRandom(seed + def.port), ...(flakyTimeoutMs !== undefined ? { flakyTimeoutMs } : {}) });
    const s = await m.serve(0);
    closers.push(s.close);
    out[name] = {
      name,
      host: def.host,
      url: s.url,
      resource: s.url + def.path,
      admin: async (path, body) => {
        const r = await fetch(s.url + path, { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        if (!r.ok) throw new Error(`admin ${path} -> HTTP ${r.status} ${await r.text()}`);
        return r.json();
      },
      state: async () => (await fetch(s.url + '/admin/state')).json() as Promise<MerchantState>,
    };
  }
  return { merchants: out, close: () => Promise.all(closers.map((c) => c())).then(() => undefined) };
}

// ---------------------------------------------------------------- simulated

/** A gate that takes payment on the simulated ledger: "Authorization: Sim <txDigest>". */
export function simGate(world: ReturnType<typeof testing.newWorld>): Gate {
  const used = new Set<string>();
  const challenge = (amount: string, recipient: string) => {
    const request = Buffer.from(JSON.stringify({ amount, currency: testing.USDC, recipient })).toString('base64url');
    return new Response('payment required', { status: 402, headers: { 'www-authenticate': `Payment id="sim", realm="localhost", method="sui", intent="charge", request="${request}"` } });
  };
  return async (req, { amount, recipient }) => {
    const auth = req.headers.get('authorization') ?? '';
    const digest = auth.startsWith('Sim ') ? auth.slice(4) : '';
    const p = world.ledger.payments.get(digest);
    const got = p?.changes.find((c) => c.owner === recipient && c.coinType === testing.USDC)?.amount ?? 0n;
    if (!p || p.status !== 'SUCCESS' || used.has(digest) || got < parseAmount(amount)) return { status: 402, challenge: challenge(amount, recipient) };
    used.add(digest);
    return { status: 200, withReceipt: (res) => res };
  };
}

export function simPayer(world: ReturnType<typeof testing.newWorld>, address: string): Payer {
  return {
    async pay(res) {
      const c = readChallenge(res);
      const digest = world.ledger.pay(address, c.recipient, parseAmount(c.amount));
      return { authorization: `Sim ${digest}`, txDigest: digest };
    },
  };
}

export async function simHarness(o: { seed?: number; flakyTimeoutMs?: number } = {}): Promise<Harness> {
  const world = testing.newWorld();
  // The simulated Fides clock follows real time, like the agents and merchants do.
  Object.defineProperty(world.clock, 'now', { get: () => Date.now(), set: () => undefined });
  const wallets = walletsFromEnv({ SUI_PRIVATE_KEY_MERCHANTS: Ed25519Keypair.generate().getSecretKey() });
  const { merchants, close } = await startMerchants(simGate(world), wallets, o.seed ?? 1, 1, o.flakyTimeoutMs);
  const shared = () => new SharedRecord(world.memory, { maxEvidenceBytes: 524_288 });
  return {
    mode: 'sim',
    network: 'sim',
    merchants,
    makeAgent(name, ask, onEvent, extra, config) {
      const a = testing.makeAgent(world, name, config);
      const agent = new PayingAgent({ name, fides: a.fides, payer: simPayer(world, a.address), askPolicy: ask, reportDelayMs: 0, sleep: async () => undefined, ...(onEvent ? { onEvent } : {}), ...extra });
      return { name, address: a.address, agent, fides: a.fides };
    },
    injectMemory: async (text) => world.memory.inject(text),
    setMemoryDown: (down) => ((world.memory.down = down), true),
    sharedReader: shared,
    chain: world.ledger.chain(),
    anchorPackageId: testing.PKG,
    maxEvidenceBytes: 524_288,
    close,
  };
}

// ---------------------------------------------------------------- live

export interface LiveOptions {
  env: Record<string, string | undefined>;
  /** "fake" keeps memory in this process; "live" uses the Walrus Memory relayer (permanent writes). */
  memory: 'fake' | 'live';
  seed?: number;
}

export function loadEnvFile(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  const p = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (existsSync(p)) {
    for (const l of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && env[m[1]!] === undefined) env[m[1]!] = m[2]!.trim();
    }
  }
  return env;
}

export async function liveHarness(o: LiveOptions): Promise<Harness> {
  const env: Record<string, string | undefined> = { FIDES_DAILY_CAP_USD: '5', ...o.env };
  const network = getNetwork(env.FIDES_NETWORK);
  const net = network.suiNetwork as 'testnet' | 'mainnet';
  const { merchants, close } = await startMerchants(mppGate({ network: net }), walletsFromEnv(env), o.seed ?? 1, 1);
  const { reader } = chainFromEnv(env);
  const fake = new testing.SharedMemory();
  const backendFor = (agent: string): MemoryBackend =>
    o.memory === 'fake' ? fake : createMemwalBackend(memwalConfigFromEnv({ ...env, [`MEMWAL_KEY_${agent.toUpperCase()}`]: env[`MEMWAL_KEY_${agent.toUpperCase()}`] ?? env.MEMWAL_KEY_A }, agent));
  const signerOf = (agent: string) => {
    const raw = env[`SUI_PRIVATE_KEY_${agent.toUpperCase()}`];
    if (!raw) throw new Error(`SUI_PRIVATE_KEY_${agent.toUpperCase()} is not set (run packages/evidence/gen-wallets.mjs and fund it)`);
    return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(raw).secretKey);
  };
  return {
    mode: 'live',
    network: network.name,
    merchants,
    makeAgent(name, ask, onEvent, extra, config) {
      const signer = signerOf(name);
      const fides = fidesFromEnv(env, name, { statePath: ':memory:', memory: backendFor(name), ...(config ? { config } : {}) });
      const agent = new PayingAgent({ name, fides, payer: mppPayer({ signer, network: net, fullnodeUrl: network.fullnodeUrl }), askPolicy: ask, autoRetry: {}, ...(onEvent ? { onEvent } : {}), ...extra });
      return { name, address: signer.toSuiAddress(), agent, fides };
    },
    injectMemory: async (text) => {
      const b = backendFor('B');
      const job = await b.remember(text, { idempotencyKey: text.slice(-64) });
      await b.waitForRememberJob(job.job_id, { timeoutMs: 120_000 });
    },
    setMemoryDown: (down) => (o.memory === 'fake' ? ((fake.down = down), true) : false),
    sharedReader: () => new SharedRecord(backendFor('B'), { maxEvidenceBytes: 524_288 }),
    chain: reader,
    anchorPackageId: anchorPackageId(network.name),
    maxEvidenceBytes: 524_288,
    close,
  };
}
