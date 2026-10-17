'use client';

import * as m from 'motion/react-m';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { FitWord } from './fit-word';

type Size = 'phone' | 'tv';

/**
 * Game end (§2.3.7, §5.8): both words, face down, flip over side by side — civilians' word in blue,
 * the imposters' in red. Mode A shows the one secret word the same way. Labels sit above the cards
 * on the page surface: small text on red would miss AA contrast.
 */
export function WordReveal({
  wordA,
  wordB,
  category,
  size = 'phone',
}: {
  wordA: string;
  /** Mode B only. */
  wordB: string | null;
  category: string;
  size?: Size;
}) {
  return (
    <div className={cn('flex flex-col', size === 'tv' ? 'gap-6' : 'gap-3')}>
      <div
        className={cn(
          'grid [perspective:1200px]',
          size === 'tv' ? 'gap-10' : 'gap-3',
          wordB !== null && 'grid-cols-2',
        )}
      >
        <FlipCard
          label={wordB !== null ? mn.result.civilianWord : mn.result.word}
          word={wordA}
          tone="civilian"
          delay={0.35}
          size={size}
        />
        {wordB !== null && (
          <FlipCard
            label={mn.result.imposterWord}
            word={wordB}
            tone="imposter"
            delay={0.75}
            size={size}
          />
        )}
      </div>
      <p
        className={cn(
          'text-center font-bold text-fg-muted',
          size === 'tv' ? 'text-[1.75rem]' : 'text-base',
        )}
      >
        {mn.roleCard.category}: {category}
      </p>
    </div>
  );
}

function FlipCard({
  label,
  word,
  tone,
  delay,
  size,
}: {
  label: string;
  word: string;
  tone: 'civilian' | 'imposter';
  delay: number;
  size: Size;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col', size === 'tv' ? 'gap-4' : 'gap-2')}>
      <p
        className={cn(
          'font-bold tracking-[0.08em] text-fg-muted uppercase',
          size === 'tv' ? 'text-[1.5rem]' : 'text-xs',
        )}
      >
        {label}
      </p>
      <m.div
        className={cn(
          'relative [transform-style:preserve-3d]',
          size === 'tv' ? 'h-[15rem]' : 'h-[7.5rem]',
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ delay, duration: 0.42, ease: [0.3, 0, 0.2, 1] }}
      >
        <div
          className={cn(
            'absolute inset-0 flex items-center rounded-card text-paper lift backface-hidden ink-border',
            tone === 'civilian' ? 'bg-tenger' : 'bg-al',
            size === 'tv' ? 'px-8' : 'px-3.5',
          )}
        >
          {/* ≥ 20px extra-bold: large text, so paper on red keeps AA (4.1:1). */}
          <FitWord word={word} min={size === 'tv' ? 56 : 20} max={size === 'tv' ? 120 : 44} />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 grid [transform:rotateY(180deg)] place-items-center rounded-card bg-ink text-paper lift backface-hidden ink-border"
        >
          <span
            className={cn(
              'font-display leading-none font-black',
              size === 'tv' ? 'text-[8rem]' : 'text-[4rem]',
            )}
          >
            ?
          </span>
        </div>
      </m.div>
    </div>
  );
}
