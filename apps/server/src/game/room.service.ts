import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import {
  DURATIONS,
  MAX_PLAYERS,
  checkName,
  createRoom,
  nextWakeAt,
  projectStateForPlayer,
  projectStateForTv,
  reduce,
  type Action,
  type GameErrorCode,
  type GameEvent,
  type NameCheck,
  type RoomState,
  type Rng,
  type WordPair,
} from '@khuuramch/game-core';
import {
  C2SSchemas,
  S2C,
  ackError,
  type Ack,
  type C2SPayloads,
  type ClientEvent,
  type ErrorCode,
  type PeekAck,
  type StateSync,
} from '@khuuramch/protocol';
import { RateLimiter } from './rate-limiter';
import type { RoomStore, SessionStore } from './room-store';

/** How the service talks to sockets; the gateway implements it with Socket.IO. */
export type Broadcaster = {
  send(socketId: string, event: string, payload: unknown): void;
};

export type ContentProvider = { pairs(): WordPair[] };

/** Anonymous analytics sink (§8): no names, no IPs — only a random per-room id. */
export type AnalyticsSink = {
  record(type: string, payload: Record<string, unknown>, roomId: string | null): void;
};

export type RoomServiceDeps = {
  store: RoomStore;
  sessions: SessionStore;
  content: ContentProvider;
  analytics: AnalyticsSink;
  now?: () => number;
  rng?: Rng;
  newId?: () => string;
  newToken?: () => string;
  newCode?: () => string;
  limiter?: RateLimiter;
};

type Binding = { code: string; playerId: string | null };

const MAX_TV_SCREENS = 8;

const cryptoRng: Rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

function ok<T>(data: T): Ack<T> {
  return { ok: true, data };
}

function nameError(reason: Extract<NameCheck, { ok: false }>['reason']): Ack<never> {
  if (reason === 'length') return ackError('NAME_LENGTH');
  if (reason === 'chars') return ackError('NAME_CHARS');
  return ackError('NAME_PROFANE');
}

/**
 * The authoritative game server (§3): applies game-core transitions, owns every timer, keeps
 * sessions for reconnects, and sends each socket only its own projection of the room.
 */
export class RoomService {
  private readonly bindings = new Map<string, Binding>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly revisions = new Map<string, number>();
  private readonly analyticsIds = new Map<string, string>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private broadcaster: Broadcaster | null = null;

  private readonly store: RoomStore;
  private readonly sessions: SessionStore;
  private readonly content: ContentProvider;
  private readonly analytics: AnalyticsSink;
  private readonly now: () => number;
  private readonly rng: Rng;
  private readonly newId: () => string;
  private readonly newToken: () => string;
  private readonly newCode: () => string;
  private readonly limiter: RateLimiter;

  constructor(deps: RoomServiceDeps) {
    this.store = deps.store;
    this.sessions = deps.sessions;
    this.content = deps.content;
    this.analytics = deps.analytics;
    this.now = deps.now ?? Date.now;
    this.rng = deps.rng ?? cryptoRng;
    this.newId = deps.newId ?? randomUUID;
    this.newToken = deps.newToken ?? (() => randomBytes(24).toString('base64url'));
    this.newCode = deps.newCode ?? (() => String(randomInt(0, 10_000)).padStart(4, '0'));
    this.limiter = deps.limiter ?? new RateLimiter();
  }

  attach(broadcaster: Broadcaster): void {
    this.broadcaster = broadcaster;
  }

  /** Entry point for every client → server event: rate limit, validate, route, acknowledge. */
  async handle(socketId: string, event: ClientEvent, payload: unknown): Promise<Ack<unknown>> {
    if (!this.limiter.take(socketId, this.now())) return ackError('RATE_LIMITED');
    const parsed = C2SSchemas[event].safeParse(payload ?? {});
    if (!parsed.success) return ackError('VALIDATION_FAILED');
    try {
      return await this.route(socketId, event, parsed.data);
    } catch (error) {
      console.error(`[rooms] ${event} failed`, error);
      return ackError('INTERNAL');
    }
  }

