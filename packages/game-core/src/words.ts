import { GUESS_OPTIONS, type CategoryId } from './constants';
import { pick, shuffle } from './rng';
import type { Rng, WordPair } from './types';

/**
 * Picks the next pair from the chosen categories, never repeating a pair in the same room until
 * every eligible pair has been used.
 */
export function pickPair(
  pool: readonly WordPair[],
  categories: readonly CategoryId[],
  used: readonly string[],
  rng: Rng,
): { pair: WordPair; used: string[] } | null {
  const eligible = pool.filter((p) => categories.includes(p.category));
  if (eligible.length === 0) return null;
  let fresh = eligible.filter((p) => !used.includes(p.id));
  let keep = [...used];
  if (fresh.length === 0) {
    fresh = eligible;
    keep = used.filter((id) => !eligible.some((p) => p.id === id));
  }
  const pair = pick(fresh, rng) as WordPair;
  return { pair, used: [...keep, pair.id] };
}

/** Every distinct word of a category: the pool the guess distractors come from. */
export function categoryWords(pool: readonly WordPair[], category: CategoryId): string[] {
  const words = pool.filter((p) => p.category === category).flatMap((p) => [p.a, p.b]);
  return [...new Set(words)];
}

/**
 * The real word plus seven distractors from the same category, shuffled (§2.2.6).
 * `exclude`: words that must not appear (Mode B: the imposter's own word gives nothing away).
 */
export function guessOptions(
  answer: string,
  exclude: readonly string[],
  words: readonly string[],
  rng: Rng,
): string[] {
  const candidates = [...new Set(words)].filter((w) => w !== answer && !exclude.includes(w));
  const distractors = shuffle(candidates, rng).slice(0, GUESS_OPTIONS - 1);
  return shuffle([answer, ...distractors], rng);
}
