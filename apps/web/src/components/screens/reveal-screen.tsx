'use client';

import type { PlayerView } from '@khuuramch/game-core';
import { useState } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { HAPTICS, vibrate } from '@/lib/haptics';
import { useGame } from '@/store/game';
import { VoteReveal } from '../game/vote-reveal';
import { WaitingState } from '../game/waiting-state';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { checkFat, question, x } from '../ui/icon-data';
import { PhaseTimer } from './phase-timer';
import { Screen } from './shell';
import { playerById } from './view-helpers';

const onStamp = () => vibrate(HAPTICS.reveal);

/** Vote reveal (§5.8) on a phone: the shared sequence, plus a buzz as the stamp lands. */
export function RevealScreen({ view }: { view: PlayerView }) {
  const offset = useGame((s) => s.clockOffset);
  return (
    <Screen code={view.code}>
      <VoteReveal view={view} origin={view.phaseStartedAt - offset} onStamp={onStamp} />
    </Screen>
  );
}

/**
 * Imposter guess (§5.9): the caught imposter picks the civilians' word from eight tiles in a 2×4
 * grid within 20 s; every other phone says who is guessing. Mode B never shows the right word
 * here — words stay hidden until the game ends.
 */
export function GuessScreen({ view }: { view: PlayerView }) {
  const send = useGame((s) => s.send);
  const [choice, setChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const guess = view.round?.guess;
  if (!guess) return null;

  const guesser = playerById(view, guess.guesserId);
  const mine = guess.guesserId === view.me.id;
  const options = view.me.guessOptions;
  const resolved = guess.correct !== null;
  const hint = view.settings.mode === 'A' ? mn.guess.hintA : mn.guess.hintB;

  if (mine && options && !resolved) {
    return (
      <Screen
        code={view.code}
        actions={
          <Button
            block
            tone="danger"
            busy={busy}
            disabled={choice === null}
            iconStart={<Icon icon={question} />}
            onClick={() => {
              if (choice === null) return;
              setBusy(true);
              void send('guess:submit', { optionIndex: choice }).finally(() => setBusy(false));
            }}
          >
            {mn.guess.submit}
          </Button>
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[1.75rem] leading-tight font-extrabold">
              {mn.guess.title}
            </h1>
            <p className="text-base font-semibold text-fg-muted">{hint}</p>
          </div>
          <PhaseTimer view={view} size={76} />
        </div>
        <p className="text-lg font-bold">{mn.guess.pick}</p>
        <ul className="grid grid-cols-2 gap-3">
          {options.map((word, index) => (
            <li key={`${index}-${word}`}>
              <OptionTile
                word={word}
                selected={choice === index}
                onSelect={() => setChoice(index)}
              />
            </li>
          ))}
        </ul>
      </Screen>
    );
  }

  if (resolved) {
    const correct = guess.correct === true;
    const picked =
      mine && options && view.me.guessChoice !== null ? options[view.me.guessChoice] : null;
    const title = mine
      ? correct
        ? mn.guess.correct
        : picked
          ? mn.guess.wrong
          : mn.guess.timeUp
      : correct
        ? mn.guess.guesserCorrect(guesser?.name ?? '')
        : mn.guess.guesserWrong(guesser?.name ?? '');
    return (
      <Screen code={view.code}>
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
        >
          <span
            className={cn(
              'grid size-24 place-items-center rounded-pill lift ink-border',
              correct ? 'bg-nogoon text-ink' : 'bg-al text-paper',
            )}
          >
            <Icon icon={correct ? checkFat : x} size={48} />
          </span>
          <p className="font-display text-[2rem] leading-tight font-extrabold">{title}</p>
          {picked && (
            <p className="rounded-card px-4 py-3 font-display text-[1.5rem] font-extrabold lift-sm ink-border">
              {picked}
            </p>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen code={view.code}>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {guesser && (
          <WaitingState
            animal={guesser.animal}
            color={avatarColor(guesser.seat)}
            title={mn.guess.waiting}
            detail={mn.guess.guessing(guesser.name)}
          />
        )}
        <PhaseTimer view={view} size={96} />
      </div>
    </Screen>
  );
}

function OptionTile({
  word,
  selected,
  onSelect,
}: {
  word: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-[4.75rem] w-full pressable touch-manipulation items-center justify-center rounded-card px-3 py-2 text-center no-callout ink-border',
        'font-display text-[1.25rem] leading-tight font-extrabold [text-wrap:balance] [overflow-wrap:anywhere]',
        selected ? 'bg-alt text-ink selected-ring' : 'bg-raised text-fg',
      )}
    >
      {word}
    </button>
  );
}
