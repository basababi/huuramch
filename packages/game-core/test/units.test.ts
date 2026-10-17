import { describe, expect, it } from 'vitest';
import { GUESS_OPTIONS } from '../src/constants';
import { checkName, dedupeName, isProfane, normalizeName } from '../src/names';
import { emptyStats, isAbsent, migrateHostIfNeeded, nextSeat, removePlayer } from '../src/players';
import { pick, seededRng, shuffle } from '../src/rng';
import { DEFAULT_SETTINGS, imposterCountFor, mergeSettings } from '../src/settings';
import type { Player } from '../src/types';
import { categoryWords, guessOptions, pickPair } from '../src/words';
import { POOL, T0, lobby } from './helpers';

describe('settings', () => {
  it('defaults to every free category, Mode A, auto imposters', () => {
    expect(DEFAULT_SETTINGS.categories).toHaveLength(6);
    expect(DEFAULT_SETTINGS.mode).toBe('A');
    expect(DEFAULT_SETTINGS.imposterCount).toBe('auto');
  });

  it('merges valid patches', () => {
    const next = mergeSettings(DEFAULT_SETTINGS, {
      mode: 'B',
      categories: ['food'],
      imposterCount: 2,
    });
    expect(next).toMatchObject({ mode: 'B', categories: ['food'], imposterCount: 2 });
  });

  it.each([
    [{ mode: 'C' }],
    [{ categories: [] }],
    [{ categories: ['food', 'food'] }],
    [{ categories: ['kpop'] }],
    [{ imposterCount: 4 }],
    [{ imposterCount: 0 }],
    [{ imposterCount: 1.5 }],
    [{ showCategoryHint: 'yes' }],
    [{ turnTimer: 1 }],
    [{ timerPreset: 'slow' }],
  ])('rejects %j', (patch) => {
    expect(mergeSettings(DEFAULT_SETTINGS, patch as never)).toBeNull();
  });

  it.each([
    [3, 'auto', 1],
    [6, 'auto', 1],
    [7, 'auto', 2],
    [12, 'auto', 2],
    [3, 3, 1],
    [4, 2, 1],
    [5, 2, 2],
    [6, 3, 2],
    [7, 3, 3],
  ] as const)(
    '%i players with %s imposters → %i (always fewer than half)',
    (players, setting, expected) => {
      expect(imposterCountFor(players, setting)).toBe(expected);
      expect(expected).toBeLessThan(players / 2);
    },
  );
});

describe('names', () => {
  it('accepts Mongolian Cyrillic, Latin and digits up to 12 characters', () => {
    expect(checkName('  Өнөр   Үүлэн  ')).toEqual({ ok: true, name: 'Өнөр Үүлэн' });
    expect(checkName('Bat-Erdene_1')).toEqual({ ok: true, name: 'Bat-Erdene_1' });
    expect(checkName('Тэмүүлэнбаат')).toEqual({ ok: true, name: 'Тэмүүлэнбаат' });
  });

  it.each([
    ['', 'length'],
    ['   ', 'length'],
    ['Тэмүүлэнбаатар', 'length'],
    ['Бат!', 'chars'],
    ['-Бат', 'chars'],
    ['Бат 🙂', 'chars'],
  ])('rejects %j (%s)', (name, reason) => {
    expect(checkName(name)).toEqual({ ok: false, reason });
  });

  it.each(['гичий', 'Новш', 'FUCK', 'sh1t', 'бля', 'хуй', 'pizdets', 'сука'])(
    'blocks %s',
    (name) => {
      expect(isProfane(name) || !checkName(name).ok).toBe(true);
    },
  );

  it('blocks Latin look-alikes written to dodge the Cyrillic list', () => {
    expect(isProfane('нoвш')).toBe(true); // Latin "o"
    expect(isProfane('xуй')).toBe(true); // Latin "x"
  });

  it('does not block ordinary words that contain a short root', () => {
    expect(isProfane('Хуйхаа')).toBe(false);
    expect(isProfane('Сдасан')).toBe(false);
    expect(isProfane('Massimo')).toBe(false);
  });

  it('normalises whitespace and Unicode form', () => {
    expect(normalizeName(' Бат\t Эрдэнэ ')).toBe('Бат Эрдэнэ');
  });

  it('adds a numeric suffix to duplicate names, case-insensitively', () => {
    expect(dedupeName('Бат', [])).toBe('Бат');
    expect(dedupeName('бат', ['Бат'])).toBe('бат 2');
    expect(dedupeName('Бат', ['Бат', 'Бат 2'])).toBe('Бат 3');
  });
});

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = seededRng(1);
    const b = seededRng(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRng(2)()).not.toBe(seededRng(1)());
  });

  it('shuffles into a permutation without touching the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, seededRng(3));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('picks an element (or nothing from an empty list)', () => {
    expect([1, 2, 3]).toContain(pick([1, 2, 3], seededRng(4)));
    expect(pick([], seededRng(4))).toBeUndefined();
  });
});