  /** A socket went away: if it was the player's last one, start their grace period. */
  async socketDisconnected(socketId: string): Promise<void> {
    const binding = this.bindings.get(socketId);
    this.bindings.delete(socketId);
    this.limiter.forget(socketId);
    if (!binding?.playerId) return;
    if (this.socketsOf(binding.code, binding.playerId).length > 0) return;
    await this.dispatch(binding.code, { type: 'DISCONNECT', playerId: binding.playerId });
  }

  /** Expires rooms idle for longer than the TTL (§2.5). Called every minute. */
  async sweep(): Promise<void> {
    const now = this.now();
    for (const code of await this.store.codes()) {
      await this.serial(code, async () => {
        const state = await this.store.get(code);
        if (state && now - state.lastActivityAt > DURATIONS.roomTtlMs) {
          await this.close(code, 'ROOM_EXPIRED');
        }
      });
    }
  }

  /** Stops every timer (tests, shutdown). */
  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  // ── routing ────────────────────────────────────────────────────────────────────────────────

  private async route(socketId: string, event: ClientEvent, data: unknown): Promise<Ack<unknown>> {
    switch (event) {
      case 'room:create':
        return this.create(socketId, data as C2SPayloads['room:create']);
      case 'room:join':
        return this.join(socketId, data as C2SPayloads['room:join']);
      case 'room:rejoin':
        return this.rejoin(socketId, data as C2SPayloads['room:rejoin']);
      case 'tv:watch':
        return this.watch(socketId, (data as C2SPayloads['tv:watch']).code);
      case 'room:peek':
        return this.peek((data as C2SPayloads['room:peek']).code);
      case 'clock:ping':
        return ok({ t0: (data as C2SPayloads['clock:ping']).t0, serverNow: this.now() });
      default:
        return this.playerAction(socketId, event, data);
    }
  }

  private async create(socketId: string, data: C2SPayloads['room:create']): Promise<Ack<unknown>> {
    const name = checkName(data.nickname);
    if (!name.ok) return nameError(name.reason);
    const code = await this.freshCode();
    const playerId = this.newId();
    const created = createRoom({
      code,
      host: { id: playerId, name: name.name, animal: data.avatar },
      now: this.now(),
      settings: data.settings,
    });
    if (!created.ok) return ackError(created.error);
    await this.detach(socketId);
    await this.store.set(created.state);
    const sessionToken = this.newToken();
    await this.sessions.set(sessionToken, { code, playerId });
    this.bindings.set(socketId, { code, playerId });
    this.analyticsIds.set(code, randomUUID());
    this.analytics.record('room_created', {}, this.analyticsIds.get(code) ?? null);
    this.broadcast(created.state);
    return ok({ code, playerId, sessionToken });
  }

  private async join(socketId: string, data: C2SPayloads['room:join']): Promise<Ack<unknown>> {
    const name = checkName(data.nickname);
    if (!name.ok) return nameError(name.reason);
    const playerId = this.newId();
    const sessionToken = this.newToken();
    await this.detach(socketId);
    const error = await this.dispatch(
      data.code,
      { type: 'JOIN', player: { id: playerId, name: name.name, animal: data.avatar } },
      async (state) => {
        await this.sessions.set(sessionToken, { code: data.code, playerId });
        this.bindings.set(socketId, { code: data.code, playerId });
        this.analytics.record(
          'player_joined',
          { count: state.players.length },
          this.analyticsIds.get(data.code) ?? null,
        );
      },
    );
    if (error) return ackError(error);
    return ok({ code: data.code, playerId, sessionToken });
  }

  private async rejoin(socketId: string, data: C2SPayloads['room:rejoin']): Promise<Ack<unknown>> {
    const session = await this.sessions.get(data.sessionToken);
    if (!session || session.code !== data.code) return ackError('SESSION_INVALID');
    const state = await this.store.get(data.code);
    if (!state || !state.players.some((p) => p.id === session.playerId)) {
      await this.sessions.delete(data.sessionToken);
      return ackError(state ? 'SESSION_INVALID' : 'ROOM_NOT_FOUND');
    }
    const { playerId } = session;
    const current = this.bindings.get(socketId);
    if (current && (current.code !== data.code || current.playerId !== playerId))
      await this.detach(socketId);
    const error = await this.dispatch(data.code, { type: 'RECONNECT', playerId }, () => {
      this.bindings.set(socketId, { code: data.code, playerId });
    });
    if (error === 'NOT_ALLOWED') {
      await this.sessions.delete(data.sessionToken);
      return ackError('SESSION_INVALID');
    }
    if (error) return ackError(error);
    return ok({ playerId });
  }

