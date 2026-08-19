# LetsPlayCards

Realtime multiplayer card games (War, Go Fish, Free Play) on Cloudflare.

## Stack

| Concern | Tech |
|---------|------|
| Runtime | Cloudflare Workers (Wrangler) |
| Data | D1 (lobby index) + Durable Objects (authoritative game state) |
| Realtime | Durable Object WebSockets |
| Engine | Pure TypeScript (`src/game/engine.ts`) |

## Architecture

- `src/game/engine.ts` — pure game-state transitions (deal, draw, play, discard,
  pickup, War flip/collect, Go Fish ask). No I/O; every function returns a new
  state or throws `EngineError`. This is the single source of truth ported from
  the old Supabase RPCs.
- `src/durable/game-room.ts` — one Durable Object per game. Holds state, applies
  engine transitions, fans out `{ type: 'state', state }` to connected sockets.
- `src/index.ts` — Worker entry: `/health`, `/api/games` (create/list), and
  `/game/:code` (forwarded to the room's DO).
- `migrations/0001_init.sql` — D1 `games` table (code → id + metadata).

Live game state (deck, hands, game_state) lives **only** in the DO — not D1.
D1 keeps the durable lobby index so the home page can list games and resolve
codes without waking every room.

## Commands

```bash
pnpm install            # once
pnpm test
pnpm typecheck
pnpm dev                # wrangler dev :8789
pnpm d1:migrate
```

## Deploy

Live: https://letsplaycards.devbyethan.workers.dev

Push to `main` deploys via GitHub Actions (`.github/workflows/deploy.yml`).

Required repo secrets:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token with Workers + D1 edit |
| `CLOUDFLARE_ACCOUNT_ID` | `c96f5c11e25505555d06dc79e77c6574` |

Manual:

```bash
pnpm ship                   # build + wrangler deploy
pnpm d1:migrate:remote      # first time / new SQL
```
