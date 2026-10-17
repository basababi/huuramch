'use client';

import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { readStorage, writeStorage } from '@/lib/storage';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { arrowRight, checkFat } from '../ui/icon-data';
import { Sheet } from '../ui/sheet';

const SEEN_KEY = 'khuuramch:rules-seen';
/** The three steps that matter once you are already in a room. */
const CARDS = mn.rules.steps.slice(1);

/** A skippable three-card rules sheet on a player's first game (§5.11), once per device. */
export function FirstGameRules() {
  const [open, setOpen] = useState(() => readStorage(SEEN_KEY) === null);
  const [index, setIndex] = useState(0);
  const card = CARDS[index];
  const last = index === CARDS.length - 1;

  const close = () => {
    writeStorage(SEEN_KEY, '1');
    setOpen(false);
  };

  if (!card) return null;

  return (
    <Sheet open={open} onClose={close} title={mn.rules.firstTime}>
      <article className="flex min-h-[13rem] flex-col gap-3 rounded-card bg-raised p-5 lift ink-border">
        <span className="font-display tabular text-[2.5rem] leading-none font-black text-tenger dark:text-tsenher">
          {mn.rules.step(index + 1, CARDS.length)}
        </span>
        <h3 className="font-display text-[1.5rem] leading-tight font-extrabold">{card.title}</h3>
        <p className="text-lg leading-snug font-medium">{card.body}</p>
      </article>
      <div className="grid grid-cols-2 gap-3">
        <Button tone="secondary" size="md" onClick={close}>
          {mn.rules.skip}
        </Button>
        <Button
          size="md"
          iconEnd={<Icon icon={last ? checkFat : arrowRight} />}
          onClick={() => (last ? close() : setIndex(index + 1))}
        >
          {last ? mn.rules.gotIt : mn.rules.next}
        </Button>
      </div>
    </Sheet>
  );
}
