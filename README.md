# ХУУРАМЧ

Монгол хэл дээрх, нэг өрөөнд найзуудтайгаа утсаараа тоглох social-deduction party тоглоом.
A Mongolian-language in-person party game: everyone plays on their own phone, one or more players
are the хуурамч (imposter).

- Build spec: [`CLAUDE.md`](CLAUDE.md) · plan: [`PLAN.md`](PLAN.md) · decisions: [`DECISIONS.md`](DECISIONS.md)
- Status: **Milestone 4 — the whole game is playable** (both modes, phones + TV). Polish (sounds,
  Lighthouse) is M5; full deploy notes arrive in M6.

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
кодоос уншигдаж, статистик санах ойд хадгалагдана (`docker compose up -d` → `apps/server/.env`).

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

Add `?theme=light` or `?theme=dark` to any URL to force a theme. Environment examples:
[`apps/server/.env.example`](apps/server/.env.example), [`apps/web/.env.example`](apps/web/.env.example).

## Checks

```bash
pnpm lint          # ESLint + the §6.7 anti-slop scan
pnpm typecheck     # next typegen + tsc --noEmit
pnpm test          # Vitest: game core, protocol, content, server (incl. real-socket games), web
pnpm build         # production build (needed before the browser tests)
pnpm e2e           # Playwright: design audit, glyphs, role card, focus, JS budget
pnpm --filter @khuuramch/web exec playwright test --project=game   # 4 phones + TV, both modes
pnpm screenshots   # regenerate the static-page screenshots (MILESTONE=milestone-4)
```

`SHOTS=milestone-4` on the game project also saves every phase to `screenshots/milestone-4/game/`.
First run of the browser tests: `pnpm --filter @khuuramch/web exec playwright install chromium`.
