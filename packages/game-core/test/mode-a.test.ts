import { describe, expect, it } from 'vitest';
import { DURATIONS, POINTS, TIMER_PRESETS } from '../src/constants';
import {
  act,
  alive,
  civilians,
  confirmAll,
  everyoneVotes,
  expire,
  finishTurns,
  guessIndex,
  imposters,
  lobby,
  reject,
  round,
  start,
  tick,
  toVoting,
} from './helpers';

const score = (game: ReturnType<typeof lobby>, id: string) =>
  game.state.players.find((p) => p.id === id)?.score ?? NaN;

describe('Mode A — role reveal', () => {
  it('starts clue turns once everyone confirmed "Ойлголоо"', () => {
    const game = start(lobby(4));
    const [first, ...rest] = round(game).participants;
    act(game, { type: 'CONFIRM_ROLE', playerId: first as string });
    act(game, { type: 'CONFIRM_ROLE', playerId: first as string }); // idempotent
    expect(game.state.phase).toBe('ROLE_REVEAL');
    for (const id of rest) act(game, { type: 'CONFIRM_ROLE', playerId: id });
    expect(game.state.phase).toBe('CLUE_TURNS');
  });

  it('lets the host force the start only after 30s, and moves on alone after 60s', () => {
    const game = start(lobby(4));
    reject(game, { type: 'FORCE_ROLES', by: 'p0' }, 'NOT_ALLOWED');
    reject(game, { type: 'FORCE_ROLES', by: 'p1' }, 'NOT_HOST');
    tick(game, DURATIONS.roleForceAfterMs);
    act(game, { type: 'FORCE_ROLES', by: 'p0' });
    expect(game.state.phase).toBe('CLUE_TURNS');

    const other = start(lobby(4));
    expire(other);
    expect(other.state.phase).toBe('CLUE_TURNS');
  });

  it('rejects confirmations from spectators and outside the reveal', () => {
    const game = start(lobby(3));
    act(game, { type: 'JOIN', player: { id: 'late', name: 'Оройтсон', animal: 'irves' } });
    reject(game, { type: 'CONFIRM_ROLE', playerId: 'late' }, 'NOT_ALLOWED');
    confirmAll(game);
    reject(game, { type: 'CONFIRM_ROLE', playerId: 'p0' }, 'INVALID_PHASE');
  });
});

describe('Mode A — clue turns', () => {
  it('runs two laps in one random order, then discussion (§2.2.3)', () => {
    const game = confirmAll(start(lobby(4)));
    const order = [...round(game).speakingOrder];
    const spoken: string[] = [];
    while (game.state.phase === 'CLUE_TURNS') {
      const r = round(game);
      const speaker = r.speakingOrder[r.turnIndex % r.speakingOrder.length] as string;
      spoken.push(speaker);
      act(game, { type: 'TURN_DONE', by: speaker });
    }
    expect(spoken).toEqual([...order, ...order]);
    expect(game.state.phase).toBe('DISCUSSION');
    expect(game.state.deadline).toBe(game.now + TIMER_PRESETS.normal.discussionMs);
  });

  it('only the speaker or the host can end a turn', () => {
    const game = confirmAll(start(lobby(4)));
    const r = round(game);
    const speaker = r.speakingOrder[0] as string;
    const bystander = r.participants.find((id) => id !== speaker && id !== 'p0') as string;
    reject(game, { type: 'TURN_DONE', by: bystander }, 'NOT_YOUR_TURN');
    act(game, { type: 'TURN_DONE', by: 'p0' });
    expect(round(game).turnIndex).toBe(1);
  });

  it('times each turn when the turn timer is on, and waits forever when it is off', () => {
    const timed = confirmAll(start(lobby(3, { timerPreset: 'fast' })));
    expect(timed.state.deadline).toBe(timed.now + TIMER_PRESETS.fast.turnMs);
    expire(timed);
    expect(round(timed).turnIndex).toBe(1);

    const untimed = confirmAll(start(lobby(3, { turnTimer: false })));
    expect(untimed.state.deadline).toBeNull();
  });

  it('rejects turn actions in other phases', () => {
    const game = start(lobby(3));
    reject(game, { type: 'TURN_DONE', by: 'p0' }, 'INVALID_PHASE');
    reject(game, { type: 'SKIP_DISCUSSION', by: 'p0' }, 'INVALID_PHASE');
  });
});

