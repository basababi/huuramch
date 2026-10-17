#!/usr/bin/env node
/**
 * Initial-JS budget check (§7: ≤ 180 KB gzipped on the player route).
 * Fetches a page from a running production server, collects every script it loads up front,
 * and sums their gzip sizes. Usage: node scripts/js-budget.mjs [baseUrl] [path...]
 */
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 180;
const [base = 'http://localhost:3100', ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ['/'];

let failed = false;
for (const route of routes) {
  const html = await (await fetch(new URL(route, base))).text();
  // nomodule scripts (legacy polyfills) are never downloaded by modern browsers.
  const srcs = [...html.matchAll(/<script([^>]*)>/g)]
    .filter((m) => !/nomodule/i.test(m[1]))
    .map((m) => m[1].match(/src="([^"]+)"/)?.[1])
    .filter(Boolean);
  const unique = [...new Set(srcs)];
  let total = 0;
  const rows = [];
  for (const src of unique) {
    const body = Buffer.from(await (await fetch(new URL(src, base))).arrayBuffer());
    const gz = gzipSync(body, { level: 9 }).length;
    total += gz;
    rows.push([src.split('/').pop(), (gz / 1024).toFixed(1)]);
  }
  rows.sort((a, b) => Number(b[1]) - Number(a[1]));
  const kb = total / 1024;
  const ok = kb <= BUDGET_KB;
  failed ||= !ok;
  console.warn(
    `${route}: ${unique.length} scripts, ${kb.toFixed(1)} KB gz (budget ${BUDGET_KB}) ${ok ? 'OK' : 'OVER'}`,
  );
  for (const [name, size] of rows.slice(0, 6)) console.warn(`  ${size.padStart(6)} KB  ${name}`);
}
process.exit(failed ? 1 : 0);
