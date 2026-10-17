# Decisions

Every deviation from [`CLAUDE.md`](CLAUDE.md) and every non-obvious design call, with the reason.
Newest milestone last. IDs are stable so code comments can point at them.

---

## Milestone 1 — Design system

### D-001 · Toolchain versions (October 2026)

| Piece               | Spec   | Used                                             | Why                                                                                       |
| ------------------- | ------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Next.js             | 16     | **16.4.2** (Turbopack)                           | latest 16.x                                                                               |
| React               | 19     | **19.3.1**                                       | latest 19.x                                                                               |
| TypeScript          | strict | **6.0.3**, `strict` + `noUncheckedIndexedAccess` | TS 7 (Go) exists, but `typescript-eslint` requires `<6.1`; 6.0 is the last JS-API release |
| ESLint              | —      | **9.39.5** + `eslint-config-next` 16.4.2         | `eslint-plugin-react`/`import`/`jsx-a11y` do not support ESLint 10 yet                    |
| Tailwind            | v4     | **4.3.3**                                        | —                                                                                         |
| motion              | motion | **14.3.0**                                       | —                                                                                         |
| pnpm / Turborepo    | —      | **10.34.7 / 2.11.8**                             | pnpm 10 has well-known semantics (`onlyBuiltDependencies`)                                |
| NestJS (M3)         | 11     | **11.2.7** planned                               | spec pins 11 even though 12.x is out                                                      |
| Playwright / Vitest | —      | **1.64.1 / 5.0.5**                               | —                                                                                         |

`next lint` no longer exists in Next 16, so `pnpm lint` runs `eslint .` per package plus
`scripts/anti-slop.mjs`. `typecheck` is `next typegen && tsc --noEmit`.

### D-002 · No `design-references/` folder

The folder does not exist, so the direction comes from §6 alone. If references are added later,
the "what I'm taking from each" note goes here before any redesign.

### D-003 · Tokens in Tailwind v4

- Tailwind v4 only generates utilities from the `--color-*` namespace, so the spec's `--ink`,
  `--tenger` … are declared as `--color-ink`, `--color-tenger` … (same values, 1:1).
- The default palette, soft shadows, blur, drop-shadow, text-shadow and radius scales are wiped
  (`--color-*: initial` etc.). `bg-purple-500`, `shadow-lg`, `backdrop-blur`, `rounded-2xl` cannot
  be generated at all — the §6.7 bans are enforced by the build, not by discipline.
- Theme roles (`surface`, `raised`, `fg`, `fg-muted`, `line`) switch per theme; saturated colours
  never change. `--stroke` / `--lift` are 3px / 4px on phones and 4px / 6px from 1280px up (§6.4).
- Two neutrals were added as tints, not hues: `raised` = `#ffffff` (light) / `#222227` (dark) for
  cards that sit on the page colour.

### D-004 · Theme resolution (§6.2 conflict)

§6.2 says "phones default to dark" _and_ "respect `prefers-color-scheme`". Most phones report
`light` simply because that is the OS default, so following it would make the dark-room default
meaningless. Resolution:

- an explicit choice (toggle, remembered per device) always wins;
- phone routes on `auto` → **dark**, day or night;
- `/tv/*` on `auto` → **light by day (07:00–18:59)** unless the system prefers dark; dark at night.
- `?theme=dark|light` overrides without being remembered (tests, screenshots, QA).
  An inline `<head>` script applies the theme before first paint (no white flash in a dark room).

### D-005 · Contrast rules (WCAG AA, checked in `tokens.test.ts`)

| Pair                                   | Ratio                | Rule                                                                        |
| -------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| paper on tenger                        | 4.90                 | any size ✓                                                                  |
| paper on al                            | 4.08                 | **large text only** — buttons use ≥ 19px bold; red never carries small text |
| ink on alt / nogoon / tsenher          | 11.72 / 6.76 / 11.34 | any size ✓                                                                  |
| fg on surface, both themes             | 17.1–17.6            | ✓                                                                           |
| fg-muted on surface / raised           | 7.15–8.22            | ✓                                                                           |
| al display text on night / dark raised | 4.19 / 3.71          | display sizes only (≥ 24px) ✓                                               |
| tenger stamp on night                  | 3.49                 | display sizes only ✓                                                        |
| dark-mode line (paper 90 %) on night   | 13.92                | ✓                                                                           |
| ink vs every seat colour               | 3.40–17.62           | ≥ 3:1 for the ink-filled animal parts ✓                                     |

