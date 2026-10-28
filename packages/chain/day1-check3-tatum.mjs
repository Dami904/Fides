// Day 1 check 3: what does Tatum's Sui mainnet gateway answer with our key?
// Uses TATUM_MAINNET_API_KEY (or TATUM_API_KEY) from .env. Never prints the key.
// Spaced out to stay under the free plan's 3 requests per second.
// Run: node packages/chain/day1-check3-tatum.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import http2 from 'node:http2';

const env = {};
for (const l of readFileSync(fileURLToPath(new URL('../../.env', import.meta.url)), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const key = env.TATUM_API_KEY || env.TATUM_MAINNET_API_KEY;
if (!key) throw new Error('no Tatum mainnet key in .env');

const RPC = 'https://sui-mainnet.gateway.tatum.io';
const GRPC = 'https://sui-mainnet-grpc.gateway.tatum.io';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (x) => JSON.stringify(x).slice(0, 220);

async function rpc(label, method, params = []) {
  const t0 = Date.now();
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const body = await res.text();
    console.log(`[jsonrpc] ${label}: HTTP ${res.status} ${Date.now() - t0}ms ${body.slice(0, 220).replace(key, '***')}`);
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  } catch (e) {
    console.log(`[jsonrpc] ${label}: error ${e.message}`);
    return null;
  } finally {
    await sleep(450);
  }
}

function grpcUnary(label, path, headerName = 'x-api-key') {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const client = http2.connect(GRPC);
    client.on('error', (e) => {
      console.log(`[grpc] ${label}: connect error ${e.message}`);
      resolve(null);
    });
    const req = client.request({
      ':method': 'POST',
      ':path': path,
      'content-type': 'application/grpc',
      te: 'trailers',
      [headerName]: key,
    });
    let status;
    let trailers = {};
    let size = 0;
    req.on('response', (h) => (status = h[':status']));
    req.on('trailers', (t) => (trailers = t));
    req.on('data', (d) => (size += d.length));
    req.on('end', () => {
      console.log(`[grpc] ${label}: HTTP ${status} grpc-status=${trailers['grpc-status']} msg=${trailers['grpc-message'] ?? ''} bytes=${size} ${Date.now() - t0}ms`);
      client.close();
      resolve({ status, trailers, size });
    });
    req.on('error', (e) => {
      console.log(`[grpc] ${label}: error ${e.message}`);
      client.close();
      resolve(null);
    });
    req.end(Buffer.from([0, 0, 0, 0, 0]));
    setTimeout(() => {
      client.destroy();
      resolve(null);
    }, 15000);
  });
}

// 1. JSON-RPC: does the free key reach Sui mainnet at all?
const cp = await rpc('latest checkpoint', 'sui_getLatestCheckpointSequenceNumber');
// 2. Event queries (needed for the anchor reads). Any package, limit 1, just to see if the method answers.
const ev = await rpc('queryEvents (All, limit 1)', 'suix_queryEvents', [{ All: [] }, null, 1, true]);
// 3. A transaction lookup (finality check path). Use the tx digest from the event if there was one.
const digest = ev?.result?.data?.[0]?.id?.txDigest;
if (digest) await rpc('getTransactionBlock', 'sui_getTransactionBlock', [digest, { showEffects: true, showBalanceChanges: true }]);
else console.log('[jsonrpc] getTransactionBlock: skipped, no digest from events');
// 4. gRPC: does it answer, and with which auth header?
await sleep(450);
await grpcUnary('GetServiceInfo with x-api-key', '/sui.rpc.v2.LedgerService/GetServiceInfo');
await sleep(450);
await grpcUnary('GetServiceInfo with no key', '/sui.rpc.v2.LedgerService/GetServiceInfo', 'x-none');
console.log('latest checkpoint result present:', cp?.result !== undefined);
