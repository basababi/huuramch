'use client';

import type { PlayerView } from '@khuuramch/game-core';
import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { HAPTICS, vibrate } from '@/lib/haptics';
import { useGame } from '@/store/game';
import { VoteTile } from '../game/player-tile';
import { ProgressAvatars } from '../game/progress-avatars';
import { Banner } from '../ui/banner';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { checkFat, eyeSlash } from '../ui/icon-data';
import { PhaseTimer } from './phase-timer';
import { Screen, SectionTitle } from './shell';
import { alivePlayers, playerById, summary } from './view-helpers';

/**
 * Voting (§5.7): two columns of the other players, tap to select, "Санал өгөх" to lock.
 * Shows how many voted and who we still wait for — never who voted for whom.
 */
export function VotingScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const round = view.round;
  const me = playerById(view, view.me.id);
  if (!round || !me) return null;

  const alive = alivePlayers(view);
  const candidates = round.revoteCandidates;
  const targets = alive.filter((p) => p.id !== me.id && (!candidates || candidates.includes(p.id)));
  const canVote = me.inGame && !me.eliminated && !me.absent;
  const locked = view.me.myVote;
  const selected = locked ?? (choice && targets.some((p) => p.id === choice) ? choice : null);
  const progress = (
    <p aria-live="polite" className="text-center tabular text-base font-bold">
      {mn.voting.progress(round.votesCast, round.votersTotal)}
    </p>
  );
  const pending = alive.filter((p) => !p.voted);

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[1.75rem] leading-tight font-extrabold">
          {candidates ? mn.voting.revote : mn.voting.title}
        </h1>
        <p className="text-base font-semibold text-fg-muted">
          {candidates ? mn.voting.revoteHint : canVote ? mn.voting.pick : mn.voting.watching}
        </p>
      </div>
      <PhaseTimer view={view} size={76} />
    </div>
  );

  if (!canVote || locked) {
    return (
      <Screen code={view.code}>
        {header}
        {canVote ? (
          <Banner tone="success" icon={checkFat}>
            {mn.voting.locked} · {mn.voting.lockedHint}
          </Banner>
        ) : (
          <Banner tone="info" icon={eyeSlash}>
            {mn.eliminated.body}
          </Banner>
        )}
        {locked && (
          <ul className="mx-auto grid w-full max-w-[12rem]">
            {targets
              .filter((p) => p.id === locked)
              .map((p) => (
                <li key={p.id}>
                  <VoteTile player={summary(p)} selected locked onSelect={() => undefined} />
                </li>
              ))}
          </ul>
        )}
        <div className="mt-auto flex flex-col gap-3">
          {progress}
          {pending.length > 0 && (
            <>
              <SectionTitle>{mn.voting.notVoted}</SectionTitle>
              <ProgressAvatars
                players={pending}
                isDone={() => false}
                doneLabel={mn.voting.locked}
                size={48}
              />
            </>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      code={view.code}
      actions={
        <>
          {progress}
          <Button
            block
            tone="danger"
            busy={busy}
            disabled={!selected}
            iconStart={<Icon icon={checkFat} />}
            onClick={() => {
              if (!selected) return;
              setBusy(true);
              void send('vote:cast', { targetId: selected }).then((ok) => {
                setBusy(false);
                if (ok) vibrate(HAPTICS.voteLocked);
              });
            }}
          >
            {mn.voting.cast}
          </Button>
        </>
      }
    >
      {header}
      <ul className="grid grid-cols-2 gap-3">
        {targets.map((p) => (
          <li key={p.id}>
            <VoteTile
              player={summary(p)}
              selected={selected === p.id}
              onSelect={() => setChoice(p.id)}
            />
          </li>
        ))}
      </ul>
    </Screen>
  );
}
