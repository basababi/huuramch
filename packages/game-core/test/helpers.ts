import { expect } from 'vitest';
import { ANIMAL_IDS } from '../src/constants';
import { createRoom, reduce } from '../src/machine';
import { seededRng } from '../src/rng';
import type { Action, GameEvent, RoomSettings, RoomState, Rng, WordPair } from '../src/types';

export const T0 = 1_000_000;

/** Distinctive words so a leaked secret is easy to spot in a serialised view. */
export const POOL: WordPair[] = [
  { id: 'food-1', a: 'Бууз', b: 'Хуушуур', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-2', a: 'Цуйван', b: 'Хуурга', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-3', a: 'Боорцог', b: 'Ул боов', category: 'food', difficulty: 2, packId: 'core' },
  { id: 'food-4', a: 'Тараг', b: 'Өрөм', category: 'food', difficulty: 2, packId: 'core' },
  { id: 'food-5', a: 'Ааруул', b: 'Ээзгий', category: 'food', difficulty: 2, packId: 'core' },
  { id: 'animals-1', a: 'Тэмээ', b: 'Морь', category: 'animals', difficulty: 1, packId: 'core' },
  { id: 'animals-2', a: 'Чоно', b: 'Үнэг', category: 'animals', difficulty: 1, packId: 'core' },
  { id: 'animals-3', a: 'Хун', b: 'Галуу', category: 'animals', difficulty: 1, packId: 'core' },
  { id: 'animals-4', a: 'Тарвага', b: 'Зурам', category: 'animals', difficulty: 2, packId: 'core' },
];

export const NAMES = [
  'Бат',
  'Сараа',
  'Тэмүүлэн',
  'Номин',
  'Анужин',
  'Ганбаа',
  'Хулан',
  'Тэнгис',
  'Мишээл',
  'Эрдэнэ',
  'Солонго',
  'Дөлгөөн',
];

export const pid = (i: number) => `p${i}`;

export type Game = {
  state: RoomState;
  now: number;
  rng: Rng;
  events: GameEvent[];
};

/** A lobby with `count` connected players; p0 is the host. Time advances 1s per join. */
export function lobby(count: number, settings: Partial<RoomSettings> = {}, seed = 7): Game {
  const created = createRoom({
    code: '0420',
    host: { id: pid(0), name: NAMES[0] as string, animal: ANIMAL_IDS[0] },
    now: T0,
    settings: { categories: ['food'], ...settings },
  });
  if (!created.ok) throw new Error(created.error);
  const game: Game = { state: created.state, now: T0, rng: seededRng(seed), events: [] };
  for (let i = 1; i < count; i++) {
    tick(game, 1000);
    act(game, {
      type: 'JOIN',
      player: {
        id: pid(i),
        name: NAMES[i] as string,
        animal: ANIMAL_IDS[i] as (typeof ANIMAL_IDS)[number],
      },
    });
  }
  return game;
}

/** Applies an action that must succeed. */
export function act(game: Game, action: Action): Game {
  const result = reduce(game.state, action, game.now, game.rng);
  if (!result.ok) throw new Error(`${action.type} failed: ${result.error}`);
  game.state = result.state;
  game.events.push(...result.events);
  return game;
}

/** Applies an action that must fail with `error`, and checks the state did not change. */
export function reject(game: Game, action: Action, error: string): void {
  const before = game.state;
  const result = reduce(game.state, action, game.now, game.rng);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toBe(error);
  expect(result.state).toBe(before);
}

/** Moves time forward and lets the server's TICK run. */
export function tick(game: Game, ms: number): Game {
  game.now += ms;
  return act(game, { type: 'TICK' });
}

/** Jumps to the current deadline (plus `extra`) and ticks. */
export function expire(game: Game, extra = 0): Game {
  const deadline = game.state.deadline;
  if (deadline === null) throw new Error(`no deadline in ${game.state.phase}`);
  game.now = deadline + extra;
  return act(game, { type: 'TICK' });
}

export function start(game: Game): Game {
  return act(game, { type: 'START_GAME', by: game.state.hostId, pool: POOL });
}

export function round(game: Game) {
  const r = game.state.round;
  if (!r) throw new Error('no round');
  return r;
}

export function imposters(game: Game): string[] {
  return round(game).imposters;
}

export function civilians(game: Game): string[] {
  const r = round(game);
  return r.participants.filter((id) => !r.imposters.includes(id));
}

export function alive(game: Game): string[] {
  const r = round(game);
  return r.participants.filter((id) => !r.eliminated.includes(id));
}

/** Everyone confirms their role → clue turns. */
export function confirmAll(game: Game): Game {
  for (const id of round(game).participants) {
    if (game.state.phase === 'ROLE_REVEAL') act(game, { type: 'CONFIRM_ROLE', playerId: id });
  }
  return game;
}

/** Every speaker taps Дууслаа for the remaining turns → discussion. */
export function finishTurns(game: Game): Game {
  while (game.state.phase === 'CLUE_TURNS') {
    const r = round(game);
    const speaker = r.speakingOrder[r.turnIndex % r.speakingOrder.length] as string;
    act(game, { type: 'TURN_DONE', by: speaker });
  }
  return game;
}

/** Clue turns + discussion skipped by the host → voting. */
export function toVoting(game: Game): Game {
  if (game.state.phase === 'ROLE_REVEAL') confirmAll(game);
  finishTurns(game);
  act(game, { type: 'SKIP_DISCUSSION', by: game.state.hostId });
  return game;
}

/**
 * Everyone alive votes for `target` (the target votes for `fallback`).
 * Leaves the game in VOTE_REVEAL.
 */
export function everyoneVotes(game: Game, target: string, fallback?: string): Game {
  for (const voter of alive(game)) {
    const choice =
      voter === target ? (fallback ?? alive(game).find((id) => id !== target)) : target;
    act(game, { type: 'CAST_VOTE', playerId: voter, targetId: choice as string });
  }
  return game;
}

export function guessIndex(game: Game, correct: boolean): number {
  const r = round(game);
  const options = r.guess?.options ?? [];
  const index = options.findIndex((w) => (correct ? w === r.wordA : w !== r.wordA));
  if (index < 0) throw new Error('no matching guess option');
  return index;
}
