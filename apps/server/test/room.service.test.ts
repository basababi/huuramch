import {
  DURATIONS,
  seededRng,
  type PlayerView,
  type TvView,
  type WordPair,
} from '@khuuramch/game-core';
import type { Ack, StateSync } from '@khuuramch/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../src/game/rate-limiter';
import { InMemoryRoomStore, InMemorySessionStore } from '../src/game/room-store';
import { RoomService } from '../src/game/room.service';

const POOL: WordPair[] = [
  { id: 'food-1', a: 'Бууз', b: 'Хуушуур', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-2', a: 'Цуйван', b: 'Хуурга', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-3', a: 'Тараг', b: 'Өрөм', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-4', a: 'Боорцог', b: 'Ул боов', category: 'food', difficulty: 1, packId: 'core' },
  { id: 'food-5', a: 'Ааруул', b: 'Ээзгий', category: 'food', difficulty: 1, packId: 'core' },
];
const ANIMALS = ['temee', 'mori', 'khoni', 'yamaa', 'ukher'] as const;

type Sent = { socketId: string; event: string; payload: unknown };

function harness(limiter = new RateLimiter(10_000, 10_000)) {
  const sent: Sent[] = [];
  const analytics: Array<{
    type: string;
    payload: Record<string, unknown>;
    roomId: string | null;
  }> = [];
  const store = new InMemoryRoomStore();
  let ids = 0;
  let tokens = 0;
  let codes = 0;
  const service = new RoomService({
    store,
    sessions: new InMemorySessionStore(),
    content: { pairs: () => POOL },
    analytics: { record: (type, payload, roomId) => analytics.push({ type, payload, roomId }) },
    rng: seededRng(11),
    newId: () => `p${ids++}`,
    newToken: () => `token-${String(tokens++).padStart(12, '0')}`,
    newCode: () => String(4200 + codes++),
    limiter,
  });
  service.attach({ send: (socketId, event, payload) => sent.push({ socketId, event, payload }) });

  const view = <V extends PlayerView | TvView = PlayerView>(socketId: string): V => {
    const last = [...sent]
      .reverse()
      .find((m) => m.socketId === socketId && m.event === 'state:sync');
    if (!last) throw new Error(`no state for ${socketId}`);
    return (last.payload as StateSync).view as V;
  };
  const call = async <T = Record<string, unknown>>(
    socketId: string,
    event: string,
    payload: unknown = {},
  ) => (await service.handle(socketId, event as never, payload)) as Ack<T>;
  const must = async <T = Record<string, unknown>>(
    socketId: string,
    event: string,
    payload: unknown = {},
  ) => {
    const ack = await call<T>(socketId, event, payload);
    if (!ack.ok) throw new Error(`${event}: ${ack.error.code}`);
    return ack.data;
  };

  /** Host on socket s0 plus `count - 1` players on s1…; returns the room code. */
  const room = async (
    count: number,
    settings: Record<string, unknown> = { categories: ['food'] },
  ) => {
    const created = await must<{ code: string }>('s0', 'room:create', {
      nickname: 'Бат',
      avatar: 'temee',
      settings,
    });
    for (let i = 1; i < count; i++) {
      await must(`s${i}`, 'room:join', {
        code: created.code,
        nickname: `Тоглогч${i}`,
        avatar: ANIMALS[i],
      });
    }
    return created.code;
  };

  return { service, sent, analytics, store, view, call, must, room };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 1_700_000_000_000 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rooms and sessions', () => {
  it('creates a room, hands out a session token and syncs the host', async () => {
    const h = harness();
    const data = await h.must<{ code: string; playerId: string; sessionToken: string }>(
      's0',
      'room:create',
      {
        nickname: 'Бат',
        avatar: 'temee',
      },
    );
    expect(data).toEqual({ code: '4200', playerId: 'p0', sessionToken: expect.any(String) });
    const view = h.view('s0');
    expect(view.phase).toBe('LOBBY');
    expect(view.me).toMatchObject({ id: 'p0', isHost: true });
    expect(h.analytics.map((a) => a.type)).toEqual(['room_created']);
  });

  it('lets a phone peek at a lobby before joining', async () => {
    const h = harness();
    const code = await h.room(2);
    expect(await h.must('x', 'room:peek', { code })).toEqual({
      phase: 'LOBBY',
      full: false,
      players: [
        { name: 'Бат', animal: 'temee' },
        { name: 'Тоглогч1', animal: 'mori' },
      ],
    });
    expect(await h.call('x', 'room:peek', { code: '0000' })).toMatchObject({
      error: { code: 'ROOM_NOT_FOUND' },
    });
  });

  it('maps nickname problems to specific errors', async () => {
    const h = harness();
    expect(
      await h.call('s0', 'room:create', { nickname: 'Тэмүүлэнбаатар', avatar: 'temee' }),
    ).toMatchObject({
      ok: false,
      error: { code: 'NAME_LENGTH' },
    });
    expect(await h.call('s0', 'room:create', { nickname: 'Бат!', avatar: 'temee' })).toMatchObject({
      error: { code: 'NAME_CHARS' },
    });
    expect(await h.call('s0', 'room:create', { nickname: 'гичий', avatar: 'temee' })).toMatchObject(
      {
        error: { code: 'NAME_PROFANE', message: expect.stringMatching(/нэр/i) },
      },
    );
  });

  it('validates payloads and requires a seat for game actions', async () => {
    const h = harness();
    expect(
      await h.call('s0', 'room:join', { code: 'abcd', nickname: 'Бат', avatar: 'mori' }),
    ).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    });
    expect(
      await h.call('s0', 'room:join', { code: '9999', nickname: 'Бат', avatar: 'mori' }),
    ).toMatchObject({
      error: { code: 'ROOM_NOT_FOUND' },
    });
    expect(await h.call('s0', 'game:start')).toMatchObject({ error: { code: 'NOT_A_PLAYER' } });
  });

  it('rate-limits each socket', async () => {
    const h = harness(new RateLimiter(2, 0.001));
    await h.call('s0', 'clock:ping', { t0: 1 });
    await h.call('s0', 'clock:ping', { t0: 2 });
    expect(await h.call('s0', 'clock:ping', { t0: 3 })).toMatchObject({
      error: { code: 'RATE_LIMITED' },
    });
    expect((await h.call('s1', 'clock:ping', { t0: 4 })).ok).toBe(true);
  });

  it('answers clock pings with the server time', async () => {
    const h = harness();
    expect(await h.must('s0', 'clock:ping', { t0: 42 })).toEqual({ t0: 42, serverNow: Date.now() });
  });

  it('syncs everyone when a player joins, and counts joins anonymously', async () => {
    const h = harness();
    const code = await h.room(3);
    expect(h.view('s0').players).toHaveLength(3);
    expect(h.view('s2').me.id).toBe('p2');
    expect(h.analytics.filter((a) => a.type === 'player_joined').map((a) => a.payload)).toEqual([
      { count: 2 },
      { count: 3 },
    ]);
    expect(JSON.stringify(h.analytics)).not.toContain('Тоглогч');
    expect(code).toBe('4200');
  });
});

