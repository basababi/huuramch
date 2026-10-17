'use client';

import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { checkFat } from '../ui/icon-data';
import { TimerRing } from './timer-ring';

type Timer = {
  deadline: number;
  durationMs: number;
  clockOffsetMs?: number;
  frozenRemainingMs?: number;
};

/**
 * The loudest phone state (§5.5): the whole screen turns yellow with ЧИНИЙ ЭЭЛЖ and a big
 * Дууслаа button in thumb reach. `framed` draws it as a card for the sandbox.
 */
export function YourTurn({
  timer,
  onDone,
  framed = false,
  busy = false,
  className,
}: {
  /** Omitted when the room plays without a per-turn timer. */
  timer?: Timer | null;
  onDone?: () => void;
  framed?: boolean;
  busy?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-between gap-6 bg-alt px-5 pt-8 pb-5 on-light',
        framed && 'rounded-card lift ink-border',
        className,
      )}
    >
      <h2 className="text-center font-display text-[3.25rem] leading-[0.92] font-black tracking-[-0.02em]">
        {mn.turn.yourTurn.split(' ')[0]}
        <br />
        {mn.turn.yourTurn.split(' ')[1]}
      </h2>
      {timer && (
        <TimerRing
          deadline={timer.deadline}
          durationMs={timer.durationMs}
          clockOffsetMs={timer.clockOffsetMs}
          frozenRemainingMs={timer.frozenRemainingMs}
          size={150}
          tone="ink"
        />
      )}
      <p className="text-center text-lg leading-snug font-bold">{mn.turn.yourTurnHint}</p>
      <Button
        tone="ink"
        size="lg"
        block
        busy={busy}
        onClick={onDone}
        iconStart={<Icon icon={checkFat} />}
      >
        {mn.turn.done}
      </Button>
    </section>
  );
}
