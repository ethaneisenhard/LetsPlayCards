import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { RANK_SEQ } from './iDoubtIt';

interface CheatState {
  rankIndex: number;
  center: Card[];
  pendingPlay: { playerId: string; declaredRank: string; cards: Card[] } | null;
  winner: string | null;
}

export function playCards(state: EngineState, playerId: string, cardIds: string[]): EngineState {
  const { game, players } = state;
  const gs = game.gameState as CheatState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
  if (cardIds.length < 1 || cardIds.length > 4) throw new EngineError('Play 1 to 4 cards');

  const declaredRank = RANK_SEQ[gs.rankIndex % RANK_SEQ.length];

  const cards: Card[] = [];
  let hand = [...player.hand];
  for (const id of cardIds) {
    const card = hand.find((c) => c.id === id);
    if (!card) throw new EngineError(`Card ${id} not in hand`);
    cards.push(card);
    hand = removeCard(hand, id);
  }

  const nextPlayers = updatePlayerHand(players, playerId, hand);
  const center = [...gs.center, ...cards];
  const rankIndex = (gs.rankIndex + 1) % RANK_SEQ.length;
  const winner = hand.length === 0 ? playerId : null;
  const nextSeatVal = nextSeat(orderedSeats(players), player.seat);

  return {
    game: {
      ...game,
      status: winner ? 'finished' : 'playing',
      currentSeat: nextSeatVal,
      gameState: {
        ...gs,
        rankIndex,
        center,
        pendingPlay: { playerId, declaredRank, cards },
        winner,
      } satisfies CheatState,
    },
    players: nextPlayers,
  };
}

export function doubt(state: EngineState, challengerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as CheatState;
  const challenger = findPlayer(players, challengerId);
  if (!challenger) throw new EngineError('Player not found');
  if (!gs.pendingPlay) throw new EngineError('Nothing to challenge');

  const { playerId, declaredRank, cards } = gs.pendingPlay;
  if (challengerId === playerId) throw new EngineError('You cannot challenge your own play');
  const lied = cards.some((c) => c.rank !== declaredRank);

  const takerId = lied ? playerId : challengerId;
  const taker = findPlayer(players, takerId)!;
  const nextPlayers = updatePlayerHand(players, takerId, [...taker.hand, ...gs.center]);

  return {
    game: {
      ...game,
      currentSeat: taker.seat,
      gameState: { ...gs, center: [], pendingPlay: null },
    },
    players: nextPlayers,
  };
}

export const cheatGame: CardGame = {
  type: 'cheat',
  config: GAME_CONFIGS.cheat,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = Math.floor(deck.length / players.length);
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
          rankIndex: 0,
          center: [],
          pendingPlay: null,
          winner: null,
        } satisfies CheatState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent === 'play') {
      const cardIds = Array.isArray(action.cards) ? action.cards.map(String) : [];
      return playCards(state, String(action.playerId), cardIds);
    }
    if (action.intent === 'doubt') return doubt(state, String(action.challengerId));
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as CheatState).winner;
  },
  score(state) {
    const gs = state.game.gameState as CheatState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
