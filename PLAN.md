# ХУУРАМЧ — Build plan

Source of truth: [`CLAUDE.md`](CLAUDE.md). Every deviation or judgment call goes to [`DECISIONS.md`](DECISIONS.md).

Milestones run strictly in order and end with a screenshot pass against §6.7 and a commit.
Status: **M2 done.** Next: M3 (server).

---

## 1. Architecture at a glance

```
 phones (/room/[code])          TV (/tv/[code])
        │  socket.io                 │  socket.io (read-only)
        ▼                            ▼
 ┌──────────────────────────────────────────────┐
 │ apps/server  NestJS 11 + Socket.IO gateway   │
 │   RoomService ── reduce() from game-core     │
 │   RoomStore (in-memory, Redis-ready)         │
 │   TimerScheduler (server-authoritative)      │
 │   projectStateForPlayer / ForTv → state:sync │
 └───────────────┬──────────────────────────────┘
                 │ TypeORM
                 ▼
        PostgreSQL (word packs, analytics events)
```

- **game-core** is a pure reducer: `reduce(state, action, now, rng) => state`. The server feeds it actions
  (player events + timer expiries), stores the result and broadcasts one projection per socket.
- **protocol** holds Zod schemas for every event in both directions; the server validates input, the
  web client validates `state:sync` in development.
- **The client never holds secrets it may not show.** Projections are computed server-side per player.
- **Clock:** every `state:sync` carries `serverNow`; the client keeps a smoothed `clockOffset` and renders
  `deadline - (Date.now() + clockOffset)`.

## 2. File tree (target, end of M6)

```
.
├── CLAUDE.md · PLAN.md · DECISIONS.md · README.md
├── package.json                # root scripts → turbo
├── pnpm-workspace.yaml · turbo.json · tsconfig.base.json
├── .prettierrc.json · .editorconfig · .gitattributes · .nvmrc
├── docker-compose.yml          # Postgres 17 (M3)
├── .github/workflows/ci.yml    # install → lint → typecheck → test → build
├── scripts/anti-slop.mjs       # static scan for §6.7 bans (runs in `pnpm lint`)
├── screenshots/milestone-{1..6}/
├── apps/
│   ├── web/                                   # Next.js 16, React 19, Tailwind v4, motion, Zustand
│   │   ├── next.config.ts · postcss.config.mjs · eslint.config.mjs · playwright.config.ts
│   │   ├── e2e/
│   │   │   ├── design-audit.spec.ts           # computed-style audit for §6.7 (M1+)
│   │   │   ├── glyphs.spec.ts                 # Ө ө Ү ү in every weight (M1)
│   │   │   ├── role-card.spec.ts              # hold-to-reveal behaviour (M1)
│   │   │   ├── screenshots.spec.ts            # milestone screenshots
│   │   │   └── game-4p.spec.ts                # 4 browser contexts, both modes, reconnect (M6)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx · globals.css   # fonts, tokens, theme boot script
│   │       │   ├── page.tsx                   # Home
│   │       │   ├── create/page.tsx            # mode, categories, imposters, timers
│   │       │   ├── room/[code]/page.tsx       # profile step → lobby → all phone phases
│   │       │   ├── tv/[code]/page.tsx         # read-only big screen
│   │       │   ├── rules/page.tsx
│   │       │   ├── admin/page.tsx             # analytics (env secret)
│   │       │   └── dev/{ui,type}/page.tsx     # design sandbox + glyph check
│   │       ├── components/
│   │       │   ├── ui/        Button, IconButton, Card, Chip, Stepper, Segmented, CodeInput,
│   │       │   │              TextField, Banner, Sheet, ThemeToggle, Icon
│   │       │   ├── game/      Avatar(+animals), PlayerTile, RoleCard, TimerRing, Stamp, Ornament,
│   │       │   │              Wordmark, ModeCard, ScoreBar, WinnerBanner, YourTurn, WaitingState
│   │       │   ├── screens/   one component per phase (phone)
│   │       │   └── tv/        TV layouts per phase
│   │       ├── lib/           socket, clock, haptics, wake-lock, sound, storage, theme, fit-text, cn
│   │       ├── store/game.ts  # Zustand: connection, projected state, clock offset
│   │       └── i18n/mn.ts     # every user-facing string
│   └── server/                                # NestJS 11
│       ├── src/main.ts · app.module.ts
│       ├── src/game/          game.gateway.ts, room.service.ts, room-store.ts (interface +
│       │                      in-memory impl), timer.scheduler.ts, rate-limiter.ts, sessions.ts
│       ├── src/content/       word-pair.entity.ts, word-pack.entity.ts, content.service.ts, seed.ts
│       ├── src/analytics/     analytics-event.entity.ts, analytics.service.ts, admin.controller.ts
│       ├── src/entitlements/  entitlement.service.ts (interface + stub, QPay later)
│       └── test/              gateway integration tests with socket.io-client
└── packages/
    ├── game-core/   src/{types,rng,settings,roles,words,machine,timers,scoring,projection,titles}.ts
    │                test/ (Vitest, 100% coverage target, deterministic rng/now)
    ├── protocol/    src/{events,client,server,errors,nickname,profanity}.ts  (Zod 4)
    └── content/     packs/core.v1.json (≥150 pairs) · packs/premium.json (locked, metadata only)
                     src/{categories,index}.ts · scripts/validate.ts
```

