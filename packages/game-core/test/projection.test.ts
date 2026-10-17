import { describe, expect, it } from 'vitest';
import { computeTitles, projectStateForPlayer, projectStateForTv } from '../src/projection';
import { pick, seededRng } from '../src/rng';
import type { Mode, Player, RoomState } from '../src/types';
import { act, expire, lobby, round, start, type Game } from './helpers';

/**
 * Plays a whole game with simple bots and returns every intermediate state, so each projection
 * can be checked in every phase the game actually passed through.
 */
function simulate(mode: Mode, players: number, seed: number): RoomState[] {
  const game: Game = start(lobby(players, { mode, categories: ['food', 'animals'] }, seed));
  const bots = seededRng(seed * 31 + players);
  const states: RoomState[] = [game.state];
  const lateJoiner = players < 12;
  if (lateJoiner)
    act(game, { type: 'JOIN', player: { id: 'late', name: 'Үзэгч', animal: 'burged' } });
  for (let step = 0; step < 500 && game.state.phase !== 'SCOREBOARD'; step++) {
    const s = game.state;
    const r = s.round;
    switch (s.phase) {
      case 'ROLE_REVEAL': {
        const next = r?.participants.find((id) => !r.confirmed.includes(id)) as string;
        act(game, { type: 'CONFIRM_ROLE', playerId: next });
        break;
      }
      case 'CLUE_TURNS': {
        const order = r?.speakingOrder ?? [];
        act(game, { type: 'TURN_DONE', by: order[(r?.turnIndex ?? 0) % order.length] as string });
        break;
      }
      case 'DISCUSSION':
        act(game, { type: 'SKIP_DISCUSSION', by: s.hostId });
        break;
      case 'VOTING': {
        const alive = (r?.participants ?? []).filter((id) => !r?.eliminated.includes(id));
        const voter = alive.find((id) => !(id in (r?.votes ?? {})));
        if (!voter) {
          expire(game);
          break;
        }
        const pool = (r?.revoteCandidates ?? alive).filter((id) => id !== voter);
        act(game, { type: 'CAST_VOTE', playerId: voter, targetId: pick(pool, bots) as string });
        break;
      }
      case 'IMPOSTER_GUESS':
        if (r?.guess?.correct === null && bots() < 0.8) {
          act(game, {
            type: 'SUBMIT_GUESS',
            playerId: r.guess.guesserId,
            optionIndex: Math.floor(bots() * r.guess.options.length),
          });
        } else expire(game);
        break;
      case 'VOTE_REVEAL':
        expire(game);
        break;
      case 'ROUND_RESULT':
        act(game, { type: 'CONTINUE', by: s.hostId });
        break;
    }
    states.push(game.state);
  }
  expect(game.state.phase).toBe('SCOREBOARD');
  return states;
}

const ENDED = ['ROUND_RESULT', 'SCOREBOARD'];
const CASES: Array<[Mode, number]> = [];
for (const mode of ['A', 'B'] as Mode[]) for (const n of [3, 4, 5, 7, 9, 12]) CASES.push([mode, n]);

describe.each(CASES)('no leaks — Mode %s with %i players (§3.1)', (mode, players) => {
  for (const seed of [1, 2, 3, 4]) {
    it(`seed ${seed}: nobody sees another player's word or role before the reveal`, () => {
      for (const state of simulate(mode, players, seed)) {
        const r = state.round;
        if (!r) continue;
        const ended = ENDED.includes(state.phase);
        const now = state.phaseStartedAt;

        const tv = JSON.stringify(projectStateForTv(state, now));
        if (!ended) {
          expect(tv).not.toContain(r.wordA);
          expect(tv).not.toContain(r.wordB);
        }

        for (const p of state.players) {
          const view = projectStateForPlayer(state, p.id, now);
          const json = JSON.stringify({ ...view, me: { ...view.me, guessOptions: null } });
          const imposter = r.imposters.includes(p.id);
          const participant = r.participants.includes(p.id);

          // Roles only ever appear for eliminated players until the game ends.
          for (const other of view.players) {
            if (!ended && !r.eliminated.includes(other.id)) expect(other.role).toBeNull();
          }
          // Only the eliminated imposter receives the guess options.
          if (view.me.guessOptions) expect(r.guess?.guesserId).toBe(p.id);

          if (ended) continue;
          if (!participant) {
            expect(json).not.toContain(r.wordA);
            expect(json).not.toContain(r.wordB);
            expect(view.me.secret).toBeNull();
          } else if (mode === 'A') {
            expect(json).not.toContain(r.wordB);
            if (imposter) {
              expect(json).not.toContain(r.wordA);
              expect(view.me.secret?.kind).toBe('imposter');
            } else {
              expect(view.me.secret).toEqual({ kind: 'word', word: r.wordA, category: r.category });
            }
          } else {
            expect(json).not.toContain(imposter ? r.wordA : r.wordB);
            expect(view.me.secret).toEqual({
              kind: 'word',
              word: imposter ? r.wordB : r.wordA,
              category: null,
            });
          }
        }
      }
    });
  }
});

