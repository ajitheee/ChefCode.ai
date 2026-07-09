// Build-time secret gate. Fails the build if a Supabase service_role key (or
// the SERVICE_ROLE var name) ends up in the client bundle. Runs after
// `vite build` — see package.json "build".
//
// The service_role key is a JWT whose payload base64url-decodes to
// {"role":"service_role",...}, so a plain text grep for "service_role" misses
// it. This decodes every JWT-looking token and inspects the payload.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
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
}

if (leaks.length) {
  console.error('\n[31m✗ BUILD BLOCKED — a service_role secret is present in the build:[0m');
  for (const l of leaks) console.error('  - ' + l);
  console.error('\nRemove any VITE_-prefixed service_role key from .env.local / Vercel and rebuild.\n');
  process.exit(1);
}

console.log('[check-build-secrets] OK — no service_role secret in dist/.');
