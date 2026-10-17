import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { Icon } from '../ui/icon';
import { trophy } from '../ui/icon-data';

/** Winner banner with the ornament band top and bottom (one of its three placements, §6.5). */
export function WinnerBanner({
  winner,
  className,
}: {
  winner: 'civilians' | 'imposters';
  className?: string;
}) {
  const civilians = winner === 'civilians';
  return (
    <div
      role="status"
      className={cn(
        'overflow-hidden rounded-card text-paper lift ink-border',
        civilians ? 'bg-tenger' : 'bg-al',
        className,
      )}
    >
      <span aria-hidden className="block h-3.5 ornament text-paper tv:h-5" />
      <div className="flex items-center justify-center gap-3 px-4 py-6 tv:gap-6 tv:py-10">
        <Icon icon={trophy} size={40} className="shrink-0 tv:size-20" />
        <p className="font-display text-[2rem] leading-[1] font-black [text-wrap:balance] tv:text-[4.5rem]">
          {civilians ? mn.result.civiliansWin : mn.result.impostersWin}
        </p>
      </div>
      <span aria-hidden className="block h-3.5 ornament text-paper tv:h-5" />
    </div>
  );
}
