import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { trophy } from '../ui/icon-data';

/** Winner banner with the ornament band top and bottom (one of its three placements, §6.5). */
export function WinnerBanner({
  winner,
  size = 'phone',
  className,
}: {
  winner: 'civilians' | 'imposters';
  size?: 'phone' | 'tv';
  className?: string;
}) {
  const civilians = winner === 'civilians';
  const tv = size === 'tv';
  return (
    <div
      role="status"
      className={cn(
        'overflow-hidden rounded-card text-paper lift ink-border',
        civilians ? 'bg-tenger' : 'bg-al',
        className,
      )}
    >
      <span aria-hidden className={cn('block ornament text-paper', tv ? 'h-6' : 'h-3.5')} />
      <div
        className={cn(
          'flex items-center justify-center',
          tv ? 'gap-8 px-10 py-12' : 'gap-3 px-4 py-6',
        )}
      >
        <Icon icon={trophy} size={tv ? 96 : 40} className="shrink-0" />
        <p
          className={cn(
            'font-display leading-[1] font-black [text-wrap:balance]',
            tv ? 'text-[6rem]' : 'text-[2rem]',
          )}
        >
          {civilians ? mn.result.civiliansWin : mn.result.impostersWin}
        </p>
      </div>
      <span aria-hidden className={cn('block ornament text-paper', tv ? 'h-6' : 'h-3.5')} />
    </div>
  );
}
