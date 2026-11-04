// Scans files for key-like strings. Cross-platform.
//   node scripts/check-secrets.mjs         staged files, before a commit
//   node scripts/check-secrets.mjs --all   every tracked file (what CI runs)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SECRET_NAME = '\\b[A-Z0-9_]*(PRIVATE_KEY|API_KEY|_TOKEN|MEMWAL_KEY|DELEGATE_KEY|SECRET)[A-Z0-9_]*';
const patterns = [
  // Sui private keys (bech32), as used by SUI_PRIVATE_KEY_* and WALRUS_PRIVATE_KEY
  /suiprivkey1[0-9a-z]{20,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  // A secret-named setting given a real-looking value: TATUM_*_API_KEY, MEMWAL_KEY_*, FIDES_MCP_TOKEN,
  // MERCHANT_ADMIN_TOKEN, WEBAPP_DELEGATE_KEY and the like, as a .env line or as a quoted literal in code.
  // A code expression such as `MEMWAL_KEY_A: env.MEMWAL_KEY_A` is not a value and is not flagged.
  new RegExp(`^\\s*(export\\s+)?${SECRET_NAME}\\s*=\\s*\\S{16,}`),
  new RegExp(`${SECRET_NAME}['"]?\\s*[=:]\\s*['"\`][^'"\`\\s]{16,}['"\`]`),
];

const all = process.argv.includes('--all');
const list = all ? 'git ls-files' : 'git diff --cached --name-only --diff-filter=ACM';
// This file is skipped: its own patterns would match themselves.
const files = execSync(list, { encoding: 'utf8' }).split('\n').filter(Boolean).filter((f) => f !== 'scripts/check-secrets.mjs');

let bad = 0;
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    for (const re of patterns) {
      if (re.test(line)) { console.error(`possible secret in ${f}:${i + 1} (${re.source.slice(0, 40)})`); bad++; }
    }
  });
}
if (bad) process.exit(1);
console.log(`secret check ok (${files.length} ${all ? 'tracked' : 'staged'} files)`);
