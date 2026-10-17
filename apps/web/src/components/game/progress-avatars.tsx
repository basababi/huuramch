import type { PublicPlayer } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { checkFat } from '../ui/icon-data';
import { Avatar } from './avatar';

/**
 * Who is done and who we are still waiting for (§5: every waiting state names them).
 * Done players get a green check; the rest keep their idle animation.
 */
export function ProgressAvatars({
  players,
  isDone,
  doneLabel,
  size = 52,
  className,
}: {
  players: readonly PublicPlayer[];
  isDone: (player: PublicPlayer) => boolean;
  doneLabel: string;
  size?: number;
  /** Replaces the default `justify-center gap-3`. */
  className?: string;
}) {
  const badge = Math.max(28, Math.round(size * 0.36));
  return (
    <ul className={cn('flex flex-wrap', className ?? 'justify-center gap-3')}>
      {players.map((p) => {
        const done = isDone(p);
        return (
          <li key={p.id} className={cn('relative', !done && !p.connected && 'opacity-50')}>
            <Avatar
              animal={p.animal}
              color={avatarColor(p.seat)}
              size={size}
              idle={!done}
              label={done ? `${p.name} · ${doneLabel}` : p.name}
            />
            {done && (
              <span
                aria-hidden
                className="absolute -right-1 -bottom-1 grid place-items-center rounded-pill bg-nogoon text-ink ink-border"
                style={{ width: badge, height: badge }}
              >
                <Icon icon={checkFat} size={Math.round(badge * 0.54)} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
