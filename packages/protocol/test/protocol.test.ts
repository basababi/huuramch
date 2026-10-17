import {
  createRoom,
  projectStateForPlayer,
  projectStateForTv,
  reduce,
  seededRng,
  type PlayerView,
  type TvView,
  type WordPair,
} from '@khuuramch/game-core';
import { describe, expect, it } from 'vitest';
import type * as z from 'zod/mini';
import {
  C2S,
  C2SSchemas,
  ERROR_MESSAGES,
  ackError,
  stateSyncSchema,
  tvViewSchema,
  type playerViewSchema,
} from '../src/index';

/** Compile-time check (run by `tsc`): schema output and game-core view types are interchangeable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const viewsMatch: [
  Same<z.infer<typeof playerViewSchema>, PlayerView>,
  Same<z.infer<typeof tvViewSchema>, TvView>,
] = [true, true];

const POOL: WordPair[] = [
  { id: 'food-1', a: 'Бууз', b: 'Хуушуур', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-2', a: 'Цуйван', b: 'Хуурга', category: 'food', difficulty: 1, packId: 'core' },
];

describe('client → server schemas', () => {
  it('has a schema for every client event', () => {
    expect(Object.keys(C2SSchemas).sort()).toEqual(Object.values(C2S).sort());
  });

  it('accepts well-formed payloads', () => {
    expect(
      C2SSchemas['room:join'].safeParse({ code: '0420', nickname: 'Бат', avatar: 'mori' }).success,
    ).toBe(true);
    expect(
      C2SSchemas['room:create'].safeParse({
        nickname: 'Бат',
        avatar: 'temee',
        settings: { mode: 'B' },
      }).success,
    ).toBe(true);
    expect(C2SSchemas['guess:submit'].safeParse({ optionIndex: 7 }).success).toBe(true);
    expect(
      C2SSchemas['room:updateSettings'].safeParse({ categories: ['food', 'arts'] }).success,
    ).toBe(true);
  });

  it.each([
    ['room:join', { code: '42', nickname: 'Бат', avatar: 'mori' }],
    ['room:join', { code: '0420', nickname: '', avatar: 'mori' }],
    ['room:join', { code: '0420', nickname: 'Бат', avatar: 'unicorn' }],
    ['room:rejoin', { code: '0420', sessionToken: 'short' }],
    ['guess:submit', { optionIndex: 8 }],
    ['guess:submit', { optionIndex: 1.5 }],
    ['room:updateSettings', { categories: ['kpop'] }],
    ['room:updateSettings', { imposterCount: 4 }],
    ['vote:cast', { targetId: '' }],
    ['clock:ping', { t0: 'now' }],
  ] as const)('rejects %s %j', (event, payload) => {
    expect(C2SSchemas[event].safeParse(payload).success).toBe(false);
  });
});

describe('server → client schemas', () => {
  it('validate real projections through a whole game', () => {
    const created = createRoom({
      code: '0420',
      host: { id: 'p0', name: 'Бат', animal: 'temee' },
      now: 0,
    });
    if (!created.ok) throw new Error(created.error);
    let state = created.state;
    const rng = seededRng(1);
    const step = (action: Parameters<typeof reduce>[1]) => {
      const result = reduce(state, action, 0, rng);
      if (!result.ok) throw new Error(result.error);
      state = result.state;
      for (const p of state.players) {
        const sync = { rev: 1, serverNow: 0, view: projectStateForPlayer(state, p.id, 0) };
        expect(stateSyncSchema.safeParse(sync).success).toBe(true);
      }
      expect(tvViewSchema.safeParse(projectStateForTv(state, 0)).success).toBe(true);
    };
    step({ type: 'JOIN', player: { id: 'p1', name: 'Сараа', animal: 'mori' } });
    step({ type: 'JOIN', player: { id: 'p2', name: 'Номин', animal: 'khoni' } });
    step({ type: 'START_GAME', by: 'p0', pool: POOL });
    for (const id of ['p0', 'p1', 'p2']) step({ type: 'CONFIRM_ROLE', playerId: id });
    while (state.phase === 'CLUE_TURNS') step({ type: 'TURN_DONE', by: 'p0' });
    step({ type: 'SKIP_DISCUSSION', by: 'p0' });
    step({ type: 'CAST_VOTE', playerId: 'p0', targetId: 'p1' });
  });
});

describe('errors', () => {
  it('has a Mongolian message for every code', () => {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message.length, code).toBeGreaterThan(3);
      expect(message).toMatch(/[а-яөү]/i);
    }
  });

  it('builds the ack envelope', () => {
    expect(ackError('ROOM_FULL')).toEqual({
      ok: false,
      error: { code: 'ROOM_FULL', message: ERROR_MESSAGES.ROOM_FULL },
    });
  });
});
