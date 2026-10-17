'use client';

import { MIN_PLAYERS, type TvView } from '@khuuramch/game-core';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useState } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { shareableOrigin } from '@/lib/server-url';
import { useGame } from '@/store/game';
import { Avatar } from '../game/avatar';
import { playerPop } from '../game/player-tile';
import { ProgressAvatars } from '../game/progress-avatars';
import { QrCode } from '../game/qr-code';
import { ScoreBar } from '../game/score-bar';
import { SpeakingOrder } from '../game/speaking-order';
import { TitlesList } from '../game/titles-list';
import { VoteReveal } from '../game/vote-reveal';
import { WinnerBanner } from '../game/winner-banner';
import { WordReveal } from '../game/word-reveal';
import { ranked } from '../screens/result-screen';
import { PhaseTimer } from '../screens/phase-timer';
import { alivePlayers, nameOf, playerById } from '../screens/view-helpers';
import { Icon } from '../ui/icon';
import { checkFat, eyeSlash, x } from '../ui/icon-data';
import { TvCenter } from './tv-stage';

/** One layout per phase on the 1920×1080 stage (§5.12). Never receives a secret. */
export function TvPhase({ view }: { view: TvView }) {
  switch (view.phase) {
    case 'LOBBY':
      return <TvLobby view={view} />;
    case 'ROLE_REVEAL':
      return <TvRoles view={view} />;
    case 'CLUE_TURNS':
      return <TvTurns view={view} />;
    case 'DISCUSSION':
      return <TvDiscussion view={view} />;
    case 'VOTING':
      return <TvVoting view={view} />;
    case 'VOTE_REVEAL':
      return <TvReveal key={view.phaseStartedAt} view={view} />;
    case 'IMPOSTER_GUESS':
      return <TvGuess view={view} />;
    case 'ROUND_RESULT':
      return <TvResult view={view} />;
    case 'SCOREBOARD':
      return <TvScoreboard view={view} />;
  }
}

