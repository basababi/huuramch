import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconData } from './icon';
import { info, sealCheck, spinner, warning, wifiSlash } from './icon-data';

type BannerTone = 'reconnecting' | 'success' | 'error' | 'info';

const config: Record<BannerTone, { icon: IconData; className: string; role: 'status' | 'alert' }> =
  {
    reconnecting: { icon: wifiSlash, className: 'bg-alt on-light', role: 'status' },
    success: { icon: sealCheck, className: 'bg-nogoon on-light', role: 'status' },
    info: { icon: info, className: 'bg-tsenher on-light', role: 'status' },
    // Red behind 15px text would miss AA, so errors use a red icon block on the normal surface.
    error: { icon: warning, className: 'bg-raised text-fg', role: 'alert' },
  };

export function Banner({
  tone,
  icon,
  busy = false,
  children,
  className,
}: {
  tone: BannerTone;
  icon?: IconData;
  busy?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { icon: defaultIcon, className: toneClass, role } = config[tone];
  return (
    <div
      role={role}
      className={cn(
        'flex items-center gap-3 rounded-card px-3 py-3 text-[0.9375rem] leading-snug font-bold lift-sm ink-border',
        toneClass,
        className,
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-[8px]',
          tone === 'error' && 'bg-al text-paper',
        )}
      >
        <Icon icon={icon ?? defaultIcon} size={24} />
      </span>
      <span className="flex-1">{children}</span>
      {busy && <Icon icon={spinner} size={22} className="shrink-0 animate-spin" />}
    </div>
  );
}
