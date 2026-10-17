import type { CSSProperties } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import type { AnimalId } from './animals';
import { Avatar } from './avatar';

/** Chunky horizontal score bar (§5.10). The fill grows with transform: scaleX only. */
export function ScoreBar({
  name,
  animal,
  color,
  score,
  max,
  order = 0,
  size = 'phone',
}: {
  name: string;
  animal: AnimalId;
  color: string;
  score: number;
  max: number;
  /** Stagger index for the grow-in. */
  order?: number;
  size?: 'phone' | 'tv';
}) {
  const share = max > 0 ? Math.max(0.06, score / max) : 0.06;
  const tv = size === 'tv';
  return (
    <li className={cn('flex items-center', tv ? 'gap-6' : 'gap-3')}>
      <Avatar animal={animal} color={color} size={tv ? 88 : 44} label={name} />
      <div className={cn('flex min-w-0 flex-1 flex-col', tv ? 'gap-2' : 'gap-1')}>
        <span className={cn('truncate font-bold', tv ? 'text-[2rem]' : 'text-[0.9375rem]')}>
          {name}
        </span>
        <div
          className={cn('overflow-hidden rounded-[6px] bg-raised ink-border', tv ? 'h-12' : 'h-7')}
        >
          <div
            className="k-grow h-full origin-left border-r-[length:var(--stroke)] border-line"
            style={
              {
                width: `${share * 100}%`,
                backgroundColor: color,
                '--grow-delay': `${order * 70}ms`,
              } as CSSProperties
            }
          />
        </div>
      </div>
      <span
        className={cn(
          'text-right font-display tabular leading-none font-extrabold',
          tv ? 'w-28 text-[4rem]' : 'w-12 text-[1.5rem]',
        )}
      >
        {score}
        <span className="sr-only"> {mn.result.points}</span>
      </span>
    </li>
  );
}
