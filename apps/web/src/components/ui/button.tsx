import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './icon';
import { spinner } from './icon-data';

export type ButtonTone = 'primary' | 'secondary' | 'danger' | 'success' | 'highlight' | 'ink';
export type ButtonSize = 'lg' | 'md';

/*
 * Text colours follow the contrast table in DECISIONS.md: paper on tenger/al/ink, ink on the
 * light fills. Labels are ≥ 19px bold, which makes paper-on-al (4.1:1) WCAG AA "large text".
 */
const tones: Record<ButtonTone, string> = {
  primary: 'bg-tenger text-paper',
  secondary: 'bg-raised text-fg',
  danger: 'bg-al text-paper',
  success: 'bg-nogoon text-ink',
  highlight: 'bg-alt text-ink',
  ink: 'bg-ink text-paper',
};

const sizes: Record<ButtonSize | 'none', string> = {
  lg: 'min-h-14 gap-2.5 px-6 text-[1.25rem]',
  md: 'min-h-12 gap-2 px-5 text-[1.1875rem]',
  none: '',
};

export function buttonClass({
  tone = 'primary',
  size = 'lg',
  block = false,
  className,
}: {
  tone?: ButtonTone;
  /** `none` leaves sizing to the caller (icon buttons). */
  size?: ButtonSize | 'none';
  block?: boolean;
  className?: string;
}) {
  return cn(
    'inline-flex pressable touch-manipulation items-center justify-center rounded-card font-sans leading-tight font-bold lift no-callout ink-border',
    'disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-fg-muted disabled:[box-shadow:none]',
    'aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:bg-transparent aria-disabled:text-fg-muted aria-disabled:[box-shadow:none]',
    tones[tone],
    sizes[size],
    block && 'w-full',
    className,
  );
}

type ButtonOwnProps = {
  tone?: ButtonTone;
  size?: ButtonSize;
  block?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  busy?: boolean;
};

export function Button({
  tone,
  size,
  block,
  iconStart,
  iconEnd,
  busy = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonOwnProps & ComponentProps<'button'>) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      className={buttonClass({ tone, size, block, className })}
      {...props}
    >
      {busy ? <Icon icon={spinner} className="animate-spin" /> : iconStart}
      <span>{children}</span>
      {iconEnd}
    </button>
  );
}

export function ButtonLink({
  tone,
  size,
  block,
  iconStart,
  iconEnd,
  className,
  children,
  ...props
}: Omit<ButtonOwnProps, 'busy'> & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ tone, size, block, className })} {...props}>
      {iconStart}
      <span>{children}</span>
      {iconEnd}
    </Link>
  );
}