describe('Mode B: civilian and imposter payloads are identical in shape (§2.3.2, DoD)', () => {
  it('differs only in the word itself, in every phase of play', () => {
    for (const seed of [1, 2, 3]) {
      for (const state of simulate('B', 6, seed)) {
        const r = state.round;
        if (!r || ENDED.includes(state.phase) || state.phase === 'LOBBY') continue;
        const civilian = r.participants.find(
          (id) => !r.imposters.includes(id) && id !== state.hostId,
        );
        const imposter = r.participants.find(
          (id) => r.imposters.includes(id) && id !== state.hostId,
        );
        if (!civilian || !imposter) continue;
        const normalise = (id: string) => {
          const view = projectStateForPlayer(state, id, state.phaseStartedAt);
          const secret = view.me.secret;
          return {
            ...view,
            me: {
              ...view.me,
              id: '·',
              myVote: null,
              guessOptions: null,
              guessChoice: null,
              secret: secret && { ...secret, word: '·' },
            },
          };
        };
        expect(normalise(civilian)).toEqual(normalise(imposter));
      }
    }
  });
});

describe('projection details', () => {
  it('Mode A hides the category from the imposter when the hint is off', () => {
    const game = start(lobby(4, { showCategoryHint: false }));
    const imp = round(game).imposters[0] as string;
    expect(projectStateForPlayer(game.state, imp, game.now).me.secret).toEqual({
      kind: 'imposter',
      category: null,
    });
  });

  it('reveals both words side by side once a Mode B game ends', () => {
    const states = simulate('B', 5, 2);
    const final = states.at(-1) as RoomState;
    const view = projectStateForTv(final, final.phaseStartedAt);
    expect(view.round?.result?.wordA).toBe(final.round?.wordA);
    expect(view.round?.result?.wordB).toBe(final.round?.wordB);
    expect(view.players.filter((p) => p.inGame).every((p) => p.role !== null)).toBe(true);
    expect(view.titles).not.toBeNull();
  });

  it('shows only the word (no imposters’ word) at the end of Mode A', () => {
    const final = simulate('A', 4, 1).at(-1) as RoomState;
    expect(projectStateForTv(final, final.phaseStartedAt).round?.result?.wordB).toBeNull();
  });

  it('reports vote progress without revealing who voted for whom', () => {
    const game = start(lobby(4));
    for (const id of round(game).participants) act(game, { type: 'CONFIRM_ROLE', playerId: id });
    while (game.state.phase === 'CLUE_TURNS')
      act(game, { type: 'TURN_DONE', by: game.state.hostId });
    act(game, { type: 'SKIP_DISCUSSION', by: 'p0' });
    const [a, b] = round(game).participants as [string, string];
    act(game, { type: 'CAST_VOTE', playerId: a, targetId: b });
    const tv = projectStateForTv(game.state, game.now);
    expect(tv.round).toMatchObject({ votesCast: 1, votersTotal: 4 });
    expect(tv.players.find((p) => p.id === a)?.voted).toBe(true);
    expect(JSON.stringify(tv)).not.toContain(`"${a}":"${b}"`);
    expect(projectStateForPlayer(game.state, a, game.now).me.myVote).toBe(b);
    expect(projectStateForPlayer(game.state, b, game.now).me.myVote).toBeNull();
  });

  it('marks the current speaker only during clue turns', () => {
    const game = start(lobby(3));
    expect(projectStateForTv(game.state, game.now).round?.currentSpeakerId).toBeNull();
    for (const id of round(game).participants) act(game, { type: 'CONFIRM_ROLE', playerId: id });
    expect(projectStateForTv(game.state, game.now).round?.currentSpeakerId).toBe(
      round(game).speakingOrder[0],
    );
  });

  it('gives a lobby view without a round or secrets', () => {
    const game = lobby(3);
    const view = projectStateForPlayer(game.state, 'p1', game.now);
    expect(view.round).toBeNull();
    expect(view.me).toMatchObject({ id: 'p1', isHost: false, secret: null });
  });
});

describe('fun titles (§2.4)', () => {
  const player = (id: string, stats: Partial<Player['stats']>): Player => ({
    id,
    name: id,
    animal: 'mori',
    seat: 0,
    joinedAt: 0,
    connected: true,
    disconnectedAt: null,
    left: false,
    waiting: false,
    score: 0,
    stats: { imposterPoints: 0, correctVotes: 0, civilianEliminations: 0, ...stats },
  });

  it('picks the leader of each stat; first joiner wins ties; zero earns nothing', () => {
    expect(
      computeTitles([
        player('a', { imposterPoints: 3, correctVotes: 1 }),
        player('b', { imposterPoints: 5, correctVotes: 1 }),
        player('c', { civilianEliminations: 2 }),
      ]),
    ).toEqual({ liar: 'b', detective: 'a', victim: 'c' });
    expect(computeTitles([player('a', {})])).toEqual({ liar: null, detective: null, victim: null });
  });
});
