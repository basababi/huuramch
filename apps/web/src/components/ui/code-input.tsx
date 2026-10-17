'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

type CodeInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  describedBy?: string;
};

/**
 * 4-digit room code. One real <input> (numeric keypad, paste, autofill all work) sits invisibly
 * over the cells. Digits only, so it behaves the same on Cyrillic keyboards. The active cell turns
 * yellow — that is the focus indicator.
 */
export function CodeInput({
  label,
  value,
  onChange,
  onComplete,
  length = 4,
  autoFocus,
  describedBy,
}: CodeInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative">
      <input
        id={id}
        data-focus-proxy
        aria-label={label}
        aria-describedby={describedBy}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        autoFocus={autoFocus}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, '').slice(0, length);
          onChange(next);
          if (next.length === length) onComplete?.(next);
        }}
        className="absolute inset-0 z-10 size-full cursor-text text-base opacity-0"
      />
      <div
        aria-hidden
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }}
      >
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          const caret = focused && i === activeIndex && value.length < length;
          // The cell the next digit lands in (or the last one when full) is the focus indicator.
          const active = focused && i === activeIndex;
          return (
            <div
              key={i}
              className={cn(
                'flex h-16 items-center justify-center rounded-card font-display tabular text-[2rem] leading-none font-extrabold ink-border',
                digit && 'lift-sm',
                active ? 'bg-alt text-ink' : digit ? 'bg-raised text-fg' : 'bg-transparent text-fg',
              )}
            >
              {digit ?? (caret ? <span className="h-8 w-[3px] animate-caret bg-ink" /> : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
