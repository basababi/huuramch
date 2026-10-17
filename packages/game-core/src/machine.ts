import {
  CLUE_LAPS,
  DURATIONS,
  MAX_PLAYERS,
  MAX_ROUNDS_WITHOUT_ELIMINATION,
  MIN_PLAYERS,
  POINTS,
  TIMER_PRESETS,
} from './constants';
import { checkName, dedupeName } from './names';
import {
  emptyStats,
  findPlayer,
  isAbsent,
  migrateHostIfNeeded,
  nextSeat,
  removePlayer,
} from './players';
import { shuffle } from './rng';
import { DEFAULT_SETTINGS, imposterCountFor, mergeSettings } from './settings';
import type {
  Action,
  GameErrorCode,
  GameEvent,
  NewPlayer,
  Phase,
  Player,
  PlayerStats,
  ReduceResult,
  Result,
  RoomSettings,
  RoomState,
  Rng,
  Round,
  Team,
  VoteReveal,
} from './types';
import { categoryWords, guessOptions, pickPair } from './words';

/** Phases in which a game is being played (a disconnecting imposter voids it, §2.5). */
export const ACTIVE_PHASES: readonly Phase[] = [
  'ROLE_REVEAL',
  'CLUE_TURNS',
  'DISCUSSION',
  'VOTING',
  'VOTE_REVEAL',
  'IMPOSTER_GUESS',
];

type Ctx = { s: RoomState; now: number; rng: Rng; events: GameEvent[] };

function newPlayer(
  input: NewPlayer,
  name: string,
  seat: number,
  now: number,
  waiting: boolean,
): Player {
  return {
    id: input.id,
    name,
    animal: input.animal,
    seat,
    joinedAt: now,
    connected: true,
    disconnectedAt: null,
    left: false,
    waiting,
    score: 0,
    stats: emptyStats(),
  };
}

