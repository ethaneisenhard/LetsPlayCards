import { createDeck, shuffleDeck } from '../deck';
import { detectBooks, type GoFishGameState } from '../gameTypes';
import type { Card } from '../types';
import { EngineError, findPlayer, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export function goFishAsk(
  state: EngineState,
  playerId: string,
  rank: string,
  targetId: string,
): EngineState {
  const { game, players } = state;
  const gs = game.gameState as GoFishGameState;

  const player = findPlayer(players, playerId);
  const target = findPlayer(players, targetId);
  if (!player || !target) throw new EngineError('Player not found');
  if (game.currentSeat !== player.seat) throw new EngineError('Not your turn');
  if (targetId === playerId) throw new EngineError('Cannot ask yourself');
  if (!player.hand.some((c) => c.rank === rank)) throw new EngineError('You must hold that rank');

  const matching = target.hand.filter((c) => c.rank === rank);
  let myHand = [...player.hand];
  let targetHand = [...target.hand];
  let deck = [...game.deck];
  let result: 'success' | 'go_fish';

  if (matching.length > 0) {
    result = 'success';
    myHand = [...myHand, ...matching];
    targetHand = targetHand.filter((c) => c.rank !== rank);
  } else {
    result = 'go_fish';
    if (deck.length > 0) {
      myHand = [...myHand, deck[0]];
      deck = deck.slice(1);
    }
  }

  const { books: newBooks, remaining: handAfterBooks } = detectBooks(myHand);
  const currentBooks = gs.books ?? {};
  const existingBooks = currentBooks[playerId] ?? [];

  let handToSave = myHand;
  let updatedBooks = currentBooks;
  if (newBooks.length > 0) {
    handToSave = handAfterBooks;
    updatedBooks = { ...currentBooks, [playerId]: [...existingBooks, ...newBooks] };
  }

  const nextPlayers = players.map((p) => {
    if (p.id === playerId) return { ...p, hand: handToSave };
    if (p.id === targetId) return { ...p, hand: targetHand };
    return p;
  });

  let nextSeatVal = game.currentSeat;
  if (result === 'go_fish') {
    nextSeatVal = nextSeat(orderedSeats(players), game.currentSeat);
  }

  const deckEmpty = deck.length === 0;
  const allHandsEmpty = nextPlayers.every((p) => p.hand.length === 0);
  let winner: string | null = null;
  if (deckEmpty && allHandsEmpty) {
    let maxBooks = -1;
    for (const [pid, bks] of Object.entries(updatedBooks)) {
      if ((bks as Card[][]).length > maxBooks) {
        maxBooks = (bks as Card[][]).length;
        winner = pid;
      }
    }
  }

  return {
    game: {
      ...game,
      deck,
      status: winner ? 'finished' : 'playing',
      currentSeat: nextSeatVal,
      gameState: {
        ...gs,
        currentSeat: nextSeatVal,
        books: updatedBooks,
        lastAsk: { fromId: playerId, fromName: player.name, toId: targetId, toName: target.name, rank, result },
        winner,
      },
    },
    players: nextPlayers,
  };
}

export const goFishGame: CardGame = {
  type: 'go_fish',
  config: GAME_CONFIGS.go_fish,
  family: 'collecting',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = players.length >= 4 ? 5 : 7;
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + dealCount);
      idx += dealCount;
      return { ...p, hand };
    });
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          currentSeat: 0,
          books: Object.fromEntries(players.map((p) => [p.id, []])),
          lastAsk: null,
          winner: null,
        },
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent === 'gofish-ask') {
      return goFishAsk(state, action.playerId!, String(action.rank), String(action.targetId));
    }
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    const gs = state.game.gameState as GoFishGameState;
    return !!gs.winner;
  },
  score(state) {
    const gs = state.game.gameState as GoFishGameState;
    return Object.fromEntries(Object.entries(gs.books ?? {}).map(([id, books]) => [id, books.length]));
  },
};
