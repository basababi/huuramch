'use client';

import { AnimatePresence } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { ModeCard } from '@/components/game/mode-card';
import { PlayerTile, VoteTile } from '@/components/game/player-tile';
import { RoleCard, type RoleCardContent } from '@/components/game/role-card';
import { Stamp, shake } from '@/components/game/stamp';
import { TimerRing } from '@/components/game/timer-ring';
import { YourTurn } from '@/components/game/your-turn';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { CodeInput } from '@/components/ui/code-input';
import { Icon } from '@/components/ui/icon';
import { minus, plus, replay, users } from '@/components/ui/icon-data';
import { Segmented } from '@/components/ui/segmented';
import { Stepper } from '@/components/ui/stepper';
import { TextField } from '@/components/ui/text-field';
import { mn } from '@/i18n/mn';
import { HAPTICS, vibrate } from '@/lib/haptics';
import { samplePlayer } from './samples';

const FREE = ['food', 'places', 'animals', 'daily', 'arts', 'sports'] as const;
const LOCKED = ['student', 'kpop', 'singers', 'tsagaanSar', 'night'] as const;

export function FormDemo() {
  const [categories, setCategories] = useState<string[]>(['food', 'animals']);
  const [imposters, setImposters] = useState(1);
  const [preset, setPreset] = useState<'calm' | 'normal' | 'fast'>('normal');
  const [code, setCode] = useState('48');
  const [name, setName] = useState('Тэмүүлэн');
  const [mode, setMode] = useState<'A' | 'B'>('A');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
          {mn.settings.mode}
        </h3>
        <div role="radiogroup" aria-label={mn.settings.mode} className="grid gap-4 tv:grid-cols-2">
          <ModeCard mode="A" selected={mode === 'A'} onClick={() => setMode('A')} />
          <ModeCard mode="B" selected={mode === 'B'} onClick={() => setMode('B')} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
          {mn.settings.categories}
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {FREE.map((id) => (
            <Chip
              key={id}
              selected={categories.includes(id)}
              onClick={() =>
                setCategories((prev) =>
                  prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
                )
              }
            >
              {mn.categories[id]}
            </Chip>
          ))}
          {LOCKED.map((id) => (
            <Chip key={id} locked aria-label={mn.settings.lockedLabel(mn.categories[id])}>
              {mn.categories[id]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.settings.imposters}
          </h3>
          <Stepper
            label={mn.settings.imposters}
            value={imposters}
            min={1}
            max={3}
            onChange={setImposters}
          />
        </div>
        <div className="flex min-w-[18rem] flex-1 flex-col gap-3">
          <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.settings.timers}
          </h3>
          <Segmented
            label={mn.settings.timers}
            value={preset}
            onChange={setPreset}
            options={[
              {
                value: 'calm',
                label: mn.settings.timerPresets.calm,
                hint: mn.common.secondsShort(30),
              },
              {
                value: 'normal',
                label: mn.settings.timerPresets.normal,
                hint: mn.common.secondsShort(20),
              },
              {
                value: 'fast',
                label: mn.settings.timerPresets.fast,
                hint: mn.common.secondsShort(12),
              },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-6 tv:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.home.codeLabel}
          </h3>
          <CodeInput label={mn.home.codeLabel} value={code} onChange={setCode} />
        </div>
        <div className="flex flex-col gap-6">
          <TextField
            label={mn.profile.nickname}
            hint={mn.profile.nicknameHint}
            value={name}
            onValueChange={setName}
            maxChars={12}
            autoComplete="nickname"
          />
          <TextField
            label={mn.profile.nickname}
            error={mn.profile.nicknameTooLong}
            value="Тэмүүлэнбаатар"
            onValueChange={() => {}}
            maxChars={12}
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

export function LobbyDemo() {
  const [count, setCount] = useState(2);
  const players = Array.from({ length: count }, (_, i) => samplePlayer(i, { isHost: i === 0 }));

  return (
    <div className="flex flex-col gap-5">
      <ul className="grid grid-cols-3 gap-x-3 gap-y-5 tv:grid-cols-6">
        <AnimatePresence initial={false}>
          {players.map((p) => (
            <PlayerTile key={p.id} player={p} idle />
          ))}
        </AnimatePresence>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="md"
          tone="secondary"
          onClick={() => setCount((c) => Math.min(12, c + 1))}
          iconStart={<Icon icon={plus} />}
        >
          {mn.dev.addPlayer}
        </Button>
        <Button
          size="md"
          tone="secondary"
          onClick={() => setCount((c) => Math.max(1, c - 1))}
          iconStart={<Icon icon={minus} />}
        >
          {mn.dev.removePlayer}
        </Button>
        <span
          className={
            count < 3
              ? 'inline-flex min-h-10 items-center gap-2 rounded-pill bg-alt px-3 text-sm font-bold text-ink ink-border'
              : 'inline-flex min-h-10 items-center gap-2 rounded-pill bg-nogoon px-3 text-sm font-bold text-ink ink-border'
          }
        >
          <Icon icon={users} size={18} />
          {count < 3 ? mn.lobby.needPlayers : `${count}/12`}
        </span>
      </div>
    </div>
  );
}

export function VoteDemo() {
  const [selected, setSelected] = useState<string | null>('p2');
  const players = [1, 2, 3, 4].map((i) => samplePlayer(i));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 tv:grid-cols-4">
        {players.map((p) => (
          <VoteTile
            key={p.id}
            player={p}
            selected={selected === p.id}
            onSelect={() => setSelected(p.id)}
          />
        ))}
      </div>
      <p className="text-center tabular text-base font-bold">{mn.voting.progress(5, 7)}</p>
      <Button tone="danger" block disabled={!selected} onClick={() => vibrate(HAPTICS.voteLocked)}>
        {mn.voting.cast}
      </Button>
    </div>
  );
}

const ROLE_VARIANTS: Array<{ key: string; label: string; content: RoleCardContent }> = [
  {
    key: 'a-civ',
    label: 'A · Энгийн',
    content: { mode: 'A', role: 'civilian', word: 'Бууз', category: mn.categories.food },
  },
  {
    key: 'a-imp',
    label: 'A · Хуурамч',
    content: { mode: 'A', role: 'imposter', category: mn.categories.food },
  },
  {
    key: 'a-imp-hidden',
    label: 'A · Ангилалгүй',
    content: { mode: 'A', role: 'imposter', category: null },
  },
  { key: 'b', label: 'B · Үг', content: { mode: 'B', word: 'Сүүтэй цай' } },
];

export function RoleCardDemo() {
  const [variant, setVariant] = useState('a-civ');
  const [peeked, setPeeked] = useState(false);
  const current = ROLE_VARIANTS.find((v) => v.key === variant) ?? ROLE_VARIANTS[0];
  const onReveal = useCallback(() => setPeeked(true), []);
  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap justify-center gap-2">
        {ROLE_VARIANTS.map((v) => (
          <Chip key={v.key} selected={v.key === variant} onClick={() => setVariant(v.key)}>
            {v.label}
          </Chip>
        ))}
      </div>
      <RoleCard key={current.key} content={current.content} onReveal={onReveal} />
      <Button block className="max-w-[21rem]" disabled={!peeked}>
        {peeked ? mn.roleCard.gotIt : mn.roleCard.lookFirst}
      </Button>
    </div>
  );
}

export function RoleFacesDemo() {
  return (
    <div className="grid gap-6 tv:grid-cols-4">
      {ROLE_VARIANTS.map((v) => (
        <figure key={v.key} className="flex flex-col items-center gap-2">
          <RoleCard content={v.content} forceRevealed />
          <figcaption className="text-sm font-bold text-fg-muted">{v.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function TimerDemo({ frozen }: { frozen: boolean }) {
  const [deadline, setDeadline] = useState(() => Date.now() + 20_000);
  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <TimerRing
          deadline={deadline}
          durationMs={20_000}
          frozenRemainingMs={frozen ? 13_000 : undefined}
        />
        <Button
          size="md"
          tone="secondary"
          onClick={() => setDeadline(Date.now() + 20_000)}
          iconStart={<Icon icon={replay} />}
        >
          {mn.common.replayDemo}
        </Button>
      </div>
      <TimerRing deadline={0} durationMs={20_000} frozenRemainingMs={4_000} size={120} />
      <TimerRing deadline={0} durationMs={90_000} frozenRemainingMs={61_000} size={96} />
    </div>
  );
}

export function StampDemo({ frozen }: { frozen: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const land = useCallback(() => {
    if (run === 0) return;
    shake(stage.current);
    vibrate(HAPTICS.reveal);
  }, [run]);

  return (
    <div className="flex flex-col items-start gap-5">
      <div
        ref={stage}
        className="flex w-full flex-wrap items-center justify-center gap-10 rounded-card bg-surface px-4 py-10 ink-border"
      >
        <Stamp key={`i${run}`} kind="imposter" slam={!frozen && run > 0} onLand={land} />
        <Stamp key={`c${run}`} kind="civilian" slam={!frozen && run > 0} />
      </div>
      <Button
        size="md"
        tone="secondary"
        onClick={() => setRun((r) => r + 1)}
        iconStart={<Icon icon={replay} />}
      >
        {mn.common.replayDemo}
      </Button>
    </div>
  );
}

export function YourTurnDemo({ frozen }: { frozen: boolean }) {
  const [deadline] = useState(() => Date.now() + 20_000);
  return (
    <YourTurn
      framed
      deadline={deadline}
      durationMs={20_000}
      frozenRemainingMs={frozen ? 9_000 : undefined}
      onDone={() => vibrate(HAPTICS.yourTurn)}
      className="w-full max-w-[22.5rem]"
    />
  );
}
