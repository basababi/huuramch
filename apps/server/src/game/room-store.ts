import type { RoomState } from '@khuuramch/game-core';

/**
 * Where room state lives (§3). In memory for the MVP; the interface is async so a Redis store can
 * replace it without touching the game logic or the room service.
 */
export interface RoomStore {
  get(code: string): Promise<RoomState | undefined>;
  set(state: RoomState): Promise<void>;
  delete(code: string): Promise<void>;
  codes(): Promise<string[]>;
}

export class InMemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomState>();

  async get(code: string) {
    return this.rooms.get(code);
  }

  async set(state: RoomState) {
    this.rooms.set(state.code, state);
  }

  async delete(code: string) {
    this.rooms.delete(code);
  }

  async codes() {
    return [...this.rooms.keys()];
  }
}

export type Session = { code: string; playerId: string };

/** sessionToken → seat in a room. Survives socket reconnects so a phone can rejoin (§2.5). */
export interface SessionStore {
  get(token: string): Promise<Session | undefined>;
  set(token: string, session: Session): Promise<void>;
  delete(token: string): Promise<void>;
  /** Drops every session of a room (room closed) or of one player (kicked, left). */
  deleteWhere(match: (session: Session) => boolean): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async get(token: string) {
    return this.sessions.get(token);
  }

  async set(token: string, session: Session) {
    this.sessions.set(token, session);
  }

  async delete(token: string) {
    this.sessions.delete(token);
  }

  async deleteWhere(match: (session: Session) => boolean) {
    for (const [token, session] of this.sessions) if (match(session)) this.sessions.delete(token);
  }
}
