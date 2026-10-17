import { describe, expect, it } from 'vitest';
import { DURATIONS } from '../src/constants';
import {
  act,
  civilians,
  confirmAll,
  everyoneVotes,
  expire,
  imposters,
  lobby,
  reject,
  round,
  start,
  tick,
  toVoting,
} from './helpers';

describe('disconnects mid-game (§2.5)', () => {
  it('voids the game with no points when an imposter is gone past the grace period', () => {
    const game = confirmAll(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    act(game, { type: 'DISCONNECT', playerId: imp });
    tick(game, DURATIONS.graceMs - 1);
    expect(game.state.phase).not.toBe('LOBBY');
    tick(game, 1);
    expect(game.state.phase).toBe('LOBBY');
    expect(game.state.notice).toBe('round-voided');
    expect(game.state.players.every((p) => p.score === 0)).toBe(true);
    expect(game.state.players.find((p) => p.id === imp)).toBeUndefined();
    expect(game.events.map((e) => e.type)).toContain('round_voided');
  });

  it('voids immediately when an imposter leaves on purpose', () => {
    const game = confirmAll(start(lobby(4)));
    act(game, { type: 'LEAVE', playerId: imposters(game)[0] as string });
    expect(game.state.phase).toBe('LOBBY');
    expect(game.state.players).toHaveLength(3);
  });

  it('restores everything when a phone reconnects within the grace period', () => {
    const game = confirmAll(start(lobby(4)));
    const [imp] = imposters(game) as [string];
    act(game, { type: 'DISCONNECT', playerId: imp });
    tick(game, 60_000);
    act(game, { type: 'RECONNECT', playerId: imp });
    tick(game, DURATIONS.graceMs);
    expect(game.state.phase).not.toBe('LOBBY');
    expect(round(game).imposters).toContain(imp);
  });

  it('skips the turn of a civilian who is gone, and keeps them out of the vote count', () => {
    const game = confirmAll(start(lobby(4, { turnTimer: false })));
    const r = round(game);
    const gone = civilians(game).find((id) => id !== r.speakingOrder[0]) as string;
    act(game, { type: 'LEAVE', playerId: gone });
    const spoken: string[] = [];
    while (game.state.phase === 'CLUE_TURNS') {
      const now = round(game);
      const speaker = now.speakingOrder[now.turnIndex % now.speakingOrder.length] as string;
      spoken.push(speaker);
      act(game, { type: 'TURN_DONE', by: speaker });
    }
    expect(spoken).not.toContain(gone);
    act(game, { type: 'SKIP_DISCUSSION', by: game.state.hostId });
    const target = civilians(game).find((id) => id !== gone) as string;
    for (const id of round(game).participants.filter((x) => x !== gone)) {
      act(game, {
        type: 'CAST_VOTE',
        playerId: id,
        targetId: id === target ? (imposters(game)[0] as string) : target,
      });
    }
    expect(game.state.phase).toBe('VOTE_REVEAL');
    reject(game, { type: 'RECONNECT', playerId: gone }, 'NOT_ALLOWED');
  });

  it('skips the current speaker when they drop out past the grace period', () => {
    const game = confirmAll(start(lobby(4, { turnTimer: false })));
    // Let the host move past any imposter speaker: their disconnect would void the game instead.
    while (round(game).imposters.includes(speakerOf(game))) {
      act(game, { type: 'TURN_DONE', by: game.state.hostId });
    }
    const index = round(game).turnIndex;
    act(game, { type: 'DISCONNECT', playerId: speakerOf(game) });
    tick(game, DURATIONS.graceMs);
    expect(round(game).turnIndex).toBe(index + 1);
  });

  it('confirms the role reveal without waiting for someone who left', () => {
    const game = start(lobby(4));
    const gone = civilians(game)[0] as string;
    act(game, { type: 'LEAVE', playerId: gone });
    for (const id of round(game).participants.filter((x) => x !== gone)) {
      act(game, { type: 'CONFIRM_ROLE', playerId: id });
    }
    expect(game.state.phase).toBe('CLUE_TURNS');
  });

  it('migrates the host mid-game and lets the new host drive', () => {
    const game = confirmAll(startWhere(4, (g) => !imposters(g).includes('p0')));
    act(game, { type: 'LEAVE', playerId: 'p0' });
    expect(game.state.hostId).toBe('p1');
    finishTurnsAs(game);
    act(game, { type: 'SKIP_DISCUSSION', by: 'p1' });
    expect(game.state.phase).toBe('VOTING');
  });

  it('keeps a player who leaves on the results screen until the next lobby', () => {
    const game = toVoting(start(lobby(4)));
    everyoneVotes(game, civilians(game)[0] as string);
    expire(game);
    const leaver = civilians(game)[1] as string;
    act(game, { type: 'LEAVE', playerId: leaver });
    expect(game.state.players.find((p) => p.id === leaver)?.left).toBe(true);
    act(game, { type: 'CONTINUE', by: 'p0' });
    act(game, { type: 'REPLAY', by: 'p0' });
    expect(game.state.players.find((p) => p.id === leaver)).toBeUndefined();
  });

  it('removes a spectator who leaves mid-game straight away', () => {
    const game = start(lobby(3));
    act(game, { type: 'JOIN', player: { id: 'late', name: 'Оройтсон', animal: 'irves' } });
    act(game, { type: 'LEAVE', playerId: 'late' });
    expect(game.state.players.find((p) => p.id === 'late')).toBeUndefined();
    expect(game.state.phase).toBe('ROLE_REVEAL');
  });

  it('makes late joiners regular players back in the lobby', () => {
    const game = toVoting(start(lobby(3)));
    act(game, { type: 'JOIN', player: { id: 'late', name: 'Оройтсон', animal: 'irves' } });
    everyoneVotes(game, civilians(game)[0] as string);
    expire(game);
    act(game, { type: 'CONTINUE', by: 'p0' });
    act(game, { type: 'REPLAY', by: 'p0' });
    expect(game.state.players.find((p) => p.id === 'late')?.waiting).toBe(false);
  });
});

function finishTurnsAs(game: ReturnType<typeof lobby>) {
  while (game.state.phase === 'CLUE_TURNS') act(game, { type: 'TURN_DONE', by: game.state.hostId });
}

function speakerOf(game: ReturnType<typeof lobby>): string {
  const r = round(game);
  return r.speakingOrder[r.turnIndex % r.speakingOrder.length] as string;
}

/** Starts games with successive seeds until the role assignment satisfies `predicate`. */
function startWhere(count: number, predicate: (game: ReturnType<typeof lobby>) => boolean) {
  for (let seed = 1; seed < 200; seed++) {
    const game = start(lobby(count, {}, seed));
    if (predicate(game)) return game;
  }
  throw new Error('no seed satisfies the predicate');
}