Consequences: error banners are not red blocks (15px text on red would fail) — they use a red
icon tile on the normal surface. Ink on red (4.32) is never used for text.

### D-006 · Display face: Unbounded → **Rubik** (§6.3 mandatory glyph check failed)

The `/dev/type` check and an independent fontTools inspection of every Google Fonts instance show
**Unbounded has no Ө ө Ү ү at any weight** (its Cyrillic covers Russian/Ukrainian, not
Mongolian). In the browser those letters silently fell back to another face mid-word — exactly the
"falls back visibly" case §6.3 describes.

Following §6.3 ("switch to the next fallback"), the display face is **Rubik** (variable, used at
700/800/900), the spec's own fallback, which passes for all four letters and has tabular figures.
Candidates compared side by side: Science Gothic (too techno at wide widths), Geologica,
Montserrat, Exo 2, Tektur, Onest Black. Rubik Black reads as chunky, friendly and printed — right
for a party card game — and keeps us inside the spec's list. Unbounded stays on `/dev/type`, marked
"татгалзсан", as the evidence. Patching Unbounded with home-made Mongolian glyphs was rejected:
drawing ү badly is worse than not having it.

Body/UI stays **Onest** (passes 400–700). Golos Text also passes and remains the documented
fallback. Fonts load through `next/font` with `cyrillic` + `cyrillic-ext` + `latin` subsets.

| Font                  | Weights         | Ө ө Ү ү | Tabular |
| --------------------- | --------------- | ------- | ------- |
| Rubik (display)       | 700 800 900     | ✓       | ✓       |
| Onest (UI)            | 400 500 600 700 | ✓       | ✓       |
| Golos Text (fallback) | 400 500 600 700 | ✓       | ✓       |
| Unbounded (rejected)  | 800 900         | ✗       | ✓       |

### D-007 · Secret word fitting (§6.3)

"≥ 44px, one line, never an ellipsis" conflicts with long phrases on a 360px phone (the old
16-character rule assumed a narrow face). `computeFit` (unit-tested):

1. largest size ≤ max that fits one line;
2. if that is < 44px and the word is a phrase, wrap at spaces (balanced) at ≥ 44px instead;
3. only a single word wider than the card at 44px may go smaller — content validation (M2) will
   measure every word with the real font metrics so this never ships.
   Example: "Сүүтэй цай" → two lines at 55.75px rather than one line at 34.8px.

### D-008 · Timer ring = 20 chunky blocks

A continuous `stroke-dashoffset` ring repaints every frame; §7 allows only `transform`/`opacity`.
The ring is 20 annular blocks that drop out clockwise from 12 o'clock (opacity + scale), turning
red with a kicking number for the last 5 seconds. It reads as a physical game timer and costs
nothing on low-end Android. One shared 5 Hz clock (`useNow`) drives every timer; it renders
`deadline − (now + clockOffset)`, so the server stays authoritative (M3).

### D-009 · Avatars

- 64×64 grid, face on x = 32, eye line y ≈ 29–31, 3-unit ink outlines, paper/ink fills; the seat
  colour is the circle behind. One shared `clipPath` keeps every animal inside its circle.
- **The camel (Тэмээ) is the one profile view**: from the front it read as a horse/llama; the
  two-humped silhouette is unmistakably a Bactrian camel.
- Local details: black-faced Mongolian sheep, the dark crown of the Mongolian marmot, the saker
  falcon (итгэлт шонхор) with brow ridge and moustache stripes, a golden eagle with golden nape.
- Birds of prey get the one extra fill, `--alt`, for beak and eye-ring.
- Eliminated: eyes become X, CSS `grayscale(1)`. Idle: staggered blink + 1.5px bob (transform only).

### D-010 · Seat colours

Five tokens + tints/shades (coral, forest, mustard, sky, brick, mint) + paper. Dark shades
(navy, oxblood) were dropped: ink-filled animals vanished on them (< 3:1).

### D-011 · Ornament

An original "hammer meander" (алхан хээ inspired): alternating hanging and standing T-forms with
raised ends between two rules, as a 32×20 SVG tile used as a CSS mask so it takes `currentColor`.
Used only in the three allowed places (Home wordmark underline, role-card back top edge, winner
banner). `/dev/ui` shows it as a specimen — internal, not a product placement. No state symbols.

### D-012 · Focus indicator

