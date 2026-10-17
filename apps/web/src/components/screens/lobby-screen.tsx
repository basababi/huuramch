'use client';

import {
  MIN_PLAYERS,
  TIMER_PRESETS,
  type PlayerView,
  type PublicPlayer,
  type RoomSettings,
} from '@khuuramch/game-core';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { shareableOrigin } from '@/lib/server-url';
import { useGame } from '@/store/game';
import { FirstGameRules } from '../game/first-game-rules';
import { PlayerTile } from '../game/player-tile';
import { QrCode } from '../game/qr-code';
import { SettingsForm } from '../game/settings-form';
import { WaitingState } from '../game/waiting-state';
import { Banner } from '../ui/banner';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { gear, play, signOut, tv, users } from '../ui/icon-data';
import { Sheet } from '../ui/sheet';
import { Screen, SectionTitle } from './shell';
import { useLeaveRoom } from './use-leave-room';
import { playerById, summary } from './view-helpers';

/** Lobby (§5.3): the host shares the QR and starts; everyone else waits with an idle avatar. */
export function LobbyScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const leaveRoom = useLeaveRoom();
  const isHost = view.me.isHost;
  const ready = view.players.filter((p) => p.connected && !p.absent);
  const enough = ready.length >= MIN_PLAYERS;
  const me = playerById(view, view.me.id);
  const host = playerById(view, view.hostId);
  const [origin, setOrigin] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<RoomSettings>(view.settings);
  const [kickTarget, setKickTarget] = useState<PublicPlayer | null>(null);

  useEffect(() => {
    void shareableOrigin().then(setOrigin);
  }, []);

  const joinUrl = origin ? `${origin}/room/${view.code}` : null;
  const shortJoin = origin ? origin.replace(/^https?:\/\//, '') : '';

  return (
    <Screen
      code={view.code}
      actions={
        isHost ? (
          <>
            <p
              className="flex items-center justify-center gap-2 text-base font-bold"
              aria-live="polite"
            >
              <Icon icon={users} size={20} />
              {enough
                ? `${mn.lobby.players(ready.length)} · ${mn.lobby.ready}`
                : mn.lobby.needPlayers}
            </p>
            <Button
              block
              tone="success"
              disabled={!enough}
              iconStart={<Icon icon={play} />}
              onClick={() => void send('game:start')}
            >
              {mn.lobby.start}
            </Button>
          </>
        ) : (
          <Button block tone="secondary" iconStart={<Icon icon={signOut} />} onClick={leaveRoom}>
            {mn.room.leave}
          </Button>
        )
      }
    >
      {view.notice === 'round-voided' && <Banner tone="info">{mn.lobby.voided}</Banner>}
      {!isHost && <FirstGameRules />}

      {isHost ? (
        <section className="flex flex-col items-center gap-4">
          <h1 className="sr-only">{mn.lobby.shareTitle}</h1>
          {joinUrl && (
            <QrCode value={joinUrl} label={mn.lobby.shareTitle} className="w-56 tv:w-72" />
          )}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
              {mn.lobby.codeLabel}
            </span>
            <span className="font-display tabular text-[3.5rem] leading-none font-black tracking-[0.06em]">
              {view.code}
            </span>
            {shortJoin && (
              <span className="text-sm text-fg-muted">{mn.lobby.shareHint(shortJoin)}</span>
            )}
          </div>
        </section>
      ) : (
        me && (
          <WaitingState
            animal={me.animal}
            color={avatarColor(me.seat)}
            title={mn.lobby.waitingForHost}
            detail={mn.lobby.hostWillStart(host?.name ?? mn.lobby.host)}
          />
        )
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>{mn.lobby.players(view.players.length)}</SectionTitle>
        <ul className="grid grid-cols-3 gap-x-3 gap-y-5">
          <AnimatePresence initial={false}>
            {view.players.map((p) => (
              <PlayerTile
                key={p.id}
                player={summary(p)}
                idle
                onSelect={isHost && p.id !== view.me.id ? () => setKickTarget(p) : undefined}
              />
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{mn.settings.title}</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {[
            mn.modes[view.settings.mode].title,
            `${mn.settings.categories}: ${view.settings.categories.length}`,
            view.settings.imposterCount === 'auto'
              ? `${mn.settings.imposters}: ${mn.settings.impostersAuto}`
              : mn.settings.impostersFixed(view.settings.imposterCount),
            `${mn.settings.timerPresets[view.settings.timerPreset]} · ${mn.common.secondsShort(TIMER_PRESETS[view.settings.timerPreset].turnMs / 1000)}`,
          ].map((label) => (
            <span
              key={label}
              className="inline-flex min-h-10 items-center rounded-pill px-3 text-sm font-semibold ink-border"
            >
              {label}
            </span>
          ))}
        </div>
        {isHost && (
          <Button
            tone="secondary"
            size="md"
            iconStart={<Icon icon={gear} />}
            onClick={() => {
              setDraft(view.settings);
              setSettingsOpen(true);
            }}
          >
            {mn.settings.title}
          </Button>
        )}
        {isHost && shortJoin && (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Icon icon={tv} size={18} />
            {mn.lobby.tvHint(`${shortJoin}/tv/${view.code}`)}
          </p>
        )}
      </section>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={mn.settings.title}>
        <SettingsForm value={draft} onChange={setDraft} />
        <Button
          block
          onClick={() => {
            void send('room:updateSettings', draft).then((ok) => ok && setSettingsOpen(false));
          }}
        >
          {mn.settings.save}
        </Button>
      </Sheet>

      <Sheet
        open={kickTarget !== null}
        onClose={() => setKickTarget(null)}
        title={kickTarget?.name ?? ''}
      >
        <Button
          block
          tone="danger"
          onClick={() => {
            if (kickTarget) void send('room:kick', { playerId: kickTarget.id });
            setKickTarget(null);
          }}
        >
          {kickTarget ? mn.lobby.kick(kickTarget.name) : ''}
        </Button>
      </Sheet>
    </Screen>
  );
}
