import type { ComponentProps } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { checkFat } from '../ui/icon-data';
import { INK, PAPER } from './animals';

/** Illustrations in the avatar style: paper faces, 3-unit ink lines, flat fills. */
function Face({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={PAPER} />
      <circle cx={cx - r * 0.36} cy={cy - r * 0.1} r={2.4} fill={INK} stroke="none" />
      <circle cx={cx + r * 0.36} cy={cy - r * 0.1} r={2.4} fill={INK} stroke="none" />
      <path d={`M${cx - r * 0.3} ${cy + r * 0.38}H${cx + r * 0.3}`} fill="none" />
    </g>
  );
}

function Bubble({
  x,
  y,
  w,
  h,
  tail,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tail: 'left' | 'right';
}) {
  const tx = tail === 'left' ? x + 10 : x + w - 10;
  const dx = tail === 'left' ? -6 : 6;
  return (
    <path
      d={`M${x + 8} ${y}H${x + w - 8}Q${x + w} ${y} ${x + w} ${y + 8}V${y + h - 8}Q${x + w} ${y + h} ${x + w - 8} ${y + h}H${tx + 6}L${tx + dx} ${y + h + 9}L${tx - 2} ${y + h}H${x + 8}Q${x} ${y + h} ${x} ${y + h - 8}V${y + 8}Q${x} ${y} ${x + 8} ${y}Z`}
      fill={PAPER}
    />
  );
}

export function ModeIllustration({ mode, className }: { mode: 'A' | 'B'; className?: string }) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden className={className}>
      <g stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {mode === 'A' ? (
          <>
            <Face cx={40} cy={54} r={17} />
            <Bubble x={62} y={8} w={40} h={32} tail="left" />
            <text
              x={82}
              y={33}
              textAnchor="middle"
              fill={INK}
              stroke="none"
              className="font-display"
              style={{ fontSize: 26, fontWeight: 900 }}
            >
              ?
            </text>
          </>
        ) : (
          <>
            <Face cx={30} cy={58} r={14} />
            <Face cx={90} cy={58} r={14} />
            <Bubble x={8} y={8} w={36} h={28} tail="right" />
            <Bubble x={76} y={8} w={36} h={28} tail="left" />
            <circle cx={26} cy={22} r={7} fill={INK} stroke="none" />
            <path d="M94 15L102 29H86Z" fill={INK} />
          </>
        )}
      </g>
    </svg>
  );
}

/** Large illustrated toggle card for the mode choice on /create (§5.2). */
export function ModeCard({
  mode,
  selected,
  className,
  ...props
}: { mode: 'A' | 'B'; selected: boolean } & Omit<ComponentProps<'button'>, 'children'>) {
  const copy = mn.modes[mode];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        'relative flex w-full pressable touch-manipulation items-center gap-4 rounded-card p-3 text-left no-callout ink-border',
        selected ? 'bg-tsenher text-ink selected-ring' : 'bg-raised text-fg',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'grid w-28 shrink-0 place-items-center rounded-[8px] p-1 ink-border',
          mode === 'A' ? 'bg-alt' : 'bg-nogoon',
          selected && 'border-ink',
        )}
      >
        <ModeIllustration mode={mode} className="h-auto w-full" />
      </span>
      <span className="flex min-w-0 flex-col gap-1 pr-6">
        <span className="font-display text-[1.0625rem] leading-tight font-extrabold">
          {copy.title}
        </span>
        <span
          className={cn('text-[0.9375rem] leading-snug font-medium', !selected && 'text-fg-muted')}
        >
          {copy.blurb}
        </span>
      </span>
      {selected && (
        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-pill bg-ink text-paper">
          <Icon icon={checkFat} size={16} />
        </span>
      )}
    </button>
  );
}
