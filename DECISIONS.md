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
