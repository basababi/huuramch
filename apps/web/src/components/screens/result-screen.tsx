'use client';

import type { PlayerView, PublicPlayer, PublicView } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { useGame } from '@/store/game';
import { Avatar } from '../game/avatar';
import { ScoreBar } from '../game/score-bar';
import { TitlesList } from '../game/titles-list';
import { WinnerBanner } from '../game/winner-banner';
import { WordReveal } from '../game/word-reveal';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { chartBar, replay, signOut } from '../ui/icon-data';
import { Screen, SectionTitle } from './shell';
import { useLeaveRoom } from './use-leave-room';
import { nameOf } from './view-helpers';

/** Players by cumulative score, highest first; ties keep join order. */
export function ranked(view: PublicView): PublicPlayer[] {
  return view.players
    .filter((p) => !p.absent || p.score > 0)
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
}

/** Round result (§5.10): who won and why, the words, the imposters, this game's points. */
export function ResultScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const result = view.round?.result;
  if (!result) return null;

  const imposters = view.players.filter((p) => result.imposterIds.includes(p.id));
  const earned = view.players
    .filter((p) => (result.points[p.id] ?? 0) > 0)
    .sort((a, b) => (result.points[b.id] ?? 0) - (result.points[a.id] ?? 0));

  return (
    <Screen
      code={view.code}
      actions={
        view.me.isHost ? (
          <Button
            block
            iconStart={<Icon icon={chartBar} />}
            onClick={() => void send('round:continue')}
          >
            {mn.result.showScores}
          </Button>
        ) : (
          <p role="status" className="text-center text-base font-bold text-fg-muted">
            {mn.result.waitingScores(nameOf(view, view.hostId))}
          </p>
        )
      }
    >
      <WinnerBanner winner={result.winner} />
      <p className="text-center text-lg font-bold">{mn.result.reasons[result.reason]}</p>
      <WordReveal
        wordA={result.wordA}
        wordB={result.wordB}
        category={mn.categories[result.category]}
      />

      <section className="flex flex-col gap-3">
        <SectionTitle>{mn.result.imposters}</SectionTitle>
        <ul className="flex flex-wrap gap-4">
          {imposters.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <Avatar
                animal={p.animal}
                color={avatarColor(p.seat)}
                size={48}
                eliminated={p.eliminated}
                label={p.name}
              />
              <span className="font-display text-[1.25rem] font-extrabold">{p.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {earned.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>{mn.result.thisGame}</SectionTitle>
          <ul className="flex flex-col gap-2">
            {earned.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar animal={p.animal} color={avatarColor(p.seat)} size={40} label={p.name} />
                <span className="min-w-0 flex-1 truncate text-base font-bold">{p.name}</span>
                <span className="rounded-pill bg-nogoon px-3 py-0.5 font-display tabular text-[1.25rem] font-extrabold text-ink ink-border">
                  {mn.result.roundPoints(result.points[p.id] ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}

/** Scoreboard (§5.10): chunky score bars, fun titles, Дахин тоглох / Гарах. */
export function ScoreboardScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const exit = useLeaveRoom();
  const players = ranked(view);
  const max = Math.max(0, ...players.map((p) => p.score));

  return (
    <Screen
      code={view.code}
      actions={
        view.me.isHost ? (
          <>
            <Button
              block
              tone="success"
              iconStart={<Icon icon={replay} />}
              onClick={() => void send('game:replay')}
            >
              {mn.result.replay}
            </Button>
            <Button
              block
              tone="secondary"
              size="md"
              iconStart={<Icon icon={signOut} />}
              onClick={exit}
            >
              {mn.result.leave}
            </Button>
          </>
        ) : (
          <>
            <p role="status" className="text-center text-base font-bold text-fg-muted">
              {mn.result.waitingHost}
            </p>
            <Button
              block
              tone="secondary"
              size="md"
              iconStart={<Icon icon={signOut} />}
              onClick={exit}
            >
              {mn.result.leave}
            </Button>
          </>
        )
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.75rem] leading-tight font-extrabold">
          {mn.result.scoreboard}
        </h1>
        <span className="tabular text-sm font-bold text-fg-muted">
          {mn.result.gamesPlayed(view.gamesPlayed)}
        </span>
      </div>
      <ol className="flex flex-col gap-3">
        {players.map((p, i) => (
          <ScoreBar
            key={p.id}
            name={p.name}
            animal={p.animal}
            color={avatarColor(p.seat)}
            score={p.score}
            max={max}
            order={i}
          />
        ))}
      </ol>
      {view.titles && <TitlesList titles={view.titles} players={view.players} />}
    </Screen>
  );
}
