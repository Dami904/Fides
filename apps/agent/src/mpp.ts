// The payment side of an agent: read what a 402 asks for, and pay it. Behind an interface so the agent logic can be
// tested, and simulated, without a chain.
import type { Signer } from '@mysten/sui/cryptography';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Mppx } from 'mppx/client';
import { USDC, USDC_TESTNET, sui } from '@suimpp/mpp/client';

export interface Challenge {
  /** Decimal USDC, for example "0.01". */
  amount: string;
  /** Full coin type. */
  currency: string;
  recipient: string;
}

/** What a 402 response asks for, from its WWW-Authenticate header. */
export function readChallenge(res: Response): Challenge {
  const h = res.headers.get('www-authenticate') ?? '';
  const m = /request="([^"]+)"/.exec(h);
  if (!m) throw new Error('no payment request in the 402 challenge');
  const c = JSON.parse(Buffer.from(m[1]!, 'base64url').toString()) as Partial<Challenge>;
  if (!c.amount || !c.currency || !c.recipient) throw new Error('the 402 challenge is missing amount, currency or recipient');
  return { amount: c.amount, currency: c.currency, recipient: c.recipient };
}

/**
 * Thrown by a payer only when it is certain nothing was sent (for example, the balance was too low to build the transfer).
 * Any other error means the outcome is unknown: the transfer may have reached the chain.
 */
export class PaymentNotSentError extends Error {
  override name = 'PaymentNotSentError';
}

export interface Payer {
  /**
   * Pay the challenge carried by this 402 response. Resolves once the payment has been made.
   * `authorization` goes in the retry request; `txDigest` is the payment transaction.
   * Throw PaymentNotSentError only when certain nothing was sent.
   */
  pay(challenge: Response): Promise<{ authorization: string; txDigest: string }>;
}

/** The digest inside an MPP credential ("Payment <base64url json>"). */
export function digestOfCredential(authorization: string): string {
  const raw = authorization.replace(/^Payment\s+/i, '');
  const c = JSON.parse(Buffer.from(raw, 'base64url').toString()) as { payload?: { digest?: string } };
  const d = c.payload?.digest;
  if (!d) throw new Error('credential has no payment digest');
  return d;
}

/** Real MPP payment on Sui through @suimpp/mpp: building the credential makes the on-chain USDC transfer. */
export function mppPayer(o: { signer: Signer; network: 'testnet' | 'mainnet'; fullnodeUrl: string }): Payer {
  const client = new SuiGrpcClient({ network: o.network, baseUrl: o.fullnodeUrl });
  const mppx = Mppx.create({
    methods: [sui({ client, signer: o.signer, currency: o.network === 'mainnet' ? USDC : USDC_TESTNET })],
    polyfill: false,
  });
  return {
    async pay(challenge) {
      const authorization = await mppx.createCredential(challenge);
      return { authorization, txDigest: digestOfCredential(authorization) };
    },
  };
}