4px `--alt` outline with **offset 0**, so the ring always sits against the element's own ink
outline — on the light theme yellow next to paper alone is only 1.5:1. Inside light panels
(yellow/light blue/green) the ring switches to ink (yellow on yellow is invisible). Text links get
a yellow "highlighter" block. The code input's real `<input>` is invisible; its active cell turns
yellow instead (`data-focus-proxy`). Verified by tabbing through `/dev/ui` in Playwright.

### D-013 · Icons

Phosphor's React package ships all six weights per icon (~2.2 KB each). `scripts/build-icons.mjs`
extracts only the **Bold** paths of the 37 icons we use into a tree-shakeable module; everything
goes through `<Icon>`, and ESLint forbids importing `@phosphor-icons/react` anywhere else.

### D-014 · motion and the JS budget (§7: ≤ 180 KB gz)

Measured on the production build with `apps/web/scripts/js-budget.mjs` (gzip -9, initial scripts,
excluding the `nomodule` legacy polyfill modern browsers never download):

| Route                  | Before   | After        |
| ---------------------- | -------- | ------------ |
| `/`                    | 172.3 KB | **142.5 KB** |
| `/dev/ui` (everything) | 187.9 KB | **171.4 KB** |

`motion` used to sit in the root layout. Now `<MotionProvider>` wraps only routes that animate,
and `LazyMotion` loads its features asynchronously. React + Next runtime alone is ~115 KB, so M4
must stay lean: ~37 KB headroom remains for socket.io-client and the game screens.

### D-015 · Role card safety

Press and hold (pointer capture, `touch-action: none`, no context menu / callout) reveals; any
release, cancel, blur or lost capture hides. Keyboard: hold Space/Enter. The hidden side is
`backface-visibility: hidden` **and** `visibility: hidden` switched at the flip midpoint (old
Android WebViews mis-handle backface visibility; a mirrored secret would leak). In dark mode the
face is dark too, so a peek doesn't flash a white card across a dim room. Reduced motion turns the
flip into a cut.

### D-016 · Selection language

Selected things **rise**: thick outline + offset shadow (vote tiles, mode cards), shadow + fill +
check mark (chips), fill + check (segmented). Colour is never the only signal. Disabled things are
dashed and flat.

### D-017 · Dev pages

`/dev/ui` and `/dev/type` ship in production with `noindex`. They contain no secrets and let the
team open the glyph check on a real Samsung phone.

### D-018 · Gaps carried into M4

- Home links to `/create` and `/rules`, which arrive in M4; `prefetch` is off and `typedRoutes`
  is disabled until those routes exist.
- Socket events beyond the spec's essentials (`role:force`, `room:leave`, `round:continue`,
  `tv:watch`, `clock:ping`) are listed in PLAN.md §4 and will be justified when implemented.

### §6.7 checklist — Milestone 1 ✅

Evidence: `screenshots/milestone-1/` (360×740 dark + light, 1920×1080 dark + light, per-section
crops), `scripts/anti-slop.mjs` (static), `e2e/design-audit.spec.ts` (computed styles of every
element on `/`, `/dev/ui`, `/dev/type` in both themes — zero violations, zero console errors).

| #   | Ban                                          | Result                                                            |
| --- | -------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Purple / violet / indigo                     | ✅ none — palette wiped, hue check in unit + browser tests        |
| 2   | Gradients, gradient text                     | ✅ none — no `*-gradient` in source or computed styles            |
| 3   | Glass, blur, glow, soft shadows              | ✅ none — every shadow has 0 blur (computed-style audit)          |
| 4   | Cream + terracotta / near-black + acid green | ✅ cool paper `#FAFAF7`, night `#17171A` with four saturated hues |
| 5   | shadcn look (1px grey borders, rounded-2xl)  | ✅ ≥ 2px ink outlines, radius 12px or pill only (audited)         |
| 6   | Marketing hero, feature grid, fake stats     | ✅ Home = wordmark, tagline, two actions, rules link              |
| 7   | Inter / Roboto / system-ui                   | ✅ only Rubik + Onest render (audited per text node)              |
| 8   | Emoji, sparkles, stock/3D illustration       | ✅ Phosphor Bold + original SVG animals only                      |
| 9   | Placeholder copy                             | ✅ real Mongolian copy, all in `src/i18n/mn.ts`                   |
| 10  | Focus removed                                | ✅ thick yellow ring everywhere (tab-through test)                |

