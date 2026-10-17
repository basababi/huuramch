'use client';

import type { PublicView } from '@khuuramch/game-core';
import { useCountdownTicks } from '@/lib/sound';
import { useNow } from '@/lib/use-now';
import { useGame } from '@/store/game';
import { TimerRing } from '../game/timer-ring';
import { useRoomSound } from './use-room-sound';

/** The current phase's countdown, drawn from the server deadline and the clock offset. */
export function PhaseTimer({ view, size = 132 }: { view: PublicView; size?: number }) {
  const offset = useGame((s) => s.clockOffset);
  const now = useNow();
  const sound = useRoomSound();
  const seconds =
    view.deadline === null || now === 0 ? null : Math.ceil((view.deadline - (now + offset)) / 1000);
  // The last five seconds tick on the TV and the host's phone (§5).
  useCountdownTicks(seconds, sound);
  if (view.deadline === null) return null;
  return (
    <TimerRing
      deadline={view.deadline}
      durationMs={Math.max(1, view.deadline - view.phaseStartedAt)}
      clockOffsetMs={offset}
      size={size}
    />
  );
}
