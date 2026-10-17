'use client';

import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { useAudioRunning, useAudioUnlock, useSoundOn } from '@/lib/sound';
import { useWakeLock } from '@/lib/use-wake-lock';
import { useGame, warmUpNetwork } from '@/store/game';
import { Banner } from '../ui/banner';
import { Icon } from '../ui/icon';
import { spinner } from '../ui/icon-data';
import { SoundToggle } from '../ui/sound-toggle';
import { ThemeToggle } from '../ui/theme-toggle';
import { TvCenter, TvStage } from './tv-stage';

/*
 * The network layer, the phase layouts and motion load as their own chunks: the socket as soon as
 * this module runs (while React is still hydrating), the layouts right after the first paint.
 */
const loadPhases = () => import('./tv-phases');
const loadMotion = () => import('../motion-provider');
if (typeof window !== 'undefined') warmUpNetwork();

const TvPhase = lazy(() => loadPhases().then((m) => ({ default: m.TvPhase })));
const MotionProvider = lazy(() => loadMotion().then((m) => ({ default: m.MotionProvider })));

/**
 * /tv/[code] (§5.12): a read-only big-screen mirror of the shared moments — lobby QR, speaking
 * order, timers, the vote reveal, the scoreboard. It joins as a watcher, so the server only ever
 * sends it the TV projection: no secret word or hidden role can reach this screen.
 */
export function TvApp({ code }: { code: string }) {
  const stage = useGame((s) => s.stage);
  const view = useGame((s) => s.tv);
  const connection = useGame((s) => s.connection);
  const watch = useGame((s) => s.watch);

  useEffect(() => {
    void watch(code);
    void loadPhases();
    void loadMotion();
  }, [code, watch]);

  // The shared screen stays on for the whole evening.
  useWakeLock(true);
  const soundOn = useSoundOn(true);
  const audioRunning = useAudioRunning();
  useAudioUnlock(soundOn);

  let body: ReactNode;
  if (stage === 'missing' || stage === 'expired') {
    body = (
      <TvCenter>
        <h1 className="font-display text-[5rem] leading-tight font-black">
          {mn.room.notFoundTitle}
        </h1>
        <p className="text-[2.25rem] font-semibold text-fg-muted">
          {stage === 'expired' ? mn.room.expired : mn.room.notFoundBody}
        </p>
      </TvCenter>
    );
  } else if (!view) {
    body = (
      <TvCenter>
        <Icon icon={spinner} size={72} className="animate-spin text-fg-muted" />
        <p className="text-[2.25rem] font-bold text-fg-muted">{mn.connection.connecting}</p>
      </TvCenter>
    );
  } else {
    body = (
      <Suspense fallback={null}>
        <MotionProvider>
          <TvPhase view={view} />
        </MotionProvider>
      </Suspense>
    );
  }

  return (
    <TvStage>
      <header className="flex items-center justify-between gap-8 px-16 pt-10">
        <span className="font-display text-[2.75rem] leading-none font-black tracking-[-0.01em]">
          {mn.app.name}
        </span>
        <div className="flex items-center gap-6">
          {connection === 'reconnecting' && (
            <Banner tone="reconnecting" busy>
              {mn.connection.lost}
            </Banner>
          )}
          <span className="inline-flex min-h-16 items-center gap-3 rounded-pill px-6 text-[1.75rem] font-bold ink-border">
            {mn.room.label}
            <span className="font-display tabular">{code}</span>
          </span>
          {soundOn && !audioRunning && (
            <span className="text-[1.25rem] font-semibold text-fg-muted">{mn.tv.tapForSound}</span>
          )}
          <SoundToggle defaultOn />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col px-16 pt-8 pb-14">{body}</main>
    </TvStage>
  );
}
