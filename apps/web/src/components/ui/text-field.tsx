'use client';

import { useId, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';
import { warning } from './icon-data';

type TextFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onValueChange: (value: string) => void;
  maxChars?: number;
} & Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'id'>;

export function TextField({
  label,
  hint,
  error,
  value,
  onValueChange,
  maxChars,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const count = [...value].length;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.9375rem] font-bold">
          {label}
        </label>
        {maxChars !== undefined && (
          <span aria-hidden className="tabular text-sm font-semibold text-fg-muted">
            {count}/{maxChars}
          </span>
        )}
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        className={cn(
          'min-h-14 rounded-card border-[length:var(--stroke)] border-line bg-raised px-4 text-lg font-semibold text-fg placeholder:text-fg-muted',
          error ? 'border-dashed' : 'border-solid',
        )}
        {...props}
      />
      {error ? (
        <p id={noteId} className="flex items-center gap-2 text-sm font-semibold">
          <Icon icon={warning} size={20} className="shrink-0 text-al" />
          {error}
        </p>
      ) : hint ? (
        <p id={noteId} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
