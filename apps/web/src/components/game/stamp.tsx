'use client';

import * as m from 'motion/react-m';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';

type StampProps = {
  kind: 'imposter' | 'civilian';
  /** Slam in on mount. False renders the landed state (re-renders, screenshots). */
  slam?: boolean;
  size?: 'phone' | 'tv';
  /** Called as the stamp hits: trigger the screen shake, haptics and sound there. */
  onLand?: () => void;
  className?: string;
};

/**
 * Rubber stamp for the reveal (§5.8): ХУУРАМЧ! in red or ЭНГИЙН in blue, double rule, ink gaps.
 * The word itself carries the meaning, so colour is never the only signal (§7).
 * Reduced motion: MotionConfig drops the scale/rotate and keeps a plain fade.
 */
export function Stamp({ kind, slam = true, size = 'phone', onLand, className }: StampProps) {
  const text = kind === 'imposter' ? mn.reveal.imposter : mn.reveal.civilian;

  return (
    <m.div
      role="img"
      aria-label={text}
      initial={slam ? { scale: 2.6, opacity: 0, rotate: -15 } : false}
      animate={{ scale: 1, opacity: 1, rotate: -7 }}
      transition={{ duration: 0.2, ease: [0.55, 0, 1, 0.45] }}
      onAnimationComplete={() => onLand?.()}
      className={cn(
        'relative inline-block select-none',
        kind === 'imposter' ? 'text-al' : 'text-tenger',
        className,
      )}
    >
      <span
        className={cn(
          'block rounded-card border-current font-display leading-none font-black tracking-[-0.01em] uppercase',
          '[box-shadow:inset_0_0_0_var(--gap)_var(--stamp-bg,var(--surface)),inset_0_0_0_calc(var(--gap)*2)_currentColor]',
          size === 'tv'
            ? 'border-[10px] px-10 py-5 text-[7.5rem] [--gap:6px]'
            : 'border-[6px] px-4 py-2.5 text-[2.25rem] [--gap:4px]',
        )}
      >
        {text}
      </span>
      <Speckle />
    </m.div>
  );
}

/* Deterministic "ink didn't take" gaps: small knock-outs in the background colour. */
const SPECKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [6, 14, 1.6, 1],
  [12, 72, 1.1, 0.8],
  [19, 40, 0.9, 1.3],
  [24, 86, 1.4, 0.9],
  [31, 22, 0.8, 0.8],
  [37, 64, 1.2, 1.1],
  [43, 9, 1.5, 0.7],
  [49, 78, 0.9, 1.2],
  [55, 35, 1.3, 0.9],
  [61, 90, 1.1, 0.8],
  [66, 18, 0.9, 1.1],
  [72, 58, 1.6, 1],
  [78, 82, 0.8, 0.8],
  [83, 28, 1.2, 1.3],
  [89, 66, 1, 0.9],
  [94, 12, 1.4, 1],
  [9, 50, 0.7, 0.7],
  [28, 52, 0.6, 0.9],
  [52, 60, 0.7, 0.6],
  [68, 42, 0.6, 0.8],
  [86, 46, 0.8, 0.6],
  [15, 92, 0.9, 0.7],
  [46, 94, 0.7, 0.9],
  [75, 6, 0.8, 0.7],
  [97, 74, 0.7, 1],
];

function Speckle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 size-full"
    >
      {SPECKS.map(([x, y, rx, ry], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx={rx}
          ry={ry * 2.4}
          fill="var(--stamp-bg, var(--surface))"
        />
      ))}
    </svg>
  );
}

/** Screen shake on landing: ≤ 4px, ~260 ms, Web Animations API (transform only, no bundle). */
export function shake(element: HTMLElement | null) {
  if (!element) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  element.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-4px, 2px)' },
      { transform: 'translate(4px, -2px)' },
      { transform: 'translate(-3px, -1px)' },
      { transform: 'translate(2px, 1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}
