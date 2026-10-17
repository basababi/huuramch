'use client';

import type { CSSProperties } from 'react';
import { COLORS } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { useNow } from '@/lib/use-now';
import { RING_SEGMENTS, ringSegments, timerState } from './timer-math';

const SEGMENT_PATHS = ringSegments();

/** A dark island inside light panels; inline so it always beats the panel's inherited roles. */
const INK_DISC = {
  '--raised': COLORS.ink,
  '--fg': COLORS.paper,
  '--line': COLORS.ink,
} as CSSProperties;

type TimerRingProps = {
  /** Server deadline (epoch ms). */
  deadline: number;
  durationMs: number;
  /** serverNow − Date.now(), measured on connect. */
  clockOffsetMs?: number;
  /** Pin the ring to a moment (sandbox, screenshots). */
  frozenRemainingMs?: number;
  size?: number;
  /** `ink`: a solid ink disc with paper digits, for yellow screens. */
  tone?: 'surface' | 'ink';
  className?: string;
};

/**
 * Chunky countdown (§5.5): twenty yellow blocks drop out clockwise from 12 o'clock; the last five
 * seconds turn red and the number kicks on every tick. The server owns the deadline — this only
 * renders `deadline − (now + offset)`.
 */
export function TimerRing({
  deadline,
  durationMs,
  clockOffsetMs = 0,
  frozenRemainingMs,
  size = 168,
  tone = 'surface',
  className,
}: TimerRingProps) {
  const now = useNow();
  const remaining =
    frozenRemainingMs ?? (now === 0 ? durationMs : deadline - (now + clockOffsetMs));
  const { seconds, visible, urgent } = timerState(remaining, durationMs);
  const firstStanding = RING_SEGMENTS - visible;

  return (
    <div
      role="timer"
      aria-label={mn.timer.secondsLeft(seconds)}
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size, ...(tone === 'ink' ? INK_DISC : null) }}
    >
      <span
        aria-hidden
        className="absolute inset-0 translate-x-(--lift) translate-y-(--lift) rounded-pill bg-line"
      />
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full">
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="var(--raised)"
          stroke="var(--line)"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 'var(--stroke)' }}
        />
        {SEGMENT_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            stroke={COLORS.ink}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className={cn(
              '[transform-origin:center] transition-[opacity,transform] duration-200 ease-out [transform-box:fill-box]',
              urgent ? 'fill-al' : 'fill-alt',
              i < firstStanding && 'scale-50 opacity-0',
            )}
          />
        ))}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="var(--raised)"
          stroke="var(--line)"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 'var(--stroke)' }}
        />
      </svg>
      <span
        key={urgent ? seconds : 'steady'}
        className={cn(
          'relative font-display tabular leading-none font-extrabold',
          urgent ? 'animate-tick text-al' : 'text-fg',
        )}
        style={{ fontSize: size * 0.27 }}
      >
        {seconds}
      </span>
    </div>
  );
}
