# ХУУРАМЧ — Claude Code Build Prompt

> **Хэрхэн ашиглах вэ (Монголоор):**
> 1. Шинэ хоосон folder үүсгээд энэ файлыг `CLAUDE.md` нэрээр хадгал. Эсвэл Claude Code-д бүхэлд нь хуулж өг.
> 2. Pinterest, Dribbble-ээс таалагдсан 5–10 зургаа `design-references/` folder-т хий. Claude Code тэдгээрийг харж дизайнаа тааруулна.
> 3. Claude Code-д: *"Read CLAUDE.md fully, write PLAN.md, then start Milestone 1."* гэж эхлүүл.
> 4. Milestone бүрийн дараа дэлгэцийн зургийг өөрөө шалгаж, санал өг.
>
> Тоглоомын нэр "ХУУРАМЧ" нь түр нэр. Хүсвэл соль.

---

## 0. Your role

You are a senior full-stack engineer **and** a senior product designer with real game-UI taste. You ship production-quality, tested code, and you make deliberate visual decisions that a generic AI tool would never make. You treat the UI as part of the game, not a skin on top of it.

Work autonomously. Do not ask me questions unless something is truly blocking; when a decision is ambiguous, pick the option most consistent with this document, write the decision in `DECISIONS.md`, and continue.

---

## 1. Product summary

**ХУУРАМЧ** is a Mongolian-language, in-person party game for 3–12 friends sitting in the same room. It is a social-deduction word game: most players get the same secret word, one or more players are the **хуурамч** (imposter).

- **Web app, no install.** One person creates a room; everyone else scans a QR code and plays on their own phone. Optional big-screen view for a TV or laptop.
- **Clues are spoken out loud**, in person. The app does not need typed clues. The app's job: assign roles secretly, manage turn order and timers, run voting, dramatize reveals, keep score.
- **Audience:** Mongolian Gen Z and young adults (16–30). Most play on mid/low-end Android phones (Samsung Galaxy A-series class), often at night, in dim rooms, with noise.
- **Market context:** Many English "imposter / spy" party apps exist, and most are single-phone pass-and-play with translated, foreign content. Our differentiation is (1) native Mongolian content, humor and culture, (2) every player on their own phone with a dramatic shared reveal, (3) a visual identity that feels unmistakably local and handmade.

---

## 2. Game rules (source of truth)

### 2.1 Players and roles
- 3–12 players per room. Players beyond 12 are rejected with a friendly message.
- Imposter count: default **1** for 3–6 players, **2** for 7–12. Host can override (1–3), but imposters must always be fewer than half of players.
- Each round, roles and words are assigned **server-side, randomly**. The server never sends any player another player's word or role until the reveal step.

### 2.2 Mode A — "Үггүй хуурамч" (imposter gets no word)
1. Civilians see the secret word (e.g. **Бууз**) and its category.
2. Imposter sees **"ЧИ ХУУРАМЧ"** plus the category only (e.g. "Монгол хоол"). Host can toggle the category hint off for harder games.
3. **Clue phase:** 2 laps. In a random speaking order, each player says one word or a short phrase out loud. Each turn has an optional timer (default 20s).
4. **Discussion phase:** default 90s; host can end early.
5. **Vote:** everyone secretly votes for one player (cannot vote for self). Majority is eliminated. Tie → one re-vote between tied players only; if still tied, nobody is eliminated and the imposter wins the round.
6. If the eliminated player is the imposter, they get **one last chance**: choose the civilians' word from **8 options** (the real word + 7 distractors from the same category) within 20s.
7. Round result:
   - Imposter not caught → **imposter wins**.
   - Imposter caught and guesses correctly → **imposter wins**.
   - Imposter caught and guesses wrong → **civilians win**.

### 2.3 Mode B — "Өөр үгтэй хуурамч" (imposter gets a different, similar word)
1. Civilians get word A (e.g. **Бууз**), imposter(s) get word B (e.g. **Хуушуур**).
2. **Nobody is told their role.** The imposter does not know they are the imposter. UI must be identical for both roles: same layout, same copy, same timing.
3. Elimination rounds: 1 clue lap → discussion → vote → eliminate one player.
4. When a player is eliminated, reveal **only** whether they were "ЭНГИЙН" (civilian) or "ХУУРАМЧ". Do not reveal words yet.
5. When an imposter is eliminated, they may guess the civilians' word from 8 options for bonus points.
6. Game ends when:
   - all imposters are eliminated → **civilians win**, or
   - imposters ≥ remaining civilians → **imposters win**.
