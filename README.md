# ХУУРАМЧ

Монгол хэл дээрх, нэг өрөөнд найзуудтайгаа утсаараа тоглох social-deduction party тоглоом.
A Mongolian-language in-person party game: everyone plays on their own phone, one or more players
are the хуурамч (imposter).

- Build spec: [`CLAUDE.md`](CLAUDE.md) · plan: [`PLAN.md`](PLAN.md) · decisions: [`DECISIONS.md`](DECISIONS.md)
- Status: **all six milestones done** — both modes playable on phones + TV, polished, tested.

## Хурдан эхлэх (quick start)

Requirements: Node 22.12+, pnpm 10 (`npm i -g pnpm@10`).

```bash
pnpm install
pnpm dev        # game server on :3001 + web app on http://localhost:3000
```

Тоглох нь:

1. Компьютер дээр http://localhost:3000 нээгээд **Өрөө үүсгэх**.
2. Найзууд **нэг Wi-Fi**-д холбогдсон утсаараа лобби дээрх QR-ыг уншуулна (QR нь компьютерийн
   LAN хаягийг автоматаар заана, жишээ нь `http://192.168.1.5:3000/room/4821`).
3. Том дэлгэц хэрэгтэй бол ТВ/зөөврийн компьютер дээр `http://<LAN хаяг>:3000/tv/<код>` нээнэ.

Windows дээр утас холбогдохгүй бол Windows Defender Firewall-д Node.js-ийг **Private network** дээр
зөвшөөрнө үү (3000, 3001 портууд). PostgreSQL заавал биш: `DATABASE_URL` хоосон бол үгсийн сан
кодоос уншигдаж, статистик санах ойд хадгалагдана.

| Page           | What it shows                                                             |
| -------------- | ------------------------------------------------------------------------- |
| `/`            | Home: create a room or join with a 4-digit code                           |
| `/create`      | Mode, categories, imposters, timers — then your name and animal           |
| `/room/[code]` | A player's phone: lobby, role card, turns, voting, reveal, results        |
| `/tv/[code]`   | Read-only big screen: QR, speaking order, timers, reveal, scoreboard      |
| `/rules`       | Rules in four illustrated steps                                           |
| `/admin`       | Anonymous stats; needs `ADMIN_SECRET` on the server                       |
| `/dev/ui`      | Design-system sandbox: tokens, buttons, avatars, role card, timer, stamp… |
| `/dev/type`    | Ө ө Ү ү glyph check for every font weight in use                          |

Add `?theme=light` or `?theme=dark` to any URL to force a theme.

## Local setup in detail

```
apps/web        Next.js 16 phone + TV app            → :3000
apps/server     NestJS 11 + Socket.IO game server   → :3001
packages/game-core   pure rules engine (state machine, scoring, projections)
packages/protocol    Zod schemas for every socket event
packages/content     word packs (171 checked pairs) + validator
```

- `pnpm dev` builds the three packages once, then runs everything in watch mode.
- Optional database: `docker compose up -d` starts PostgreSQL 17 (set `POSTGRES_PORT=55432` if
  5432 is taken), then copy [`apps/server/.env.example`](apps/server/.env.example) to
  `apps/server/.env` with
  `DATABASE_URL=postgres://khuuramch:khuuramch@localhost:5432/khuuramch`. Migrations run on start;
  load the word packs with `pnpm --filter @khuuramch/server build && pnpm --filter @khuuramch/server seed`.
- Admin stats: set `ADMIN_SECRET` in `apps/server/.env` and open `/admin`.
- Web settings: [`apps/web/.env.example`](apps/web/.env.example) (`NEXT_PUBLIC_SERVER_URL`,
  `NEXT_PUBLIC_PUBLIC_URL`) — both optional locally.

## Deploy

The web app and the game server deploy separately. The server keeps live rooms in memory
(`RoomStore`, swappable for Redis later), so run **one** server instance.

### Game server — any Node host with WebSockets (Render, Railway, Fly.io, a VPS)

```bash
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@khuuramch/server     # builds the packages it depends on
node apps/server/dist/main.js
```

| Variable       | Production value                                                           |
| -------------- | -------------------------------------------------------------------------- |
| `PORT`         | the port your host gives you (default 3001)                                |
| `HOST`         | `0.0.0.0`                                                                  |
| `CORS_ORIGINS` | your web origin(s), comma-separated, e.g. `https://khuuramch.vercel.app`   |
| `DATABASE_URL` | PostgreSQL connection string (Neon, Supabase, RDS…); empty = bundled packs |
| `ADMIN_SECRET` | a long random string; empty disables `/admin/stats`                        |
| `EXPOSE_LAN`   | `false` (only useful for local Wi-Fi play)                                 |
| `NODE_ENV`     | `production`                                                               |

Health check: `GET /health`. With a database, run the seed once after the first deploy:
`node apps/server/dist/database/seed.js`. Put the server behind HTTPS (the host's TLS is fine):
a page served over `https` can only open a `wss://` socket.

### Web app — Vercel

- Import the repository, set **Root Directory** to `apps/web` (framework: Next.js). Vercel
  detects pnpm workspaces and builds the packages through Turborepo.
- Environment: `NEXT_PUBLIC_SERVER_URL=https://your-game-server.example.com` (required in
  production) and optionally `NEXT_PUBLIC_PUBLIC_URL=https://your-domain` for the lobby QR.
- `NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.

Any other Node host works too: `pnpm turbo run build --filter=@khuuramch/web`, then
`pnpm --filter @khuuramch/web start` (port 3000).

## Checks

```bash
pnpm lint          # ESLint + the §6.7 anti-slop scan
pnpm typecheck     # next typegen + tsc --noEmit
pnpm test          # Vitest: game core, protocol, content, server (incl. real-socket games), web
pnpm build         # production build (needed before the browser tests)
pnpm e2e           # Playwright: design audit, glyphs, role card, focus, JS budget, offline
pnpm --filter @khuuramch/web exec playwright test --project=game   # 4 phones + TV, both modes
pnpm screenshots   # regenerate the static-page screenshots (MILESTONE=milestone-5)
```

- `SHOTS=milestone-5` on the game project also saves every phase to `screenshots/milestone-5/game/`.
- `E2E_BASE_URL=http://<LAN IP>:3000` runs the browser tests against `pnpm dev` the way phones on
  the same Wi-Fi reach it.
- First run of the browser tests: `pnpm --filter @khuuramch/web exec playwright install chromium`.
- Lighthouse (mobile): `npx lighthouse@13.5.0 http://localhost:3100/` against `next start --port 3100`;
  results and caveats in [DECISIONS.md D-403](DECISIONS.md).