describe('Mode A — discussion and voting', () => {
  it('host-only skip, or the timer, moves discussion to voting', () => {
    const game = finishTurns(confirmAll(start(lobby(3))));
    reject(game, { type: 'SKIP_DISCUSSION', by: 'p1' }, 'NOT_HOST');
    expire(game);
    expect(game.state.phase).toBe('VOTING');
    expect(game.state.deadline).toBe(game.now + DURATIONS.votingMs);
  });

  it('validates votes: no self votes, one vote each, only alive players', () => {
    const game = toVoting(start(lobby(4)));
    const [a, b] = round(game).participants as [string, string];
    reject(game, { type: 'CAST_VOTE', playerId: a, targetId: a }, 'INVALID_TARGET');
    reject(game, { type: 'CAST_VOTE', playerId: a, targetId: 'ghost' }, 'INVALID_TARGET');
    reject(game, { type: 'CAST_VOTE', playerId: 'ghost', targetId: a }, 'NOT_ALLOWED');
    act(game, { type: 'CAST_VOTE', playerId: a, targetId: b });
    reject(game, { type: 'CAST_VOTE', playerId: a, targetId: b }, 'ALREADY_VOTED');
  });

  it('resolves as soon as everyone has voted', () => {
    const game = toVoting(start(lobby(4)));
    everyoneVotes(game, civilians(game)[0] as string);
    expect(game.state.phase).toBe('VOTE_REVEAL');
  });

  it('treats non-voters as abstaining when the 30s run out', () => {
    const game = toVoting(start(lobby(5)));
    const target = civilians(game)[0] as string;
    const voters = alive(game)
      .filter((id) => id !== target)
      .slice(0, 2);
    for (const v of voters) act(game, { type: 'CAST_VOTE', playerId: v, targetId: target });
    expire(game);
    expect(round(game).reveal).toMatchObject({ eliminatedId: target, tally: { [target]: 2 } });
  });
});

