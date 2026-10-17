'use client';

import { useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

function subscribe(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

const fitScale = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);

/**
 * The TV view is laid out once, on a fixed 1920×1080 stage (§5.12), and scaled to whatever screen
 * it lands on — a TV, a projector, a 1366×768 laptop — so it is the same picture everywhere and
 * readable from four metres. TV outlines are 4px with 6px shadows (§6.4) at any scale.
 */
export function TvStage({ children }: { children: ReactNode }) {
  const scale = useSyncExternalStore(subscribe, fitScale, () => 1);
  return (
    <div className="fixed inset-0 overflow-hidden bg-surface text-fg">
      <div
        className="absolute top-1/2 left-1/2 flex origin-center flex-col"
        style={
          {
            width: STAGE_W,
            height: STAGE_H,
            marginLeft: -STAGE_W / 2,
            marginTop: -STAGE_H / 2,
            transform: `scale(${scale})`,
            '--stroke': '4px',
            '--lift': '6px',
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

/** A centred column for one big message on the stage. */
export function TvCenter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-10 text-center',
        className,
      )}
    >
      {children}
    </div>
  );
}
