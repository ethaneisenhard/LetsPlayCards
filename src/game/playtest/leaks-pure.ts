import type { EngineState } from '../state';
import type { Card } from '../types';

function isCardLike(value: unknown): value is Card {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.id === 'string' && typeof c.rank === 'string' && typeof c.suit === 'string';
}

function walkCards(value: unknown, visit: (card: Card, path: string) => void, path = 'view', depth = 0): void {
  if (depth > 12 || value == null) return;
  if (isCardLike(value)) {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkCards(item, visit, `${path}[${i}]`, depth + 1));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkCards(child, visit, `${path}.${key}`, depth + 1);
    }
  }
}

function collectHiddenCards(state: EngineState, viewerId: string): Map<string, { rank: string; suit: string; source: string }> {
  const hidden = new Map<string, { rank: string; suit: string; source: string }>();
  for (const card of state.game.deck) {
    hidden.set(card.id, { rank: card.rank, suit: card.suit, source: 'deck' });
  }
  for (const player of state.players) {
    if (player.id === viewerId) continue;
    for (const card of player.hand) {
      hidden.set(card.id, { rank: card.rank, suit: card.suit, source: `hand:${player.id}` });
    }
  }
  const stacks = (state.game.gameState as { stacks?: Record<string, Card[]> } | undefined)?.stacks;
  if (stacks && typeof stacks === 'object') {
    for (const [pid, pile] of Object.entries(stacks)) {
      if (pid === viewerId || !Array.isArray(pile)) continue;
      for (const card of pile) {
        if (isCardLike(card)) hidden.set(card.id, { rank: card.rank, suit: card.suit, source: `stack:${pid}` });
      }
    }
  }
  const boards = (state.game.gameState as { boards?: Record<string, unknown> } | undefined)?.boards;
  if (boards && typeof boards === 'object') {
    const viewerIds = new Set<string>();
    const mine = boards[viewerId];
    if (mine) walkCards(mine, (card) => viewerIds.add(card.id), 'board:self');
    for (const [pid, board] of Object.entries(boards)) {
      if (pid === viewerId || !board || typeof board !== 'object') continue;
      walkCards(board, (card) => {
        if (viewerIds.has(card.id)) return;
        hidden.set(card.id, { rank: card.rank, suit: card.suit, source: `board:${pid}` });
      }, `board:${pid}`);
    }
  }
  const dummyHand = (state.game.gameState as { dummyHand?: Card[] } | undefined)?.dummyHand;
  if (Array.isArray(dummyHand)) {
    for (const card of dummyHand) hidden.delete(card.id);
  }
  const privateCards = (state.game.gameState as { cards?: Record<string, Card> } | undefined)?.cards;
  if (privateCards && typeof privateCards === 'object') {
    for (const [pid, card] of Object.entries(privateCards)) {
      if (pid === viewerId || !isCardLike(card)) continue;
      hidden.set(card.id, { rank: card.rank, suit: card.suit, source: `hole:${pid}` });
    }
  }
  return hidden;
}

/**
 * A player's publicView must not include the deck or another player's true
 * hole cards / face-down stacks. Face-up table cards (tricks, discards,
 * community) are allowed.
 */
export function findViewLeaks(view: unknown, secret: EngineState, viewerId: string): string[] {
  const errors: string[] = [];
  if (!view || typeof view !== 'object') return ['view is not an object'];

  const root = view as {
    game?: { deck?: unknown; gameState?: { stacks?: unknown } };
    players?: Array<{ id: string; hand?: unknown[] }>;
  };

  if (Array.isArray(root.game?.deck)) {
    errors.push('view includes the raw deck');
  }
  if (root.game?.gameState && 'stacks' in root.game.gameState && root.game.gameState.stacks != null) {
    errors.push('view leaked hidden stacks');
  }

  for (const player of root.players ?? []) {
    if (player.id !== viewerId && Array.isArray(player.hand) && player.hand.length > 0) {
      errors.push(`opponent ${player.id} hand is visible`);
    }
  }

  const hidden = collectHiddenCards(secret, viewerId);
  walkCards(view, (card, path) => {
    const secretCard = hidden.get(card.id);
    if (secretCard && secretCard.rank === card.rank && secretCard.suit === card.suit) {
      errors.push(`leaked ${secretCard.source} as ${card.rank} of ${card.suit} at ${path}`);
    }
  });

  return errors;
}

export function describeStuckState(state: EngineState): string {
  const gs = (state.game.gameState ?? {}) as Record<string, unknown>;
  const phase = typeof gs.phase === 'string' ? gs.phase : undefined;
  const hands = state.players.map((p) => `${p.name}@${p.seat}:${p.hand.length}`).join(',');
  return [
    `status=${state.game.status}`,
    `seat=${state.game.currentSeat}`,
    phase ? `phase=${phase}` : null,
    `hands=${hands}`,
    `deck=${state.game.deck.length}`,
  ]
    .filter(Boolean)
    .join(' ');
}
