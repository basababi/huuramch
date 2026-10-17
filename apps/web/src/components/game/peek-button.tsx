'use client';

import type { SecretView } from '@khuuramch/game-core';
import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { eye } from '../ui/icon-data';

/**
 * "Үгээ дахин харах": forgot the word mid-round? Hold to see it, release to hide — same rule as
 * the role card, so it is never left open on the table.
 */
export function PeekButton({
  secret,
  className,
}: {
  secret: SecretView | null;
  className?: string;
}) {
  const [held, setHeld] = useState(false);
  if (!secret) return null;
  const text =
    secret.kind === 'word'
      ? secret.word
      : `${mn.roleCard.imposter}${secret.category ? ` · ${mn.categories[secret.category]}` : ''}`;

  return (
    <button
      type="button"
      data-peek
      aria-pressed={held}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setHeld(true);
      }}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onLostPointerCapture={() => setHeld(false)}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault();
          setHeld(true);
        }
      }}
      onKeyUp={() => setHeld(false)}
      onBlur={() => setHeld(false)}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        'inline-flex min-h-12 touch-none items-center justify-center gap-2 rounded-pill px-4 text-base font-bold no-callout ink-border',
        held ? 'bg-raised text-fg' : 'bg-transparent text-fg',
        className,
      )}
    >
      <Icon icon={eye} size={20} />
      {held ? (
        // 20px bold: large text, so red keeps AA contrast on the dark surface (DECISIONS D-005).
        <span
          className={cn(
            'font-display text-[1.25rem] font-extrabold',
            secret.kind === 'imposter' && 'text-al',
          )}
        >
          {text}
        </span>
      ) : (
        <span>{mn.roleCard.peek}</span>
      )}
    </button>
  );
}
