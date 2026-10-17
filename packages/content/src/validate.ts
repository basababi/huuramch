import { CATEGORY_IDS, GUESS_OPTIONS, type CategoryId, type WordPair } from '@khuuramch/game-core';

export type WordPack = {
  id: string;
  version: number;
  name: string;
  locked: boolean;
  pairs: WordPair[];
};
export type Widths = Record<string, number>;

/**
 * The role card at the design size (§5): a 360px phone leaves ~273px for the word. At the 44px
 * minimum (§6.3) that is 6.2em of Rubik 800; we keep a 0.2em margin for kerning and rounding.
 */
export const CARD_MAX_WORD_EM = 6.0;
export const MAX_CHARS = 16;
export const MIN_PAIRS = 150;
export const MIN_PER_CATEGORY = 20;

/** Free packs are all Mongolian Cyrillic: words separated by single spaces or hyphens. */
const MONGOLIAN = /^[А-ЯЁӨҮа-яёөү]+(?:[ -][А-ЯЁӨҮа-яёөү]+)*$/;

/** §4: no politics, religion or similar in free packs. A tripwire for accidental additions. */
const OFF_LIMITS = [
  'хаан',
  'чингис',
  'лам',
  'хийд',
  'сүм',
  'бурхан',
  'шашин',
  'нам',
  'ерөнхийлөгч',
  'сайд',
  'хурал',
  'сонгууль',
  'сүхбаатар',
  'чойбалсан',
  'ленин',
  'христ',
  'ислам',
  'будда',
  'архи',
];

export function emWidth(text: string, widths: Widths): number {
  return [...text].reduce((sum, ch) => sum + (widths[ch] ?? 0.75), 0);
}

export type Issue = { pairId: string; problem: string };

export function validatePack(pack: WordPack, widths: Widths): Issue[] {
  const issues: Issue[] = [];
  const seenIds = new Set<string>();
  const seenPairs = new Map<string, string>();
  const perCategory = new Map<CategoryId, number>();
  const issue = (pairId: string, problem: string) => issues.push({ pairId, problem });

  if (pack.pairs.length < MIN_PAIRS)
    issue(pack.id, `only ${pack.pairs.length} pairs (need ${MIN_PAIRS})`);

  for (const pair of pack.pairs) {
    if (!/^[a-z]+(?:-[a-z0-9]+)+$/.test(pair.id)) issue(pair.id, 'id is not a lowercase slug');
    if (seenIds.has(pair.id)) issue(pair.id, 'duplicate id');
    seenIds.add(pair.id);

    if (!CATEGORY_IDS.includes(pair.category))
      issue(pair.id, `unknown category "${pair.category}"`);
    else perCategory.set(pair.category, (perCategory.get(pair.category) ?? 0) + 1);
    if (![1, 2, 3].includes(pair.difficulty)) issue(pair.id, 'difficulty must be 1, 2 or 3');
    if (pair.packId !== pack.id) issue(pair.id, `packId "${pair.packId}" ≠ "${pack.id}"`);

    const a = pair.a.trim().toLowerCase();
    const b = pair.b.trim().toLowerCase();
    if (a === b) issue(pair.id, 'both words are the same');
    const key = [a, b].sort().join('|');
    const twin = seenPairs.get(key);
    if (twin) issue(pair.id, `duplicate of ${twin} (reversed pairs count)`);
    seenPairs.set(key, pair.id);

    for (const word of [pair.a, pair.b]) {
      if (word !== word.trim()) issue(pair.id, `"${word}" has stray spaces`);
      if ([...word].length > MAX_CHARS)
        issue(pair.id, `"${word}" is longer than ${MAX_CHARS} characters`);
      if (!MONGOLIAN.test(word)) issue(pair.id, `"${word}" is not Mongolian Cyrillic only`);
      const lower = word.toLowerCase();
      for (const banned of OFF_LIMITS) {
        if (
          lower.split(/[ -]/).includes(banned) ||
          (banned.includes(' ') && lower.includes(banned))
        ) {
          issue(pair.id, `"${word}" touches an off-limits topic ("${banned}")`);
        }
      }
      for (const part of word.split(/[ -]/)) {
        const em = emWidth(part, widths);
        if (em > CARD_MAX_WORD_EM) {
          issue(pair.id, `"${part}" is ${em.toFixed(2)}em — too wide for the role card at 44px`);
        }
      }
    }
  }

  for (const category of CATEGORY_IDS) {
    const count = perCategory.get(category) ?? 0;
    if (count < MIN_PER_CATEGORY)
      issue(pack.id, `category "${category}" has ${count} pairs (need ${MIN_PER_CATEGORY})`);
    const words = new Set(
      pack.pairs.filter((p) => p.category === category).flatMap((p) => [p.a, p.b]),
    );
    if (words.size < GUESS_OPTIONS + 1) {
      issue(pack.id, `category "${category}" has too few words for 8 guess options`);
    }
  }
  return issues;
}