/** Creates a room with its host in the lobby. */
export function createRoom(input: {
  code: string;
  host: NewPlayer;
  now: number;
  settings?: Partial<RoomSettings>;
}): { ok: true; state: RoomState } | { ok: false; error: GameErrorCode } {
  const name = checkName(input.host.name);
  if (!name.ok) return { ok: false, error: 'NAME_INVALID' };
  const settings = mergeSettings(DEFAULT_SETTINGS, input.settings ?? {});
  if (!settings) return { ok: false, error: 'INVALID_SETTINGS' };
  return {
    ok: true,
    state: {
      code: input.code,
      hostId: input.host.id,
      settings,
      players: [newPlayer(input.host, name.name, 0, input.now, false)],
      phase: 'LOBBY',
      phaseStartedAt: input.now,
      deadline: null,
      round: null,
      gamesPlayed: 0,
      usedPairIds: [],
      notice: null,
      lastActivityAt: input.now,
    },
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────

function enterPhase({ s, now }: Ctx, phase: Phase, durationMs: number | null): void {
  s.phase = phase;
  s.phaseStartedAt = now;
  s.deadline = durationMs === null ? null : now + durationMs;
}

function round(ctx: Ctx): Round {
  return ctx.s.round as Round;
}

function isAlive(r: Round, id: string): boolean {
  return r.participants.includes(id) && !r.eliminated.includes(id);
}

function statsFor(r: Round, id: string): PlayerStats {
  r.stats[id] ??= emptyStats();
  return r.stats[id];
}

function addPoints(r: Round, id: string, points: number, asImposter: boolean): void {
  r.points[id] = (r.points[id] ?? 0) + points;
  if (asImposter) statsFor(r, id).imposterPoints += points;
}

/** Still taking part: alive in this game and not gone for good. */
function present(ctx: Ctx, id: string): boolean {
  const p = findPlayer(ctx.s, id);
  return p !== undefined && !isAbsent(p, ctx.now);
}

export function currentSpeakerId(r: Round): string | null {
  if (r.speakingOrder.length === 0) return null;
  return r.speakingOrder[r.turnIndex % r.speakingOrder.length] ?? null;
}

function totalTurns(r: Round): number {
  return r.speakingOrder.length * r.totalLaps;
}

// ── phase transitions ────────────────────────────────────────────────────────────────────────

function beginTurnOrDiscussion(ctx: Ctx): void {
  const r = round(ctx);
  while (r.turnIndex < totalTurns(r) && !present(ctx, currentSpeakerId(r) as string)) {
    r.turnIndex++;
  }
  if (r.turnIndex >= totalTurns(r)) {
    enterPhase(ctx, 'DISCUSSION', TIMER_PRESETS[ctx.s.settings.timerPreset].discussionMs);
    return;
  }
  const turnMs = TIMER_PRESETS[ctx.s.settings.timerPreset].turnMs;
  enterPhase(ctx, 'CLUE_TURNS', ctx.s.settings.turnTimer ? turnMs : null);
}

function startClueTurns(ctx: Ctx): void {
  const r = round(ctx);
  r.turnIndex = 0;
  r.reveal = null;
  r.guess = null;
  if (r.mode === 'B') {
    r.speakingOrder = shuffle(
      r.participants.filter((id) => isAlive(r, id)),
      ctx.rng,
    );
  }
  beginTurnOrDiscussion(ctx);
}

function startVoting(ctx: Ctx): void {
  round(ctx).votes = {};
  enterPhase(ctx, 'VOTING', DURATIONS.votingMs);
}

/** Alive participants who have not left: the people a vote waits for. */
function voters(ctx: Ctx): string[] {
  const r = round(ctx);
  return r.participants.filter((id) => isAlive(r, id) && present(ctx, id));
}

function resolveVote(ctx: Ctx): void {
  const r = round(ctx);
  const tally: Record<string, number> = {};
  for (const [voter, target] of Object.entries(r.votes)) {
    tally[target] = (tally[target] ?? 0) + 1;
    if (r.imposters.includes(target) && !r.imposters.includes(voter)) {
      statsFor(r, voter).correctVotes += 1;
    }
  }
  const top = Math.max(0, ...Object.values(tally));
  const leaders = r.participants.filter((id) => top > 0 && tally[id] === top);
  const reveal: VoteReveal = {
    tally,
    eliminatedId: null,
    eliminatedRole: null,
    tie: false,
    candidates: [],
    noElimination: false,
  };

  if (leaders.length === 1) {
    const id = leaders[0] as string;
    const imposter = r.imposters.includes(id);
    r.eliminated.push(id);
    reveal.eliminatedId = id;
    reveal.eliminatedRole = imposter ? 'imposter' : 'civilian';
    if (imposter) {
      for (const [voter, target] of Object.entries(r.votes)) {
        if (target === id && !r.imposters.includes(voter))
          addPoints(r, voter, POINTS.correctVote, false);
      }
    } else {
      statsFor(r, id).civilianEliminations += 1;
    }
    r.revoteCandidates = null;
    r.roundsWithoutElimination = 0;
  } else if (leaders.length > 1 && r.revoteCandidates === null) {
    // §2.2.5: one re-vote between the tied players only.
    reveal.tie = true;
    reveal.candidates = leaders;
    r.revoteCandidates = leaders;
  } else {
    reveal.noElimination = true;
    r.revoteCandidates = null;
    r.roundsWithoutElimination += 1;
  }
  r.reveal = reveal;
  enterPhase(ctx, 'VOTE_REVEAL', DURATIONS.revealMs);
}

function startGuess(ctx: Ctx, guesserId: string): void {
  const r = round(ctx);
  r.guess = {
    guesserId,
    options: guessOptions(r.wordA, r.mode === 'B' ? [r.wordB] : [], r.categoryWords, ctx.rng),
    choice: null,
    correct: null,
  };
  enterPhase(ctx, 'IMPOSTER_GUESS', DURATIONS.guessMs);
}

function resolveGuess(ctx: Ctx, choice: number | null): void {
  const r = round(ctx);
  const guess = r.guess as NonNullable<Round['guess']>;
  guess.choice = choice;
  guess.correct = choice !== null && guess.options[choice] === r.wordA;
  if (guess.correct) addPoints(r, guess.guesserId, POINTS.correctGuess, true);
  // Stay on the guess screen briefly so everyone sees the outcome.
  enterPhase(ctx, 'IMPOSTER_GUESS', DURATIONS.guessResultMs);
}

function finish(ctx: Ctx, winner: Team, reason: Result['reason']): void {
  const { s, now } = ctx;
  const r = round(ctx);
  r.result = { winner, reason };
  if (winner === 'imposters') {
    for (const id of r.imposters) {
      if (!r.eliminated.includes(id)) addPoints(r, id, POINTS.imposterSurvives, true);
    }
  } else {
    for (const id of r.participants) {
      if (!r.imposters.includes(id) && !r.eliminated.includes(id)) {
        addPoints(r, id, POINTS.civilianTeamWin, false);
      }
    }
  }
  // Points and stats land only now: a voided game earns nothing.
  for (const p of s.players) {
    p.score += r.points[p.id] ?? 0;
    const delta = r.stats[p.id];
    if (delta) {
      p.stats.imposterPoints += delta.imposterPoints;
      p.stats.correctVotes += delta.correctVotes;
      p.stats.civilianEliminations += delta.civilianEliminations;
    }
  }
  ctx.events.push({
    type: 'round_completed',
    mode: r.mode,
    winner,
    durationMs: now - r.startedAt,
    players: r.participants.length,
  });
  enterPhase(ctx, 'ROUND_RESULT', null);
}

/** After an elimination (or a vote with none): end the game or play another lap (Mode B). */
function decide(ctx: Ctx): void {
  const r = round(ctx);
  if (r.mode === 'A') {
    finish(ctx, 'imposters', r.reveal?.noElimination ? 'no-elimination' : 'imposter-hidden');
    return;
  }
  const imposters = r.imposters.filter((id) => !r.eliminated.includes(id)).length;
  const civilians = r.participants.filter(
    (id) => !r.imposters.includes(id) && !r.eliminated.includes(id),
  ).length;
  if (imposters === 0) finish(ctx, 'civilians', 'all-imposters-out');
  else if (imposters >= civilians) finish(ctx, 'imposters', 'imposters-outnumber');
  else if (r.roundsWithoutElimination >= MAX_ROUNDS_WITHOUT_ELIMINATION) {
    finish(ctx, 'imposters', 'stalemate');
  } else startClueTurns(ctx);
}

function afterReveal(ctx: Ctx): void {
  const reveal = round(ctx).reveal as VoteReveal;
  if (reveal.tie) startVoting(ctx);
  else if (reveal.eliminatedRole === 'imposter') startGuess(ctx, reveal.eliminatedId as string);
  else decide(ctx);
}

function afterGuess(ctx: Ctx): void {
  const r = round(ctx);
  if (r.mode === 'A') {
    if (r.guess?.correct) finish(ctx, 'imposters', 'guessed-word');
    else finish(ctx, 'civilians', 'missed-word');
    return;
  }
  decide(ctx);
}

/** Back to the lobby: people who are gone are removed, late joiners become players. */
function toLobby(ctx: Ctx): void {
  const { s, now } = ctx;
  s.round = null;
  for (const p of [...s.players]) if (isAbsent(p, now)) removePlayer(s, p.id, now);
  for (const p of s.players) p.waiting = false;
  enterPhase(ctx, 'LOBBY', null);
  migrateHostIfNeeded(s, now);
}

/** Moves things along when nobody is left to wait for. */
function checkProgress(ctx: Ctx): void {
  const { s } = ctx;
  if (!s.round) return;
  const r = s.round;
  if (s.phase === 'ROLE_REVEAL') {
    const pending = r.participants.filter((id) => present(ctx, id) && !r.confirmed.includes(id));
    if (pending.length === 0) startClueTurns(ctx);
  } else if (s.phase === 'CLUE_TURNS') {
    if (!present(ctx, currentSpeakerId(r) as string)) beginTurnOrDiscussion(ctx);
  } else if (s.phase === 'VOTING') {
    const waiting = voters(ctx);
    if (waiting.length > 0 && waiting.every((id) => id in r.votes)) resolveVote(ctx);
  }
}

/** Grace-period expiry: lobby clean-up, void the game if an imposter is gone (§2.5). */
function processAbsences(ctx: Ctx): void {
  const { s, now } = ctx;
  for (const p of [...s.players]) {
    if (!isAbsent(p, now)) continue;
    if (s.phase === 'LOBBY') {
      removePlayer(s, p.id, now);
    } else if (ACTIVE_PHASES.includes(s.phase) && s.round) {
      const r = s.round;
      if (r.imposters.includes(p.id) && !r.eliminated.includes(p.id)) {
        ctx.events.push({ type: 'round_voided' });
        s.notice = 'round-voided';
        toLobby(ctx);
        processAbsences(ctx);
        return;
      }
    }
  }
  migrateHostIfNeeded(s, now);
  checkProgress(ctx);
}

function onTimeout(ctx: Ctx): void {
  const { s } = ctx;
  switch (s.phase) {
    case 'ROLE_REVEAL':
      startClueTurns(ctx);
      break;
    case 'CLUE_TURNS':
      round(ctx).turnIndex += 1;
      beginTurnOrDiscussion(ctx);
      break;
    case 'DISCUSSION':
      startVoting(ctx);
      break;
    case 'VOTING':
      resolveVote(ctx);
      break;
    case 'VOTE_REVEAL':
      afterReveal(ctx);
      break;
    case 'IMPOSTER_GUESS':
      if (round(ctx).guess?.correct === null) resolveGuess(ctx, null);
      else afterGuess(ctx);
      break;
    default:
      s.deadline = null;
  }
}

// ── actions ──────────────────────────────────────────────────────────────────────────────────

function requireHost(ctx: Ctx, by: string): GameErrorCode | null {
  return ctx.s.hostId === by ? null : 'NOT_HOST';
}

function requirePhase(ctx: Ctx, phase: Phase): GameErrorCode | null {
  return ctx.s.phase === phase ? null : 'INVALID_PHASE';
}

function apply(ctx: Ctx, action: Action): GameErrorCode | null {
  const { s, now, rng } = ctx;
  switch (action.type) {
    case 'JOIN': {
      const name = checkName(action.player.name);
      if (!name.ok) return 'NAME_INVALID';
      if (findPlayer(s, action.player.id)) return 'NOT_ALLOWED';
      if (s.players.length >= MAX_PLAYERS) return 'ROOM_FULL';
      if (s.players.some((p) => p.animal === action.player.animal)) return 'AVATAR_TAKEN';
      const unique = dedupeName(
        name.name,
        s.players.map((p) => p.name),
      );
      s.players.push(
        newPlayer(action.player, unique, nextSeat(s.players), now, s.phase !== 'LOBBY'),
      );
      return null;
    }

    case 'LEAVE': {
      const p = findPlayer(s, action.playerId);
      if (!p) return 'NOT_A_PLAYER';
      const playing = s.round?.participants.includes(p.id) ?? false;
      if (s.phase === 'LOBBY' || !playing) {
        removePlayer(s, p.id, now);
      } else {
        // Mid-game or on the results: keep the seat (and score) until the room is back in the lobby.
        p.left = true;
        p.connected = false;
        p.disconnectedAt = now;
      }
      processAbsences(ctx);
      return null;
    }

    case 'DISCONNECT': {
      const p = findPlayer(s, action.playerId);
      if (!p) return 'NOT_A_PLAYER';
      p.connected = false;
      p.disconnectedAt = now;
      return null;
    }

    case 'RECONNECT': {
      const p = findPlayer(s, action.playerId);
      if (!p) return 'NOT_A_PLAYER';
      if (p.left) return 'NOT_ALLOWED';
      p.connected = true;
      p.disconnectedAt = null;
      return null;
    }

    case 'KICK': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'LOBBY');
      if (error) return error;
      if (action.playerId === action.by || !findPlayer(s, action.playerId)) return 'INVALID_TARGET';
      removePlayer(s, action.playerId, now);
      return null;
    }

    case 'UPDATE_SETTINGS': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'LOBBY');
      if (error) return error;
      const next = mergeSettings(s.settings, action.settings);
      if (!next) return 'INVALID_SETTINGS';
      s.settings = next;
      return null;
    }

    case 'START_GAME': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'LOBBY');
      if (error) return error;
      const ready = s.players.filter((p) => p.connected && !isAbsent(p, now)).map((p) => p.id);
      if (ready.length < MIN_PLAYERS) return 'NOT_ENOUGH_PLAYERS';
      const picked = pickPair(action.pool, s.settings.categories, s.usedPairIds, rng);
      if (!picked) return 'NO_CONTENT';
      const { pair } = picked;
      const imposterCount = imposterCountFor(ready.length, s.settings.imposterCount);
      const imposters = shuffle(ready, rng).slice(0, imposterCount);
      for (const p of s.players) p.waiting = !ready.includes(p.id);
      s.gamesPlayed += 1;
      s.usedPairIds = picked.used;
      s.notice = null;
      s.round = {
        number: s.gamesPlayed,
        mode: s.settings.mode,
        pairId: pair.id,
        category: pair.category,
        wordA: pair.a,
        wordB: pair.b,
        categoryWords: categoryWords(action.pool, pair.category),
        participants: ready,
        imposters,
        eliminated: [],
        confirmed: [],
        speakingOrder: shuffle(ready, rng),
        turnIndex: 0,
        totalLaps: CLUE_LAPS[s.settings.mode],
        votes: {},
        revoteCandidates: null,
        reveal: null,
        guess: null,
        result: null,
        roundsWithoutElimination: 0,
        points: {},
        stats: {},
        startedAt: now,
      };
      ctx.events.push({
        type: 'game_started',
        mode: s.settings.mode,
        players: ready.length,
        imposters: imposterCount,
        categories: [...s.settings.categories],
      });
      enterPhase(ctx, 'ROLE_REVEAL', DURATIONS.roleRevealMs);
      return null;
    }

    case 'CONFIRM_ROLE': {
      const error = requirePhase(ctx, 'ROLE_REVEAL');
      if (error) return error;
      const r = round(ctx);
      if (!r.participants.includes(action.playerId)) return 'NOT_ALLOWED';
      if (!r.confirmed.includes(action.playerId)) r.confirmed.push(action.playerId);
      checkProgress(ctx);
      return null;
    }

    case 'FORCE_ROLES': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'ROLE_REVEAL');
      if (error) return error;
      if (now - s.phaseStartedAt < DURATIONS.roleForceAfterMs) return 'NOT_ALLOWED';
      startClueTurns(ctx);
      return null;
    }

    case 'TURN_DONE': {
      const error = requirePhase(ctx, 'CLUE_TURNS');
      if (error) return error;
      const r = round(ctx);
      if (action.by !== currentSpeakerId(r) && action.by !== s.hostId) return 'NOT_YOUR_TURN';
      r.turnIndex += 1;
      beginTurnOrDiscussion(ctx);
      return null;
    }

    case 'SKIP_DISCUSSION': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'DISCUSSION');
      if (error) return error;
      startVoting(ctx);
      return null;
    }

    case 'CAST_VOTE': {
      const error = requirePhase(ctx, 'VOTING');
      if (error) return error;
      const r = round(ctx);
      const { playerId, targetId } = action;
      if (!isAlive(r, playerId) || !present(ctx, playerId)) return 'NOT_ALLOWED';
      if (playerId in r.votes) return 'ALREADY_VOTED';
      if (
        targetId === playerId ||
        !isAlive(r, targetId) ||
        (r.revoteCandidates !== null && !r.revoteCandidates.includes(targetId))
      ) {
        return 'INVALID_TARGET';
      }
      r.votes[playerId] = targetId;
      checkProgress(ctx);
      return null;
    }

    case 'SUBMIT_GUESS': {
      const error = requirePhase(ctx, 'IMPOSTER_GUESS');
      if (error) return error;
      const guess = round(ctx).guess as NonNullable<Round['guess']>;
      if (guess.correct !== null) return 'INVALID_PHASE';
      if (action.playerId !== guess.guesserId) return 'NOT_ALLOWED';
      if (
        !Number.isInteger(action.optionIndex) ||
        action.optionIndex < 0 ||
        action.optionIndex >= guess.options.length
      ) {
        return 'INVALID_TARGET';
      }
      resolveGuess(ctx, action.optionIndex);
      return null;
    }

    case 'CONTINUE': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'ROUND_RESULT');
      if (error) return error;
      enterPhase(ctx, 'SCOREBOARD', null);
      return null;
    }

    case 'REPLAY': {
      const error = requireHost(ctx, action.by) ?? requirePhase(ctx, 'SCOREBOARD');
      if (error) return error;
      ctx.events.push({ type: 'game_replayed' });
      toLobby(ctx);
      return null;
    }

    case 'TICK': {
      processAbsences(ctx);
      if (s.deadline !== null && now >= s.deadline) onTimeout(ctx);
      return null;
    }
  }
}

/**
 * The game: a pure transition `(state, action, now, rng) => state` (CLAUDE.md §3.1).
 * Invalid actions leave the state untouched and return a typed error.
 */
export function reduce(state: RoomState, action: Action, now: number, rng: Rng): ReduceResult {
  const ctx: Ctx = { s: structuredClone(state), now, rng, events: [] };
  const error = apply(ctx, action);
  if (error) return { ok: false, error, state };
  if (action.type !== 'TICK') ctx.s.lastActivityAt = now;
  return { ok: true, state: ctx.s, events: ctx.events };
}

/** When the server should send the next TICK: the phase deadline or a grace-period expiry. */
export function nextWakeAt(state: RoomState): number | null {
  const times: number[] = [];
  if (state.deadline !== null) times.push(state.deadline);
  for (const p of state.players) {
    if (!p.connected && !p.left && p.disconnectedAt !== null) {
      times.push(p.disconnectedAt + DURATIONS.graceMs);
    }
  }
  return times.length ? Math.min(...times) : null;
}