7. At game end, reveal both words with a dramatic side-by-side card flip.

### 2.4 Scoring (both modes, accumulated across rounds in the same room)
| Event | Points |
|---|---|
| Civilian voted for an imposter in the vote that eliminated them | +1 |
| Imposter survives to the end / wins the round | +3 |
| Eliminated imposter guesses the word correctly | +2 |
| Civilian team wins (each surviving civilian) | +1 |

End-of-game fun titles (computed): "Шилдэг худалч" (most imposter points), "Мөрдөгч" (most correct votes), "Гэм буруугүй хохирогч" (civilian eliminated most often).

### 2.5 Room lifecycle and edge cases
- Room code: **4 digits** (keyboard-agnostic, works on Cyrillic keyboards). QR is the primary join method.
- Nickname: 1–12 characters, Cyrillic and Latin allowed, profanity-filtered with a small Mongolian + English blocklist. Duplicate names get a suffix ("Бат 2").
- Each player picks an animal avatar (see §6.6). One avatar per player per room.
- Late joiners wait in the lobby and join the next round.
- **Reconnection:** store a `sessionToken` in `localStorage` (wrapped in try/catch). If a phone sleeps or loses network, rejoin restores the same player, role, and word. Grace period: 90s.
- If an imposter disconnects past the grace period mid-round → round voided, no points, back to lobby.
- If the host leaves → host role migrates to the earliest-joined connected player.
- Rooms expire after 2 hours of inactivity. No nicknames are stored after a room expires.
- "Дахин тоглох" restarts in the same room with the same players and keeps cumulative scores.

---

## 3. Tech stack and architecture

Use exactly this stack unless something is impossible; if you deviate, explain in `DECISIONS.md`.

- **Monorepo:** pnpm workspaces + Turborepo.
  - `apps/web` — Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, `motion` (Framer Motion), Zustand for client state, `qrcode` for QR generation.
  - `apps/server` — NestJS 11 with a Socket.IO gateway. Authoritative game server.
  - `packages/game-core` — **pure TypeScript** game engine: state machine, rules, scoring, role assignment, word-pair selection. Zero I/O. 100% unit-tested. Shared by server and web (for types only on web).
  - `packages/protocol` — Zod schemas for every socket event (client→server and server→client). Both sides validate.
  - `packages/content` — word packs as versioned JSON + a validation script.
- **Persistence:** PostgreSQL via TypeORM for word packs, packs metadata, and anonymous analytics events. **Room state lives in server memory** for MVP behind a `RoomStore` interface so Redis can be added later without touching game logic.
- **Testing:** Vitest (game-core, protocol), Jest or Vitest for NestJS, Playwright for E2E with **4 simultaneous browser contexts** simulating a real room.
- **Tooling:** ESLint, Prettier, `tsc --noEmit` in CI, a `docker-compose.yml` for Postgres, `.env.example` files.

### 3.1 Game state machine (in `game-core`)
```
LOBBY
  → ROLE_REVEAL          (everyone must confirm "Ойлголоо", or host forces after 30s)
  → CLUE_TURNS           (ordered turns, optional per-turn timer)
  → DISCUSSION           (timer, host can skip)
  → VOTING               (30s; non-voters abstain)
  → VOTE_REVEAL          (dramatic sequence, ~3s)
  → IMPOSTER_GUESS?      (only if an imposter was eliminated)
  → [Mode B: back to CLUE_TURNS if game not over]
  → ROUND_RESULT
  → SCOREBOARD
  → LOBBY (replay)
```
- Every transition is a pure function `(state, action, now, rng) => newState`. Inject `rng` and `now` so tests are deterministic.
- The server is authoritative for all timers. Clients only render `serverDeadline - clockOffset`. Compute clock offset on connect.
- Per-player **view projection**: `projectStateForPlayer(state, playerId)` returns only what that player may see. Write tests proving no other player's word or role leaks in any phase.