---

## Milestone 2 — Game core, content, protocol

### D-101 · Package builds

`game-core`, `protocol` and `content` build with tsup to ESM **and** CommonJS (+ types): the NestJS
server is CommonJS, the web app consumes ESM. `game-core` has zero dependencies and zero I/O.

### D-102 · Scoring interpretation (§2.4)

- +1 to each civilian who voted for an imposter in the vote that eliminated that imposter
  (Mode B can award this several times per game).
- +3 to each imposter who is **still in** when the imposters win; an eliminated imposter whose
  correct guess wins Mode A gets the +2 guess bonus instead (the table lists them as separate rows).
- +1 to each surviving civilian when the civilians win.
- Points and stats are applied only when a game ends, so a voided game earns nothing (§2.5).

### D-103 · Mode A with two or three imposters

Imposters do not know each other. One vote decides the game: catching _any_ imposter gives that
imposter the last-chance guess; a wrong guess means the civilians win.

### D-104 · Mode B stalemate

Two elimination rounds in a row without an elimination (double tie or nobody votes) end the game
as an imposter win. Without this rule a stubborn table could loop forever.

### D-105 · Role reveal never stalls

Everyone confirms "Ойлголоо" → clue turns. The host may force it after 30s (§3.1); after 60s it
moves on by itself so an absent host cannot freeze the room.

### D-106 · Who the game waits for

Players disconnected **within** the 90s grace period are still waited for (votes, confirmations).
Players who left or stayed away past the grace period are skipped: no turn, no vote. An absent
imposter voids the game (§2.5). The host role migrates immediately when the host leaves, or once
the grace period expires after a disconnect.

### D-107 · Guess options and secrecy

Only the eliminated imposter receives the eight options. In Mode B their own word is never an
option, and the outcome is shown to everyone as "guessed / missed" without any words, because
another imposter may still be playing.

### D-108 · Fun titles

"Шилдэг худалч" = most points earned as an imposter, "Мөрдөгч" = most civilian votes cast for an
actual imposter (re-votes included), "Гэм буруугүй хохирогч" = civilian eliminated most often.
Ties go to whoever joined first; a zero earns no title.

### D-109 · Replay and late joiners

"Дахин тоглох" returns the room to the lobby with scores kept (§3.1 diagram), so late joiners can
take a seat and the host can tweak settings before starting. Players who are mid-reconnect when
a game starts sit it out as spectators.

### D-110 · Content

171 hand-written pairs (28–30 per category). The validator also measures every word with Rubik 800
metrics extracted by `scripts/font-widths.py`: no word may exceed 6.0em, i.e. every word fits the
role card at ≥ 44px on a 360px phone. This rejected Улаанбаатар, Сонгинохайрхан, Троллейбус and
Хүүхэлдэйн, which were replaced. A small off-limits list (politics, religion, alcohol) guards
against accidental additions. Validate with `pnpm --filter @khuuramch/content validate`.

### D-111 · Zod Mini

The protocol uses `zod/mini` so client-side validation stays small. A compile-time check proves
the schema output and game-core's view types stay interchangeable.

### D-112 · Nicknames

Blocklist matching folds Latin look-alikes (x→х, o→о…) and leet digits; short roots (хуй, бля,
ass…) match whole words only so ordinary names are not caught.

### Milestone 2 checks

- game-core: 183 tests, 100% statements/lines/functions, 99.3% branches; no-leak simulations over
  both modes × 3–12 players × 4 seeds check every player's view and the TV view at every step.
- content: 17 tests; protocol: 15 tests.
- No UI changed in this milestone; the M1 screenshots and §6.7 checklist still apply.

---

## Milestone 3 — Server

### D-201 · Plain classes, thin Nest shell

`RoomService`, `ContentService`, `AnalyticsService` and the stores are plain TypeScript built by
Nest factory providers. Decorators live only in the gateway, controllers and module, so the game
server is unit-testable without decorator metadata. NestJS stays on 11.x as the spec asks.

### D-202 · Async stores, serial rooms

`RoomStore` and `SessionStore` are async interfaces with in-memory implementations, ready for
Redis. Every action on a room runs through a per-room promise queue, so two taps can never
interleave even once the store is remote.

### D-203 · Server-authoritative time

One timer per room, aimed at game-core's `nextWakeAt` (phase deadline or the next grace expiry).
Every `state:sync` carries `serverNow`; `clock:ping` lets clients measure their offset (§3.1).

