import {
  ANIMAL_IDS,
  CATEGORY_IDS,
  GUESS_OPTIONS,
  MAX_PLAYERS,
  TIMER_PRESETS,
  type TimerPreset,
} from '@khuuramch/game-core';
import * as z from 'zod/mini';

/*
 * Zod Mini keeps the client bundle small; the same schemas validate on the server.
 * Strings are bounded so a hostile client can't make the server hold huge payloads.
 */

export const roomCode = z.string().check(z.regex(/^\d{4}$/));
const id = z.string().check(z.minLength(1), z.maxLength(64));
/** Raw nickname: the server normalises and applies the real rules (game-core `checkName`). */
const nickname = z.string().check(z.minLength(1), z.maxLength(40));
export const animalId = z.enum(ANIMAL_IDS);
export const categoryId = z.enum(CATEGORY_IDS);
const timerPreset = z.enum(Object.keys(TIMER_PRESETS) as [TimerPreset, ...TimerPreset[]]);

export const settingsSchema = z.object({
  mode: z.enum(['A', 'B']),
  categories: z.array(categoryId).check(z.minLength(1), z.maxLength(CATEGORY_IDS.length)),
  imposterCount: z.union([z.literal('auto'), z.literal(1), z.literal(2), z.literal(3)]),
  showCategoryHint: z.boolean(),
  timerPreset,
  turnTimer: z.boolean(),
});

// ── client → server ──────────────────────────────────────────────────────────────────────────

export const empty = z.object({});

export const C2SSchemas = {
  'room:create': z.object({
    nickname,
    avatar: animalId,
    settings: z.optional(z.partial(settingsSchema)),
  }),
  'room:join': z.object({ code: roomCode, nickname, avatar: animalId }),
  'room:rejoin': z.object({
    code: roomCode,
    sessionToken: z.string().check(z.minLength(16), z.maxLength(128)),
  }),
  'room:leave': empty,
  'room:updateSettings': z.partial(settingsSchema),
  'room:kick': z.object({ playerId: id }),
  'game:start': empty,
  'role:confirm': empty,
  'role:force': empty,
  'turn:done': empty,
  'discussion:skip': empty,
  'vote:cast': z.object({ targetId: id }),
  'guess:submit': z.object({
    optionIndex: z.number().check(z.int(), z.minimum(0), z.maximum(GUESS_OPTIONS - 1)),
  }),
  'round:continue': empty,
  'game:replay': empty,
  'tv:watch': z.object({ code: roomCode }),
  'clock:ping': z.object({ t0: z.number() }),
} as const;

export type C2SPayloads = { [K in keyof typeof C2SSchemas]: z.infer<(typeof C2SSchemas)[K]> };

/** Acknowledgement payloads for the events that return data. */
export type CreateAck = { code: string; playerId: string; sessionToken: string };
export type JoinAck = { code: string; playerId: string; sessionToken: string };
export type RejoinAck = { playerId: string };
export type ClockAck = { t0: number; serverNow: number };

// ── server → client: the projected views (mirror game-core/projection.ts) ────────────────────

const role = z.nullable(z.enum(['civilian', 'imposter']));
const team = z.enum(['civilians', 'imposters']);
const phase = z.enum([
  'LOBBY',
  'ROLE_REVEAL',
  'CLUE_TURNS',
  'DISCUSSION',
  'VOTING',
  'VOTE_REVEAL',
  'IMPOSTER_GUESS',
  'ROUND_RESULT',
  'SCOREBOARD',
]);

const publicPlayer = z.object({
  id,
  name: z.string(),
  animal: animalId,
  seat: z.number().check(z.int(), z.minimum(0), z.maximum(MAX_PLAYERS)),
  isHost: z.boolean(),
  connected: z.boolean(),
  absent: z.boolean(),
  waiting: z.boolean(),
  inGame: z.boolean(),
  eliminated: z.boolean(),
  role,
  score: z.number(),
  confirmed: z.boolean(),
  voted: z.boolean(),
});

const voteReveal = z.object({
  tally: z.record(z.string(), z.number()),
  eliminatedId: z.nullable(z.string()),
  eliminatedRole: role,
  tie: z.boolean(),
  candidates: z.array(z.string()),
  noElimination: z.boolean(),
});

const publicRound = z.object({
  number: z.number(),
  mode: z.enum(['A', 'B']),
  imposterCount: z.number(),
  speakingOrder: z.array(z.string()),
  turnIndex: z.number(),
  currentSpeakerId: z.nullable(z.string()),
  lap: z.number(),
  totalLaps: z.number(),
  votesCast: z.number(),
  votersTotal: z.number(),
  revoteCandidates: z.nullable(z.array(z.string())),
  reveal: z.nullable(voteReveal),
  guess: z.nullable(z.object({ guesserId: z.string(), correct: z.nullable(z.boolean()) })),
  result: z.nullable(
    z.object({
      winner: team,
      reason: z.enum([
        'imposter-hidden',
        'no-elimination',
        'guessed-word',
        'missed-word',
        'all-imposters-out',
        'imposters-outnumber',
        'stalemate',
      ]),
      category: categoryId,
      wordA: z.string(),
      wordB: z.nullable(z.string()),
      imposterIds: z.array(z.string()),
      points: z.record(z.string(), z.number()),
    }),
  ),
});

const secret = z.nullable(
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('word'), word: z.string(), category: z.nullable(categoryId) }),
    z.object({ kind: z.literal('imposter'), category: z.nullable(categoryId) }),
  ]),
);

const publicView = {
  code: roomCode,
  phase,
  phaseStartedAt: z.number(),
  deadline: z.nullable(z.number()),
  hostId: z.string(),
  settings: settingsSchema,
  players: z.array(publicPlayer),
  round: z.nullable(publicRound),
  gamesPlayed: z.number(),
  notice: z.nullable(z.literal('round-voided')),
  titles: z.nullable(
    z.object({
      liar: z.nullable(z.string()),
      detective: z.nullable(z.string()),
      victim: z.nullable(z.string()),
    }),
  ),
};

export const playerViewSchema = z.object({
  ...publicView,
  me: z.object({
    id,
    isHost: z.boolean(),
    secret,
    myVote: z.nullable(z.string()),
    guessOptions: z.nullable(z.array(z.string())),
    guessChoice: z.nullable(z.number()),
  }),
});

export const tvViewSchema = z.object({ ...publicView, me: z.null() });

/** `state:sync` payload: `serverNow` lets the client keep its clock offset fresh. */
export const stateSyncSchema = z.object({
  rev: z.number(),
  serverNow: z.number(),
  view: z.union([playerViewSchema, tvViewSchema]),
});

export type StateSync = z.infer<typeof stateSyncSchema>;
