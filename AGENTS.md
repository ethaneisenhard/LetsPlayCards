# LetsPlayCards — project rules

## Stack contract

Remix 3 + Cloudflare Worker ideal-stack (see monorepo `AGENTS.md`). Game-specific
additions: Durable Objects for live game state, D1 for the lobby index.

## Coding rules

- **Engine is pure.** `src/game/engine.ts` has no I/O and no mutation of inputs.
  Every transition returns a new `EngineState` or throws `EngineError`. Add
  intent handlers there, not in the DO.
- **DO is thin.** `game-room.ts` only loads/saves/broadcasts and routes intents
  to the engine. No game rules in the DO.
- **Never leak hands.** `publicView(state, viewerId)` is the only projection
  sent to clients — other players' hands and the deck stay server-side.
- **No one-offs.** Reuse the engine for all three game types; add rules via the
  registry (`gameTypes.ts`) + pure functions.

## Verify before claiming done

- `pnpm typecheck`
- `pnpm test`

## Game QA loop

One catalog game at a time. Tracker: `.scratch/game-qa.json`. Table: `.scratch/game-drain.md`. Skill: `.cursor/skills/game-qa-loop/SKILL.md`.

1. Current target = `nextQaTarget` (`src/game/audit/qa-queue-pure.ts`). Status: `pnpm qa:next`.
2. Make **this** game work in the engine and on the shared felt (`GameTable`). No one-off tables.
3. Do not mark pass. Human plays Chrome/Safari (`/playground` or `/solo/:type`) and replies `pass` or `fail: …`.
4. Next game only after human `pass`. New chat per game.
