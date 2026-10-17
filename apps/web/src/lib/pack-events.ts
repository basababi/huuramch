import type { LockedPackId } from '@khuuramch/game-core';
import { serverUrl } from './server-url';

/** Anonymous interest in a locked pack (§9). Fire-and-forget: never blocks the UI. */
export function sendPackEvent(type: 'pack_viewed_locked' | 'pack_interest', packId: LockedPackId) {
  try {
    void fetch(`${serverUrl()}/api/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, packId }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the game.
  }
}