### 3.2 Socket protocol essentials
- Client → server: `room:create`, `room:join`, `room:rejoin`, `room:updateSettings`, `room:kick`, `game:start`, `role:confirm`, `turn:done`, `discussion:skip`, `vote:cast`, `guess:submit`, `game:replay`.
- Server → client: `state:sync` (full projected state), `state:patch` (optional optimization), `error` (typed codes with Mongolian messages).
- Rate-limit actions per socket. Reject any action invalid for the current phase.

---

## 4. Content (`packages/content`)

Ship **at least 150 hand-checkable word pairs** in 6 free categories. All Mongolian Cyrillic. Correct spelling, including Ө ө Ү ү.

Schema:
```ts
type WordPair = {
  id: string;            // stable slug
  a: string;             // civilians' word (Mode B) / the word (Mode A)
  b: string;             // imposter's word (Mode B)
  category: CategoryId;
  difficulty: 1 | 2 | 3; // 1 easy, 3 hard
  packId: string;
};
```

Free categories: **Монгол хоол**, **Газар орон**, **Амьтан**, **Өдөр тутам**, **Хөгжим ба урлаг**, **Спорт ба тоглоом**.

Locked premium packs (show in UI, not playable yet): **Оюутны амьдрал**, **K-pop ба аниме**, **Монгол дуучид**, **Цагаан сар гэр бүл**, **18+ шөнийн цэнгээн**.

Starter examples (extend in the same spirit):
| a | b | category | difficulty |
|---|---|---|---|
| Бууз | Хуушуур | Монгол хоол | 1 |
| Сүүтэй цай | Айраг | Монгол хоол | 2 |
| Наадам | Цагаан сар | Өдөр тутам | 2 |
| Тэрэлж | Хустай | Газар орон | 2 |
| Морин хуур | Ятга | Хөгжим ба урлаг | 2 |
| Тэмээ | Морь | Амьтан | 1 |
| Бөх | Сур харваа | Спорт ба тоглоом | 2 |
| Шагай | Хөзөр | Спорт ба тоглоом | 3 |
| Гэр | Байшин | Өдөр тутам | 1 |
| Дархан | Эрдэнэт | Газар орон | 3 |

Pair quality rules (enforce in a validation script where possible):
- The two words must share several attributes but differ in at least one obvious one. Too similar = nobody can find the imposter; too different = instant reveal.
- No real private individuals, no politicians, no political parties, no religion, no ethnic or regional stereotypes, no sexual content in free packs.
- No duplicates (including reversed pairs). Validate lengths ≤ 16 characters so words fit on cards.
- Mode A distractors for the imposter guess are drawn from other pairs in the same category.

---

## 5. Screens and UX flows

Design **mobile first at 360×740**. Every phone screen must be fully usable with one thumb. The TV view targets 1920×1080 and must be readable from 4 meters.

