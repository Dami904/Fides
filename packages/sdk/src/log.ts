// Structured logs for the paths that touch money and evidence: payments, claims, reports, retries, verification.
// One JSON object per line. The library is silent unless given a logger; the CLIs pass jsonLogger(), which writes to
// stderr (stdout is the MCP protocol when serving over stdio). Messages never carry keys: Tatum errors are scrubbed
// at the source, and nothing here logs a request or a signer.

export interface LogEvent {
  level: 'info' | 'warn' | 'error';
  /** What happened, dotted: payment.sent, payment.unknown, claim.released, report.done, report.queued, evidence.rejected ... */
  op: string;
  msg: string;
  /** Claim or idempotency key. */
  key?: string;
  host?: string;
  evidenceId?: string;
  txDigest?: string;
  err?: string;
}

export type Logger = (e: LogEvent) => void;

export const silentLogger: Logger = () => undefined;

export function jsonLogger(write: (line: string) => void = (line) => process.stderr.write(line)): Logger {
  return (e) => write(JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
}
