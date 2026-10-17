'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';
import { check } from './icon-data';

type Option<T extends string> = { value: T; label: string; hint?: string };

type SegmentedProps<T extends string> = {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
};

/** Radio group drawn as one chunky block (timer presets). Arrow keys move the selection. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex rounded-card bg-raised lift ink-border"
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative flex min-h-14 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-2 text-[1.0625rem] leading-tight font-bold no-callout focus-visible:z-10',
              index > 0 && 'border-l-[length:var(--stroke)] border-line',
              index === 0 && 'rounded-l-[calc(var(--radius-card)-var(--stroke))]',
              index === options.length - 1 && 'rounded-r-[calc(var(--radius-card)-var(--stroke))]',
              selected ? 'bg-tsenher text-ink' : 'text-fg',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {selected && <Icon icon={check} size={16} />}
              {option.label}
            </span>
            {option.hint && (
              <span
                className={cn(
                  'tabular text-xs font-semibold',
                  selected ? 'text-ink' : 'text-fg-muted',
                )}
              >
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
