import type { PublicView } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Avatar } from './avatar';

/**
 * The speaking order as a row of avatars (§5.5): the current speaker is enlarged and outlined in
 * yellow, those who already spoke this lap step back.
 */
export function SpeakingOrder({ view, size = 44 }: { view: PublicView; size?: number }) {
  const round = view.round;
  if (!round) return null;
  const n = round.speakingOrder.length;
  const position = n ? round.turnIndex % n : 0;
  return (
    <ol aria-label={mn.turn.order} className="flex flex-wrap items-end justify-center gap-2">
      {round.speakingOrder.map((id, index) => {
        const player = view.players.find((p) => p.id === id);
        if (!player) return null;
        const current = id === round.currentSpeakerId;
        const spoken = index < position;
        return (
          <li
            key={id}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 transition-transform duration-200',
              current && 'scale-[1.35] px-2',
              spoken && 'opacity-45',
            )}
          >
            <span className={cn('rounded-pill', current && 'outline-4 outline-alt outline-solid')}>
              <Avatar
                animal={player.animal}
                color={avatarColor(player.seat)}
                size={size}
                eliminated={player.eliminated}
                label={player.name}
              />
            </span>
            <span className="sr-only">{player.name}</span>
          </li>
        );
      })}
    </ol>
  );
}
