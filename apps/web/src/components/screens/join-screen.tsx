'use client';

import type { PlayerView } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { useGame } from '@/store/game';
import { Avatar } from '../game/avatar';
import { ProfileForm } from '../game/profile-form';
import { WaitingState } from '../game/waiting-state';
import { Banner } from '../ui/banner';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { signOut } from '../ui/icon-data';
import { Screen, SectionTitle } from './shell';
import { useLeaveRoom } from './use-leave-room';
import { playerById } from './view-helpers';

/** Scanned the QR: pick a name and an animal, then you're in (§2.5). */
export function JoinScreen({ code }: { code: string }) {
  const peek = useGame((s) => s.peek);
  const join = useGame((s) => s.join);
  const running = peek !== null && peek.phase !== 'LOBBY';

  return (
    <Screen code={code}>
      <h1 className="font-display text-[1.75rem] leading-tight font-extrabold">{mn.join.title}</h1>
      {peek?.full && <Banner tone="error">{mn.join.full}</Banner>}
      {running && !peek.full && <Banner tone="info">{mn.join.gameRunning}</Banner>}
      {peek && peek.players.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionTitle>{mn.lobby.players(peek.players.length)}</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {peek.players.map((p, i) => (
              <li key={p.animal}>
                <Avatar animal={p.animal} color={avatarColor(i)} size={40} label={p.name} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {!peek?.full && (
        <ProfileForm
          taken={peek?.players.map((p) => p.animal) ?? []}
          submitLabel={mn.join.submit}
          busyLabel={mn.join.joining}
          onSubmit={async (nickname, animal) => (await join(nickname, animal))?.message ?? null}
        />
      )}
    </Screen>
  );
}

/** Joined mid-game: watch this one, play the next (§2.5). */
export function SpectatorScreen({ view }: { view: PlayerView }) {
  const leaveRoom = useLeaveRoom();
  const me = playerById(view, view.me.id);
  return (
    <Screen
      code={view.code}
      actions={
        <Button block tone="secondary" iconStart={<Icon icon={signOut} />} onClick={leaveRoom}>
          {mn.room.leave}
        </Button>
      }
    >
      <div className="flex flex-1 items-center justify-center">
        {me && (
          <WaitingState
            animal={me.animal}
            color={avatarColor(me.seat)}
            title={mn.spectator.title}
            detail={mn.spectator.body}
          />
        )}
      </div>
    </Screen>
  );
}
