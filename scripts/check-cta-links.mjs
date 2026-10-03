// Build-time CTA gate. Fails the build if a "Book a Demo" button would ship
// pointing at somewhere nobody reads. Runs after `vite build` — see
// package.json "build". Companion to check-build-secrets.mjs.
//
// Why this exists: the demo buttons spent months pointing at
// sales@chefcode.ai, a domain that was never registered. Every enterprise and
// trial-upgrade lead bounced silently — nothing failed, nothing logged, the
// mail just went nowhere. A dead CTA is invisible in testing, so it gets
// caught here instead.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

// [pattern, what the person should do about it]
const BAD = [
  [/REPLACE_ME/, 'The demo booking link is still the placeholder. Open src/siteConfig.ts and set DEMO_BOOKING_URL to your real Cal.com or Calendly URL (the full https:// address).'],
  [/mailto:[^"'\s]*@chefcode\.ai/, 'A button still points at an @chefcode.ai address. That domain is not registered, so the mail goes nowhere. Point it at DEMO_BOOKING_URL in src/siteConfig.ts instead.'],
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs|cjs|html)$/.test(name)) out.push(p);
  }
  return out;
}

let files;
try {
  files = walk(DIST);
} catch {
  console.log('[check-cta-links] no dist/ dir — skipping.');
  process.exit(0);
}

const problems = new Map(); // advice -> Set(files)
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [re, advice] of BAD) {
    if (re.test(text)) {
      if (!problems.has(advice)) problems.set(advice, new Set());
      problems.get(advice).add(file);
    }
  }
}

if (problems.size) {
  console.error('\n\x1b[31m✗ BUILD BLOCKED — a "Book a Demo" button would go nowhere.\x1b[0m\n');
  for (const [advice, fileSet] of problems) {
    console.error('  ' + advice);
    console.error('    found in: ' + [...fileSet].join(', ') + '\n');
  }
  process.exit(1);
}

console.log('[check-cta-links] OK — every demo CTA points at a real destination.');