describe('a whole game through the service', () => {
  it('runs timers on the server and only ever sends each phone its own secret', async () => {
    const h = harness();
    await h.room(4);
    await h.must('s0', 'game:start');
    const secrets = [0, 1, 2, 3].map((i) => h.view(`s${i}`).me.secret);
    const imposterSocket = `s${secrets.findIndex((s) => s?.kind === 'imposter')}`;
    expect(secrets.filter((s) => s?.kind === 'imposter')).toHaveLength(1);
    const words = secrets.flatMap((s) => (s?.kind === 'word' ? [s.word] : []));
    expect(words).toHaveLength(3);
    expect(new Set(words).size).toBe(1);

    for (let i = 0; i < 4; i++) await h.must(`s${i}`, 'role:confirm');
    expect(h.view('s0').phase).toBe('CLUE_TURNS');

    // Turn timer (20s, server-side) moves the game along without anybody tapping.
    await vi.advanceTimersByTimeAsync(20_100);
    expect(h.view('s0').round?.turnIndex).toBe(1);

    while (h.view('s0').phase === 'CLUE_TURNS') await h.must('s0', 'turn:done');
    await h.must('s0', 'discussion:skip');
    expect(h.view('s1').phase).toBe('VOTING');

    const imposterId = h.view(imposterSocket).me.id;
    for (let i = 0; i < 4; i++) {
      const socket = `s${i}`;
      const target =
        socket === imposterSocket
          ? h.view('s0').players.find((p) => p.id !== imposterId)!.id
          : imposterId;
      await h.must(socket, 'vote:cast', { targetId: target });
    }
    expect(h.view('s0').phase).toBe('VOTE_REVEAL');
    expect(h.view('s0').round?.reveal?.eliminatedRole).toBe('imposter');

    await vi.advanceTimersByTimeAsync(DURATIONS.revealMs + 50);
    expect(h.view(imposterSocket).phase).toBe('IMPOSTER_GUESS');
    expect(h.view(imposterSocket).me.guessOptions).toHaveLength(8);
    for (const socket of ['s0', 's1', 's2', 's3'].filter((s) => s !== imposterSocket)) {
      expect(h.view(socket).me.guessOptions).toBeNull();
    }

    await h.must(imposterSocket, 'guess:submit', { optionIndex: 0 });
    await vi.advanceTimersByTimeAsync(DURATIONS.guessResultMs + 50);
    expect(h.view('s0').phase).toBe('ROUND_RESULT');
    expect(h.analytics.map((a) => a.type)).toContain('round_completed');

    await h.must('s0', 'round:continue');
    await h.must('s0', 'game:replay');
    expect(h.view('s3').phase).toBe('LOBBY');
    expect(h.analytics.map((a) => a.type)).toContain('game_replayed');
  });

  it('keeps every revision number increasing', async () => {
    const h = harness();
    await h.room(3);
    const revs = h.sent
      .filter((m) => m.socketId === 's0' && m.event === 'state:sync')
      .map((m) => (m.payload as StateSync).rev);
    expect(revs).toEqual([...revs].sort((a, b) => a - b));
  });
});

