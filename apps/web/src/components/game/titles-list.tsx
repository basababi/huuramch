import type { PublicPlayer, Titles } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon, type IconData } from '../ui/icon';
import { detective, maskHappy, medal } from '../ui/icon-data';
import { Avatar } from './avatar';

const TITLES: ReadonlyArray<{ key: keyof Titles; icon: IconData; tone: string }> = [
  { key: 'liar', icon: maskHappy, tone: 'bg-al text-paper' },
  { key: 'detective', icon: detective, tone: 'bg-tenger text-paper' },
  { key: 'victim', icon: medal, tone: 'bg-alt text-ink' },
];

/** End-of-game fun titles (§2.4): Шилдэг худалч, Мөрдөгч, Гэм буруугүй хохирогч. */
export function TitlesList({
  titles,
  players,
  size = 'phone',
}: {
  titles: Titles;
  players: readonly PublicPlayer[];
  size?: 'phone' | 'tv';
}) {
  const rows = TITLES.flatMap((t) => {
    const player = players.find((p) => p.id === titles[t.key]);
    return player ? [{ ...t, player }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <ul className={cn('grid', size === 'tv' ? 'grid-cols-3 gap-8' : 'gap-3')}>
      {rows.map(({ key, icon, tone, player }) => (
        <li
          key={key}
          className={cn(
            'flex items-center rounded-card bg-raised lift-sm ink-border',
            size === 'tv' ? 'gap-5 px-6 py-5' : 'gap-3 px-3 py-2.5',
          )}
        >
          <span
            className={cn(
              'grid shrink-0 place-items-center rounded-pill ink-border',
              tone,
              size === 'tv' ? 'size-16' : 'size-11',
            )}
          >
            <Icon icon={icon} size={size === 'tv' ? 32 : 22} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className={cn('font-bold text-fg-muted', size === 'tv' ? 'text-[1.5rem]' : 'text-sm')}
            >
              {mn.result.titles[key]}
            </span>
            <span
              className={cn(
                'truncate font-display font-extrabold',
                size === 'tv' ? 'text-[2.25rem]' : 'text-[1.25rem]',
              )}
            >
              {player.name}
            </span>
          </span>
          <Avatar
            animal={player.animal}
            color={avatarColor(player.seat)}
            size={size === 'tv' ? 80 : 44}
            label={player.name}
          />
        </li>
      ))}
    </ul>
  );
}
