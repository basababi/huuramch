'use client';

import type { PlayerView } from '@khuuramch/game-core';
import { useEffect, useState } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { HAPTICS, vibrate } from '@/lib/haptics';
import { useGame } from '@/store/game';
import { Avatar } from '../game/avatar';
import { PeekButton } from '../game/peek-button';
import { SpeakingOrder } from '../game/speaking-order';
import { YourTurn } from '../game/your-turn';
import { Banner } from '../ui/banner';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { chat, eyeSlash, skip } from '../ui/icon-data';
import { PhaseTimer } from './phase-timer';
import { Screen } from './shell';
import { nameOf, playerById } from './view-helpers';

/** Clue turns (§5.5): a yellow full screen when it's your turn, a calm one otherwise. */
export function TurnsScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const offset = useGame((s) => s.clockOffset);
  const [busy, setBusy] = useState(false);
  const round = view.round;
  const speakerId = round?.currentSpeakerId ?? null;
  const mine = speakerId === view.me.id;

  useEffect(() => {
    if (mine) vibrate(HAPTICS.yourTurn);
  }, [mine, round?.turnIndex]);

  if (!round) return null;

  if (mine) {
    return (
      <Screen code={view.code} tone="alt">
        <YourTurn
          busy={busy}
          timer={
            view.deadline !== null
              ? {
                  deadline: view.deadline,
                  durationMs: view.deadline - view.phaseStartedAt,
                  clockOffsetMs: offset,
                }
              : null
          }
          onDone={() => {
            setBusy(true);
            void send('turn:done', { turnIndex: round.turnIndex }).finally(() => setBusy(false));
          }}
          className="flex-1"
        />
      </Screen>
    );
  }

  const speaker = playerById(view, speakerId);
  const n = round.speakingOrder.length;
  const nextId = n ? round.speakingOrder[(round.turnIndex + 1) % n] : null;
  const lastTurn = round.turnIndex + 1 >= n * round.totalLaps;

  return (
    <Screen
      code={view.code}
      actions={
        <>
          <PeekButton secret={view.me.secret} />
          {view.me.isHost && (
            <Button
              block
              tone="secondary"
              size="md"
              iconStart={<Icon icon={skip} />}
              onClick={() => void send('turn:done', { turnIndex: round.turnIndex })}
            >
              {mn.turn.next}
            </Button>
          )}
        </>
      }
    >
      <EliminatedNote view={view} />
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-h-10 items-center gap-2 rounded-pill px-3 text-sm font-bold ink-border">
          {mn.turn.lapLabel}
          <span className="font-display tabular">{mn.turn.lap(round.lap, round.totalLaps)}</span>
        </span>
        <PhaseTimer view={view} size={72} />
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
        aria-live="polite"
      >
        {speaker && (
          <Avatar
            animal={speaker.animal}
            color={avatarColor(speaker.seat)}
            size={128}
            idle
            label={speaker.name}
          />
        )}
        <p className="font-display text-[1.75rem] leading-tight font-extrabold">
          {mn.turn.speaking(speaker?.name ?? '')}
        </p>
        {!lastTurn && nextId && (
          <p className="text-base font-semibold text-fg-muted">
            {mn.turn.upNext(nameOf(view, nextId))}
          </p>
        )}
      </div>
      <SpeakingOrder view={view} />
    </Screen>
  );
}

/** Discussion (§5.6): big timer, one prompt, host-only skip to the vote. */
export function DiscussionScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  return (
    <Screen
      code={view.code}
      actions={
        <>
          <PeekButton secret={view.me.secret} />
          {view.me.isHost && (
            <Button
              block
              tone="danger"
              iconStart={<Icon icon={chat} />}
              onClick={() => void send('discussion:skip')}
            >
              {mn.discussion.toVoting}
            </Button>
          )}
        </>
      }
    >
      <EliminatedNote view={view} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <PhaseTimer view={view} size={200} />
        <h1 className="font-display text-[2.5rem] leading-none font-black">
          {mn.discussion.prompt}
        </h1>
        <p className="max-w-[18rem] text-lg font-semibold text-fg-muted">{mn.discussion.hint}</p>
      </div>
    </Screen>
  );
}

/** Mode B: an eliminated player keeps watching (and keeps their word to themselves). */
function EliminatedNote({ view }: { view: PlayerView }) {
  if (!playerById(view, view.me.id)?.eliminated) return null;
  return (
    <Banner tone="info" icon={eyeSlash}>
      {mn.eliminated.title}. {mn.eliminated.body}
    </Banner>
  );
}
