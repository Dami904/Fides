// Scans staged files for key-like strings before a commit. Cross-platform.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patterns = [
  /suiprivkey[0-9a-z]{20,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(TATUM_API_KEY|MEMWAL_KEY_[AB]|SUI_PRIVATE_KEY_\w+)\s*=\s*\S+/,
];

const files = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  .split('\n').filter(Boolean).filter((f) => f !== '.env.example');

let bad = 0;
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { continue; }
  for (const re of patterns) {
    if (re.test(text)) { console.error(`possible secret in ${f} (${re})`); bad++; }
  }
}
if (bad) process.exit(1);
console.log(`secret check ok (${files.length} staged files)`);
