import { describe, expect, it } from 'vitest';
import { ANIMAL_IDS, DURATIONS } from '../src/constants';
import { createRoom, currentSpeakerId, nextWakeAt, reduce } from '../src/machine';
import { migrateHostIfNeeded } from '../src/players';
import { seededRng } from '../src/rng';
import { POOL, T0, act, confirmAll, lobby, pid, reject, round, start, tick } from './helpers';

describe('room creation', () => {
  it('puts the host in the lobby on seat 0', () => {
    const { state } = lobby(1);
    expect(state.phase).toBe('LOBBY');
    expect(state.hostId).toBe('p0');
    expect(state.players[0]).toMatchObject({ seat: 0, connected: true, score: 0, waiting: false });
  });

  it('uses the default settings when none are given', () => {
    const created = createRoom({
      code: '1',
      host: { id: 'h', name: 'Бат', animal: 'mori' },
      now: T0,
    });
    expect(created.ok && created.state.settings.categories).toHaveLength(6);
  });

  it('rejects game actions outside their phase', () => {
    const game = lobby(3);
    reject(game, { type: 'CAST_VOTE', playerId: 'p0', targetId: 'p1' }, 'INVALID_PHASE');
    reject(game, { type: 'SUBMIT_GUESS', playerId: 'p0', optionIndex: 0 }, 'INVALID_PHASE');
  });

  it('has no speaker for an empty speaking order', () => {
    const game = start(lobby(3));
    expect(currentSpeakerId({ ...game.state.round!, speakingOrder: [] })).toBeNull();
  });

  it('keeps the host when nobody else is around to take over', () => {
    const game = lobby(2);
    const s = structuredClone(game.state);
    for (const p of s.players) {
      p.connected = false;
      p.disconnectedAt = game.now;
    }
    s.players[1]!.left = true;
    migrateHostIfNeeded(s, game.now + DURATIONS.graceMs);
    expect(s.hostId).toBe('p0');
  });

  it('rejects an invalid host name or settings', () => {
    const host = { id: 'h', name: '', animal: ANIMAL_IDS[0] };
    expect(createRoom({ code: '1', host, now: T0 })).toEqual({ ok: false, error: 'NAME_INVALID' });
    expect(
      createRoom({
        code: '1',
        host: { ...host, name: 'Бат' },
        now: T0,
        settings: { categories: [] },
      }),
    ).toEqual({ ok: false, error: 'INVALID_SETTINGS' });
  });
});

describe('joining', () => {
  it('seats players in order and de-duplicates names', () => {
    const game = lobby(2);
    act(game, { type: 'JOIN', player: { id: 'dup', name: 'бат', animal: 'tarvaga' } });
    expect(game.state.players.map((p) => p.seat)).toEqual([0, 1, 2]);
    expect(game.state.players[2]?.name).toBe('бат 2');
  });

  it('allows one avatar per player', () => {
    const game = lobby(2);
    reject(
      game,
      { type: 'JOIN', player: { id: 'x', name: 'Х', animal: ANIMAL_IDS[1] } },
      'AVATAR_TAKEN',
    );
  });

  it('rejects the 13th player with ROOM_FULL', () => {
    const game = lobby(12);
    reject(game, { type: 'JOIN', player: { id: 'x', name: 'Х', animal: 'mori' } }, 'ROOM_FULL');
  });

  it('rejects bad names and duplicate ids', () => {
    const game = lobby(2);
    reject(
      game,
      { type: 'JOIN', player: { id: 'x', name: 'гичий', animal: 'irves' } },
      'NAME_INVALID',
    );
    reject(
      game,
      { type: 'JOIN', player: { id: 'p1', name: 'Бат', animal: 'irves' } },
      'NOT_ALLOWED',
    );
  });

  it('lets late joiners watch and play from the next game (§2.5)', () => {
    const game = start(lobby(3));
    act(game, { type: 'JOIN', player: { id: 'late', name: 'Оройтсон', animal: 'irves' } });
    const late = game.state.players.find((p) => p.id === 'late');
    expect(late?.waiting).toBe(true);
    expect(game.state.round?.participants).not.toContain('late');
  });

  it('reuses a freed seat so colours stay unique', () => {
    const game = lobby(3);
    act(game, { type: 'LEAVE', playerId: 'p1' });
    act(game, { type: 'JOIN', player: { id: 'new', name: 'Шинэ', animal: 'irves' } });
    expect(game.state.players.find((p) => p.id === 'new')?.seat).toBe(1);
  });
});

