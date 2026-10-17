import type { CSSProperties } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { ANIMAL_ART, ANIMAL_IDS, INK, type AnimalId } from './animals';

const CLIP_ID = 'k-avatar-clip';

/** Rendered once in the root layout: the circle every avatar clips its art to. */
export function AvatarDefs() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id={CLIP_ID}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
    </svg>
  );
}

type AvatarProps = {
  animal: AnimalId;
  /** Seat colour from `avatarColor(seat)`. */
  color: string;
  size?: number;
  /** X eyes + desaturated (§6.6). */
  eliminated?: boolean;
  /** Blink + gentle bob while waiting. Off automatically for reduced motion. */
  idle?: boolean;
  /** Accessible name; defaults to the animal's Mongolian name. */
  label?: string;
  /** Inside something that already names it (a labelled button): hidden from assistive tech. */
  decorative?: boolean;
  className?: string;
};

export function Avatar({
  animal,
  color,
  size = 56,
  eliminated = false,
  idle = false,
  label,
  decorative = false,
  className,
}: AvatarProps) {
  const Art = ANIMAL_ART[animal];
  // Stagger blinks so a lobby full of avatars never blinks in unison.
  const delay = `${(ANIMAL_IDS.indexOf(animal) * 0.43) % 3.1}s`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label ?? mn.animals[animal] })}
      className={cn('k-avatar shrink-0', className)}
      data-idle={idle ? 'true' : undefined}
      data-eliminated={eliminated ? 'true' : undefined}
      style={{ '--blink-delay': delay } as CSSProperties}
    >
      <circle cx="32" cy="32" r="30" fill={color} />
      <g clipPath={`url(#${CLIP_ID})`}>
        <g
          className="k-art"
          stroke={INK}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <Art dead={eliminated} />
        </g>
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke="var(--line)" strokeWidth={3} />
    </svg>
  );
}
