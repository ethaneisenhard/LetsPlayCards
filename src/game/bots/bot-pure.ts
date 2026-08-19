import type { EngineState } from '../state';
import type { GameAction } from '../registry/types';

export type BotPolicy = (state: EngineState, playerId: string) => GameAction | null;
export type SettlePolicy = (state: EngineState) => GameAction | null;

export function firstLegalAction(
  state: EngineState,
  playerId: string,
  candidates: GameAction[],
  apply: (state: EngineState, action: GameAction) => EngineState,
): GameAction | null {
  for (const candidate of candidates) {
    const action: GameAction = { ...candidate, playerId };
    try {
      apply(state, action);
      return action;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function defaultBotCandidates(state: EngineState, playerId: string): GameAction[] {
  const player = state.players.find((p) => p.id === playerId);
  const out: GameAction[] = [
    { intent: 'war-collect' },
    { intent: 'war-play' },
    { intent: 'flip' },
    { intent: 'draw' },
    { intent: 'pass' },
    { intent: 'slap' },
    { intent: 'snap' },
    { intent: 'hit' },
    { intent: 'stand' },
    { intent: 'check' },
    { intent: 'call' },
    { intent: 'raise', amount: 2 },
    { intent: 'fold' },
    { intent: 'swap' },
    { intent: 'knock' },
    { intent: 'showdown' },
    { intent: 'deal-row' },
    { intent: 'draw-stock' },
    { intent: 'bet', side: 'player', amount: 10 },
    { intent: 'bet', side: 'banker', amount: 10 },
    { intent: 'go' },
    { intent: 'count' },
  ];
  const tableCards = Array.isArray((state.game.gameState as { table?: { id?: string }[] } | undefined)?.table)
    ? ((state.game.gameState as { table: { id: string }[] }).table)
    : [];
  for (const card of player?.hand ?? []) {
    out.push({ intent: 'trail', cardId: card.id });
    out.push({ intent: 'play-center', cardId: card.id });
    for (let corner = 0; corner < 4; corner++) out.push({ intent: 'play', cardId: card.id, corner });
    for (const t of tableCards) out.push({ intent: 'capture', cardId: card.id, targetIds: [t.id] });
  }
  const cribIds = player?.hand.map((c) => c.id) ?? [];
  if (cribIds.length >= 2) out.push({ intent: 'discard-to-crib', cards: cribIds.slice(0, 2) });
  const grid = (state.game.gameState as { grid?: unknown[] } | undefined)?.grid;
  if (Array.isArray(grid)) {
    for (let i = 0; i < grid.length; i++) out.push({ intent: 'flip', index: i });
  }
  for (const card of player?.hand ?? []) {
    out.push({ intent: 'play', cardId: card.id });
    out.push({ intent: 'discard', cardId: card.id });
  }
  for (const other of state.players) {
    if (other.id === playerId) continue;
    out.push({ intent: 'draw-from', targetId: other.id });
    for (const card of player?.hand ?? []) {
      out.push({ intent: 'gofish-ask', rank: card.rank, targetId: other.id });
    }
  }
  return out;
}

export function nextBotReply(
  state: EngineState,
  humanId: string,
  policy: BotPolicy,
): GameAction | null {
  if (state.game.status === 'finished') return null;
  for (const player of state.players) {
    if (player.id === humanId) continue;
    const action = policy(state, player.id);
    if (action) return { ...action, playerId: player.id };
  }
  return null;
}

/** One visible step: a bot reply, or a settle (collect). Never opens a new round. */
export function nextMatchStep(
  state: EngineState,
  humanId: string,
  policy: BotPolicy,
  settle?: SettlePolicy,
): GameAction | null {
  return nextBotReply(state, humanId, policy) ?? settle?.(state) ?? null;
}

/**
 * After a human move: bots answer, then one settle (e.g. collect).
 * Does not start the next round — waits for the human again.
 */
export function respondAfterHuman(
  state: EngineState,
  humanId: string,
  policy: BotPolicy,
  apply: (state: EngineState, action: GameAction) => EngineState,
  settle?: SettlePolicy,
  maxSteps = 16,
): EngineState {
  let current = state;
  for (let i = 0; i < maxSteps; i++) {
    const action = nextBotReply(current, humanId, policy);
    if (!action) break;
    try {
      current = apply(current, action);
    } catch {
      break;
    }
  }
  const extra = settle?.(current);
  if (!extra) return current;
  try {
    return apply(current, extra);
  } catch {
    return current;
  }
}
