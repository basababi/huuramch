/** Admin dashboard numbers (§8), computed from anonymous events. Pure, so it is easy to test. */
export type StoredEvent = {
  type: string;
  roomId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

export type Stats = {
  days: number;
  roomsCreated: number;
  gamesStarted: number;
  gamesPerDay: Array<{ date: string; games: number }>;
  averagePlayers: number | null;
  /** Share of rooms with a first game that went on to start a second one — the key metric. */
  replayRate: number | null;
  modes: { A: number; B: number };
  topCategories: Array<{ category: string; games: number }>;
  winners: { civilians: number; imposters: number };
  lockedPackViews: Record<string, number>;
  packInterest: Record<string, number>;
};

/** Dates are grouped in Mongolian time so "today" means the same thing to the team. */
const DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function countBy(events: StoredEvent[], key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) {
    const value = e.payload[key];
    if (typeof value === 'string') out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

export function computeStats(events: StoredEvent[], days: number): Stats {
  const games = events.filter((e) => e.type === 'game_started');
  const perDay = new Map<string, number>();
  for (const g of games) {
    const date = DAY.format(g.createdAt);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
  }

  const players = games
    .map((g) => g.payload.players)
    .filter((n): n is number => typeof n === 'number');
  const gamesPerRoom = new Map<string, number>();
  for (const g of games) {
    if (g.roomId) gamesPerRoom.set(g.roomId, (gamesPerRoom.get(g.roomId) ?? 0) + 1);
  }
  const roomsWithGame = gamesPerRoom.size;
  const roomsWithReplay = [...gamesPerRoom.values()].filter((n) => n >= 2).length;

  const categories = new Map<string, number>();
  for (const g of games) {
    const list = g.payload.categories;
    if (Array.isArray(list)) {
      for (const c of list)
        if (typeof c === 'string') categories.set(c, (categories.get(c) ?? 0) + 1);
    }
  }

  const modes = countBy(games, 'mode');
  const winners = countBy(
    events.filter((e) => e.type === 'round_completed'),
    'winner',
  );

  return {
    days,
    roomsCreated: events.filter((e) => e.type === 'room_created').length,
    gamesStarted: games.length,
    gamesPerDay: [...perDay]
      .map(([date, n]) => ({ date, games: n }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    averagePlayers: players.length
      ? Math.round((players.reduce((a, b) => a + b, 0) / players.length) * 10) / 10
      : null,
    replayRate: roomsWithGame ? Math.round((roomsWithReplay / roomsWithGame) * 1000) / 1000 : null,
    modes: { A: modes.A ?? 0, B: modes.B ?? 0 },
    topCategories: [...categories]
      .map(([category, n]) => ({ category, games: n }))
      .sort((a, b) => b.games - a.games || a.category.localeCompare(b.category)),
    winners: { civilians: winners.civilians ?? 0, imposters: winners.imposters ?? 0 },
    lockedPackViews: countBy(
      events.filter((e) => e.type === 'pack_viewed_locked'),
      'packId',
    ),
    packInterest: countBy(
      events.filter((e) => e.type === 'pack_interest'),
      'packId',
    ),
  };
}
