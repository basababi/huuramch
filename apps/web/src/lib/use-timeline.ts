'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** How many of `times` (ms after `origin`, local clock) have passed at `now`. */
export function passedSteps(origin: number, times: readonly number[], now: number): number {
  let n = 0;
  for (const t of times) if (origin + t <= now) n += 1;
  return n;
}

/**
 * A scripted sequence pinned to a server moment (`origin` = phaseStartedAt − clockOffset), so the
 * vote reveal lands at the same instant on every phone and the TV. Re-renders only when another
 * step passes — no per-frame work on low-end phones. A screen opened late starts mid-sequence.
 */
export function useTimeline(origin: number, times: readonly number[]): number {
  const subscribe = useCallback(
    (notify: () => void) => {
      const now = Date.now();
      const timers = times
        .filter((t) => origin + t > now)
        .map((t) => setTimeout(notify, origin + t - now + 4));
      return () => timers.forEach(clearTimeout);
    },
    [origin, times],
  );
  const snapshot = useCallback(() => passedSteps(origin, times, Date.now()), [origin, times]);
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