### D-204 · Sessions and reconnection

Session tokens are 192-bit random strings stored with `{ code, playerId }`. A player may have
several sockets (two tabs); they count as disconnected only when the last one closes. Rejoin on any
new socket within the 90s grace restores seat, role and word (tested with real sockets).
Leaving or being kicked burns the session.

### D-205 · Abuse limits

Socket.IO: 10-action burst, 3 actions/s per socket, 16 KB max payload, 10s ping/timeout so dead
phones are noticed quickly. HTTP pack events: 20 burst, 1/s per IP — the IP is a rate-limit key in
memory only, never stored (§8).

### D-206 · PostgreSQL is optional in development

With `DATABASE_URL` the server runs TypeORM migrations, reads word packs from Postgres and writes
analytics there (verified against `docker compose` Postgres 17: migration, seed of 171 pairs,
events, stats). Without it, the bundled pack and an in-memory analytics buffer are used, so
`pnpm dev` works with no setup. Entities use `EntitySchema` (no decorators). The compose file's
host port is configurable (`POSTGRES_PORT`) because 5432 is often taken.

### D-207 · LAN address for the lobby QR

`GET /network` lists this machine's LAN IPv4 addresses, Wi-Fi first, virtual adapters (VirtualBox,
Hyper-V, Docker, VPNs) skipped, so a host who opened `localhost` still gets a QR that phones on the
same Wi-Fi can open. Off in production unless `EXPOSE_LAN=true`.

### D-208 · Admin stats and monetisation stub

`GET /admin/stats?days=30` with header `x-admin-secret` (timing-safe compare; route disabled when
`ADMIN_SECRET` is unset) returns games per day (Ulaanbaatar dates), average players, replay rate,
mode split, top categories, winners and locked-pack interest. `EntitlementService` is an interface
with a no-op implementation, keyed by an anonymous host account id for a future QPay integration.

### Milestone 3 checks

- server: 23 tests — room service with fake timers (full game, reconnection, kick, expiry, TV,
  rate limits) and an end-to-end suite that boots the compiled server and plays Mode A (with a
  mid-game reconnect) and Mode B with four real Socket.IO clients. Stable over repeated runs.
- No UI changed in this milestone.

---

## Milestone 4 — Web app flows

### D-301 · One room route, phases as screens

`/room/[code]` is a single client app (`PlayerApp`): it restores the seat from `localStorage`
(`room:rejoin`) or shows the join form, then renders one screen per server phase. Late joiners see
a spectator screen during a running game and the shared result/scoreboard at its end. Every screen
derives everything from the projected `PlayerView`; nothing about other players' secrets exists on
the client to leak. `/tv/[code]` is the same pattern over `TvView`.

### D-302 · Network layer after hydration (§7 budget)

`socket.io-client`, the Zod protocol schemas and the state validation live in `lib/socket.ts`, which
the store loads with `import()` on first use. Every `state:sync` is still validated with
`stateSyncSchema` before it reaches the store (§3.2 "both sides validate"); it is just not part of
the first paint. Reconnects rejoin automatically (socket.io backoff 0.5 s → 5 s, jittered).

### D-303 · Screens as lazy chunks, preloaded

Each phase screen (and `motion`) is a `React.lazy` chunk behind a "Холбогдож байна…" shell. All of
them are requested immediately after hydration, in parallel with the socket connecting, so phase
changes never wait on the network. Measured initial JS (gz, `e2e/budget.spec.ts`, enforced in CI):
`/room` 167 KB, `/tv` 165 KB, `/create` 174 KB, `/` 160 KB, `/rules` 159 KB — budget 180 KB. Before
the split `/room` was 241 KB.

### D-304 · Vote reveal timeline (§5.8)

The reveal is scripted from the server's `phaseStartedAt` minus the measured clock offset, so every
phone and the TV land each ballot slip, the verdict card and the stamp at the same moment
(`useTimeline` re-renders once per step, not per frame). Voters stay secret — only per-target
tallies exist — so slips are dealt round-robin from the smallest final pile to the largest: piles
grow together and the winner pulls ahead only at the end. Timings: first slip at 0.5 s, all slips
within 1.6 s (at most 0.34 s apart), verdict +0.45 s, stamp +0.45 s, all inside the server's 5 s
phase. A screen opened mid-reveal (a reconnect) shows the steps already played as landed, without
replaying them or buzzing. Tally avatars never show X eyes before the stamp, even though the
eliminated flag arrives with the phase.