1. **Home `/`** — Wordmark "ХУУРАМЧ" set huge in the display face, a short tagline, two primary actions: **Өрөө үүсгэх** and **Нэгдэх** (4-digit input appears inline). A small **Дүрэм** link. No marketing sections, no feature grid, no testimonials, no footer clutter.
2. **Create `/create`** — Mode choice as two large illustrated toggle cards (A and B) with one-line explanations. Category chips (locked premium chips show a lock and "Удахгүй"). Imposter count stepper. Timer presets: "Тайван / Энгийн / Хурдан". Big **Эхлүүлэх** button pinned to bottom.
3. **Lobby `/room/[code]`** — Host sees a big QR + the code in display type, a live grid of joined players (avatar + name) that pop in with a springy entrance, a "3+ тоглогч хэрэгтэй" indicator, and **Тоглоом эхлүүлэх**. Players see "Хөтлөгчийг хүлээж байна" with their avatar doing a subtle idle animation.
4. **Role reveal (phone)** — A face-down card. Copy: **"Дарж байгаад хар"**. Press and hold to reveal; release hides it again (so neighbors cannot peek). Then **Ойлголоо**. Mode A imposter sees "ЧИ ХУУРАМЧ" in red with the category hint. Mode B: every player sees only a word, in identical layout.
5. **Clue turns** — Shared view: the speaking order as a row of avatars with the current speaker enlarged, a chunky countdown ring, and lap counter "1/2". Phone: if it's your turn, the whole screen becomes a bold color with **"ЧИНИЙ ЭЭЛЖ"** and a **Дууслаа** button; otherwise a calm waiting state showing who is speaking.
6. **Discussion** — Big timer, "Хэлэлцээрэй!" prompt, host-only **Санал хураалт руу** button.
7. **Voting** — Grid of other players' avatars (2 columns on phones). Tap to select (thick outline + offset shadow), then **Санал өгөх** to lock. Show "5/7 санал өгсөн" without revealing who voted for whom.
8. **Vote reveal** — The best moment of the game. Votes stack onto avatars one by one with a short drumroll, the eliminated player's card slams down, then a rubber-stamp effect: **ХУУРАМЧ!** (red) or **ЭНГИЙН** (blue). Mode B game end: both words flip side-by-side.
9. **Imposter guess** — 8 big option tiles in a 2×4 grid, 20s timer, everyone else's phone shows "Хуурамч таамаглаж байна…".
10. **Round result / Scoreboard** — Winner team banner, chunky horizontal score bars, fun titles, **Дахин тоглох** and **Гарах**.
11. **Rules `/rules`** — 4 illustrated steps, readable in under 30 seconds. Also a skippable 3-card rules sheet on a player's first game.
12. **TV view `/tv/[code]`** — Read-only big-screen mirror for the shared moments: lobby QR, speaking order, timers, vote reveal, scoreboard. Never shows secret words or roles.

UX requirements:
- Touch targets ≥ 48×48px; primary buttons ≥ 56px tall, pinned within thumb reach.
- Every waiting state tells the player **what is happening and who we are waiting for**.
- Haptics with `navigator.vibrate` on Android for: your turn, vote locked, reveal (feature-detect; iOS Safari does not support it, so fail silently).
- Sound effects on the host/TV screen only by default (tick for last 5s, drumroll, stamp), with a mute toggle. Players' phones are silent by default.
- Screen Wake Lock API during a game (feature-detect) so phones don't sleep mid-round.
- All copy in Mongolian, informal "чи", short, playful, never cringe. Put all strings in `apps/web/src/i18n/mn.ts` so English can be added later.

---

## 6. Visual design direction — READ THIS SECTION TWICE

### 6.1 The direction: "Mongolian pop poster"
Think of a contemporary Mongolian screen-printed festival poster crossed with a physical party card game: **flat saturated color fields, thick ink outlines, hard offset shadows, chunky Cyrillic display type, and small, deliberate touches of geometric Mongolian ornament.** It should feel printed, tactile and handmade, like objects you could pick up off the table, not like a SaaS dashboard.

This is a disciplined take on neubrutalism: bold blocks and hard shadows, but on a **clear grid**, with strong hierarchy and real usability. Loud where it matters (turns, reveals, results), calm everywhere else (waiting, settings).

If `design-references/` exists, study every image there first and write a short "what I'm taking from each reference" note in `DECISIONS.md` before designing.

### 6.2 Color tokens
Define these as CSS variables in Tailwind v4 `@theme`. Do not introduce other hues without writing the reason in `DECISIONS.md`.

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#141414` | Outlines, text, hard shadows |
| `--paper` | `#FAFAF7` | Light background (cool off-white, **not** cream) |
| `--tenger` (blue) | `#1E5EFF` | Primary actions, civilians, "ЭНГИЙН" |
| `--al` (red) | `#E8322A` | Imposter, danger, "ХУУРАМЧ!" stamp |
| `--alt` (yellow) | `#FFC629` | Your turn, highlights, timers |
| `--nogoon` (green) | `#19B36B` | Success, ready states, correct guess |
| `--tsenher` (light blue) | `#8FD3FF` | Secondary surfaces, chips |
| `--night` | `#17171A` | Dark mode background |

- **Default theme for phones is dark (`--night`)** because games are played at night in dim rooms. Light theme (`--paper`) is available and is the default on the TV view during the daytime. Respect `prefers-color-scheme`, with a manual toggle.
- In dark mode, outlines and hard shadows become `--paper` at 90% instead of `--ink`; the saturated colors stay.
- Each player's avatar gets one accent color from a fixed 12-color sequence derived from the tokens above (tints/shades allowed).
- All text must meet WCAG AA contrast. Check it.

