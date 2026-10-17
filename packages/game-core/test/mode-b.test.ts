import { describe, expect, it } from 'vitest';
import { MAX_ROUNDS_WITHOUT_ELIMINATION, POINTS } from '../src/constants';
import {
  act,
  alive,
  civilians,
  everyoneVotes,
  expire,
  guessIndex,
  imposters,
  lobby,
  round,
  start,
  toVoting,
} from './helpers';

const modeB = (count: number, seed = 7) => start(lobby(count, { mode: 'B' }, seed));
const score = (game: ReturnType<typeof lobby>, id: string) =>
  game.state.players.find((p) => p.id === id)?.score ?? NaN;

/** Eliminates `target` with everyone else's vote and plays through the reveal. */
function eliminate(game: ReturnType<typeof lobby>, target: string) {
  toVoting(game);
  everyoneVotes(game, target);
  expect(round(game).reveal?.eliminatedId).toBe(target);
  expire(game);
}

describe('Mode B — words and laps (§2.3)', () => {
  it('gives civilians word A and imposters word B, one lap per elimination round', () => {
    const game = modeB(5);
    const r = round(game);
    expect(r.wordA).not.toBe(r.wordB);
    expect(r.totalLaps).toBe(1);
  });

  it('reshuffles the speaking order among survivors every lap', () => {
    const game = modeB(6);
    eliminate(game, civilians(game)[0] as string);
    expect(game.state.phase).toBe('CLUE_TURNS');
    const order = round(game).speakingOrder;
    expect(order).toHaveLength(5);
    expect(order).not.toContain(round(game).eliminated[0]);
  });
});

describe('Mode B — end conditions', () => {
  it('civilians win once every imposter is out (§2.3.6)', () => {
    const game = modeB(5);
    const [imp] = imposters(game) as [string];
    eliminate(game, imp);
    expect(game.state.phase).toBe('IMPOSTER_GUESS');
    act(game, { type: 'SUBMIT_GUESS', playerId: imp, optionIndex: guessIndex(game, false) });
    expire(game);
    expect(round(game).result).toEqual({ winner: 'civilians', reason: 'all-imposters-out' });
    for (const c of civilians(game))
      expect(score(game, c)).toBe(POINTS.correctVote + POINTS.civilianTeamWin);
  });

  it('never offers the imposter their own word as a guess option', () => {
    const game = modeB(5);
    eliminate(game, imposters(game)[0] as string);
    expect(round(game).guess?.options).not.toContain(round(game).wordB);
    expect(round(game).guess?.options).toContain(round(game).wordA);
  });

  it('a correct guess earns the eliminated imposter +2 bonus, but the game goes on', () => {
    const game = modeB(9);
    expect(imposters(game)).toHaveLength(2);
    const [first, second] = imposters(game) as [string, string];
    eliminate(game, first);
    act(game, { type: 'SUBMIT_GUESS', playerId: first, optionIndex: guessIndex(game, true) });
    expire(game);
    expect(game.state.phase).toBe('CLUE_TURNS');
    eliminate(game, second);
    act(game, { type: 'SUBMIT_GUESS', playerId: second, optionIndex: guessIndex(game, false) });
    expire(game);
    expect(round(game).result?.winner).toBe('civilians');
    expect(score(game, first)).toBe(POINTS.correctGuess);
    expect(score(game, second)).toBe(0);
  });

  it('imposters win when they are at least as many as the civilians left', () => {
    const game = modeB(5);
    const [imp] = imposters(game) as [string];
    // 1 imposter, 4 civilians: eliminate civilians until 1 v 1.
    for (let i = 0; i < 3; i++) {
      eliminate(game, civilians(game).find((id) => alive(game).includes(id)) as string);
    }
    expect(round(game).result).toEqual({ winner: 'imposters', reason: 'imposters-outnumber' });
    expect(score(game, imp)).toBe(POINTS.imposterSurvives);
  });

  it(`ends as a stalemate after ${MAX_ROUNDS_WITHOUT_ELIMINATION} rounds without an elimination`, () => {
    const game = modeB(5);
    for (let i = 0; i < MAX_ROUNDS_WITHOUT_ELIMINATION; i++) {
      toVoting(game);
      expire(game); // nobody votes
      expect(round(game).reveal?.noElimination).toBe(true);
      expire(game);
    }
    expect(round(game).result).toEqual({ winner: 'imposters', reason: 'stalemate' });
  });

  it('a single round without elimination just plays another lap', () => {
    const game = modeB(5);
    toVoting(game);
    expire(game);
    expire(game);
    expect(game.state.phase).toBe('CLUE_TURNS');
    expect(round(game).roundsWithoutElimination).toBe(1);
    eliminate(game, civilians(game)[0] as string);
    expect(round(game).roundsWithoutElimination).toBe(0);
  });

  it('eliminated players can no longer vote or be voted for', () => {
    const game = modeB(6);
    const out = civilians(game)[0] as string;
    eliminate(game, out);
    toVoting(game);
    const voter = alive(game)[0] as string;
    expect(() => act(game, { type: 'CAST_VOTE', playerId: out, targetId: voter })).toThrow(
      'NOT_ALLOWED',
    );
    expect(() => act(game, { type: 'CAST_VOTE', playerId: voter, targetId: out })).toThrow(
      'INVALID_TARGET',
    );
  });
});
