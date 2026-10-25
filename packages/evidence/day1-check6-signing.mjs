// Day 1 check 6: sign an evidence record with a Sui key and verify it in code. Offline.
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { createHash } from 'node:crypto';

const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object')
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  if (typeof v === 'number' && !Number.isInteger(v)) throw new Error('no floats');
  return JSON.stringify(v);
};

const kp = new Ed25519Keypair(); // throwaway, never a real key
const addr = kp.getPublicKey().toSuiAddress();
const body = {
  schema: 'fides.evidence/v1',
  reporter: { agentId: 'A', suiAddress: addr },
  merchant: { host: 'flaky.example', payTo: '0x' + 'ab'.repeat(32) },
  verdict: 'burned',
};
const bytes = new TextEncoder().encode(canon(body));
const sha = createHash('sha256').update(bytes).digest('hex');
const { signature } = await kp.signPersonalMessage(bytes);

// good
const pk = await verifyPersonalMessageSignature(bytes, signature);
console.log('good verify, signer matches reporter:', pk.toSuiAddress() === addr);

// forged: tamper body, same signature
const forged = new TextEncoder().encode(canon({ ...body, verdict: 'clean' }));
try {
  const pk2 = await verifyPersonalMessageSignature(forged, signature);
  console.log('tampered verify, signer matches reporter:', pk2.toSuiAddress() === addr);
} catch (e) { console.log('tampered rejected (throws):', e.message.slice(0, 60)); }

// wrong signer claimed
const other = new Ed25519Keypair();
const { signature: s3 } = await other.signPersonalMessage(bytes);
const pk3 = await verifyPersonalMessageSignature(bytes, s3);
console.log('other key, signer matches reporter:', pk3.toSuiAddress() === addr);
console.log('sha256', sha.slice(0, 16));
