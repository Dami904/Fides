// A small simulated world: one shared memory store, one chain ledger, several agents. Used by the SDK tests, the agent\n// tests and the simulation (SPEC section 11 allows mocked settlement there). Never used for the headline demo.
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { loadConfig, type CheckInput, type FidesConfig } from '@fides/core';
import type { PaymentFacts } from '@fides/evidence';
import { SharedRecord, type MemoryBackend } from '@fides/memory';
import { openState } from '@fides/state';
import type { AnchorEvent } from '@fides/chain';
import { Fides, type ChainApi, type Outcome } from './fides.js';
import type { Anchorer } from './anchor.js';
import type { Logger } from './log.js';

export const USDC = '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
export const PKG = '0x' + '1e'.repeat(32);
export const MERCHANT_HOST = 'flaky.example';
export const PAYTO = '0x' + 'ab'.repeat(32);
export const T0 = Date.UTC(2026, 9, 28, 12, 0, 0);

/** The shared Walrus Memory namespace. Every agent's SharedRecord talks to the same one. */
export class SharedMemory implements MemoryBackend {
  texts: { id: string; text: string; distance: number }[] = [];
  down = false;
  private seen = new Set<string>();
  async remember(text: string, o: { idempotencyKey: string }) {
    if (this.down) throw new Error('relayer down');
    if (!this.seen.has(o.idempotencyKey)) {
      this.seen.add(o.idempotencyKey);
      this.texts.push({ id: 'blob' + this.texts.length, text, distance: 0.2 });
    }
    return { job_id: 'job-' + o.idempotencyKey.slice(0, 8) };
  }
  async waitForRememberJob(jobId: string) {
    return { blob_id: 'blob-of-' + jobId };
  }
  async recall() {
    if (this.down) throw new Error('relayer down');
    return { results: this.texts.map((t) => ({ blob_id: t.id, text: t.text, distance: t.distance })), total: this.texts.length };
  }
  async health() {
    if (this.down) throw new Error('relayer down');
    return {};
  }
  /** An attacker with a delegate key writes arbitrary text. */
  inject(text: string) {
    this.texts.push({ id: 'inj' + this.texts.length, text, distance: 0.1 });
  }
}

/** Sui as seen through Tatum: payments and anchor events. */
export class Ledger {
  payments = new Map<string, PaymentFacts>();
  anchors: AnchorEvent[] = [];
  failPayments = false;
  failAnchors = false;
  private n = 0;
  /** Chain time for new payments. The world's clock when the ledger belongs to a world. */
  constructor(private clock: () => number = () => Date.now()) {}

  /** Agent pays `amount` raw units to `payTo`. Returns the transaction digest. */
  pay(from: string, payTo: string, amount: bigint, over: Partial<PaymentFacts> = {}): string {
    const digest = 'TX' + String(++this.n).padStart(42, '0'); // 44 characters, like a real Sui digest
    this.payments.set(digest, {
      sender: from,
      status: 'SUCCESS',
      checkpoint: 1000 + this.n,
      timestamp: new Date(this.clock()).toISOString(),
      changes: [
        { owner: from, amount: -amount, coinType: USDC },
        { owner: payTo, amount, coinType: USDC },
      ],
      ...over,
    });
    return digest;
  }

  chain(): ChainApi {
    return {
      getPayment: async (d) => {
        if (this.failPayments) throw new Error('Tatum HTTP 429');
        return this.payments.get(d) ?? null;
      },
      sentSince: async (sender, sinceMs) => {
        if (this.failPayments) throw new Error('Tatum HTTP 429');
        return [...this.payments.entries()]
          .filter(([, p]) => p.sender.toLowerCase() === sender.toLowerCase() && (!p.timestamp || Date.parse(p.timestamp) >= sinceMs))
          .map(([digest, p]) => ({ ...p, digest }))
          .reverse();
      },
      findAnchor: async (o) => {
        if (this.failAnchors) throw new Error('Tatum HTTP 503');
        return (
          this.anchors.find((a) => a.evidenceSha256 === o.evidenceSha256.toLowerCase() && (!o.reporter || a.sender.toLowerCase() === o.reporter.toLowerCase())) ?? null
        );
      },
    };
  }

  anchorer(sender: string): Anchorer & { fail: boolean; calls: number } {
    const ledger = this;
    return {
      fail: false,
      calls: 0,
      async report(a) {
        this.calls++;
        if (this.fail) throw new Error('anchor tx failed');
        const txDigest = 'ANCH' + String(ledger.anchors.length + 1).padStart(6, '0');
        ledger.anchors.push({ evidenceSha256: a.evidenceSha256, sender, payTxDigest: a.payTxDigest, verdict: a.verdict, merchant: a.merchant, eventTxDigest: txDigest, timestamp: new Date().toISOString() });
        return { txDigest };
      },
    };
  }
}

export interface World {
  memory: SharedMemory;
  ledger: Ledger;
  clock: { now: number };
}
export const newWorld = (): World => {
  const clock = { now: T0 };
  return { memory: new SharedMemory(), ledger: new Ledger(() => clock.now), clock };
};

export interface Agent {
  name: string;
  fides: Fides;
  address: string;
  key: Ed25519Keypair;
  anchorer: ReturnType<Ledger['anchorer']>;
  state: ReturnType<typeof openState>;
  shared: SharedRecord;
  input: (over?: Partial<CheckInput>) => CheckInput;
  /** Pay the merchant for real on the ledger and build the matching outcome. */
  pay: (amount?: bigint, over?: Partial<Outcome> & { payToOnChain?: string }) => Outcome;
}

export function makeAgent(world: World, name: string, cfgOver: Partial<FidesConfig> = {}, opts: { log?: Logger } = {}): Agent {
  const key = new Ed25519Keypair();
  const address = key.toSuiAddress();
  const state = openState(':memory:');
  const shared = new SharedRecord(world.memory, { maxEvidenceBytes: 524_288 });
  const anchorer = world.ledger.anchorer(address);
  const fides = new Fides({
    config: loadConfig({ dailyCapUsd: '5', ...cfgOver }),
    state,
    shared,
    chain: world.ledger.chain(),
    anchorer,
    signer: key,
    agentId: name,
    anchorPackageId: PKG,
    networkName: 'sui-mainnet',
    now: () => world.clock.now,
    ...(opts.log ? { log: opts.log } : {}),
  });
  return {
    name,
    fides,
    address,
    key,
    anchorer,
    state,
    shared,
    input: (over = {}) => ({ ownerId: name, merchantHost: MERCHANT_HOST, payTo: PAYTO, amount: '0.01', asset: USDC, network: 'sui-mainnet', resource: '/data/news', ...over }),
    pay: (amount = 10_000n, over = {}) => {
      const { payToOnChain, ...rest } = over;
      const txDigest = world.ledger.pay(address, payToOnChain ?? PAYTO, amount);
      return {
        merchantHost: MERCHANT_HOST,
        payTo: PAYTO,
        txDigest,
        amount: amount.toString(),
        quotedAmount: amount.toString(),
        asset: USDC,
        requestHash: 'aa'.repeat(32),
        responseHash: 'bb'.repeat(32),
        responseBytes: 120,
        latencyMs: 300,
        checks: { schemaValid: true, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true },
        issuedAt: new Date(world.clock.now).toISOString(),
        ...rest,
      };
    },
  };
}

export const burned = { schemaValid: false, fresh: true, onTime: true, amountMatchesQuote: true, payToMatchesPinned: true };