  /** Lobby facts for the join form: phase, whether it is full, which animals are taken. */
  private async peek(code: string): Promise<Ack<PeekAck>> {
    const state = await this.store.get(code);
    if (!state) return ackError('ROOM_NOT_FOUND');
    return ok({
      phase: state.phase,
      full: state.players.length >= MAX_PLAYERS,
      players: state.players
        .filter((p) => !p.left)
        .map((p) => ({ name: p.name, animal: p.animal })),
    });
  }

  private async watch(socketId: string, code: string): Promise<Ack<unknown>> {
    const state = await this.store.get(code);
    if (!state) return ackError('ROOM_NOT_FOUND');
    const screens = [...this.bindings.values()].filter(
      (b) => b.code === code && b.playerId === null,
    );
    if (screens.length >= MAX_TV_SCREENS) return ackError('NOT_ALLOWED');
    await this.detach(socketId);
    this.bindings.set(socketId, { code, playerId: null });
    this.sendView(socketId, state, null, this.revisions.get(code) ?? 0);
    return ok({});
  }

  private async playerAction(
    socketId: string,
    event: ClientEvent,
    data: unknown,
  ): Promise<Ack<unknown>> {
    const binding = this.bindings.get(socketId);
    if (!binding?.playerId) return ackError('NOT_A_PLAYER');
    const { code, playerId: me } = binding;
    let action: Action;
    switch (event) {
      case 'room:leave':
        action = { type: 'LEAVE', playerId: me };
        break;
      case 'room:updateSettings':
        action = {
          type: 'UPDATE_SETTINGS',
          by: me,
          settings: data as C2SPayloads['room:updateSettings'],
        };
        break;
      case 'room:kick':
        action = { type: 'KICK', by: me, playerId: (data as C2SPayloads['room:kick']).playerId };
        break;
      case 'game:start':
        action = { type: 'START_GAME', by: me, pool: this.content.pairs() };
        break;
      case 'role:confirm':
        action = { type: 'CONFIRM_ROLE', playerId: me };
        break;
      case 'role:force':
        action = { type: 'FORCE_ROLES', by: me };
        break;
      case 'turn:done':
        action = {
          type: 'TURN_DONE',
          by: me,
          turnIndex: (data as C2SPayloads['turn:done']).turnIndex,
        };
        break;
      case 'discussion:skip':
        action = { type: 'SKIP_DISCUSSION', by: me };
        break;
      case 'vote:cast':
        action = {
          type: 'CAST_VOTE',
          playerId: me,
          targetId: (data as C2SPayloads['vote:cast']).targetId,
        };
        break;
      case 'guess:submit':
        action = {
          type: 'SUBMIT_GUESS',
          playerId: me,
          optionIndex: (data as C2SPayloads['guess:submit']).optionIndex,
        };
        break;
      case 'round:continue':
        action = { type: 'CONTINUE', by: me };
        break;
      case 'game:replay':
        action = { type: 'REPLAY', by: me };
        break;
      default:
        return ackError('VALIDATION_FAILED');
    }

    const error = await this.dispatch(code, action, async () => {
      if (action.type === 'LEAVE') await this.forget(code, me, null);
      if (action.type === 'KICK') await this.forget(code, action.playerId, S2C.kicked);
    });
    return error ? ackError(error) : ok({});
  }

  // ── state changes ──────────────────────────────────────────────────────────────────────────

  /**
   * Applies one game-core transition. Actions on the same room run strictly one after another,
   * so concurrent taps can never interleave (and an async store stays safe).
   */
  private dispatch(
    code: string,
    action: Action,
    onSuccess?: (state: RoomState) => void | Promise<void>,
  ): Promise<ErrorCode | null> {
    return this.serial(code, async () => {
      const state = await this.store.get(code);
      if (!state) return 'ROOM_NOT_FOUND';
      const result = reduce(state, action, this.now(), this.rng);
      if (!result.ok) return result.error as GameErrorCode;
      await this.store.set(result.state);
      this.recordEvents(code, result.events);
      await onSuccess?.(result.state);
      if (result.state.players.length === 0) {
        await this.close(code, null);
        return null;
      }
      this.schedule(result.state);
      this.broadcast(result.state);
      return null;
    });
  }

