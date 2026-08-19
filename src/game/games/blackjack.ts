import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, publicView, updatePlayerHand, type EngineState } from '../state';
import { rankValue } from '../gameTypes';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface BlackjackState {
  phase: 'playing' | 'dealer' | 'finished';
  dealer: Card[];
  dealerHidden: boolean;
  order: string[];
  current: string | null;
  results: Record<string, 'win' | 'lose' | 'push' | 'bust'>;
  bets: Record<string, number>;
}

export function handValue(hand: Card[]): number {
  let sum = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === 'A') {
      aces += 1;
      sum += 11;
    } else {
      sum += Math.min(10, rankValue(c.rank) + 2);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces -= 1;
  }
  return sum;
}

function advance(state: EngineState, next: string | null, gs: BlackjackState, results: Record<string, 'win' | 'lose' | 'push' | 'bust'>): EngineState {
  if (next) {
    return { ...state, game: { ...state.game, gameState: { ...gs, current: next, results } } };
  }
  // All players done → dealer plays.
  let dealer = [...gs.dealer];
  let deck = [...state.game.deck];
  while (handValue(dealer) < 17) {
    if (deck.length === 0) break;
    dealer = [...dealer, deck[0]];
    deck = deck.slice(1);
  }
  const dv = handValue(dealer);
  const finalResults = { ...results };
  for (const pid of gs.order) {
    if (finalResults[pid] === 'bust') continue;
    const pv = handValue(state.players.find((p) => p.id === pid)!.hand);
    finalResults[pid] = dv > 21 || pv > dv ? 'win' : pv === dv ? 'push' : 'lose';
  }
  return {
    ...state,
    game: {
      ...state.game,
      status: 'finished',
      deck,
      gameState: { ...gs, phase: 'finished', dealer, dealerHidden: false, current: null, results: finalResults },
    },
  };
}

export const blackjackGame: CardGame = {
  type: 'blackjack',
  config: GAME_CONFIGS.blackjack,
  family: 'betting',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + 2);
      idx += 2;
      return { ...p, hand };
    });
    const dealer = deck.slice(idx, idx + 2);
    idx += 2;
    const order = players.map((p) => p.id);
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'playing',
          dealer,
          dealerHidden: true,
          order,
          current: order[0] ?? null,
          results: {},
          bets: Object.fromEntries(players.map((p) => [p.id, 10])),
        } satisfies BlackjackState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as BlackjackState;
    const playerId = action.playerId!;
    const player = findPlayer(players, playerId);
    if (!player) throw new EngineError('Player not found');
    if (gs.current !== playerId) throw new EngineError('Not your turn');

    if (action.intent === 'hit') {
      if (game.deck.length === 0) throw new EngineError('No cards left');
      const card = game.deck[0];
      const newDeck = game.deck.slice(1);
      const newHand = [...player.hand, card];
      const nextPlayers = updatePlayerHand(players, playerId, newHand);
      if (handValue(newHand) > 21) {
        const results = { ...gs.results, [playerId]: 'bust' as const };
        const next = gs.order[gs.order.indexOf(playerId) + 1] ?? null;
        return advance({ game: { ...game, deck: newDeck }, players: nextPlayers }, next, gs, results);
      }
      return { game: { ...game, deck: newDeck }, players: nextPlayers };
    }

    if (action.intent === 'stand') {
      const next = gs.order[gs.order.indexOf(playerId) + 1] ?? null;
      return advance(state, next, gs, gs.results);
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  view(state, viewerId) {
    const pv = publicView(state, viewerId);
    const gs = state.game.gameState as BlackjackState;
    const dealer = gs.dealerHidden && gs.dealer.length > 0 ? [gs.dealer[0]] : gs.dealer;
    return { ...pv, game: { ...pv.game, gameState: { ...gs, dealer } } };
  },
  isTerminal(state) {
    return (state.game.gameState as BlackjackState).phase === 'finished';
  },
  score(state) {
    const gs = state.game.gameState as BlackjackState;
    return Object.fromEntries(Object.entries(gs.results).map(([id, r]) => [id, r === 'win' ? 1 : r === 'push' ? 0 : -1]));
  },
};