## 3. Game model (summary — rules live in CLAUDE.md §2)

```ts
type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'CLUE_TURNS'
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_REVEAL'
  | 'IMPOSTER_GUESS'
  | 'ROUND_RESULT'
  | 'SCOREBOARD';

type RoomSettings = {
  mode: 'A' | 'B';
  categories: CategoryId[]; // ≥ 1 free category
  imposterCount: 'auto' | 1 | 2 | 3; // auto: 1 for 3–6 players, 2 for 7–12; always < half
  showCategoryHint: boolean; // Mode A only
  timerPreset: 'calm' | 'normal' | 'fast';
  turnTimer: boolean; // optional per-turn timer
};
```

| Timer                              | calm            | normal | fast |
| ---------------------------------- | --------------- | ------ | ---- |
| Clue turn                          | 30s             | 20s    | 12s  |
| Discussion                         | 120s            | 90s    | 60s  |
| Voting / Guess / Role-reveal force | 30s / 20s / 30s | same   | same |

## 4. Socket protocol

Every client→server event is emitted with an ack: `Ack<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }`.
Payloads are validated by Zod (`packages/protocol`). Actions invalid for the current phase or sender are
rejected with `INVALID_PHASE` / `NOT_HOST` / `NOT_ALLOWED`. Per-socket token bucket: 10 actions/s burst,
3/s sustained → `RATE_LIMITED`.

### 4.1 Client → server

| Event                 | Payload                          | Ack data                           | Allowed                                    |
| --------------------- | -------------------------------- | ---------------------------------- | ------------------------------------------ |
| `room:create`         | `{ nickname, avatar, settings }` | `{ code, playerId, sessionToken }` | anyone                                     |
| `room:join`           | `{ code, nickname, avatar }`     | `{ playerId, sessionToken }`       | anyone; joins as `waiting` if a round runs |
| `room:rejoin`         | `{ code, sessionToken }`         | `{ playerId }`                     | holder of a valid token                    |
| `room:leave`          | `{}`                             | `{}`                               | any player                                 |
| `room:updateSettings` | `Partial<RoomSettings>`          | `{ settings }`                     | host, LOBBY                                |
| `room:kick`           | `{ playerId }`                   | `{}`                               | host, LOBBY                                |
| `game:start`          | `{}`                             | `{}`                               | host, LOBBY, 3–12 active players           |
| `role:confirm`        | `{}`                             | `{}`                               | player, ROLE_REVEAL                        |
| `role:force`          | `{}`                             | `{}`                               | host, ROLE_REVEAL, ≥ 30s elapsed           |
| `turn:done`           | `{}`                             | `{}`                               | current speaker or host, CLUE_TURNS        |
| `discussion:skip`     | `{}`                             | `{}`                               | host, DISCUSSION                           |
| `vote:cast`           | `{ targetId }`                   | `{}`                               | alive player, VOTING; not self; once       |
| `guess:submit`        | `{ optionIndex }`                | `{}`                               | the eliminated imposter, IMPOSTER_GUESS    |
| `round:continue`      | `{}`                             | `{}`                               | host, ROUND_RESULT → SCOREBOARD            |
| `game:replay`         | `{}`                             | `{}`                               | host, SCOREBOARD → LOBBY (scores kept)     |
| `tv:watch`            | `{ code }`                       | `{}`                               | TV view; read-only projection              |
| `clock:ping`          | `{ t0 }`                         | `{ t0, serverNow }`                | anyone; used to compute clock offset       |

`role:force`, `room:leave`, `round:continue`, `tv:watch` and `clock:ping` extend the spec's "essentials"
list (see DECISIONS.md).

### 4.2 Server → client

| Event         | Payload                                          | Notes                                                 |
| ------------- | ------------------------------------------------ | ----------------------------------------------------- |
| `state:sync`  | `{ rev, serverNow, view: PlayerView \| TvView }` | full projected state after every change               |
| `state:patch` | `{ rev, ops }`                                   | optional optimisation, only if profiling shows a need |
| `error`       | `{ code: ErrorCode, message }`                   | Mongolian message, typed code                         |
| `room:kicked` | `{}`                                             | sent to the kicked socket before disconnect           |

`PlayerView` contains public data (players, phase, deadlines, vote counts, revealed results) plus
`me: { id, isHost, word?, role?, category? }`. `role` is present only in Mode A after ROLE_REVEAL starts;
in Mode B a player only ever receives a `word` until the game-end reveal. `TvView` has no `me` and never
contains words or roles before they are revealed to everyone.

