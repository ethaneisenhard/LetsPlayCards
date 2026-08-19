import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EnginePlayer, type EngineState } from '../state';
import { orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface OldMaidState {
  /** Every player except the one stuck holding the queen. */
  winners: string[];
  /** The player left holding the unmatched queen. */
  loser: string | null;
}

/**
 * Remove matching-rank pairs from a hand, keeping the (at most one) unpaired
 * card per rank. A rank with an odd count keeps one card (the Old Maid queen).
 */
export function discardPairs(hand: Card[]): Card[] {
  const byRank = new Map<string, Card[]>();
  for (const card of hand) {
    const arr = byRank.get(card.rank) ?? [];
    arr.push(card);
    byRank.set(card.rank, arr);
  }
  const out: Card[] = [];
  for (const cards of byRank.values()) {
    for (let i = 0; i < cards.length % 2; i++) out.push(cards[i]);
  }
  return out;
}

function nextActiveSeat(players: EnginePlayer[], currentSeat: number): number {
  const seats = orderedSeats(players);
  const start = seats.indexOf(currentSeat);
  for (let i = 1; i <= seats.length; i++) {
    const seat = seats[(start + i) % seats.length];
    const p = players.find((x) => x.seat === seat);
    if (p && p.hand.length > 0) return seat;
  }
  return currentSeat;
}

export const oldMaidGame: CardGame = {
  type: 'old_maid',
  config: GAME_CONFIGS.old_maid,
  family: 'collecting',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const full = shuffleDeck(createDeck());
    // Remove one queen so 51 cards remain; the unmatched queen is the Old Maid.
    const firstQueen = full.findIndex((c) => c.rank === 'Q');
    const deck = full.filter((_, i) => i !== firstQueen);
    const hands: Card[][] = players.map(() => []);
    deck.forEach((card, i) => hands[i % players.length].push(card));
    const dealt = players.map((p, i) => ({ ...p, hand: discardPairs(hands[i]) }));
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: { winners: [], loser: null } satisfies OldMaidState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent !== 'draw-from') throw new EngineError(`Unknown intent: ${action.intent}`);
    const { game, players } = state;
    const gs = game.gameState as OldMaidState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
    if (player.hand.length === 0) throw new EngineError('You have no cards');
    const targetId = String(action.targetId);
    if (targetId === player.id) throw new EngineError('Cannot draw from yourself');
    const target = findPlayer(players, targetId);
    if (!target) throw new EngineError('Target not found');
    if (target.hand.length === 0) throw new EngineError('Target has no cards');

    // Deterministic draw: take the first card of the target's hand.
    const drawn = target.hand[0];
    const targetHand = target.hand.slice(1);
    const myHand = discardPairs([...player.hand, drawn]);

    const nextPlayers = players.map((p) => {
      if (p.id === player.id) return { ...p, hand: myHand };
      if (p.id === targetId) return { ...p, hand: targetHand };
      return p;
    });

    const active = nextPlayers.filter((p) => p.hand.length > 0);
    if (active.length === 1) {
      const loser = active[0].id;
      const winners = players.filter((p) => p.id !== loser).map((p) => p.id);
      return {
        game: { ...game, status: 'finished', gameState: { winners, loser } satisfies OldMaidState },
        players: nextPlayers,
      };
    }

    return {
      game: { ...game, currentSeat: nextActiveSeat(nextPlayers, player.seat), gameState: { ...gs } },
      players: nextPlayers,
    };
  },
  isTerminal(state) {
    return !!(state.game.gameState as OldMaidState).loser;
  },
  score(state) {
    const gs = state.game.gameState as OldMaidState;
    const result: Record<string, number> = {};
    for (const w of gs.winners) result[w] = 1;
    if (gs.loser) result[gs.loser] = 0;
    return result;
  },
};
