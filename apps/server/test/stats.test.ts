import { describe, expect, it } from 'vitest';
import { computeStats, type StoredEvent } from '../src/analytics/stats';
import { RateLimiter } from '../src/game/rate-limiter';

const at = (iso: string) => new Date(iso);
const event = (
  type: string,
  roomId: string | null,
  payload: Record<string, unknown>,
  iso: string,
): StoredEvent => ({
  type,
  roomId,
  payload,
  createdAt: at(iso),
});

describe('computeStats (§8)', () => {
  const events = [
    event('room_created', 'r1', {}, '2026-10-16T10:00:00Z'),
    event('room_created', 'r2', {}, '2026-10-16T11:00:00Z'),
    event(
      'game_started',
      'r1',
      { mode: 'A', players: 4, categories: ['food', 'animals'] },
      '2026-10-16T10:05:00Z',
    ),
    event(
      'game_started',
      'r1',
      { mode: 'B', players: 6, categories: ['food'] },
      '2026-10-16T10:30:00Z',
    ),
    event(
      'game_started',
      'r2',
      { mode: 'A', players: 5, categories: ['sports'] },
      '2026-10-16T17:30:00Z',
    ),
    event('round_completed', 'r1', { winner: 'imposters' }, '2026-10-16T10:20:00Z'),
    event('round_completed', 'r2', { winner: 'civilians' }, '2026-10-16T17:50:00Z'),
    event('pack_viewed_locked', null, { packId: 'kpop' }, '2026-10-16T12:00:00Z'),
    event('pack_interest', null, { packId: 'kpop' }, '2026-10-16T12:00:01Z'),
  ];

  it('computes the dashboard numbers', () => {
    const stats = computeStats(events, 30);
    expect(stats.roomsCreated).toBe(2);
    expect(stats.gamesStarted).toBe(3);
    expect(stats.averagePlayers).toBe(5);
    expect(stats.replayRate).toBe(0.5);
    expect(stats.modes).toEqual({ A: 2, B: 1 });
    expect(stats.topCategories[0]).toEqual({ category: 'food', games: 2 });
    expect(stats.winners).toEqual({ civilians: 1, imposters: 1 });
    expect(stats.lockedPackViews).toEqual({ kpop: 1 });
    expect(stats.packInterest).toEqual({ kpop: 1 });
  });

  it('groups games by day in Mongolian time (UTC+8)', () => {
    // 17:30 UTC on the 16th is already 01:30 on the 17th in Ulaanbaatar.
    expect(computeStats(events, 30).gamesPerDay).toEqual([
      { date: '2026-10-16', games: 2 },
      { date: '2026-10-17', games: 1 },
    ]);
  });

  it('returns nulls rather than fake numbers when there is no data', () => {
    const stats = computeStats([], 7);
    expect(stats).toMatchObject({ averagePlayers: null, replayRate: null, gamesStarted: 0 });
  });
});

describe('RateLimiter', () => {
  it('allows a burst, then refills over time', () => {
    const limiter = new RateLimiter(3, 2);
    expect([1, 2, 3, 4].map(() => limiter.take('a', 0))).toEqual([true, true, true, false]);
    expect(limiter.take('a', 499)).toBe(false);
    expect(limiter.take('a', 1000)).toBe(true);
    limiter.forget('a');
    expect(limiter.take('a', 1000)).toBe(true);
  });
});