### 6.3 Typography
- **Display:** `Unbounded` (800–900) for the wordmark, secret words, stamps, timers, big headings.
- **Body/UI:** `Onest` (400–700). Fallbacks: `Golos Text`, then `Rubik`.
- **Mandatory check:** Mongolian needs Cyrillic letters **Ө ө Ү ү** (U+04E8/U+04E9, U+04AE/U+04AF). Build a `/dev/type` page rendering "Өнөөдөр Үүрийн гэгээ ӨӨ үү Хуушуур Бууз" in every weight you use. If any font is missing these glyphs or falls back visibly, switch to the next fallback and record it in `DECISIONS.md`. Load fonts with `next/font` and subset `cyrillic` + `cyrillic-ext` + `latin`.
- Secret words on the role card: at least 44px, auto-shrink to fit one line, never truncate with an ellipsis.
- Timers and scores use tabular numerals.

### 6.4 Shape, depth and motion
- Outlines: 3px on phones, 4px on TV. Corner radius: **12px** on cards and buttons, **999px** only on chips and avatars. Not everything rounded to the max.
- Depth comes only from **hard offset shadows** (e.g. `4px 4px 0 var(--ink)`), never blurry drop shadows.
- Pressed state: element translates by the shadow offset and the shadow collapses to 0, like a physical button. Instant, under 80ms.
- Motion is purposeful and tied to game moments: springy entrances for players joining, card flip for role reveal, stacking votes, stamp slam with a slight screen shake (≤ 4px) on the reveal. Durations 150–400ms except the reveal sequence. Respect `prefers-reduced-motion` by replacing motion with instant cuts and fades.
- No ambient floating blobs, no animated gradients, no parallax, no glow.

### 6.5 Ornament (use sparingly)
- Create an **original** simple geometric border pattern inspired by traditional Mongolian meander-style ornament (alkhan-style), drawn as an SVG pattern in code.
- Use it in only three places: the Home wordmark underline, the top edge of the role card back, and the winner banner. Nowhere else.
- Do **not** use national state symbols (e.g. the Soyombo or the state emblem), flags, or religious symbols anywhere.

### 6.6 Avatars and illustration
- 12 original animal avatars drawn as **simple geometric SVGs built in code** (circles, rects, triangles, thick ink outline, flat fill): Тэмээ, Морь, Хонь, Ямаа, Үхэр, Сарлаг, Үнэг, Чоно, Тарвага, Ирвэс, Шонхор, Бүргэд.
- Consistent construction grid (e.g. 64×64 with the same stroke width) so they read as one family. Each has 2 states: idle and "eliminated" (eyes become X, desaturated).
- Mode cards on `/create` get simple illustrations in the same style (one face with "?" vs two faces with different speech bubbles).
- Icons: use **Phosphor Icons, Bold weight** only. No emoji anywhere in the UI.

### 6.7 Hard bans (AI-generated look) — violating any of these is a bug
Do **not** use, anywhere:
1. Purple, violet or indigo as an accent, and any purple-to-blue or purple-to-pink gradient.
2. Gradient text (`background-clip: text`) or gradient backgrounds of any kind. The palette is flat.
3. Glassmorphism, frosted blur panels, glows, neon, or soft blurry shadows.
4. The "second wave" of AI looks: cream/beige background with a terracotta accent, or a near-black background with one acid-green accent.
5. Default shadcn/ui look-alikes: thin 1px gray borders, gray cards on white, `rounded-2xl` on everything, muted slate palettes.
6. Centered marketing hero with two buttons and a gradient blob; three-column feature card rows; testimonial or stats sections; fake numbers.
7. Inter, Roboto, or system-ui as the visible UI font.
8. Emoji as icons, sparkle "✨ AI" icons, generic stock illustrations, or 3D blob illustrations.
9. Placeholder copy (lorem ipsum, "Welcome to our app", "Get started today"). All copy must be real, specific Mongolian game copy.
10. Default browser focus rings removed without a visible replacement. Use a thick `--alt` focus outline.

