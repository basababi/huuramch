/** Rule constants (CLAUDE.md §2, §3.1). Every duration is in milliseconds. */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_IMPOSTERS = 3;

export const ANIMAL_IDS = [
  'temee',
  'mori',
  'khoni',
  'yamaa',
  'ukher',
  'sarlag',
  'uneg',
  'chono',
  'tarvaga',
  'irves',
  'shonkhor',
  'burged',
] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

/** The six free categories (§4). */
export const CATEGORY_IDS = ['food', 'places', 'animals', 'daily', 'arts', 'sports'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Premium packs: visible, locked, not playable yet (§4, §9). */
export const LOCKED_PACK_IDS = ['student', 'kpop', 'singers', 'tsagaanSar', 'night'] as const;
export type LockedPackId = (typeof LOCKED_PACK_IDS)[number];

export const TIMER_PRESETS = {
  calm: { turnMs: 30_000, discussionMs: 120_000 },
  normal: { turnMs: 20_000, discussionMs: 90_000 },
  fast: { turnMs: 12_000, discussionMs: 60_000 },
} as const;
export type TimerPreset = keyof typeof TIMER_PRESETS;

export const DURATIONS = {
  /** Host may force the game on once this much of the role reveal has passed. */
  roleForceAfterMs: 30_000,
  /** Safety net: the reveal ends on its own so an absent host can't stall the room. */
  roleRevealMs: 60_000,
  votingMs: 30_000,
  /** Votes stack, drumroll, stamp slam, hold (§5.8). */
  revealMs: 5_000,
  guessMs: 20_000,
  /** How long the guess outcome stays on screen before the game moves on. */
  guessResultMs: 3_000,
  /** Disconnect grace period before a player counts as absent (§2.5). */
  graceMs: 90_000,
  /** Rooms expire after this much inactivity (§2.5). */
  roomTtlMs: 2 * 60 * 60 * 1000,
} as const;

/** Mode A has two clue laps; Mode B one lap per elimination round (§2.2, §2.3). */
export const CLUE_LAPS = { A: 2, B: 1 } as const;

/** Imposter guess: the real word plus seven distractors from the same category (§2.2). */
export const GUESS_OPTIONS = 8;

/** Mode B stops after this many rounds in a row without an elimination (DECISIONS D-104). */
export const MAX_ROUNDS_WITHOUT_ELIMINATION = 2;

export const POINTS = {
  /** Civilian who voted for the imposter in the vote that eliminated them. */
  correctVote: 1,
  /** Imposter who survives to the end of a game the imposters win. */
  imposterSurvives: 3,
  /** Eliminated imposter who guesses the civilians' word. */
  correctGuess: 2,
  /** Each surviving civilian when the civilians win. */
  civilianTeamWin: 1,
} as const;
