import type { AnimalId } from '@khuuramch/game-core';
import { readStorage, writeStorage } from './storage';

/** Per-room seat, so a phone that slept or lost Wi-Fi rejoins as the same player (§2.5). */
export type Session = { code: string; playerId: string; sessionToken: string };

const sessionKey = (code: string) => `khuuramch:session:${code}`;
const PROFILE_KEY = 'khuuramch:profile';

export function loadSession(code: string): Session | null {
  const raw = readStorage(sessionKey(code));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (parsed.code === code && parsed.playerId && parsed.sessionToken) return parsed as Session;
  } catch {
    // Corrupt entry: treat as no session.
  }
  return null;
}

export function saveSession(session: Session): void {
  writeStorage(sessionKey(session.code), JSON.stringify(session));
}

export function clearSession(code: string): void {
  writeStorage(sessionKey(code), null);
}

/** Last nickname and animal, so the next room's form is already filled in. */
export type Profile = { nickname: string; animal: AnimalId | null };

export function loadProfile(): Profile {
  try {
    const parsed = JSON.parse(readStorage(PROFILE_KEY) ?? '{}') as Partial<Profile>;
    return { nickname: parsed.nickname ?? '', animal: parsed.animal ?? null };
  } catch {
    return { nickname: '', animal: null };
  }
}

export function saveProfile(profile: Profile): void {
  writeStorage(PROFILE_KEY, JSON.stringify(profile));
}
