import type { ComponentProps, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type CardTone = 'raised' | 'surface' | 'tenger' | 'al' | 'alt' | 'nogoon' | 'tsenher';

const tones: Record<CardTone, string> = {
  raised: 'bg-raised text-fg',
  surface: 'bg-surface text-fg',
  tenger: 'bg-tenger text-paper',
  al: 'bg-al text-paper',
  alt: 'bg-alt on-light',
  nogoon: 'bg-nogoon on-light',
  tsenher: 'bg-tsenher on-light',
};

type CardProps<T extends ElementType> = {
  as?: T;
  tone?: CardTone;
  /** Flat cards drop the hard shadow: calm surfaces, nested panels. */
  flat?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, 'as' | 'className' | 'children'>;

export function Card<T extends ElementType = 'div'>({
  as,
  tone = 'raised',
  flat = false,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Tag: ElementType = as ?? 'div';
  return (
    <Tag
      className={cn('rounded-card ink-border', !flat && 'lift', tones[tone], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
