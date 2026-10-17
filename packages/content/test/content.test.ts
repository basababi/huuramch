import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, LOCKED_PACK_IDS, type WordPair } from '@khuuramch/game-core';
import {
  CORE_PACK,
  PREMIUM_PACKS,
  RUBIK_800_WIDTHS,
  emWidth,
  playablePairs,
  validatePack,
} from '../src/index';

describe('core pack', () => {
  it('passes every content rule (§4)', () => {
    expect(validatePack(CORE_PACK, RUBIK_800_WIDTHS)).toEqual([]);
  });

  it('ships at least 150 pairs across all six free categories', () => {
    expect(playablePairs().length).toBeGreaterThanOrEqual(150);
    expect(new Set(playablePairs().map((p) => p.category))).toEqual(new Set(CATEGORY_IDS));
  });

  it('uses Ө ө Ү ү (Mongolian, not Russian, Cyrillic)', () => {
    const text = playablePairs()
      .map((p) => p.a + p.b)
      .join('');
    expect(text).toMatch(/[Өө]/);
    expect(text).toMatch(/[Үү]/);
  });

  it('lists the five locked premium packs', () => {
    expect(PREMIUM_PACKS.map((p) => p.id)).toEqual([...LOCKED_PACK_IDS]);
    expect(PREMIUM_PACKS.every((p) => p.locked)).toBe(true);
  });
});

describe('validator catches bad content', () => {
  const base: WordPair = {
    id: 'food-a-b',
    a: 'Бууз',
    b: 'Хуушуур',
    category: 'food',
    difficulty: 1,
    packId: 'core',
  };
  const check = (pairs: WordPair[]) =>
    validatePack({ id: 'core', version: 1, name: 'x', locked: false, pairs }, RUBIK_800_WIDTHS).map(
      (i) => i.problem,
    );

  it.each([
    [{ a: 'Хуушуур', b: 'Хуушуур' }, 'same'],
    [{ a: 'Buuz' }, 'Mongolian Cyrillic'],
    [{ a: 'Бууз ' }, 'stray spaces'],
    [{ a: 'Аааааааааааааааааа' }, 'longer than'],
    [{ a: 'Улаанбаатар' }, 'too wide'],
    [{ a: 'Чингис хаан' }, 'off-limits'],
    [{ category: 'kpop' as never }, 'unknown category'],
    [{ difficulty: 4 as never }, 'difficulty'],
    [{ packId: 'other' }, 'packId'],
    [{ id: 'Bad Id' }, 'slug'],
  ])('flags %j', (patch, problem) => {
    expect(check([{ ...base, ...patch }]).join('\n')).toContain(problem);
  });

  it('flags duplicates, including reversed pairs and repeated ids', () => {
    const problems = check([base, { ...base, id: 'food-b-a', a: 'Хуушуур', b: 'Бууз' }, base]).join(
      '\n',
    );
    expect(problems).toContain('reversed');
    expect(problems).toContain('duplicate id');
  });

  it('flags a pack that is too small or has thin categories', () => {
    const problems = check([base]).join('\n');
    expect(problems).toContain('need 150');
    expect(problems).toContain('category "sports" has 0 pairs');
    expect(problems).toContain('too few words');
  });

  it('measures words with the real Rubik 800 widths', () => {
    expect(emWidth('Бууз', RUBIK_800_WIDTHS)).toBeCloseTo(2.47, 1);
    expect(emWidth('Сонгинохайрхан', RUBIK_800_WIDTHS)).toBeGreaterThan(6);
  });
});
