import type { ComponentProps } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from './icon';
import { check, lock } from './icon-data';

type ChipProps = {
  selected?: boolean;
  /** Premium pack: shown with a lock and "Удахгүй"; tapping opens the waitlist sheet. */
  locked?: boolean;
} & ComponentProps<'button'>;

/**
 * Category chip. Selection is never colour-only: selected chips rise (hard shadow), fill with
 * tsenher and gain a check mark; locked chips are dashed with a lock and a "soon" tag.
 */
export function Chip({
  selected = false,
  locked = false,
  className,
  children,
  type = 'button',
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={locked ? undefined : selected}
      className={cn(
        'inline-flex min-h-12 pressable touch-manipulation items-center gap-2 rounded-pill border-[length:var(--stroke)] border-line px-4 text-[0.9375rem] leading-none font-semibold no-callout',
        selected && !locked && 'bg-tsenher text-ink lift-sm',
        !selected && !locked && 'bg-transparent text-fg',
        locked && 'border-dashed bg-transparent text-fg-muted',
        className,
      )}
      {...props}
    >
      {selected && !locked && <Icon icon={check} size={18} />}
      {locked && <Icon icon={lock} size={18} />}
      <span>{children}</span>
      {locked && (
        <span className="rounded-pill bg-alt px-2 py-1 text-xs leading-none font-bold text-ink">
          {mn.settings.locked}
        </span>
      )}
    </button>
  );
}
