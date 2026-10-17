'use client';

import { useEffect } from 'react';

type WakeLockSentinelLike = { release(): Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> };
};

/**
 * Keeps the screen on during a game (§5): phones must not sleep mid-round. Feature-detected; the
 * lock is re-taken when the tab becomes visible again (browsers drop it on hide).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!active || !nav.wakeLock) return;
    let lock: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await nav.wakeLock?.request('screen');
        if (cancelled) await next?.release();
        else lock = next ?? null;
      } catch {
        // Battery saver or an unsupported WebView: the game still works, the screen may dim.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [active]);
}
