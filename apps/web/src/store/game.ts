'use client';

import type { AnimalId, PlayerView, RoomSettings, TvView } from '@khuuramch/game-core';
import type { AckError, ClientEvent, CreateAck, JoinAck, PeekAck } from '@khuuramch/protocol';
import { create } from 'zustand';
import { mn } from '@/i18n/mn';
import { clearSession, loadSession, saveProfile, saveSession } from '@/lib/session';
import type * as NetModule from '@/lib/socket';

/** Where a phone is in the room flow. */
export type Stage = 'connecting' | 'join' | 'playing' | 'missing' | 'kicked' | 'expired';
export type Connection = 'connecting' | 'online' | 'reconnecting';

type GameStore = {
  code: string | null;
  mode: 'player' | 'tv';
  stage: Stage;
  connection: Connection;
  view: PlayerView | null;
  tv: TvView | null;
  rev: number;
  /** serverNow − Date.now(); timers render `deadline − (now + offset)`. */
  clockOffset: number;
  peek: PeekAck | null;
  flash: { message: string; at: number } | null;

  enter(code: string): Promise<void>;
  watch(code: string): Promise<void>;
  join(nickname: string, animal: AnimalId): Promise<AckError | null>;
  createRoom(
    nickname: string,
    animal: AnimalId,
    settings: Partial<RoomSettings>,
  ): Promise<{ ok: true; code: string } | { ok: false; error: AckError }>;
  send(event: ClientEvent, payload?: unknown): Promise<boolean>;
  leave(): Promise<void>;
  dismissFlash(): void;
};

export const useGame = create<GameStore>()((set, get) => ({
  code: null,
  mode: 'player',
  stage: 'connecting',
  connection: 'connecting',
  view: null,
  tv: null,
  rev: 0,
  clockOffset: 0,
  peek: null,
  flash: null,

  async enter(code) {
    set({ code, mode: 'player', stage: 'connecting', view: null, tv: null, rev: 0, peek: null });
    const { emitAck } = await connected();
    const session = loadSession(code);
    if (session) {
      const ack = await emitAck('room:rejoin', { code, sessionToken: session.sessionToken });
      if (ack.ok) {
        set({ stage: 'playing' });
        return;
      }
      clearSession(code);
      if (ack.error.code === 'ROOM_NOT_FOUND') {
        set({ stage: 'missing' });
        return;
      }
    }
    await refreshPeek(code);
  },

  async watch(code) {
    set({ code, mode: 'tv', stage: 'connecting', view: null, tv: null, rev: 0 });
    const { emitAck } = await connected();
    const ack = await emitAck('tv:watch', { code });
    set({ stage: ack.ok ? 'playing' : 'missing' });
  },

  async join(nickname, animal) {
    const code = get().code;
    if (!code) return { code: 'ROOM_NOT_FOUND', message: mn.connection.roomNotFound };
    const mod = await connected(ACTION_TIMEOUT_MS);
    if (!mod) return TIMEOUT;
    const { emitAck } = mod;
    const ack = await emitAck<JoinAck>('room:join', { code, nickname, avatar: animal });
    if (!ack.ok) {
      if (ack.error.code === 'AVATAR_TAKEN' || ack.error.code === 'ROOM_FULL') {
        await refreshPeek(code);
      }
      return ack.error;
    }
    saveSession({ code, playerId: ack.data.playerId, sessionToken: ack.data.sessionToken });
    saveProfile({ nickname, animal });
    set({ stage: 'playing' });
    return null;
  },

  async createRoom(nickname, animal, settings) {
    const mod = await connected(ACTION_TIMEOUT_MS);
    if (!mod) return { ok: false, error: TIMEOUT };
    const { emitAck } = mod;
    const ack = await emitAck<CreateAck>('room:create', { nickname, avatar: animal, settings });
    if (!ack.ok) return { ok: false, error: ack.error };
    saveSession({
      code: ack.data.code,
      playerId: ack.data.playerId,
      sessionToken: ack.data.sessionToken,
    });
    saveProfile({ nickname, animal });
    return { ok: true, code: ack.data.code };
  },

  async send(event, payload = {}) {
    const { emitAck } = await net();
    const ack = await emitAck(event, payload);
    // INVALID_PHASE is a race (two people ended the same phase); the screen has already moved on.
    if (!ack.ok && ack.error.code !== 'INVALID_PHASE') {
      set({ flash: { message: ack.error.message, at: Date.now() } });
    }
    return ack.ok;
  },

  async leave() {
    const code = get().code;
    const { emitAck } = await net();
    await emitAck('room:leave');
    if (code) clearSession(code);
    set({ view: null, stage: 'connecting', code: null });
  },

  dismissFlash() {
    set({ flash: null });
  },
}));

