'use client';

import { DEFAULT_SETTINGS, type RoomSettings } from '@khuuramch/game-core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { useGame } from '@/store/game';
import { ProfileForm } from '../game/profile-form';
import { SettingsForm } from '../game/settings-form';
import { Button, buttonClass } from '../ui/button';
import { Icon } from '../ui/icon';
import { arrowLeft, play } from '../ui/icon-data';
import { Sheet } from '../ui/sheet';
import { ThemeToggle } from '../ui/theme-toggle';
import { StatusBanners } from './shell';

/** /create (§5.2): settings first, then who you are, then the room exists. */
export function CreateScreen() {
  const router = useRouter();
  const createRoom = useGame((s) => s.createRoom);
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col tv:max-w-[52rem]">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          aria-label={mn.common.back}
          className={buttonClass({ tone: 'secondary', size: 'none', className: 'size-12' })}
        >
          <Icon icon={arrowLeft} />
        </Link>
        <h1 className="font-display text-[1.375rem] font-extrabold">{mn.create.title}</h1>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <StatusBanners />
        <SettingsForm value={settings} onChange={setSettings} />
      </main>
      <div className="sticky bottom-0 border-t-[length:var(--stroke)] border-line bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button block iconStart={<Icon icon={play} />} onClick={() => setProfileOpen(true)}>
          {mn.settings.start}
        </Button>
      </div>
      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title={mn.profile.title}>
        <ProfileForm
          submitLabel={mn.create.title}
          busyLabel={mn.create.creating}
          onSubmit={async (nickname, animal) => {
            const result = await createRoom(nickname, animal, settings);
            if (!result.ok) return result.error.message;
            router.push(`/room/${result.code}`);
            return null;
          }}
        />
      </Sheet>
    </div>
  );
}
