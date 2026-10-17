'use client';

import type { PublicPlayer, PublicView, Role } from '@khuuramch/game-core';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef, useState } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { useTimeline } from '@/lib/use-timeline';
import { Avatar } from './avatar';
import { planReveal, slipsLanded } from './reveal-plan';
import { Stamp, shake } from './stamp';

type Size = 'phone' | 'tv';

const SIZES = {
  phone: {
    avatar: 56,
    card: 104,
    pile: 76,
    slipW: 40,
    slipH: 14,
    slipGap: 10,
    cols: 'grid-cols-3',
  },
  tv: { avatar: 112, card: 200, pile: 168, slipW: 84, slipH: 26, slipGap: 20, cols: 'grid-cols-6' },
} as const;

/** Deterministic slant per slip so each pile looks hand-dropped but identical on every screen. */
const slant = (i: number) => ((i * 37) % 11) - 5;

/**
 * The best moment of the game (§5.8): ballot slips stack onto avatars one by one, the eliminated
 * player's card slams down, then the rubber stamp — ХУУРАМЧ! or ЭНГИЙН — with a ≤ 4px shake.
 * Driven by the server's phase start, so every phone and the TV play it in sync. Steps that had
 * already passed when the screen opened (a reconnect) render landed, without replaying.
 */
