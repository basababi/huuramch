'use client';

import * as m from 'motion/react-m';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { checkFat, crown } from '../ui/icon-data';
import type { AnimalId } from './animals';
import { Avatar } from './avatar';

export type PlayerSummary = {
  id: string;
  name: string;
  animal: AnimalId;
  color: string;
  isHost?: boolean;
  eliminated?: boolean;
};

/** Springy entrance for players popping into the lobby grid (§5.3). */
export const playerPop = {
  initial: { opacity: 0, scale: 0.4, y: 14 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.15 } },
  transition: { type: 'spring', stiffness: 560, damping: 22, mass: 0.7 },
} as const;

export function PlayerTile({
  player,
  size = 64,
  idle = false,
}: {
  player: PlayerSummary;
  size?: number;
  idle?: boolean;
}) {
  return (
    <m.li {...playerPop} className="flex min-w-0 flex-col items-center gap-1.5">
      <div className="relative">
        <Avatar
          animal={player.animal}
          color={player.color}
          size={size}
          idle={idle}
          eliminated={player.eliminated}
          label={player.name}
        />
        {player.isHost && (
          <span className="absolute -top-1.5 -right-1.5 grid size-7 place-items-center rounded-pill bg-alt text-ink ink-border">
            <Icon icon={crown} size={15} label={mn.lobby.host} />
          </span>
        )}
      </div>
      <span
        className={cn(
          'max-w-full truncate text-[0.9375rem] font-bold',
          player.eliminated && 'text-fg-muted line-through',
        )}
      >
        {player.name}
      </span>
    </m.li>
  );
}

/** Voting target (§5.7): tap to select — thick outline, offset shadow, check badge. */
export function VoteTile({
  player,
  selected,
  locked = false,
  onSelect,
}: {
  player: PlayerSummary;
  selected: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={locked && !selected}
      onClick={onSelect}
      className={cn(
        'relative flex min-h-36 w-full pressable touch-manipulation flex-col items-center justify-center gap-2 rounded-card p-3 no-callout ink-border',
        selected ? 'bg-alt text-ink selected-ring' : 'bg-raised text-fg',
        locked && !selected && 'opacity-60',
      )}
    >
      <Avatar animal={player.animal} color={player.color} size={72} label={player.name} />
      <span className="max-w-full truncate text-base font-bold">{player.name}</span>
      {selected && (
        <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-pill bg-ink text-paper">
          <Icon icon={checkFat} size={18} label={mn.voting.selected} />
        </span>
      )}
    </button>
  );
}
