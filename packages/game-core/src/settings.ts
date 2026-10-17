import { CATEGORY_IDS, MAX_IMPOSTERS, TIMER_PRESETS, type CategoryId } from './constants';
import type { RoomSettings } from './types';

export const DEFAULT_SETTINGS: RoomSettings = {
  mode: 'A',
  categories: [...CATEGORY_IDS],
  imposterCount: 'auto',
  showCategoryHint: true,
  timerPreset: 'normal',
  turnTimer: true,
};

function isCategory(value: unknown): value is CategoryId {
  return (CATEGORY_IDS as readonly unknown[]).includes(value);
}

/** Applies a partial update; returns null when the result would be invalid. */
export function mergeSettings(
  current: RoomSettings,
  patch: Partial<RoomSettings>,
): RoomSettings | null {
  const next: RoomSettings = { ...current, ...patch };
  if (next.mode !== 'A' && next.mode !== 'B') return null;
  if (!Array.isArray(next.categories) || next.categories.length === 0) return null;
  if (!next.categories.every(isCategory)) return null;
  if (new Set(next.categories).size !== next.categories.length) return null;
  if (
    next.imposterCount !== 'auto' &&
    !(
      Number.isInteger(next.imposterCount) &&
      next.imposterCount >= 1 &&
      next.imposterCount <= MAX_IMPOSTERS
    )
  ) {
    return null;
  }
  if (typeof next.showCategoryHint !== 'boolean' || typeof next.turnTimer !== 'boolean')
    return null;
  if (!(next.timerPreset in TIMER_PRESETS)) return null;
  return { ...next, categories: [...next.categories] };
}

/**
 * §2.1: 1 imposter for 3–6 players, 2 for 7–12; a host override (1–3) is honoured only while
 * imposters stay fewer than half of the players.
 */
export function imposterCountFor(players: number, setting: RoomSettings['imposterCount']): number {
  const fewerThanHalf = Math.max(1, Math.floor((players - 1) / 2));
  const wanted = setting === 'auto' ? (players >= 7 ? 2 : 1) : setting;
  return Math.min(wanted, fewerThanHalf);
}