describe('leaving, kicking, host migration', () => {
  it('removes a player who leaves the lobby', () => {
    const game = act(lobby(3), { type: 'LEAVE', playerId: 'p2' });
    expect(game.state.players.map((p) => p.id)).toEqual(['p0', 'p1']);
  });

  it('moves the host role to the earliest-joined connected player when the host leaves', () => {
    const game = lobby(3);
    act(game, { type: 'DISCONNECT', playerId: 'p1' });
    act(game, { type: 'LEAVE', playerId: 'p0' });
    expect(game.state.hostId).toBe('p2');
  });

  it('lets only the host kick, only in the lobby, never themselves', () => {
    const game = lobby(3);
    reject(game, { type: 'KICK', by: 'p1', playerId: 'p2' }, 'NOT_HOST');
    reject(game, { type: 'KICK', by: 'p0', playerId: 'p0' }, 'INVALID_TARGET');
    reject(game, { type: 'KICK', by: 'p0', playerId: 'ghost' }, 'INVALID_TARGET');
    act(game, { type: 'KICK', by: 'p0', playerId: 'p2' });
    expect(game.state.players).toHaveLength(2);
    start(act(game, { type: 'JOIN', player: { id: 'p9', name: 'Ес', animal: 'irves' } }));
    reject(game, { type: 'KICK', by: 'p0', playerId: 'p1' }, 'INVALID_PHASE');
  });

  it('drops lobby players who stay disconnected past the 90s grace period', () => {
    const game = lobby(3);
    act(game, { type: 'DISCONNECT', playerId: 'p2' });
    tick(game, DURATIONS.graceMs - 1);
    expect(game.state.players).toHaveLength(3);
    tick(game, 1);
    expect(game.state.players).toHaveLength(2);
  });

  it('migrates the host after the grace period, not before', () => {
    const game = lobby(3);
    act(game, { type: 'DISCONNECT', playerId: 'p0' });
    tick(game, 10_000);
    expect(game.state.hostId).toBe('p0');
    tick(game, DURATIONS.graceMs);
    expect(game.state.hostId).toBe('p1');
  });

  it('reports unknown players', () => {
    const game = lobby(2);
    reject(game, { type: 'LEAVE', playerId: 'ghost' }, 'NOT_A_PLAYER');
    reject(game, { type: 'DISCONNECT', playerId: 'ghost' }, 'NOT_A_PLAYER');
    reject(game, { type: 'RECONNECT', playerId: 'ghost' }, 'NOT_A_PLAYER');
  });
});

describe('settings in the lobby', () => {
  it('only the host can change settings, only in the lobby, only to valid values', () => {
    const game = lobby(3);
    reject(game, { type: 'UPDATE_SETTINGS', by: 'p1', settings: { mode: 'B' } }, 'NOT_HOST');
    reject(
      game,
      { type: 'UPDATE_SETTINGS', by: 'p0', settings: { categories: [] } },
      'INVALID_SETTINGS',
    );
    act(game, { type: 'UPDATE_SETTINGS', by: 'p0', settings: { mode: 'B', timerPreset: 'fast' } });
    expect(game.state.settings).toMatchObject({ mode: 'B', timerPreset: 'fast' });
    start(game);
    reject(game, { type: 'UPDATE_SETTINGS', by: 'p0', settings: { mode: 'A' } }, 'INVALID_PHASE');
  });
});

