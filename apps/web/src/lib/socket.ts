'use client';

import {
  S2C,
  stateSyncSchema,
  type Ack,
  type AckError,
  type ClientEvent,
  type ClockAck,
  type StateSync,
} from '@khuuramch/protocol';
import { io, type Socket } from 'socket.io-client';
import { mn } from '@/i18n/mn';
import { serverUrl } from './server-url';

/*
 * The network layer: socket.io-client, the Zod protocol schemas and the state validation. The
 * game store loads this module with a dynamic import right after hydration, so ~30 KB of it stays
 * out of every page's initial JS (§7 budget) while the first paint is already on screen.
 */

let socket: Socket | null = null;

/**
 * One Socket.IO connection per tab. Socket.IO retries with backoff (0.5s → 5s, jittered); the
 * game store rejoins the room on every reconnect (§7 "auto-retry with backoff, automatic rejoin").
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(serverUrl(), {
    transports: ['websocket', 'polling'],
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 8000,
  });
  return socket;
}

/** Emits an event and resolves with the server's acknowledgement (or a timeout error). */
export function emitAck<T = Record<string, unknown>>(
  event: ClientEvent,
  payload: unknown = {},
  timeoutMs = 8000,
): Promise<Ack<T>> {
  const s = getSocket();
  return new Promise((resolve) => {
    s.timeout(timeoutMs).emit(event, payload, (error: Error | null, ack: Ack<T>) => {
      if (error || !ack) {
        resolve({ ok: false, error: { code: 'INTERNAL', message: mn.connection.timeout } });
      } else resolve(ack);
    });
  });
}

/**
 * Clock offset (server − client) from a few pings, using the fastest round trip (§3.1:
 * clients render `serverDeadline − clockOffset`).
 */
export async function measureClockOffset(samples = 3): Promise<number | null> {
  let best: { rtt: number; offset: number } | null = null;
  for (let i = 0; i < samples; i++) {
    const t0 = Date.now();
    const ack = await emitAck<ClockAck>('clock:ping', { t0 }, 4000);
    const t1 = Date.now();
    if (!ack.ok) continue;
    const rtt = t1 - t0;
    const offset = ack.data.serverNow - (t0 + rtt / 2);
    if (!best || rtt < best.rtt) best = { rtt, offset };
  }
  return best ? Math.round(best.offset) : null;
}

export type ServerHandlers = {
  connect(): void;
  disconnect(): void;
  /** A connection attempt failed (server down, Wi-Fi off); socket.io keeps retrying. */
  connectError(): void;
  /** Only states that pass the protocol schema arrive here (§3.2: both sides validate). */
  sync(data: StateSync): void;
  kicked(): void;
  error(error: AckError): void;
};

/** Wires the server's events to the store. Call once per tab. */
export function listen(handlers: ServerHandlers): void {
  const s = getSocket();
  s.on('connect', handlers.connect);
  s.on('disconnect', handlers.disconnect);
  s.on('connect_error', handlers.connectError);
  s.on(S2C.stateSync, (payload: unknown) => {
    const parsed = stateSyncSchema.safeParse(payload);
    if (!parsed.success) {
      console.error('[sync] rejected an invalid state from the server', parsed.error);
      return;
    }
    handlers.sync(parsed.data);
  });
  s.on(S2C.kicked, handlers.kicked);
  s.on(S2C.error, handlers.error);
}

/** Resolves once the socket is connected. */
export function whenConnected(): Promise<void> {
  const s = getSocket();
  if (s.connected) return Promise.resolve();
  return new Promise((resolve) => s.once('connect', () => resolve()));
}
