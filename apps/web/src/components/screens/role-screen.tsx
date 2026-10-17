'use client';

import { DURATIONS, type PlayerView } from '@khuuramch/game-core';
import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { useNow } from '@/lib/use-now';
import { useGame } from '@/store/game';
import { PeekButton } from '../game/peek-button';
import { ProgressAvatars } from '../game/progress-avatars';
import { RoleCard } from '../game/role-card';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { checkFat, skip } from '../ui/icon-data';
import { Screen } from './shell';
import { cardContent, playerById } from './view-helpers';

/** Role reveal (§5.4): press-and-hold card, then "Ойлголоо", then wait for the others. */
export function RoleScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const offset = useGame((s) => s.clockOffset);
  const now = useNow();
  const [peeked, setPeeked] = useState(false);
  const [busy, setBusy] = useState(false);
  const me = playerById(view, view.me.id);
  const secret = view.me.secret;
  const participants = view.players.filter((p) => p.inGame && !p.absent);
  const confirmed = participants.filter((p) => p.confirmed);
  const canForce =
    view.me.isHost && now > 0 && now + offset - view.phaseStartedAt >= DURATIONS.roleForceAfterMs;

  if (!secret || !me) return null;

  if (me.confirmed) {
    return (
      <Screen
        code={view.code}
        actions={
          <>
            <PeekButton secret={secret} />
            {canForce && (
              <>
                <p className="text-center text-sm font-semibold text-fg-muted">
                  {mn.roleCard.forceHint}
                </p>
                <Button
                  block
                  tone="secondary"
                  iconStart={<Icon icon={skip} />}
                  onClick={() => void send('role:force')}
                >
                  {mn.roleCard.force}
                </Button>
              </>
            )}
          </>
        }
      >
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
        >
          <p className="font-display text-[1.5rem] leading-tight font-extrabold">
            {mn.roleCard.waitingTitle}
          </p>
          <ProgressAvatars
            players={participants}
            isDone={(p) => p.confirmed}
            doneLabel={mn.roleCard.gotIt}
          />
          <p className="font-display tabular text-[2rem] leading-none font-extrabold">
            {mn.tv.confirmed(confirmed.length, participants.length)}
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      code={view.code}
      actions={
        <Button
          block
          busy={busy}
          disabled={!peeked}
          iconStart={peeked ? <Icon icon={checkFat} /> : undefined}
          onClick={() => {
            setBusy(true);
            void send('role:confirm').finally(() => setBusy(false));
          }}
        >
          {peeked ? mn.roleCard.gotIt : mn.roleCard.lookFirst}
        </Button>
      }
    >
      <div className="flex flex-1 items-center justify-center">
        <RoleCard
          content={cardContent(secret, view.settings.mode)}
          onReveal={() => setPeeked(true)}
        />
      </div>
    </Screen>
  );
}