**ErrorCode**: `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_EXPIRED`, `NAME_INVALID`, `NAME_PROFANE`,
`AVATAR_TAKEN`, `SESSION_INVALID`, `NOT_HOST`, `NOT_ALLOWED`, `INVALID_PHASE`, `NOT_ENOUGH_PLAYERS`,
`INVALID_SETTINGS`, `INVALID_TARGET`, `ALREADY_VOTED`, `NOT_YOUR_TURN`, `RATE_LIMITED`,
`VALIDATION_FAILED`, `INTERNAL`.

## 5. Milestones and tasks

### M1 — Design system _(no game logic)_

- [x] Monorepo scaffold: pnpm workspace, Turborepo, TS base config, Prettier, ESLint, CI workflow
- [x] `apps/web`: Next.js 16 + Tailwind v4 + motion + Phosphor (Bold only, via one `Icon` wrapper)
- [x] Tokens in `@theme` (colors, radius, stroke, lift); Tailwind default palette/shadows/blur removed
- [x] Theme: dark default on phones, light by day on TV, `?theme=` override, manual toggle, no flash
- [x] Fonts with `next/font`: Rubik display + Onest UI (Unbounded failed the Ө ө Ү ү check, D-006)
- [x] `/dev/type`: sample line in every weight + automated glyph check for Ө ө Ү ү
- [x] Core UI: Button (+pressed physics), IconButton, Card, Chip (+locked), Stepper, Segmented,
      CodeInput, TextField, Banner, ThemeToggle
- [x] Game UI: 12 animal avatars (idle + eliminated, idle animation), PlayerTile (pop-in, vote select),
      RoleCard (press-and-hold, flip, fit-text), TimerRing, Stamp (slam + shake), Ornament, Wordmark,
      ModeCard illustrations, ScoreBar, WinnerBanner, YourTurn panel, WaitingState
- [x] `/dev/ui` sandbox page showing everything, `/` Home screen as the first real composition
- [x] All strings in `src/i18n/mn.ts`
- [x] Tests: contrast (Vitest), fit-text + timer math (Vitest), design audit + glyph + role card (Playwright)
- [x] `scripts/anti-slop.mjs` source scan
- [x] Screenshots 360×740 dark/light + 1920×1080 → `screenshots/milestone-1/`
- [x] §6.7 checklist in DECISIONS.md, fix violations, commit

### M2 — Game core

- [x] `packages/game-core`: types, seeded rng, settings validation, role assignment, word selection
      (no repeats per room), distractors from same category
- [x] Reducer for every phase, both modes; tie → re-vote → no elimination; Mode B end conditions
- [x] Timers as `TICK` actions against deadlines stored in state (`nextWakeAt` tells the server when)
- [x] Scoring table + fun titles; cumulative scores across replays
- [x] Late joiners, host migration, disconnect grace (90s) and imposter-disconnect void
- [x] `projectStateForPlayer` / `projectStateForTv` + exhaustive no-leak tests (every phase × role × mode)
- [x] `packages/content`: ≥150 pairs in 6 categories, premium metadata, validation script
      (dupes incl. reversed, ≤16 chars, Mongolian Cyrillic only, fits the role card at ≥44px)
- [x] `packages/protocol`: Zod schemas for all events, error codes with Mongolian messages, nickname rules
- [x] Vitest coverage report; screenshots pass (unchanged UI) + commit

### M3 — Server

- [ ] NestJS 11 app, Socket.IO gateway, Zod validation pipe, typed acks
- [ ] `RoomStore` interface + in-memory implementation, 4-digit codes, 2h expiry sweep
- [ ] Server-authoritative timers, clock ping, `state:sync` per socket projection
- [ ] Sessions + reconnection (90s grace), host migration, kick, rate limiting
- [ ] PostgreSQL via TypeORM: word packs, analytics events; seed script; docker-compose; `.env.example`
- [ ] Analytics events (anonymous) + admin stats endpoint (env secret), `EntitlementService` stub
- [ ] Integration tests with real socket.io clients; commit

### M4 — Web app flows

- [ ] Socket client with backoff + auto rejoin, Zustand store, clock offset
- [ ] Home, Create, profile step, Lobby (QR + code, springy grid), Role reveal, Clue turns, Discussion,
      Voting, Vote reveal, Imposter guess, Round result, Scoreboard, Rules (+ first-game sheet), TV view
- [ ] Locked pack sheet + `pack_interest`; admin page
- [ ] Screenshots of every screen (phone dark/light, TV) + §6.7 pass; commit

### M5 — Polish

- [ ] Sounds (TV/host only, mute), haptics, wake lock, reduced motion audit, reconnection banner
- [ ] Empty/error states, copy pass, `aria-live` for turns and reveals, keyboard support on host/TV
- [ ] Lighthouse mobile (≥90 perf, ≥95 a11y), JS budget ≤180 KB gz on player route; record results

### M6 — E2E + docs

- [ ] Playwright: 4 contexts, full game in Mode A and Mode B, one reconnect mid-round
- [ ] README: local setup, env, deploy (web → Vercel, server → Node host with WebSockets, Postgres)
- [ ] Final Definition-of-Done check (CLAUDE.md §11)