async function refreshPeek(code: string): Promise<void> {
  const { emitAck } = await net();
  const peek = await emitAck<PeekAck>('room:peek', { code });
  if (peek.ok) useGame.setState({ stage: 'join', peek: peek.data });
  else {
    useGame.setState({
      stage: peek.error.code === 'ROOM_NOT_FOUND' ? 'missing' : 'join',
      peek: null,
    });
  }
}

type Net = typeof NetModule;
let loading: Promise<Net> | null = null;

/** Creating or joining gives up after this long without a connection, with a clear message. */
const ACTION_TIMEOUT_MS = 10_000;
const TIMEOUT: AckError = { code: 'INTERNAL', message: mn.connection.timeout };

/** Starts loading the network layer early, e.g. while React is still hydrating the room. */
export function warmUpNetwork(): void {
  if (typeof window !== 'undefined') void net();
}

/**
 * The network layer (socket.io-client + Zod schemas) is its own chunk, kept out of the initial JS
 * (D-302) and wired to the store exactly once. If the chunk fails to arrive (Wi-Fi dropped right
 * after the page loaded) it is retried with backoff while the "reconnecting" banner shows.
 */
function net(): Promise<Net> {
  loading ??= loadNet();
  return loading;
}

async function loadNet(): Promise<Net> {
  for (let attempt = 0; ; attempt++) {
    try {
      const mod = await import('@/lib/socket');
      wire(mod);
      return mod;
    } catch {
      useGame.setState({ connection: 'reconnecting' });
      await new Promise((resolve) => setTimeout(resolve, Math.min(5000, 500 * 2 ** attempt)));
    }
  }
}

/** The network layer once the socket is connected; `null` if `timeoutMs` passes first. */
async function connected(): Promise<Net>;
async function connected(timeoutMs: number): Promise<Net | null>;
async function connected(timeoutMs?: number): Promise<Net | null> {
  const mod = await net();
  const ok = await (timeoutMs === undefined
    ? mod.whenConnected().then(() => true)
    : Promise.race([
        mod.whenConnected().then(() => true),
        new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
      ]));
  if (!ok) return null;
  useGame.setState({ connection: 'online' });
  return mod;
}

function wire(mod: Net): void {
  mod.listen({
    connect() {
      useGame.setState({ connection: 'online' });
      void mod.measureClockOffset().then((offset) => {
        if (offset !== null) useGame.setState({ clockOffset: offset });
      });
      // A dropped phone comes back: take the same seat again (§2.5, §7).
      const { code, stage, mode } = useGame.getState();
      if (!code || stage !== 'playing') return;
      if (mode === 'tv') {
        void mod.emitAck('tv:watch', { code });
        return;
      }
      const session = loadSession(code);
      if (!session) return;
      void mod.emitAck('room:rejoin', { code, sessionToken: session.sessionToken }).then((ack) => {
        if (ack.ok) return;
        clearSession(code);
        useGame.setState({ stage: ack.error.code === 'ROOM_NOT_FOUND' ? 'expired' : 'missing' });
      });
    },
    disconnect() {
      useGame.setState({ connection: 'reconnecting' });
    },
    connectError() {
      useGame.setState({ connection: 'reconnecting' });
    },
    sync({ rev, view }) {
      const current = useGame.getState();
      if (view.code !== current.code || rev < current.rev) return;
      if (view.me) useGame.setState({ view, rev });
      else useGame.setState({ tv: view, rev });
    },
    kicked() {
      const { code } = useGame.getState();
      if (code) clearSession(code);
      useGame.setState({ stage: 'kicked', view: null });
    },
    error(error) {
      if (error?.code !== 'ROOM_EXPIRED') return;
      const { code } = useGame.getState();
      if (code) clearSession(code);
      useGame.setState({ stage: 'expired', view: null, tv: null });
    },
  });
}
