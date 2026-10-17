'use client';

import { ANIMAL_IDS, NAME_MAX, checkName, type AnimalId } from '@khuuramch/game-core';
import { useState, type FormEvent } from 'react';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { loadProfile } from '@/lib/session';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { arrowRight, checkFat } from '../ui/icon-data';
import { TextField } from '../ui/text-field';
import { Avatar } from './avatar';

const NAME_ERRORS = {
  length: mn.profile.nicknameHint,
  chars: mn.profile.nameChars,
  profane: mn.profile.nameProfane,
} as const;

/** Nickname + one of the 12 animals (one animal per player per room, §2.5). */
export function ProfileForm({
  taken = [],
  submitLabel,
  busyLabel,
  onSubmit,
}: {
  taken?: AnimalId[];
  submitLabel: string;
  busyLabel: string;
  onSubmit: (nickname: string, animal: AnimalId) => Promise<string | null>;
}) {
  const [nickname, setNickname] = useState(() => loadProfile().nickname);
  const [animal, setAnimal] = useState<AnimalId | null>(() => {
    const saved = loadProfile().animal;
    return saved && !taken.includes(saved) ? saved : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const free = animal && !taken.includes(animal) ? animal : null;
  const check = checkName(nickname);
  const nameError = nickname && !check.ok ? NAME_ERRORS[check.reason] : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!check.ok || !free || busy) return;
    setBusy(true);
    setError(await onSubmit(check.name, free));
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        label={mn.profile.nickname}
        hint={mn.profile.nicknameHint}
        error={nameError}
        placeholder={mn.profile.nicknamePlaceholder}
        value={nickname}
        onValueChange={setNickname}
        maxChars={NAME_MAX}
        autoComplete="nickname"
        enterKeyHint="done"
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[0.9375rem] font-bold">{mn.profile.pickAnimal}</legend>
        <div
          role="radiogroup"
          aria-label={mn.profile.pickAnimal}
          className="grid grid-cols-4 gap-x-2 gap-y-3"
        >
          {ANIMAL_IDS.map((id, index) => {
            const isTaken = taken.includes(id);
            const selected = free === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={isTaken ? `${mn.animals[id]} · ${mn.profile.taken}` : mn.animals[id]}
                disabled={isTaken}
                onClick={() => setAnimal(id)}
                className={cn(
                  'relative flex min-h-12 touch-manipulation flex-col items-center gap-1 rounded-card p-1.5 no-callout',
                  selected && 'bg-alt text-ink',
                  isTaken && 'opacity-40',
                )}
              >
                <Avatar
                  animal={id}
                  color={avatarColor(index)}
                  size={56}
                  eliminated={isTaken}
                  decorative
                />
                <span className="text-xs font-bold">{mn.animals[id]}</span>
                {selected && (
                  <span className="absolute top-0 right-0 grid size-6 place-items-center rounded-pill bg-ink text-paper">
                    <Icon icon={checkFat} size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="text-base font-bold">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 border-t-[length:var(--stroke)] border-line bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="submit"
          block
          busy={busy}
          disabled={!check.ok || !free}
          iconEnd={<Icon icon={arrowRight} />}
        >
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
