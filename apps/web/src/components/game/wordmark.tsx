import type { ElementType } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';

/**
 * "ХУУРАМЧ" in the display face at Black with a red misregistered offset, like a two-colour screen
 * print, underlined by the ornament band (one of its three allowed placements, §6.5).
 * In Rubik 900 the word is 5.05em wide (+0.055em offset): `100cqw / 5.16` fills the container.
 */
export function Wordmark({
  as: Tag = 'h1',
  className,
  ornament = true,
}: {
  as?: ElementType;
  className?: string;
  ornament?: boolean;
}) {
  return (
    <div className={cn('@container flex w-full flex-col', className)}>
      <Tag className="font-display text-[min(calc(100cqw/5.16),9rem)] leading-[0.92] font-black tracking-[-0.02em] whitespace-nowrap text-fg [text-shadow:0.055em_0.055em_0_var(--color-al)]">
        {mn.app.name}
      </Tag>
      {ornament && <span aria-hidden className="mt-4 h-4 ornament text-alt tv:mt-6 tv:h-6" />}
    </div>
  );
}
