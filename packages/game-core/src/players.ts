import { DURATIONS, MAX_PLAYERS } from './constants';
import type { Player, PlayerStats, RoomState } from './types';

export function emptyStats(): PlayerStats {
  return { imposterPoints: 0, correctVotes: 0, civilianEliminations: 0 };
}

export function findPlayer(state: RoomState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

/** Gone for good: left on purpose, or disconnected for longer than the grace period. */
export function isAbsent(player: Player, now: number): boolean {
  if (player.left) return true;
  return (
    !player.connected &&
    player.disconnectedAt !== null &&
    now - player.disconnectedAt >= DURATIONS.graceMs
  );
}

/** Lowest free seat 0–11: seats map to avatar colours, so they are reused when people leave. */
export function nextSeat(players: readonly Player[]): number {
  const taken = new Set(players.map((p) => p.seat));
  let seat = 0;
  while (seat < MAX_PLAYERS && taken.has(seat)) seat++;
  return seat;
}

/** Earliest-joined player who is still around, preferring connected ones. */
function successor(state: RoomState, now: number, exclude: string): Player | undefined {
  const candidates = state.players
    .filter((p) => p.id !== exclude && !isAbsent(p, now))
    .sort((a, b) => a.joinedAt - b.joinedAt);
  return candidates.find((p) => p.connected) ?? candidates[0];
}

/** §2.5: when the host is gone, the role moves to the earliest-joined connected player. */
export function migrateHostIfNeeded(state: RoomState, now: number): void {
  const host = findPlayer(state, state.hostId);
  if (host && !isAbsent(host, now)) return;
  const next = successor(state, now, state.hostId);
  if (next) state.hostId = next.id;
}

export function removePlayer(state: RoomState, id: string, now: number): void {
  const wasHost = state.hostId === id;
  state.players = state.players.filter((p) => p.id !== id);
  if (wasHost) state.hostId = successor(state, now, id)?.id ?? state.players[0]?.id ?? '';
}