export function VoteReveal({
  view,
  origin,
  size = 'phone',
  onSlip,
  onVerdict,
  onStamp,
}: {
  view: PublicView;
  /** The reveal phase start on this device's clock (phaseStartedAt − clockOffset). */
  origin: number;
  size?: Size;
  /** Sound/haptic hooks; each fires once per step, never for steps skipped on open. */
  onSlip?: () => void;
  onVerdict?: () => void;
  onStamp?: (role: Role) => void;
}) {
  const reveal = view.round?.reveal ?? null;
  const tallyKey = JSON.stringify(reveal?.tally ?? {});
  const seatKey = [...view.players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => p.id)
    .join(',');
  const plan = useMemo(
    () => planReveal(JSON.parse(tallyKey) as Record<string, number>, seatKey.split(',')),
    [tallyKey, seatKey],
  );
  const step = useTimeline(origin, plan.times);
  const [openedAt] = useState(step);
  const notified = useRef(openedAt);
  const root = useRef<HTMLDivElement>(null);
  const s = SIZES[size];

  useEffect(() => {
    if (step <= notified.current) return;
    notified.current = step;
    if (step <= plan.sequence.length) onSlip?.();
    else if (step === plan.verdictStep) onVerdict?.();
  }, [step, plan, onSlip, onVerdict]);

  if (!reveal) return null;

  const byId = (id: string | null) => view.players.find((p) => p.id === id);
  const verdict = step >= plan.verdictStep;
  const stamped = step >= plan.stampStep;
  const eliminated = byId(reveal.eliminatedId);
  const role = reveal.eliminatedRole;

  let heading: string = mn.reveal.counting;
  let announcement = '';
  if (verdict) {
    if (eliminated && role) {
      heading = mn.reveal.eliminated(eliminated.name);
      announcement = stamped
        ? `${heading}. ${role === 'imposter' ? mn.reveal.imposter : mn.reveal.civilian}`
        : '';
    } else if (reveal.tie) {
      heading = mn.reveal.tie;
      announcement = `${mn.reveal.tie}. ${mn.reveal.tieHint}`;
    } else {
      heading = mn.reveal.nobody;
      announcement = heading;
    }
  }

  return (
    <div ref={root} className={cn('flex flex-1 flex-col', size === 'tv' ? 'gap-10' : 'gap-4')}>
      <h1
        className={cn(
          'text-center font-display leading-tight font-extrabold',
          size === 'tv' ? 'text-[4rem]' : 'text-[1.75rem]',
        )}
      >
        {heading}
      </h1>
      <p aria-live="assertive" className="sr-only">
        {announcement}
      </p>

      <div
        className={cn('relative grid flex-1', size === 'tv' ? 'min-h-[36rem]' : 'min-h-[22rem]')}
      >
        <ul
          aria-hidden={verdict}
          className={cn(
            'grid content-start justify-center transition-opacity duration-300',
            size === 'tv' ? 'gap-x-10 gap-y-10' : 'gap-x-3 gap-y-5',
            plan.targets.length <= 2 ? 'grid-cols-2' : s.cols,
            plan.targets.length === 1 && 'grid-cols-1',
            verdict && 'opacity-25',
          )}
        >
          {plan.targets.map((id) => {
            const p = byId(id);
            if (!p) return null;
            return (
              <TallyTile
                key={id}
                player={p}
                landed={slipsLanded(plan, id, step)}
                landedOnOpen={slipsLanded(plan, id, openedAt)}
                maxVotes={plan.maxVotes}
                size={size}
              />
            );
          })}
        </ul>

        {verdict && (
          <div className="absolute inset-0 grid place-items-center">
            {eliminated && role ? (
              <m.div
                initial={
                  openedAt < plan.verdictStep
                    ? { scale: 1.4, y: -40, opacity: 0, rotate: 4 }
                    : false
                }
                animate={{ scale: 1, y: 0, opacity: 1, rotate: -1.5 }}
                transition={{ type: 'spring', stiffness: 640, damping: 24, mass: 0.9 }}
                className={cn(
                  'flex w-full flex-col items-center rounded-card bg-raised text-center lift [--stamp-bg:var(--raised)] ink-border',
                  size === 'tv'
                    ? 'max-w-[52rem] gap-5 px-10 pt-10 pb-8'
                    : 'max-w-[18rem] gap-2.5 px-5 pt-6 pb-4',
                )}
              >
                <Avatar
                  animal={eliminated.animal}
                  color={avatarColor(eliminated.seat)}
                  size={s.card}
                  eliminated={stamped}
                  label={eliminated.name}
                />
                <p
                  className={cn(
                    'max-w-full truncate font-display leading-tight font-extrabold',
                    size === 'tv' ? 'text-[3.5rem]' : 'text-[1.75rem]',
                  )}
                >
                  {eliminated.name}
                </p>
                <p
                  className={cn(
                    'tabular font-bold text-fg-muted',
                    size === 'tv' ? 'text-[1.75rem]' : 'text-base',
                  )}
                >
                  {mn.reveal.votes(reveal.tally[eliminated.id] ?? 0)}
                </p>
                <div
                  className={cn(
                    'grid w-full place-items-center',
                    size === 'tv' ? 'h-[11rem]' : 'h-[5rem]',
                  )}
                >
                  {stamped && (
                    <Stamp
                      kind={role}
                      size={size}
                      slam={openedAt < plan.stampStep}
                      onLand={() => {
                        if (openedAt >= plan.stampStep) return;
                        shake(root.current);
                        onStamp?.(role);
                      }}
                    />
                  )}
                </div>
              </m.div>
            ) : (
              <m.div
                initial={
                  openedAt < plan.verdictStep ? { scale: 1.3, opacity: 0, rotate: -3 } : false
                }
                animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
                transition={{ type: 'spring', stiffness: 600, damping: 24 }}
                className={cn(
                  'flex w-full flex-col items-center gap-4 rounded-card text-center lift ink-border',
                  reveal.tie ? 'bg-alt on-light' : 'bg-raised',
                  size === 'tv' ? 'max-w-[48rem] px-12 py-12' : 'max-w-[20rem] px-5 py-7',
                )}
              >
                <p
                  className={cn(
                    'font-display leading-none font-black',
                    reveal.tie
                      ? size === 'tv'
                        ? 'text-[6rem]'
                        : 'text-[2.75rem]'
                      : size === 'tv'
                        ? 'text-[4.5rem]'
                        : 'text-[2rem]',
                  )}
                >
                  {reveal.tie ? mn.reveal.tie : mn.reveal.nobody}
                </p>
                {reveal.tie && (
                  <ul
                    className={cn(
                      'flex flex-wrap justify-center',
                      size === 'tv' ? 'gap-6' : 'gap-3',
                    )}
                  >
                    {reveal.candidates.map((id) => {
                      const p = byId(id);
                      return p ? (
                        <li key={id}>
                          <Avatar
                            animal={p.animal}
                            color={avatarColor(p.seat)}
                            size={size === 'tv' ? 120 : 64}
                            label={p.name}
                          />
                        </li>
                      ) : null;
                    })}
                  </ul>
                )}
                {(reveal.tie || plan.targets.length === 0) && (
                  <p className={cn('font-bold', size === 'tv' ? 'text-[2rem]' : 'text-lg')}>
                    {reveal.tie ? mn.reveal.tieHint : mn.reveal.noVotes}
                  </p>
                )}
              </m.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TallyTile({
  player,
  landed,
  landedOnOpen,
  maxVotes,
  size,
}: {
  player: PublicPlayer;
  landed: number;
  landedOnOpen: number;
  maxVotes: number;
  size: Size;
}) {
  const s = SIZES[size];
  // Piles share one spacing, sized for the tallest final pile, so nothing jumps mid-count.
  const gap = Math.min(s.slipGap, (s.pile - s.slipH) / Math.max(1, maxVotes - 1));
  return (
    <li className="flex min-w-0 flex-col items-center gap-2">
      <div className="relative w-full" style={{ height: s.pile }}>
        {Array.from({ length: landed }, (_, i) => (
          <m.span
            key={i}
            aria-hidden
            initial={i < landedOnOpen ? false : { y: -56, opacity: 0, rotate: slant(i) * 3 }}
            animate={{ y: 0, opacity: 1, rotate: slant(i) }}
            transition={{ type: 'spring', stiffness: 700, damping: 26 }}
            className="absolute left-1/2 block rounded-[3px] border-[length:var(--stroke)] border-ink bg-paper"
            style={{ width: s.slipW, height: s.slipH, bottom: i * gap, marginLeft: -s.slipW / 2 }}
          />
        ))}
      </div>
      <Avatar
        animal={player.animal}
        color={avatarColor(player.seat)}
        size={s.avatar}
        label={player.name}
      />
      <span
        className={cn(
          'max-w-full truncate font-bold',
          size === 'tv' ? 'text-[1.75rem]' : 'text-[0.9375rem]',
        )}
      >
        {player.name}
      </span>
      <span
        key={landed}
        aria-hidden
        className={cn(
          'inline-block animate-tick font-display tabular leading-none font-extrabold',
          size === 'tv' ? 'text-[3.5rem]' : 'text-[1.5rem]',
        )}
      >
        {landed}
      </span>
    </li>
  );
}
