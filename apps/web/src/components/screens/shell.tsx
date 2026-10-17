'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { useGame } from '@/store/game';
import { Banner } from '../ui/banner';
import { buttonClass } from '../ui/button';
import { Icon } from '../ui/icon';
import { arrowLeft, spinner } from '../ui/icon-data';
import { SoundToggle } from '../ui/sound-toggle';
import { ThemeToggle } from '../ui/theme-toggle';

/** "Холболт тасарлаа…" while the socket is down (§7); a short error flash after a rejected tap. */
export function StatusBanners() {
  const connection = useGame((s) => s.connection);
  const flash = useGame((s) => s.flash);
  const dismiss = useGame((s) => s.dismissFlash);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [flash, dismiss]);

  return (
    <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
      {connection === 'reconnecting' && (
        <Banner tone="reconnecting" busy>
          {mn.connection.lost}
        </Banner>
      )}
      {flash && <Banner tone="error">{flash.message}</Banner>}
    </div>
  );
}

/**
 * Phone screen frame: a slim top bar (room code, theme), content, and an action area pinned in
 * thumb reach (§5). `tone="alt"` turns the whole screen yellow for "ЧИНИЙ ЭЭЛЖ".
 */
export function Screen({
  code,
  children,
  actions,
  tone = 'surface',
}: {
  code?: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: 'surface' | 'alt';
}) {
  return (
    <div
      className={cn('flex min-h-dvh flex-col', tone === 'alt' ? 'bg-alt on-light' : 'bg-surface')}
    >
      <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {code ? (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-pill px-3 text-sm font-bold ink-border">
              {mn.room.label}
              <span className="font-display tabular">{code}</span>
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <RoomSoundToggle />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-5 px-4 py-4">
          <StatusBanners />
          {children}
        </main>
        {actions && (
          <div
            className={cn(
              'sticky bottom-0 flex flex-col gap-3 border-t-[length:var(--stroke)] border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]',
              tone === 'alt' ? 'bg-alt' : 'bg-surface',
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/** A centred message screen (room missing, kicked, expired) with a way home. */
export function MessageScreen({ title, body }: { title: string; body?: string }) {
  return (
    <Screen
      actions={
        <Link href="/" className={buttonClass({ tone: 'primary', block: true })}>
          <Icon icon={arrowLeft} />
          <span>{mn.room.home}</span>
        </Link>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="font-display text-[2rem] leading-tight font-extrabold">{title}</h1>
        {body && <p className="text-lg font-medium text-fg-muted">{body}</p>}
      </div>
    </Screen>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">{children}</h2>;
}

/** First paint while the socket connects, the session is restored and the screen code arrives. */
export function ConnectingScreen({ code }: { code?: string }) {
  return (
    <Screen code={code}>
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-5">
        {code && (
          <p className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
              {mn.lobby.codeLabel}
            </span>
            <span className="font-display tabular text-[5rem] leading-none font-black tracking-[0.06em]">
              {code}
            </span>
          </p>
        )}
        <p className="flex items-center gap-3 text-lg font-bold text-fg-muted">
          <Icon icon={spinner} size={28} className="animate-spin" />
          {mn.connection.connecting}
        </p>
      </div>
    </Screen>
  );
}

/** The mute toggle, once this phone has a seat; on by default for the host only (§5). */
function RoomSoundToggle() {
  const joined = useGame((s) => s.view !== null);
  const isHost = useGame((s) => Boolean(s.view?.me.isHost));
  return joined ? <SoundToggle defaultOn={isHost} /> : null;
}
