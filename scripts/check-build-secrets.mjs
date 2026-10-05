// Build-time secret gate. Fails the build if a secret ends up in the client
// bundle, where anyone visiting the site can read it. Runs after `vite build` —
// see package.json "build". Checks for:
//   1. a Supabase service_role key (or the SERVICE_ROLE var name)
//   2. a Google / Gemini API key — by shape, and by the actual configured value.
//      The Gemini key was once compiled into the bundle; it was copied off
//      chefcode.cc, misused, and Google suspended the project (2026-10-04).
//
// The service_role key is a JWT whose payload base64url-decodes to
// {"role":"service_role",...}, so a plain text grep for "service_role" misses
// it. This decodes every JWT-looking token and inspects the payload.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
// Google API keys: the classic "AIza…" form and the newer "AQ.…" form.
const GOOGLE_KEY_RES = [/AIza[0-9A-Za-z_-]{35}/, /AQ\.[A-Za-z0-9_-]{40,}/];

// The real configured values, so a key in any format is caught. Vercel puts
// them in process.env during its build; locally they live in .env.local.
function configuredGeminiKeys() {
  const names = ['GEMINI_API_KEY', 'VITE_GEMINI_API_KEY', 'API_KEY', 'VITE_API_KEY'];
  const values = names.map((n) => process.env[n]);
  for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
        if (m && names.includes(m[1])) values.push(m[2].trim().replace(/^["']|["']$/g, ''));
      }
    } catch { /* file absent */ }
  }
  return [...new Set(values.filter((v) => v && v.length >= 20))];
}
const GEMINI_KEYS = configuredGeminiKeys();
const JWT_RE = /eyJ[A-Za-z0-9_-]{6,}\.eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|cjs|css|html|map)$/.test(name)) out.push(p);
  }
  return out;
}

function decodePayload(jwt) {
  try {
    const payload = jwt.split('.')[1];
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

let leaks = [];
let files;
try {
  files = walk(DIST);
} catch {
  console.log('[check-build-secrets] no dist/ dir — skipping.');
  process.exit(0);
}

for (const file of files) {
  const text = readFileSync(file, 'utf8');

  // 1) Any embedded service_role JWT (survives key rotation — checks the claim)
  const tokens = text.match(JWT_RE) || [];
  for (const t of tokens) {
    const p = decodePayload(t);
    if (p && p.role === 'service_role') {
      leaks.push(`${file}: embedded service_role JWT (ref=${p.ref || '?'})`);
    }
  }

  // 2) The var name leaking as an inlined object key
  if (/SERVICE_ROLE/.test(text)) {
    leaks.push(`${file}: contains "SERVICE_ROLE"`);
  }

  // 3) A Google / Gemini API key — never print it, only say where it is.
  if (GOOGLE_KEY_RES.some((re) => re.test(text)) || GEMINI_KEYS.some((k) => text.includes(k))) {
    leaks.push(`${file}: contains a Google API key`);
  }
}

if (leaks.length) {
  console.error('\n[31m✗ BUILD BLOCKED — a secret is present in the build:[0m');
  for (const l of leaks) console.error('  - ' + l);
  console.error('\nA secret would be published inside the website, where anyone can read it. Supabase service_role key: remove any VITE_-prefixed copy from .env.local and Vercel. Gemini key: only api/extract-invoice.ts may read it, as GEMINI_API_KEY; check no browser code reads it and vite.config.ts has no define for it.\n');
  process.exit(1);
}

console.log(`[check-build-secrets] OK — no service_role secret and no Google API key in dist/ (checked ${GEMINI_KEYS.length} configured key value(s) plus key shapes).`);
