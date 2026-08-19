---
name: game-qa-loop
description: >-
  Sequential game QA: one catalog game at a time until engine + UI pass, then
  the next. Use when the user says game QA, visual-test games, next game,
  pass/fail after a playground check, or wants the agent loop through each game.
---

# Game QA loop

Human-gated. **One game per chat.** Do not start the next game until the human says `pass`.

No Cursor browser MCP. Human plays in Chrome/Safari.

## Tracker

- State: `.scratch/game-qa.json`
- Order / verdicts: `src/game/audit/qa-queue-pure.ts` (`qaOrder`, `nextQaTarget`, `applyVerdict`)
- Status: `pnpm qa:next`

## Sprint (current game only)

1. Read tracker. Current game is `nextQaTarget`. If null, stop — queue done.
2. Run `auditGame(type)`. Fix engine (`src/game/engine.ts` + registry) until `engineReady`.
3. If `!tableReady`, add a **generic felt projection or board kind** (registry + pure). Do not add a one-off `GameTable`.
4. Wire playground / `/solo/:type` so this game is playable on the shared table.
5. `pnpm typecheck` && `pnpm test`. Rebuild client if UI changed (`node scripts/build-client.mjs`; CSS via tailwind if needed).
6. Print `pnpm qa:next` output. Stop. Wait for human visual.

## Human replies

| They say | You do |
| --- | --- |
| `pass` | `applyVerdict(..., 'pass')`, write tracker, **new chat** for the next game (do not drain the next one here) |
| `fail: …` | `applyVerdict(..., 'fail', notes)`, stay on this game, fix, re-verify |
| `next` / `continue` | Only if current is `pass`. Otherwise stay. |

## Hard stops

- Do not mark `pass` yourself.
- Do not skip ahead in `qaOrder`.
- Engine stays pure. DO stays thin. Hands stay behind `publicView`.
