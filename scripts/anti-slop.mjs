#!/usr/bin/env node
/**
 * Static scan for the "AI-generated look" bans in CLAUDE.md §6.7. Runs in `pnpm lint` and CI.
 * Comments are stripped first, so explaining a ban in a comment is fine; using it is not.
 * The runtime counterpart (computed styles in a real browser) is apps/web/e2e/design-audit.spec.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['apps/web/src', 'apps/server/src', 'packages'];
const EXTENSIONS = /\.(tsx?|css|mjs|json)$/;
const SKIP = /(node_modules|dist|\.next|icon-data\.ts$|\.test\.ts$)/;

const RULES = [
  { id: '6.7.1 purple/violet/indigo', re: /\b(purple|violet|indigo|fuchsia|lavender)\b/i },
  {
    id: '6.7.2 gradients',
    re: /(linear|radial|conic)-gradient|\bbg-gradient|\bbg-(linear|radial|conic)\b|\bfrom-\w+-\d{2,3}\b/,
  },
  { id: '6.7.2 gradient text', re: /bg-clip-text|background-clip:\s*text/ },
  {
    id: '6.7.3 blur / glass / glow',
    re: /backdrop-(blur|filter)|\bblur\(|\bblur-(sm|md|lg|xl|2xl|3xl)\b|drop-shadow|\bglow\b/,
  },
  { id: '6.7.3 soft shadows', re: /\bshadow-(xs|sm|md|lg|xl|2xl|inner)\b/ },
  { id: '6.7.5 shadcn radius', re: /\brounded-(2xl|3xl|xl|lg)\b/ },
  { id: '6.7.5 hairline borders', re: /\bborder-(gray|slate|zinc|neutral|stone)-\d{2,3}\b/ },
  { id: '6.7.7 banned fonts', re: /\b(Inter|Roboto)\b|system-ui/ },
  { id: '6.7.8 emoji', re: /\p{Extended_Pictographic}/u },
  { id: '6.7.9 placeholder copy', re: /lorem|ipsum|welcome to our|get started today/i },
  { id: '6.7.10 focus removed', re: /\boutline-none\b|outline:\s*(none|0)\b/ },
];

/** Tailwind resets like `--blur-*: initial` are how the bans are enforced, not violations. */
const ALLOW_LINE = /:\s*initial;/;

function stripComments(source, file) {
  if (file.endsWith('.json')) return source;
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (SKIP.test(path)) continue;
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.test(name)) yield path;
  }
}

const violations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(root, dir))) {
    const lines = stripComments(readFileSync(file, 'utf8'), file).split('\n');
    lines.forEach((line, i) => {
      if (ALLOW_LINE.test(line)) return;
      for (const rule of RULES) {
        if (rule.re.test(line)) {
          violations.push(
            `${relative(root, file)}:${i + 1}  [${rule.id}]  ${line.trim().slice(0, 120)}`,
          );
        }
      }
    });
  }
}

if (violations.length) {
  console.error(`anti-slop: ${violations.length} violation(s) of CLAUDE.md §6.7\n`);
  console.error(violations.join('\n'));
  process.exit(1);
}
console.warn('anti-slop: clean (CLAUDE.md §6.7)');