describe('starting a game', () => {
  it('needs the host and at least 3 connected players', () => {
    const game = lobby(3);
    reject(game, { type: 'START_GAME', by: 'p1', pool: POOL }, 'NOT_HOST');
    act(game, { type: 'DISCONNECT', playerId: 'p2' });
    reject(game, { type: 'START_GAME', by: 'p0', pool: POOL }, 'NOT_ENOUGH_PLAYERS');
  });

  it('fails cleanly when the pool has nothing for the chosen categories', () => {
    const game = lobby(3, { categories: ['sports'] });
    reject(game, { type: 'START_GAME', by: 'p0', pool: POOL }, 'NO_CONTENT');
  });

  it('assigns roles server-side: 1 imposter for 3–6 players, 2 for 7–12 (§2.1)', () => {
    for (const [count, expected] of [
      [3, 1],
      [6, 1],
      [7, 2],
      [12, 2],
    ] as const) {
      const game = start(lobby(count));
      const r = game.state.round;
      expect(r?.imposters).toHaveLength(expected);
      expect(r?.participants).toHaveLength(count);
      expect(new Set(r?.imposters).size).toBe(expected);
    }
  });

  it('honours a host override while it stays fewer than half', () => {
    expect(start(lobby(7, { imposterCount: 3 })).state.round?.imposters).toHaveLength(3);
    expect(start(lobby(4, { imposterCount: 3 })).state.round?.imposters).toHaveLength(1);
  });

  it('picks the word from the chosen categories and records the start', () => {
    const game = start(lobby(4, { categories: ['animals'] }));
    expect(game.state.round?.category).toBe('animals');
    expect(game.state.phase).toBe('ROLE_REVEAL');
    expect(game.state.deadline).toBe(game.now + DURATIONS.roleRevealMs);
    expect(game.events).toContainEqual({
      type: 'game_started',
      mode: 'A',
      players: 4,
      imposters: 1,
      categories: ['animals'],
    });
  });

  it('differs between seeds (roles really are random)', () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      outcomes.add(start(lobby(5, {}, seed)).state.round?.imposters.join() ?? '');
    }
    expect(outcomes.size).toBeGreaterThan(2);
  });

  it('leaves players who are mid-reconnect out of the game as spectators', () => {
    const game = lobby(4);
    act(game, { type: 'DISCONNECT', playerId: 'p3' });
    start(game);
    expect(game.state.round?.participants).not.toContain('p3');
    expect(game.state.players.find((p) => p.id === 'p3')?.waiting).toBe(true);
  });
});

describe('reconnecting', () => {
  it('restores the same player', () => {
    const game = lobby(3);
    act(game, { type: 'DISCONNECT', playerId: 'p1' });
    tick(game, 60_000);
    act(game, { type: 'RECONNECT', playerId: 'p1' });
    expect(game.state.players.find((p) => p.id === 'p1')).toMatchObject({
      connected: true,
      disconnectedAt: null,
    });
  });
});

describe('nextWakeAt', () => {
  it('is the phase deadline or the earliest grace expiry, whichever is first', () => {
    const game = lobby(4);
    expect(nextWakeAt(game.state, game.now)).toBeNull();
    act(game, { type: 'DISCONNECT', playerId: 'p3' });
    const graceEnd = game.now + DURATIONS.graceMs;
    expect(nextWakeAt(game.state, game.now)).toBe(graceEnd);
    start(game);
    expect(nextWakeAt(game.state, game.now)).toBe(
      Math.min(game.now + DURATIONS.roleRevealMs, graceEnd),
    );
  });

  it('never wakes for a grace period that has already run out', () => {
    const game = confirmAll(start(lobby(4, { turnTimer: false })));
    const civilian = round(game).participants.find((id) => !round(game).imposters.includes(id));
    act(game, { type: 'DISCONNECT', playerId: civilian as string });
    tick(game, DURATIONS.graceMs);
    // The absent civilian stays in the game, but there is nothing left to wait for.
    expect(nextWakeAt(game.state, game.now)).toBeNull();
  });

  it('touches lastActivityAt for real actions but not for TICK', () => {
    const game = lobby(3);
    const before = game.state.lastActivityAt;
    tick(game, 5000);
    expect(game.state.lastActivityAt).toBe(before);
    const result = reduce(game.state, { type: 'LEAVE', playerId: 'p2' }, game.now, seededRng(1));
    expect(result.ok && result.state.lastActivityAt).toBe(game.now);
  });

  it('does nothing on TICK in a phase without a deadline', () => {
    const game = lobby(3);
    tick(game, 1);
    expect(game.state.phase).toBe('LOBBY');
    expect(pid(1)).toBe('p1');
  });

  it('clears a stale deadline left on a phase that never times out', () => {
    const game = lobby(3);
    game.state = { ...game.state, deadline: game.now };
    tick(game, 1);
    expect(game.state.deadline).toBeNull();
    expect(game.state.phase).toBe('LOBBY');
  });
});