### D-305 · TV stage

The TV view is laid out once on a fixed 1920×1080 stage and scaled to fit any screen (TV,
projector, 1366×768 laptop), with 4 px outlines and 6 px shadows set on the stage (§6.4). Type
sizes target four metres: names 28–32 px, headings 64–128 px, timers 360–460 px.

### D-306 · Races between two phones

The speaker's "Дууслаа" and the host's "Дараагийнх" can land together. `turn:done` now carries the
`turnIndex` the phone saw; a stale one is a no-op, so one tap never skips the next speaker too
(game-core test). Other races (two taps on a phase that already ended, a timer expiring as someone
taps) are answered with `INVALID_PHASE`; the client does not flash an error for those because the
screen has already moved on.

### D-307 · First-game rules sheet

§5.11's skippable three-card sheet opens for non-host players in the lobby on their first game on
this device (`khuuramch:rules-seen`). The host is not interrupted while friends scan the QR.

### D-308 · Secrecy in the guess phase

The caught imposter's eight options reach only their phone. In Mode B the outcome screen says
whether the guess was right but never shows the civilians' word: words stay hidden until the game
ends (§2.3.7). A wrong guesser does not learn the right word either.

### D-309 · Contrast on red

Paper on `--al` is 4.1:1, enough only for large text. Words on red cards are at least 20 px
extra-bold; labels sit above the cards on the page surface; the "+2" points pill is ink on green.

### D-310 · The error boundary's copy

`app/error.tsx` is loaded on every route, and importing `mn` there shipped the whole Mongolian copy
a second time on every page (about 14 KB gz). Its four strings live in `i18n/mn-shell.ts`, which
`mn` re-exports — a deliberate exception to "all strings in `mn.ts`", still inside `src/i18n/`.

### D-311 · Thumb reach

Primary actions sit in a sticky bottom bar with an opaque surface and an ink rule, so scrolled
content never shows through. The join form's submit button is pinned the same way, also inside the
create sheet.

### D-312 · What a waiting screen says

Role reveal: "Бусдыгаа хүлээж байна", avatars with checks, "3/4 бэлэн". Voting after locking:
"5/7 санал өгсөн" and the avatars of who has not voted — never who voted for whom. Guess: who is
guessing. Result: who will open the scoreboard. Mode B eliminated players see a note to keep their
word to themselves.

### Milestone 4 checks

- `e2e/game.spec.ts`: four phones (360×740) and a TV (1920×1080) play Mode A, then Mode B in the
  same room with cumulative scores; one phone closes mid-round and returns to the same seat and
  word; the TV never contains a secret word before the result; every phase passes the §6.7
  computed-style audit in both themes; zero console errors on every device.
- `e2e/design-audit.spec.ts` now also covers `/create`, `/rules`, `/admin`, a missing room and 404.
- `e2e/budget.spec.ts`: initial JS ≤ 180 KB gz on six routes.
- Unit tests: game-core 185, server 24, protocol 15, content 17, web 52 (incl. the reveal plan).

### §6.7 checklist — Milestone 4 ✅

Evidence: `screenshots/milestone-4/` (every phase on a phone in dark + light, the TV, `/create` and
`/rules`) and the audits above.

| #   | Ban                                          | Result                                                             |
| --- | -------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Purple / violet / indigo                     | ✅ none (audited at every phase)                                   |
| 2   | Gradients, gradient text                     | ✅ none                                                            |
| 3   | Glass, blur, glow, soft shadows              | ✅ hard offset shadows only; the sheet backdrop is a flat ink wash |
| 4   | Cream + terracotta / near-black + acid green | ✅ unchanged palette                                               |
| 5   | shadcn look                                  | ✅ ≥ 3 px outlines, 12 px or pill radii only                       |
| 6   | Marketing hero, feature grid, fake stats     | ✅ no marketing; admin shows real counts or "—"                    |
| 7   | Inter / Roboto / system-ui                   | ✅ Rubik + Onest only                                              |
| 8   | Emoji, sparkles, stock/3D illustration       | ✅ Phosphor Bold, original SVG animals, rules art and stamp        |
| 9   | Placeholder copy                             | ✅ Mongolian game copy throughout                                  |
| 10  | Focus removed                                | ✅ yellow ring kept; dialogs use native `<dialog>` focus handling  |
