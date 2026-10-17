'use client';

import type { PublicView } from '@khuuramch/game-core';
import { useGame } from '@/store/game';
import { TimerRing } from '../game/timer-ring';

/** The current phase's countdown, drawn from the server deadline and the clock offset. */
export function PhaseTimer({ view, size = 132 }: { view: PublicView; size?: number }) {
  const offset = useGame((s) => s.clockOffset);
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
