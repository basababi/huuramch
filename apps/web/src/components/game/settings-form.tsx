'use client';

import {
  CATEGORY_IDS,
  LOCKED_PACK_IDS,
  TIMER_PRESETS,
  type LockedPackId,
  type RoomSettings,
} from '@khuuramch/game-core';
import { useState } from 'react';
import { mn } from '@/i18n/mn';
import { sendPackEvent } from '@/lib/pack-events';
import { Button } from '../ui/button';
import { Chip } from '../ui/chip';
import { Icon } from '../ui/icon';
import { sealCheck } from '../ui/icon-data';
import { Segmented } from '../ui/segmented';
import { Sheet } from '../ui/sheet';
import { ModeCard } from './mode-card';

function Heading({ children }: { children: string }) {
  return <h2 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">{children}</h2>;
}

type ImposterChoice = 'auto' | '1' | '2' | '3';

/** Every room setting a host can change (§5.2): mode, categories, imposters, speed, toggles. */
export function SettingsForm({
  value,
  onChange,
}: {
  value: RoomSettings;
  onChange: (next: RoomSettings) => void;
}) {
  const [lockedPack, setLockedPack] = useState<LockedPackId | null>(null);
  const update = (patch: Partial<RoomSettings>) => onChange({ ...value, ...patch });

  const toggleCategory = (id: (typeof CATEGORY_IDS)[number]) => {
    const has = value.categories.includes(id);
    if (has && value.categories.length === 1) return; // at least one category
    update({
      categories: has ? value.categories.filter((c) => c !== id) : [...value.categories, id],
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <Heading>{mn.settings.mode}</Heading>
        <div role="radiogroup" aria-label={mn.settings.mode} className="grid gap-4 tv:grid-cols-2">
          <ModeCard mode="A" selected={value.mode === 'A'} onClick={() => update({ mode: 'A' })} />
          <ModeCard mode="B" selected={value.mode === 'B'} onClick={() => update({ mode: 'B' })} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{mn.settings.categories}</Heading>
        <div className="flex flex-wrap gap-2.5">
          {CATEGORY_IDS.map((id) => (
            <Chip
              key={id}
              selected={value.categories.includes(id)}
              onClick={() => toggleCategory(id)}
            >
              {mn.categories[id]}
            </Chip>
          ))}
          {LOCKED_PACK_IDS.map((id) => (
            <Chip
              key={id}
              locked
              aria-label={mn.settings.lockedLabel(mn.categories[id])}
              onClick={() => {
                setLockedPack(id);
                sendPackEvent('pack_viewed_locked', id);
              }}
            >
              {mn.categories[id]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{mn.settings.imposters}</Heading>
        <Segmented<ImposterChoice>
          label={mn.settings.imposters}
          value={String(value.imposterCount) as ImposterChoice}
          onChange={(choice) =>
            update({ imposterCount: choice === 'auto' ? 'auto' : (Number(choice) as 1 | 2 | 3) })
          }
          options={[
            { value: 'auto', label: mn.settings.impostersAuto },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
          ]}
        />
        <p className="text-sm text-fg-muted">{mn.settings.impostersAutoHint}</p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>{mn.settings.timers}</Heading>
        <Segmented
          label={mn.settings.timers}
          value={value.timerPreset}
          onChange={(timerPreset) => update({ timerPreset })}
          options={(['calm', 'normal', 'fast'] as const).map((preset) => ({
            value: preset,
            label: mn.settings.timerPresets[preset],
            hint: mn.common.secondsShort(TIMER_PRESETS[preset].turnMs / 1000),
          }))}
        />
        <div className="flex flex-wrap gap-2.5">
          <Chip selected={value.turnTimer} onClick={() => update({ turnTimer: !value.turnTimer })}>
            {mn.settings.turnTimer}
          </Chip>
          {value.mode === 'A' && (
            <Chip
              selected={value.showCategoryHint}
              onClick={() => update({ showCategoryHint: !value.showCategoryHint })}
            >
              {mn.settings.categoryHint}
            </Chip>
          )}
        </div>
      </section>

      <LockedPackSheet pack={lockedPack} onClose={() => setLockedPack(null)} />
    </div>
  );
}

function LockedPackSheet({ pack, onClose }: { pack: LockedPackId | null; onClose: () => void }) {
  const [thanked, setThanked] = useState<LockedPackId | null>(null);
  return (
    <Sheet open={pack !== null} onClose={onClose} title={pack ? mn.categories[pack] : ''}>
      <p className="text-lg leading-snug font-semibold">{mn.premium.body}</p>
      {pack && thanked === pack ? (
        <p role="status" className="flex items-center gap-2 text-base font-bold">
          <Icon icon={sealCheck} className="text-nogoon" />
          {mn.premium.thanks}
        </p>
      ) : (
        <Button
          tone="highlight"
          block
          onClick={() => {
            if (!pack) return;
            sendPackEvent('pack_interest', pack);
            setThanked(pack);
          }}
        >
          {mn.premium.interested}
        </Button>
      )}
    </Sheet>
  );
}