  private serial<T>(code: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(code) ?? Promise.resolve();
    const next = previous.then(task, task);
    this.queues.set(
      code,
      next.catch(() => undefined),
    );
    return next;
  }

  /** One timer per room, aimed at the next deadline or grace expiry (§3.1: server-authoritative). */
  private schedule(state: RoomState): void {
    const existing = this.timers.get(state.code);
    if (existing) clearTimeout(existing);
    this.timers.delete(state.code);
    const now = this.now();
    const wake = nextWakeAt(state, now);
    if (wake === null) return;
    const timer = setTimeout(
      () => {
        this.timers.delete(state.code);
        void this.dispatch(state.code, { type: 'TICK' });
      },
      Math.max(0, wake - now) + 15,
    );
    timer.unref?.();
    this.timers.set(state.code, timer);
  }

  private recordEvents(code: string, events: GameEvent[]): void {
    const roomId = this.analyticsIds.get(code) ?? null;
    for (const { type, ...payload } of events) this.analytics.record(type, payload, roomId);
  }

  /** Sends every socket in the room its own projection, tagged with one shared revision. */
  private broadcast(state: RoomState): void {
    const rev = (this.revisions.get(state.code) ?? 0) + 1;
    this.revisions.set(state.code, rev);
    const known = new Set(state.players.map((p) => p.id));
    for (const [socketId, binding] of this.bindings) {
      if (binding.code !== state.code) continue;
      if (binding.playerId && !known.has(binding.playerId)) {
        // Removed from the room (grace period ran out in the lobby): stop updating that phone.
        this.bindings.delete(socketId);
        continue;
      }
      this.sendView(socketId, state, binding.playerId, rev);
    }
  }

  private sendView(socketId: string, state: RoomState, playerId: string | null, rev: number): void {
    const now = this.now();
    const view = playerId
      ? projectStateForPlayer(state, playerId, now)
      : projectStateForTv(state, now);
    const sync: StateSync = { rev, serverNow: now, view };
    this.broadcaster?.send(socketId, S2C.stateSync, sync);
  }

  // ── bookkeeping ────────────────────────────────────────────────────────────────────────────

  private socketsOf(code: string, playerId: string): string[] {
    return [...this.bindings]
      .filter(([, b]) => b.code === code && b.playerId === playerId)
      .map(([socketId]) => socketId);
  }

  /** A player is gone for good (left or kicked): unbind their phones, burn their sessions. */
  private async forget(code: string, playerId: string, notify: string | null): Promise<void> {
    for (const socketId of this.socketsOf(code, playerId)) {
      if (notify) this.broadcaster?.send(socketId, notify, {});
      this.bindings.delete(socketId);
    }
    await this.sessions.deleteWhere((s) => s.code === code && s.playerId === playerId);
  }

  /** The socket is moving to another room (or seat): leave the old one cleanly first. */
  private async detach(socketId: string): Promise<void> {
    if (this.bindings.has(socketId)) await this.socketDisconnected(socketId);
  }

  private async close(code: string, reason: ErrorCode | null): Promise<void> {
    const timer = this.timers.get(code);
    if (timer) clearTimeout(timer);
    this.timers.delete(code);
    for (const [socketId, binding] of this.bindings) {
      if (binding.code !== code) continue;
      if (reason) this.broadcaster?.send(socketId, S2C.error, ackError(reason).error);
      this.bindings.delete(socketId);
    }
    await this.sessions.deleteWhere((s) => s.code === code);
    await this.store.delete(code);
    this.revisions.delete(code);
    this.analyticsIds.delete(code);
    this.queues.delete(code);
  }

  private async freshCode(): Promise<string> {
    const taken = new Set(await this.store.codes());
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = this.newCode();
      if (!taken.has(code)) return code;
    }
    throw new Error('no free room code');
  }
}
