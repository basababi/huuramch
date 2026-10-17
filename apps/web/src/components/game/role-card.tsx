'use client';

import * as m from 'motion/react-m';
import { useCallback, useState, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { useFitText } from '@/lib/fit-text';
import { Icon } from '../ui/icon';
import { handTap } from '../ui/icon-data';

export type RoleCardContent =
  | { mode: 'A'; role: 'civilian'; word: string; category: string }
  | { mode: 'A'; role: 'imposter'; category: string | null }
  /** Mode B: everyone just gets a word, imposter or not — identical layout (§2.3). */
  | { mode: 'B'; word: string };

type RoleCardProps = {
  content: RoleCardContent;
  /** Fired on the first reveal, e.g. to enable "Ойлголоо". */
  onReveal?: () => void;
  size?: 'phone' | 'tv';
  /** Sandbox/screenshots only: render the face up without holding. */
  forceRevealed?: boolean;
  className?: string;
};

/**
 * Press and hold to look, release to hide (§5.4) — so neighbours can't peek over a shoulder.
 * Pointer capture keeps the card revealed while the thumb wanders; any cancel hides it.
 * Keyboard: hold Space or Enter. With reduced motion, MotionConfig turns the flip into a cut.
 */
export function RoleCard({
  content,
  onReveal,
  size = 'phone',
  forceRevealed = false,
  className,
}: RoleCardProps) {
  const [held, setHeld] = useState(false);
  const revealed = held || forceRevealed;

  const show = useCallback(() => {
    setHeld(true);
    onReveal?.();
  }, [onReveal]);
  const hide = useCallback(() => setHeld(false), []);

  return (
    <div
      className={cn(
        'w-full [perspective:1200px]',
        size === 'tv' ? 'max-w-[30rem]' : 'max-w-[21rem]',
        className,
      )}
    >
      <button
        type="button"
        data-role-card
        aria-pressed={revealed}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          show();
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onLostPointerCapture={hide}
        onKeyDown={(event) => {
          if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            show();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') hide();
        }}
        onBlur={hide}
        onContextMenu={(event) => event.preventDefault()}
        className="relative block aspect-[5/7] w-full touch-none rounded-card text-left no-callout"
      >
        <m.div
          className="relative size-full [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.24, ease: [0.3, 0, 0.2, 1] }}
        >
          {/*
           * backface-visibility alone is not trusted with a secret (old Android WebViews get it
           * wrong): the hidden side is also visibility:hidden, switched at the flip's midpoint.
           */}
          <CardBack
            hidden={revealed}
            className={cn(
              'absolute inset-0 transition-[visibility] delay-120 duration-0 backface-hidden',
              revealed && 'invisible',
            )}
          />
          <CardFace
            content={content}
            size={size}
            hidden={!revealed}
            className={cn(
              'absolute inset-0 [transform:rotateY(180deg)] transition-[visibility] delay-120 duration-0 backface-hidden',
              !revealed && 'invisible',
            )}
          />
        </m.div>
      </button>
      <p aria-live="polite" className="sr-only">
        {revealed ? faceText(content) : ''}
      </p>
    </div>
  );
}

function faceText(content: RoleCardContent): string {
  if (content.mode === 'B') return `${mn.roleCard.yourWord}: ${content.word}`;
  if (content.role === 'imposter') return mn.roleCard.imposter;
  return `${mn.roleCard.secretWord}: ${content.word}`;
}

function CardBack({ hidden, className }: { hidden: boolean; className?: string }) {
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        'flex flex-col overflow-hidden rounded-card bg-tenger text-paper lift ink-border',
        className,
      )}
    >
      {/* ornament: top edge of the card back (§6.5) */}
      <div className="border-b-[length:var(--stroke)] border-line bg-ink px-2 py-2">
        <span aria-hidden className="block h-3.5 ornament text-alt" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span
          aria-hidden
          className="font-display text-[8rem] leading-none font-black [text-shadow:6px_6px_0_var(--color-ink)]"
        >
          ?
        </span>
      </div>
      <div className="flex items-center justify-center gap-2.5 px-4 pb-6 text-[1.25rem] font-bold">
        <Icon icon={handTap} size={28} />
        {mn.roleCard.holdToSee}
      </div>
    </div>
  );
}

function CardFace({
  content,
  size,
  hidden,
  className,
}: {
  content: RoleCardContent;
  size: 'phone' | 'tv';
  hidden: boolean;
  className?: string;
}) {
  let body: ReactNode;
  if (content.mode === 'A' && content.role === 'imposter') {
    body = (
      <>
        <FaceLabel>{mn.roleCard.noWord}</FaceLabel>
        {/* "ХУУРАМЧ" is 5.2em wide in the display face: size it to the card, never wider. */}
        <p className="font-display text-[min(calc(100cqw/5.3),5.5rem)] leading-[0.95] font-black text-al">
          {mn.roleCard.imposterLines[0]}
          <br />
          {mn.roleCard.imposterLines[1]}
        </p>
        {content.category ? (
          <CategoryTag>{content.category}</CategoryTag>
        ) : (
          <p className="text-base font-semibold text-fg-muted">{mn.roleCard.categoryHidden}</p>
        )}
      </>
    );
  } else {
    body = (
      <>
        <FaceLabel>
          {content.mode === 'B' ? mn.roleCard.yourWord : mn.roleCard.secretWord}
        </FaceLabel>
        <SecretWord word={content.word} size={size} />
        {content.mode === 'A' ? (
          <CategoryTag>{content.category}</CategoryTag>
        ) : (
          <span className="h-10" />
        )}
      </>
    );
  }

  return (
    <div
      aria-hidden={hidden}
      className={cn(
        'flex flex-col rounded-card bg-raised p-5 text-fg lift ink-border tv:p-8',
        className,
      )}
    >
      <div className="@container flex flex-1 flex-col justify-between gap-4">{body}</div>
    </div>
  );
}

function FaceLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-bold tracking-[0.12em] text-fg-muted uppercase">{children}</p>;
}

function CategoryTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-10 self-start rounded-pill bg-tsenher px-4 py-1.5 text-[0.9375rem] font-bold text-ink ink-border">
      {children}
    </span>
  );
}

/** ≥ 44px, one line when it fits, wraps at spaces before it ever shrinks further (§6.3). */
function SecretWord({ word, size }: { word: string; size: 'phone' | 'tv' }) {
  const { ref, fontSize, wrap } = useFitText(word, {
    min: 44,
    max: size === 'tv' ? 128 : 72,
  });
  return (
    <div ref={ref} className="w-full font-display font-extrabold">
      <p
        className="leading-[1.02] tracking-[-0.01em] [text-wrap:balance]"
        style={{ fontSize, whiteSpace: wrap ? 'normal' : 'nowrap' }}
      >
        {word}
      </p>
    </div>
  );
}
