/**
 * Content check for editors: `pnpm --filter @khuuramch/content validate`.
 * Prints every problem with the pair id, and a per-category summary.
 */
import { CATEGORY_IDS } from '@khuuramch/game-core';
import { CORE_PACK, RUBIK_800_WIDTHS, emWidth, validatePack } from '../src/index';

const issues = validatePack(CORE_PACK, RUBIK_800_WIDTHS);
for (const category of CATEGORY_IDS) {
  const pairs = CORE_PACK.pairs.filter((p) => p.category === category);
  const widest = Math.max(
    ...pairs
      .flatMap((p) => [p.a, p.b])
      .flatMap((w) => w.split(/[ -]/))
      .map((w) => emWidth(w, RUBIK_800_WIDTHS)),
  );
  console.warn(
    `${category.padEnd(8)} ${String(pairs.length).padStart(3)} pairs · widest word ${widest.toFixed(2)}em`,
  );
}
if (issues.length) {
  console.error(`\n${issues.length} problem(s):`);
  for (const { pairId, problem } of issues) console.error(`  ${pairId}: ${problem}`);
  process.exit(1);
}
console.warn(`\n${CORE_PACK.pairs.length} pairs, no problems.`);
