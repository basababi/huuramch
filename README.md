# ХУУРАМЧ

Монгол хэл дээрх, нэг өрөөнд найзуудтайгаа утсаараа тоглох social-deduction party тоглоом.
A Mongolian-language in-person party game: everyone plays on their own phone, one or more players
are the хуурамч (imposter).

- Build spec: [`CLAUDE.md`](CLAUDE.md) · plan: [`PLAN.md`](PLAN.md) · decisions: [`DECISIONS.md`](DECISIONS.md)
- Status: **Milestone 1 — design system** (no game logic yet). Full setup and deploy notes arrive in M6.

## Хурдан эхлэх (quick start)

Requirements: Node 22.12+, pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
pnpm dev                      # http://localhost:3000
```

| Page        | What it shows                                                             |
| ----------- | ------------------------------------------------------------------------- |
| `/`         | Home screen                                                               |
| `/dev/ui`   | Design-system sandbox: tokens, buttons, avatars, role card, timer, stamp… |
| `/dev/type` | Ө ө Ү ү glyph check for every font weight in use                          |

Add `?theme=light` or `?theme=dark` to any URL to force a theme.

## Checks

```bash
pnpm lint          # ESLint + the §6.7 anti-slop scan
pnpm typecheck     # next typegen + tsc --noEmit
pnpm test          # Vitest unit tests
pnpm build         # production build (needed before the browser tests)
pnpm e2e           # Playwright: design audit, glyphs, role card, focus
pnpm screenshots   # regenerate screenshots/milestone-1/
```

First run of the browser tests: `pnpm --filter @khuuramch/web exec playwright install chromium`.