describe('reconnection (§2.5)', () => {
  it('restores the same seat, role and word on a new socket within the grace period', async () => {
    const h = harness();
    const code = await h.room(3);
    await h.must('s0', 'game:start');
    const before = h.view('s1');
    const token = (await h.service.handle('s1-old', 'room:rejoin', {
      code,
      sessionToken: 'x'.repeat(20),
    })) as Ack<unknown>;
    expect(token).toMatchObject({ error: { code: 'SESSION_INVALID' } });

    await h.service.socketDisconnected('s1');
    expect(h.view('s0').players.find((p) => p.id === before.me.id)?.connected).toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);

    const sessionToken = 'token-000000000001';
    expect(await h.must('s1-new', 'room:rejoin', { code, sessionToken })).toEqual({
      playerId: before.me.id,
    });
    expect(h.view('s1-new').me.secret).toEqual(before.me.secret);
    expect(h.view('s0').players.find((p) => p.id === before.me.id)?.connected).toBe(true);
  });

  it('only disconnects a player when their last socket goes', async () => {
    const h = harness();
    const code = await h.room(3);
    await h.must('s1-tab2', 'room:rejoin', { code, sessionToken: 'token-000000000001' });
    await h.service.socketDisconnected('s1');
    expect(h.view('s0').players.find((p) => p.id === 'p1')?.connected).toBe(true);
  });

  it('drops a lobby player after the grace period and refuses their old session', async () => {
    const h = harness();
    const code = await h.room(3);
    await h.service.socketDisconnected('s2');
    await vi.advanceTimersByTimeAsync(DURATIONS.graceMs + 100);
    expect(h.view('s0').players).toHaveLength(2);
    expect(
      await h.call('s2b', 'room:rejoin', { code, sessionToken: 'token-000000000002' }),
    ).toMatchObject({
      error: { code: 'SESSION_INVALID' },
    });
  });
});

describe('host tools and room lifecycle', () => {
  it('kicks a player: they are told, and their session stops working', async () => {
    const h = harness();
    const code = await h.room(3);
    expect(await h.call('s1', 'room:kick', { playerId: 'p2' })).toMatchObject({
      error: { code: 'NOT_HOST' },
    });
    await h.must('s0', 'room:kick', { playerId: 'p2' });
    expect(h.sent.some((m) => m.socketId === 's2' && m.event === 'room:kicked')).toBe(true);
    expect(await h.call('s2', 'game:start')).toMatchObject({ error: { code: 'NOT_A_PLAYER' } });
    expect(
      await h.call('s2', 'room:rejoin', { code, sessionToken: 'token-000000000002' }),
    ).toMatchObject({
      error: { code: 'SESSION_INVALID' },
    });
  });

  it('closes the room when the last player leaves', async () => {
    const h = harness();
    const code = await h.room(1);
    await h.must('s0', 'room:leave');
    expect(await h.store.get(code)).toBeUndefined();
  });

  it('expires rooms after two idle hours and tells the phones', async () => {
    const h = harness();
    const code = await h.room(3);
    await vi.advanceTimersByTimeAsync(DURATIONS.roomTtlMs + 1000);
    await h.service.sweep();
    expect(await h.store.get(code)).toBeUndefined();
    expect(h.sent.some((m) => m.socketId === 's1' && m.event === 'error')).toBe(true);
  });

  it('serves the TV a view with no secrets', async () => {
    const h = harness();
    const code = await h.room(3);
    await h.must('tv', 'tv:watch', { code });
    await h.must('s0', 'game:start');
    const tv = h.view<TvView>('tv');
    expect(tv.me).toBeNull();
    expect(JSON.stringify(tv)).not.toMatch(/Бууз|Хуушуур|Цуйван|Хуурга|Тараг|Өрөм|Боорцог|Ааруул/);
    expect(await h.call('tv2', 'tv:watch', { code: '0000' })).toMatchObject({
      error: { code: 'ROOM_NOT_FOUND' },
    });
  });

  it('moves a socket that creates a new room out of its old one', async () => {
    const h = harness();
    await h.room(3);
    await h.must('s1', 'room:create', { nickname: 'Шинэ', avatar: 'irves' });
    expect(h.view('s0').players.find((p) => p.id === 'p1')?.connected).toBe(false);
  });
});
