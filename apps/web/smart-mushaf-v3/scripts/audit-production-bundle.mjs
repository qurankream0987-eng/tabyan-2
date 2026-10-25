#!/usr/bin/env node
/**
 * Fails if a production build of the Tabyan web app contains Smart Mushaf
 * development-only code (fake stream, diagnostics, dev URL switches) or a
 * recitation-provider secret name.
 *
 *   node smart-mushaf-v3/scripts/audit-production-bundle.mjs dist/public
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/public';
const FORBIDDEN = [
  'FakeStreamProvider',
  'buildFakeTimeline',
  'FAKE_STREAM_SCENARIOS',
  'LiveDiagnosticsPanel',
  '__smartMushafLive',
  'smProvider',
  'smAutostart',
  'MockUiRecitationProvider',
  'NABR_QRC_API_KEY',
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|html|css|json)$/.test(name)) yield path;
  }
}

const hits = [];
for (const file of files(root)) {
  const text = readFileSync(file, 'utf8');
  for (const marker of FORBIDDEN) if (text.includes(marker)) hits.push(`${marker} in ${file}`);
}
if (hits.length) {
  console.error(`✘ production bundle contains development-only code:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`✔ ${root}: no Smart Mushaf development code or provider secret names`);
