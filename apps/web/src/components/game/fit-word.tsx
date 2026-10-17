'use client';

import { cn } from '@/lib/cn';
import { useFitText } from '@/lib/fit-text';

/** A revealed word sized to its box: one line when it fits, wrapping at spaces, never an ellipsis. */
export function FitWord({
  word,
  min,
  max,
  className,
}: {
  word: string;
  min: number;
  max: number;
  className?: string;
}) {
  const { ref, fontSize, wrap } = useFitText(word, { min, max });
  return (
    <div ref={ref} className={cn('w-full font-display font-extrabold', className)}>
      <p
        className="leading-[1.02] tracking-[-0.01em] [text-wrap:balance]"
        style={{ fontSize, whiteSpace: wrap ? 'normal' : 'nowrap' }}
      >
        {word}
      </p>
    </div>
  );
}