### 6.8 Process to keep the design honest
1. **Milestone 1 is design only.** Build tokens, fonts, buttons, cards, chips, avatars, the role card, the timer ring and the stamp in a `/dev/ui` sandbox page before any game logic. Take Playwright screenshots at 360×740 (dark and light) and 1920×1080 and save them to `screenshots/milestone-1/`.
2. Review your screenshots against §6.7 and fix violations before moving on. Write the checklist result in `DECISIONS.md`.
3. Repeat the screenshot + checklist pass at the end of every milestone.

---

## 7. Accessibility, performance and quality bar

- WCAG AA contrast; full keyboard support on the TV and host screens; `aria-live` announcements for turn changes and reveals; color is never the only signal (the stamps use words, not just red/blue).
- Performance budget for the player route on a mid-range Android over 4G: initial JS ≤ 180 KB gzipped, LCP ≤ 2.0s, smooth 60fps animations (animate only `transform` and `opacity`). Run Lighthouse mobile and record scores; target ≥ 90 Performance and ≥ 95 Accessibility.
- Works in Chrome Android, Samsung Internet, and iOS Safari. Test 360px width and very tall phones.
- Handle network loss gracefully: an inline "Холболт тасарлаа, дахин холбогдож байна…" banner, auto-retry with backoff, automatic rejoin.
- No `any` in TypeScript. No console errors in production builds.

---

## 8. Analytics (privacy-first)

Record anonymous events in Postgres (no names, no IPs stored): `room_created`, `player_joined` (count only), `game_started` (mode, player count, categories), `round_completed` (winner side, duration), `game_replayed`, `pack_viewed_locked`.

Provide a tiny admin-only route (protected by an env secret) showing: games per day, average players per game, **replay rate** (share of rooms that start a second game), mode A vs B usage, and most-played categories. Replay rate is the key metric for validating this product.

---

## 9. Monetization (stub only for now)

- Premium packs are visible but locked. Tapping one opens a sheet: "Удахгүй нээгдэнэ. Хүлээлгийн жагсаалтад нэгдэх үү?" with an optional anonymous "Сонирхож байна" button that logs `pack_interest`.
- Model entitlements per **room host** (one purchase unlocks the pack for everyone in that room), but do **not** integrate any payment provider yet. Leave a clean `EntitlementService` interface for a future QPay integration.

---

## 10. Milestones (do them in order, commit after each)

1. **Design system:** tokens, fonts + glyph check, core components, avatars, role card, timer ring, stamp, `/dev/ui`, screenshots, anti-slop checklist.
2. **Game core:** state machine, both modes, scoring, projections, word selection, with exhaustive Vitest coverage (including "no leak" tests and tie/disconnect edge cases).
3. **Server:** NestJS gateway, protocol validation, in-memory `RoomStore`, timers, reconnection, host migration, rate limiting, Postgres for content + analytics, seed script.
4. **Web app flows:** Home, Create, Lobby with QR, Role reveal, Clue turns, Discussion, Voting, Reveal, Guess, Scoreboard, Rules, TV view.
5. **Polish:** sounds, haptics, wake lock, reduced motion, reconnection UI, empty/error states, copy pass, Lighthouse pass.
6. **E2E + docs:** Playwright test simulating a full 4-player game in both modes (including one reconnect), `README.md` with local setup and deploy notes (web on Vercel, server on any Node host with WebSockets, Postgres anywhere).

---

## 11. Definition of done

- [ ] A full game in **both modes** can be played end-to-end by 4 real phones on the same Wi-Fi, joined by QR.
- [ ] No player can ever see another player's word or role before the reveal (proven by tests).
- [ ] Mode B UI is pixel-identical for civilians and imposters during play.
- [ ] Reconnecting after locking a phone for 60s restores the exact state.
- [ ] Ө ө Ү ү render correctly in every font weight used.
- [ ] Zero violations of §6.7, verified with screenshots in `screenshots/` for every milestone.
- [ ] All tests pass; `tsc`, lint and build pass; Lighthouse targets met and recorded.
- [ ] `DECISIONS.md` explains every deviation and design choice.

Start by reading this entire file, then write `PLAN.md` with the file tree, the socket event list, and a task list per milestone. Then begin Milestone 1.
