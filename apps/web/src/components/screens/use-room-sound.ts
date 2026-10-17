'use client';

import { useSoundOn } from '@/lib/sound';
import { useGame } from '@/store/game';

/** Sound plays on the TV and the host's phone by default; players' phones stay silent (§5). */
export function useRoomSound(): boolean {
  const defaultOn = useGame((s) => s.mode === 'tv' || Boolean(s.view?.me.isHost));
  return useSoundOn(defaultOn);
}
