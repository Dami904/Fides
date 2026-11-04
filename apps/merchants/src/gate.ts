// The payment gate: answers 402 with a price and recipient, or lets a verified payment through.
// Behind an interface so merchant behaviour can be tested without a chain.
import { randomBytes } from 'node:crypto';
import { Mppx } from 'mppx/server';
import { InMemoryDigestStore, USDC, USDC_TESTNET, sui, type Currency } from '@suimpp/mpp/server';

export type GateResult =
  | { status: 402; challenge: Response }
  | { status: 200; withReceipt: (res: Response) => Response };

/** Charge `amount` (decimal USDC) to `recipient` for this request. */
export type Gate = (req: Request, charge: { amount: string; recipient: string }) => Promise<GateResult>;

/**
 * MPP on Sui. @suimpp/mpp fixes the recipient when the method is created, so one instance is kept per recipient:
 * when the malicious merchant swaps its payout address the next 402 simply comes from a new instance.
 * All instances share one digest store, so a payment digest can never be redeemed twice.
 * Verification uses the package's default fullnode (Tatum's gRPC host cannot be used, see docs/DAY1.md).
 */
export function mppGate(o: { network: 'testnet' | 'mainnet' }): Gate {
  const currency: Currency = o.network === 'mainnet' ? USDC : USDC_TESTNET;
  const store = new InMemoryDigestStore();
  const secretKey = randomBytes(32).toString('hex');
  // mppx types the handler by method name; the one method here is "sui", with a "charge" intent.
  type Charger = { sui: { charge: (o: { amount: string }) => (r: Request) => Promise<GateResult> } };
  const byRecipient = new Map<string, Charger>();
  const instance = (recipient: string): Charger => {
    let m = byRecipient.get(recipient);
    if (!m) {
      m = Mppx.create({
        methods: [sui({ currency, recipient, network: o.network, store })],
        realm: 'localhost',
        secretKey,
      }) as unknown as Charger;
      byRecipient.set(recipient, m);
    }
    return m;
  };
  return async (req, { amount, recipient }) => instance(recipient).sui.charge({ amount })(req);
}

/** Decode the request carried in a 402's WWW-Authenticate header: what was asked for. */
export function readChallenge(res: Response): { amount: string; currency: string; recipient: string } {
  const h = res.headers.get('www-authenticate') ?? '';
  const m = /request="([^"]+)"/.exec(h);
  if (!m) throw new Error('no payment request in the 402 challenge');
  return JSON.parse(Buffer.from(m[1]!, 'base64url').toString());
}
