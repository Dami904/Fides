// Tatum Sui gateway client (GraphQL). The free plan allows 3 requests per second (SPEC section 13), so every call
// goes through one queue with a minimum spacing, 429 and 5xx are retried with backoff, and nothing polls.
// The API key goes in the x-api-key header only and is never put in a URL, a log line or an error message.

export class TatumError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface TatumOptions {
  /** Full GraphQL URL, for example https://sui-mainnet.gateway.tatum.io/graphql */
  url: string;
  apiKey: string;
  /** Minimum gap between requests. 400 ms stays under 3 per second. */
  minIntervalMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export class TatumGraphql {
  private tail: Promise<unknown> = Promise.resolve();
  private lastAt = -Infinity;
  private o: Required<Omit<TatumOptions, 'url' | 'apiKey'>> & Pick<TatumOptions, 'url' | 'apiKey'>;

  constructor(opts: TatumOptions) {
    if (!opts.apiKey) throw new Error('Tatum API key is required');
    this.o = {
      minIntervalMs: 400,
      maxRetries: 3,
      timeoutMs: 20_000,
      fetchImpl: fetch,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      ...opts,
    };
  }

  /** Run one query. Calls are serialized and spaced, so concurrent callers cannot burst past the rate limit. */
  query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const run = this.tail.then(() => this.exec<T>(query, variables));
    this.tail = run.catch(() => undefined);
    return run;
  }

  private scrub(s: string): string {
    return s.split(this.o.apiKey).join('***');
  }

  private async exec<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    let attempt = 0;
    for (;;) {
      const wait = this.lastAt + this.o.minIntervalMs - this.o.now();
      if (wait > 0) await this.o.sleep(wait);
      this.lastAt = this.o.now();

      let res: Response;
      try {
        res = await this.o.fetchImpl(this.o.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': this.o.apiKey },
          body: JSON.stringify({ query, ...(variables ? { variables } : {}) }),
          signal: AbortSignal.timeout(this.o.timeoutMs),
        });
      } catch (e) {
        if (attempt++ < this.o.maxRetries) {
          await this.o.sleep(500 * 2 ** (attempt - 1));
          continue;
        }
        throw new TatumError(this.scrub(`Tatum request failed: ${(e as Error).message}`));
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt++ < this.o.maxRetries) {
          const ra = Number(res.headers.get('retry-after'));
          await this.o.sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 500 * 2 ** (attempt - 1));
          continue;
        }
        throw new TatumError(`Tatum returned HTTP ${res.status} after ${attempt} attempts`, res.status);
      }
      if (!res.ok) throw new TatumError(`Tatum returned HTTP ${res.status}`, res.status);

      const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
      if (body.errors?.length) {
        throw new TatumError(this.scrub(`Tatum GraphQL error: ${body.errors.map((e) => e.message).join('; ').slice(0, 300)}`), res.status);
      }
      if (body.data === undefined) throw new TatumError('Tatum GraphQL response had no data');
      return body.data;
    }
  }
}
