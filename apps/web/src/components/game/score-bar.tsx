import type { CSSProperties } from 'react';
import { mn } from '@/i18n/mn';
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
}: {
  name: string;
  animal: AnimalId;
  color: string;
  score: number;
  max: number;
  /** Stagger index for the grow-in. */
  order?: number;
}) {
  const share = max > 0 ? Math.max(0.06, score / max) : 0.06;
  return (
    <li className="flex items-center gap-3">
      <Avatar animal={animal} color={color} size={44} label={name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[0.9375rem] font-bold">{name}</span>
        <div className="h-7 overflow-hidden rounded-[6px] bg-raised ink-border">
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
      <span className="w-12 text-right font-display tabular text-[1.5rem] leading-none font-extrabold">
        {score}
        <span className="sr-only"> {mn.result.points}</span>
      </span>
    </li>
  );
}