describe('words', () => {
  it('only picks pairs from the chosen categories', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 20; i++) {
      expect(pickPair(POOL, ['animals'], [], rng)?.pair.category).toBe('animals');
    }
  });

  it('never repeats a pair until the category is exhausted, then starts over', () => {
    const rng = seededRng(6);
    let used: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const picked = pickPair(POOL, ['food'], used, rng);
      if (!picked) throw new Error('no pair');
      seen.add(picked.pair.id);
      used = picked.used;
    }
    expect(seen.size).toBe(5);
    const again = pickPair(POOL, ['food'], used, rng);
    expect(again?.used).toHaveLength(1);
  });

  it('keeps other categories’ history when one category starts over', () => {
    const picked = pickPair(
      POOL,
      ['animals'],
      ['food-1', 'animals-1', 'animals-2', 'animals-3', 'animals-4'],
      seededRng(1),
    );
    expect(picked?.used).toContain('food-1');
    expect(picked?.used).toHaveLength(2);
  });

  it('returns null when no pair matches', () => {
    expect(pickPair(POOL, ['sports'], [], seededRng(1))).toBeNull();
  });

  it('lists every distinct word of a category', () => {
    const words = categoryWords(POOL, 'animals');
    expect(words).toHaveLength(8);
    expect(new Set(words).size).toBe(8);
  });

  it('builds 8 options: the answer plus 7 distinct distractors', () => {
    const words = categoryWords(POOL, 'food');
    const options = guessOptions('Бууз', ['Хуушуур'], words, seededRng(9));
    expect(options).toHaveLength(GUESS_OPTIONS);
    expect(options).toContain('Бууз');
    expect(options).not.toContain('Хуушуур');
    expect(new Set(options).size).toBe(GUESS_OPTIONS);
  });

  it('offers fewer options rather than duplicates when the category is small', () => {
    const options = guessOptions('Хун', [], ['Хун', 'Галуу', 'Галуу'], seededRng(1));
    expect(options.sort()).toEqual(['Галуу', 'Хун']);
  });
});

describe('players', () => {
  const base: Player = {
    id: 'x',
    name: 'X',
    animal: 'mori',
    seat: 0,
    joinedAt: T0,
    connected: true,
    disconnectedAt: null,
    left: false,
    waiting: false,
    score: 0,
    stats: emptyStats(),
  };

  it('counts someone as absent after leaving or after the 90s grace period', () => {
    expect(isAbsent(base, T0)).toBe(false);
    expect(isAbsent({ ...base, left: true }, T0)).toBe(true);
    const away = { ...base, connected: false, disconnectedAt: T0 };
    expect(isAbsent(away, T0 + 89_999)).toBe(false);
    expect(isAbsent(away, T0 + 90_000)).toBe(true);
  });

  it('reuses the lowest free seat', () => {
    expect(
      nextSeat([
        { ...base, seat: 0 },
        { ...base, seat: 2 },
      ]),
    ).toBe(1);
    expect(nextSeat(Array.from({ length: 12 }, (_, seat) => ({ ...base, seat })))).toBe(12);
  });

  it('hands the host role to the earliest-joined connected player', () => {
    const game = lobby(4);
    const s = structuredClone(game.state);
    s.players[0]!.left = true;
    s.players[1]!.connected = false;
    s.players[1]!.disconnectedAt = game.now;
    migrateHostIfNeeded(s, game.now);
    expect(s.hostId).toBe('p2');
  });

  it('keeps the host while they are only briefly disconnected', () => {
    const game = lobby(3);
    const s = structuredClone(game.state);
    s.players[0]!.connected = false;
    s.players[0]!.disconnectedAt = game.now;
    migrateHostIfNeeded(s, game.now + 1000);
    expect(s.hostId).toBe('p0');
  });

  it('empties the host id when the last player leaves', () => {
    const game = lobby(1);
    const s = structuredClone(game.state);
    removePlayer(s, 'p0', game.now);
    expect(s.players).toHaveLength(0);
    expect(s.hostId).toBe('');
  });
});
