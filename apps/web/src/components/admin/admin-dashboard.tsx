'use client';

import {
  CATEGORY_IDS,
  LOCKED_PACK_IDS,
  type CategoryId,
  type LockedPackId,
} from '@khuuramch/game-core';
import { useState, type FormEvent, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';
import { serverUrl } from '@/lib/server-url';
import { Banner } from '../ui/banner';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { chartBar } from '../ui/icon-data';
import { TextField } from '../ui/text-field';

/** Mirrors the server's `Stats` (apps/server/src/analytics/stats.ts). */
type Stats = {
  days: number;
  roomsCreated: number;
  gamesStarted: number;
  gamesPerDay: Array<{ date: string; games: number }>;
  averagePlayers: number | null;
  replayRate: number | null;
  modes: { A: number; B: number };
  topCategories: Array<{ category: string; games: number }>;
  winners: { civilians: number; imposters: number };
  lockedPackViews: Record<string, number>;
  packInterest: Record<string, number>;
};

type Load =
  | { state: 'idle' | 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; stats: Stats };

const isCategory = (id: string): id is CategoryId =>
  (CATEGORY_IDS as readonly string[]).includes(id);
const percent = (share: number | null) => (share === null ? '—' : `${Math.round(share * 100)}%`);

/**
 * Admin-only numbers (§8), behind ADMIN_SECRET. The secret stays in memory for this tab only.
 * Replay rate — rooms that start a second game — is the metric that validates the product.
 */
export function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [load, setLoad] = useState<Load>({ state: 'idle' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!secret) return;
    setLoad({ state: 'loading' });
    try {
      const response = await fetch(`${serverUrl()}/admin/stats?days=30`, {
        headers: { 'x-admin-secret': secret },
        cache: 'no-store',
      });
      if (response.status === 404) setLoad({ state: 'error', message: mn.admin.unavailable });
      else if (!response.ok) setLoad({ state: 'error', message: mn.admin.denied });
      else setLoad({ state: 'ready', stats: (await response.json()) as Stats });
    } catch {
      setLoad({ state: 'error', message: mn.connection.timeout });
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col gap-6 px-4 py-6 tv:max-w-[64rem]">
      <h1 className="flex items-center gap-3 font-display text-[1.75rem] font-extrabold">
        <Icon icon={chartBar} size={32} />
        {mn.admin.title}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3 tv:flex-row tv:items-end">
        <div className="flex-1">
          <TextField
            label={mn.admin.secret}
            type="password"
            autoComplete="current-password"
            value={secret}
            onValueChange={setSecret}
          />
        </div>
        <Button type="submit" busy={load.state === 'loading'} disabled={!secret}>
          {mn.admin.load}
        </Button>
      </form>
      {load.state === 'error' && <Banner tone="error">{load.message}</Banner>}
      {load.state === 'ready' && <StatsView stats={load.stats} />}
    </div>
  );
}

function StatsView({ stats }: { stats: Stats }) {
  const perDayMax = Math.max(1, ...stats.gamesPerDay.map((d) => d.games));
  const modeTotal = stats.modes.A + stats.modes.B;
  const categoryMax = Math.max(1, ...stats.topCategories.map((c) => c.games));
  const winnerTotal = stats.winners.civilians + stats.winners.imposters;
  const packs = LOCKED_PACK_IDS.filter((id) => stats.lockedPackViews[id] || stats.packInterest[id]);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-3 tv:grid-cols-4">
        <Tile label={mn.admin.replayRate} value={percent(stats.replayRate)} highlight />
        <Tile label={mn.admin.gamesStarted} value={String(stats.gamesStarted)} />
        <Tile label={mn.admin.roomsCreated} value={String(stats.roomsCreated)} />
        <Tile
          label={mn.admin.averagePlayers}
          value={stats.averagePlayers === null ? '—' : String(stats.averagePlayers)}
        />
      </dl>

      {stats.gamesStarted === 0 ? (
        <p className="text-lg font-semibold text-fg-muted">{mn.admin.noData}</p>
      ) : (
        <div className="grid gap-6 tv:grid-cols-2">
          <Panel title={mn.admin.gamesPerDay}>
            {stats.gamesPerDay.map((d) => (
              <Bar key={d.date} label={d.date} value={d.games} max={perDayMax} />
            ))}
          </Panel>
          <Panel title={mn.admin.topCategories}>
            {stats.topCategories.map((c) => (
              <Bar
                key={c.category}
                label={isCategory(c.category) ? mn.categories[c.category] : c.category}
                value={c.games}
                max={categoryMax}
              />
            ))}
          </Panel>
          <Panel title={mn.admin.modes}>
            <Bar label={mn.modes.A.title} value={stats.modes.A} max={Math.max(1, modeTotal)} />
            <Bar label={mn.modes.B.title} value={stats.modes.B} max={Math.max(1, modeTotal)} />
          </Panel>
          <Panel title={mn.admin.winners}>
            <Bar
              label={mn.result.civiliansWin}
              value={stats.winners.civilians}
              max={Math.max(1, winnerTotal)}
            />
            <Bar
              label={mn.result.impostersWin}
              value={stats.winners.imposters}
              max={Math.max(1, winnerTotal)}
            />
          </Panel>
        </div>
      )}

      {packs.length > 0 && (
        <Panel title={mn.admin.packInterest}>
          {packs.map((id: LockedPackId) => (
            <p key={id} className="flex justify-between gap-3 text-base font-semibold">
              <span>{mn.categories[id]}</span>
              <span className="tabular">
                {stats.lockedPackViews[id] ?? 0} / {stats.packInterest[id] ?? 0}
              </span>
            </p>
          ))}
        </Panel>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-card p-3 ink-border',
        highlight ? 'bg-alt text-ink lift' : 'bg-raised',
      )}
    >
      <dt className={cn('text-sm font-bold', !highlight && 'text-fg-muted')}>{label}</dt>
      <dd className="font-display tabular text-[2rem] leading-none font-extrabold">{value}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card bg-raised p-4 ink-border">
      <h2 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3">
      <span className="truncate text-sm font-semibold">{label}</span>
      <span className="h-4 overflow-hidden rounded-[4px] bg-surface ink-border">
        <span
          className="block h-full origin-left bg-tenger"
          style={{ transform: `scaleX(${value / max})` }}
        />
      </span>
      <span className="text-right font-display tabular font-extrabold">{value}</span>
    </div>
  );
}