describe('Mode A — outcomes and scoring (§2.2.7, §2.4)', () => {
  it('imposter not caught → imposter wins (+3)', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    const victim = civilians(game)[0] as string;
    everyoneVotes(game, victim);
    expect(round(game).reveal).toMatchObject({ eliminatedId: victim, eliminatedRole: 'civilian' });
    expire(game);
    expect(game.state.phase).toBe('ROUND_RESULT');
    expect(round(game).result).toEqual({ winner: 'imposters', reason: 'imposter-hidden' });
    expect(score(game, imp)).toBe(POINTS.imposterSurvives);
    expect(game.state.players.find((p) => p.id === victim)?.stats.civilianEliminations).toBe(1);
  });

  it('imposter caught and guesses right → imposter wins; voters still get +1', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, imp);
    expect(round(game).reveal).toMatchObject({ eliminatedId: imp, eliminatedRole: 'imposter' });
    expire(game);
    expect(game.state.phase).toBe('IMPOSTER_GUESS');
    expect(round(game).guess?.options).toHaveLength(8);
    expect(round(game).guess?.options).toContain(round(game).wordA);
    act(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: guessIndex(game, true) });
    expect(round(game).guess?.correct).toBe(true);
    expect(game.state.phase).toBe('IMPOSTER_GUESS');
    expire(game);
    expect(round(game).result).toEqual({ winner: 'imposters', reason: 'guessed-word' });
    expect(score(game, imp)).toBe(POINTS.correctGuess);
    for (const c of civilians(game)) expect(score(game, c)).toBe(POINTS.correctVote);
  });

  it('imposter caught and guesses wrong → civilians win: +1 vote, +1 team', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, imp);
    expire(game);
    act(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: guessIndex(game, false) });
    expire(game);
    expect(round(game).result).toEqual({ winner: 'civilians', reason: 'missed-word' });
    expect(score(game, imp)).toBe(0);
    for (const c of civilians(game))
      expect(score(game, c)).toBe(POINTS.correctVote + POINTS.civilianTeamWin);
  });

  it('an unanswered guess counts as wrong after 20s', () => {
    const game = toVoting(start(lobby(3)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, imp);
    expire(game);
    expire(game);
    expect(round(game).guess).toMatchObject({ choice: null, correct: false });
    expire(game);
    expect(round(game).result?.winner).toBe('civilians');
  });

  it('only the eliminated imposter guesses, once, with a valid option', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, imp);
    expire(game);
    reject(
      game,
      { type: 'SUBMIT_GUESS', playerId: civilians(game)[0] as string, optionIndex: 0 },
      'NOT_ALLOWED',
    );
    reject(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: 8 }, 'INVALID_TARGET');
    reject(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: -1 }, 'INVALID_TARGET');
    act(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: 0 });
    reject(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: 1 }, 'INVALID_PHASE');
  });

  it('a tie triggers one re-vote between the tied players only', () => {
    const game = toVoting(start(lobby(4)));
    const [x, y, z, w] = round(game).participants as [string, string, string, string];
    act(game, { type: 'CAST_VOTE', playerId: x, targetId: y });
    act(game, { type: 'CAST_VOTE', playerId: y, targetId: x });
    act(game, { type: 'CAST_VOTE', playerId: z, targetId: x });
    act(game, { type: 'CAST_VOTE', playerId: w, targetId: y });
    expect(round(game).reveal).toMatchObject({
      tie: true,
      candidates: expect.arrayContaining([x, y]),
    });
    expire(game);
    expect(game.state.phase).toBe('VOTING');
    expect(round(game).revoteCandidates?.sort()).toEqual([x, y].sort());
    reject(game, { type: 'CAST_VOTE', playerId: x, targetId: z }, 'INVALID_TARGET');
    act(game, { type: 'CAST_VOTE', playerId: x, targetId: y });
    act(game, { type: 'CAST_VOTE', playerId: z, targetId: y });
    act(game, { type: 'CAST_VOTE', playerId: w, targetId: y });
    act(game, { type: 'CAST_VOTE', playerId: y, targetId: x });
    expect(round(game).reveal).toMatchObject({ eliminatedId: y });
  });

  it('a second tie eliminates nobody and the imposter wins (§2.2.5)', () => {
    const game = toVoting(start(lobby(4)));
    const [x, y, z, w] = round(game).participants as [string, string, string, string];
    const tie = () => {
      act(game, { type: 'CAST_VOTE', playerId: x, targetId: y });
      act(game, { type: 'CAST_VOTE', playerId: y, targetId: x });
      act(game, { type: 'CAST_VOTE', playerId: z, targetId: x });
      act(game, { type: 'CAST_VOTE', playerId: w, targetId: y });
    };
    tie();
    expire(game);
    tie();
    expect(round(game).reveal).toMatchObject({ noElimination: true, eliminatedId: null });
    expire(game);
    expect(round(game).result).toEqual({ winner: 'imposters', reason: 'no-elimination' });
  });

  it('nobody voting at all eliminates nobody', () => {
    const game = toVoting(start(lobby(3)));
    expire(game);
    expect(round(game).reveal?.noElimination).toBe(true);
    expire(game);
    expect(round(game).result?.reason).toBe('no-elimination');
  });

  it('counts correct votes for the "Мөрдөгч" title', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, imp);
    expire(game);
    expire(game);
    expire(game);
    for (const c of civilians(game)) {
      expect(game.state.players.find((p) => p.id === c)?.stats.correctVotes).toBe(1);
    }
  });
});

describe('Mode A — after the game', () => {
  it('result → scoreboard → lobby keeps cumulative scores (§2.5 "Дахин тоглох")', () => {
    const game = toVoting(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    everyoneVotes(game, civilians(game)[0] as string);
    expire(game);
    reject(game, { type: 'CONTINUE', by: 'p1' }, 'NOT_HOST');
    reject(game, { type: 'REPLAY', by: 'p0' }, 'INVALID_PHASE');
    act(game, { type: 'CONTINUE', by: 'p0' });
    expect(game.state.phase).toBe('SCOREBOARD');
    act(game, { type: 'REPLAY', by: 'p0' });
    expect(game.state.phase).toBe('LOBBY');
    expect(game.state.round).toBeNull();
    expect(score(game, imp)).toBe(3);
    expect(game.events.map((e) => e.type)).toEqual([
      'game_started',
      'round_completed',
      'game_replayed',
    ]);

    start(game);
    expect(game.state.round?.number).toBe(2);
    expect(game.state.round?.pairId).not.toBe(game.state.usedPairIds[0]);
  });

  it('records the round duration for analytics', () => {
    const game = toVoting(start(lobby(3)));
    const startedAt = round(game).startedAt;
    everyoneVotes(game, civilians(game)[0] as string);
    tick(game, 1234);
    expire(game);
    const completed = game.events.find((e) => e.type === 'round_completed');
    expect(completed).toMatchObject({ mode: 'A', winner: 'imposters', players: 3 });
    expect(completed && 'durationMs' in completed && completed.durationMs).toBe(
      game.now - startedAt,
    );
  });
});