function TvLobby({ view }: { view: TvView }) {
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    void shareableOrigin().then(setOrigin);
  }, []);
  const ready = view.players.filter((p) => p.connected && !p.absent).length;
  const short = origin?.replace(/^https?:\/\//, '') ?? '';

  return (
    <div className="grid flex-1 grid-cols-[38rem_1fr] gap-20">
      <section className="flex flex-col items-center justify-center gap-6 text-center">
        {origin && (
          <QrCode
            value={`${origin}/room/${view.code}`}
            label={mn.lobby.shareTitle}
            className="w-[26rem]"
          />
        )}
        <p className="text-[2.25rem] leading-tight font-bold">{mn.tv.scan}</p>
        <p className="font-display tabular text-[8rem] leading-none font-black tracking-[0.06em]">
          {view.code}
        </p>
        {short && (
          <p className="text-[1.5rem] font-semibold text-fg-muted">{mn.lobby.shareHint(short)}</p>
        )}
      </section>
      <section className="flex min-w-0 flex-col gap-10">
        <h1 className="font-display text-[3.5rem] leading-none font-extrabold">
          {mn.lobby.players(view.players.length)}
        </h1>
        <ul className="grid grid-cols-4 content-start gap-x-10 gap-y-10">
          <AnimatePresence initial={false}>
            {view.players.map((p) => (
              <m.li key={p.id} {...playerPop} className="flex min-w-0 flex-col items-center gap-3">
                <Avatar
                  animal={p.animal}
                  color={avatarColor(p.seat)}
                  size={136}
                  idle
                  label={p.name}
                />
                <span className="max-w-full truncate text-[1.75rem] font-bold">{p.name}</span>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <p
          aria-live="polite"
          className={cn(
            'mt-auto inline-flex self-start rounded-pill px-8 py-3 text-[2rem] font-bold lift ink-border',
            ready >= MIN_PLAYERS ? 'bg-nogoon text-ink' : 'bg-alt text-ink',
          )}
        >
          {ready >= MIN_PLAYERS
            ? `${mn.lobby.ready} · ${mn.lobby.waitingForHost}`
            : mn.lobby.needPlayers}
        </p>
      </section>
    </div>
  );
}

function TvRoles({ view }: { view: TvView }) {
  const participants = view.players.filter((p) => p.inGame && !p.absent);
  const done = participants.filter((p) => p.confirmed).length;
  return (
    <TvCenter>
      <h1 className="font-display text-[5.5rem] leading-none font-black">{mn.tv.roleReveal}</h1>
      <ProgressAvatars
        players={participants}
        isDone={(p) => p.confirmed}
        doneLabel={mn.roleCard.gotIt}
        size={128}
        className="justify-center gap-8"
      />
      <p aria-live="polite" className="font-display tabular text-[3.5rem] font-extrabold">
        {mn.tv.confirmed(done, participants.length)}
      </p>
      <p className="flex items-center gap-3 text-[1.75rem] font-semibold text-fg-muted">
        <Icon icon={eyeSlash} size={36} />
        {mn.tv.secretsHidden}
      </p>
    </TvCenter>
  );
}

function TvTurns({ view }: { view: TvView }) {
  const round = view.round;
  if (!round) return null;
  const speaker = playerById(view, round.currentSpeakerId);
  const n = round.speakingOrder.length;
  const lastTurn = round.turnIndex + 1 >= n * round.totalLaps;
  const nextId = n ? round.speakingOrder[(round.turnIndex + 1) % n] : null;
  return (
    <div className="flex flex-1 flex-col gap-10">
      <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-16">
        <div aria-live="polite" className="flex flex-col items-center gap-8 text-center">
          <span className="inline-flex min-h-16 items-center gap-4 rounded-pill px-8 text-[2rem] font-bold ink-border">
            {mn.turn.lapLabel}
            <span className="font-display tabular">{mn.turn.lap(round.lap, round.totalLaps)}</span>
          </span>
          {speaker && (
            <Avatar
              animal={speaker.animal}
              color={avatarColor(speaker.seat)}
              size={280}
              idle
              label={speaker.name}
            />
          )}
          <p className="font-display text-[5.5rem] leading-none font-black">
            {mn.turn.speaking(speaker?.name ?? '')}
          </p>
          {!lastTurn && nextId && (
            <p className="text-[2.25rem] font-semibold text-fg-muted">
              {mn.turn.upNext(nameOf(view, nextId))}
            </p>
          )}
        </div>
        <PhaseTimer view={view} size={360} />
      </div>
      <SpeakingOrder view={view} size={88} />
    </div>
  );
}

function TvDiscussion({ view }: { view: TvView }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-24">
      <PhaseTimer view={view} size={460} />
      <div className="flex max-w-[52rem] flex-col gap-8">
        <h1 className="font-display text-[8rem] leading-none font-black">{mn.discussion.prompt}</h1>
        <p className="text-[2.5rem] leading-snug font-semibold text-fg-muted">
          {mn.discussion.hint}
        </p>
      </div>
    </div>
  );
}

function TvVoting({ view }: { view: TvView }) {
  const round = view.round;
  if (!round) return null;
  const alive = alivePlayers(view);
  return (
    <div className="flex flex-1 items-center justify-center gap-24">
      <PhaseTimer view={view} size={380} />
      <div className="flex max-w-[64rem] flex-col gap-10">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[6rem] leading-none font-black">
            {round.revoteCandidates ? mn.voting.revote : mn.voting.title}
          </h1>
          {round.revoteCandidates && (
            <p className="text-[2.25rem] font-semibold text-fg-muted">{mn.voting.revoteHint}</p>
          )}
        </div>
        <p
          aria-live="polite"
          className="font-display tabular text-[4rem] leading-none font-extrabold"
        >
          {mn.voting.progress(round.votesCast, round.votersTotal)}
        </p>
        <ProgressAvatars
          players={alive}
          isDone={(p) => p.voted}
          doneLabel={mn.voting.locked}
          size={112}
          className="justify-start gap-6"
        />
      </div>
    </div>
  );
}

function TvReveal({ view }: { view: TvView }) {
  const offset = useGame((s) => s.clockOffset);
  return <VoteReveal view={view} origin={view.phaseStartedAt - offset} size="tv" />;
}

function TvGuess({ view }: { view: TvView }) {
  const guess = view.round?.guess;
  const guesser = playerById(view, guess?.guesserId);
  if (!guess || !guesser) return null;
  if (guess.correct !== null) {
    const correct = guess.correct;
    return (
      <TvCenter>
        <span
          className={cn(
            'grid size-56 place-items-center rounded-pill lift ink-border',
            correct ? 'bg-nogoon text-ink' : 'bg-al text-paper',
          )}
        >
          <Icon icon={correct ? checkFat : x} size={120} />
        </span>
        <p role="status" className="font-display text-[6rem] leading-none font-black">
          {correct ? mn.guess.guesserCorrect(guesser.name) : mn.guess.guesserWrong(guesser.name)}
        </p>
      </TvCenter>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center gap-24">
      <Avatar
        animal={guesser.animal}
        color={avatarColor(guesser.seat)}
        size={300}
        idle
        label={guesser.name}
      />
      <div className="flex max-w-[56rem] flex-col gap-8">
        <h1 className="font-display text-[6rem] leading-none font-black">{mn.guess.waiting}</h1>
        <p className="text-[2.5rem] font-semibold text-fg-muted">
          {mn.guess.guessing(guesser.name)}
        </p>
        <PhaseTimer view={view} size={260} />
      </div>
    </div>
  );
}

function TvResult({ view }: { view: TvView }) {
  const result = view.round?.result;
  if (!result) return null;
  const imposters = view.players.filter((p) => result.imposterIds.includes(p.id));
  return (
    <div className="grid flex-1 grid-cols-[1.05fr_1fr] items-center gap-20">
      <div className="flex flex-col gap-10">
        <WinnerBanner winner={result.winner} size="tv" />
        <p className="text-center text-[2.5rem] font-bold">{mn.result.reasons[result.reason]}</p>
        <div className="flex flex-col gap-5">
          <h2 className="text-[1.5rem] font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.result.imposters}
          </h2>
          <ul className="flex flex-wrap gap-10">
            {imposters.map((p) => (
              <li key={p.id} className="flex items-center gap-5">
                <Avatar
                  animal={p.animal}
                  color={avatarColor(p.seat)}
                  size={112}
                  eliminated={p.eliminated}
                  label={p.name}
                />
                <span className="font-display text-[3rem] font-extrabold">{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <WordReveal
        wordA={result.wordA}
        wordB={result.wordB}
        category={mn.categories[result.category]}
        size="tv"
      />
    </div>
  );
}

function TvScoreboard({ view }: { view: TvView }) {
  const players = ranked(view);
  const max = Math.max(0, ...players.map((p) => p.score));
  return (
    <div className="flex flex-1 flex-col gap-10">
      <div className="flex items-baseline justify-between gap-8">
        <h1 className="font-display text-[5rem] leading-none font-black">{mn.result.scoreboard}</h1>
        <span className="tabular text-[2rem] font-bold text-fg-muted">
          {mn.result.gamesPlayed(view.gamesPlayed)}
        </span>
      </div>
      <ol
        className={cn('grid content-start gap-x-16 gap-y-6', players.length > 6 && 'grid-cols-2')}
      >
        {players.map((p, i) => (
          <ScoreBar
            key={p.id}
            name={p.name}
            animal={p.animal}
            color={avatarColor(p.seat)}
            score={p.score}
            max={max}
            order={i}
            size="tv"
          />
        ))}
      </ol>
      {view.titles && (
        <div className="mt-auto">
          <TitlesList titles={view.titles} players={view.players} size="tv" />
        </div>
      )}
    </div>
  );
}
