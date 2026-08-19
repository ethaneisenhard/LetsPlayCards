import { createDeck, shuffleDeck } from '../deck';
import { compareCards, type WarGameState } from '../gameTypes';
import { EngineError, findPlayer, updatePlayerHand, type EngineState } from '../state';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export function warFlip(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as WarGameState;

  if (gs.phase === 'reveal') throw new EngineError('Waiting for winner to collect');
  if (gs.roundCards[playerId]) throw new EngineError('Already played this round');

  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (player.hand.length === 0) throw new EngineError('No cards in hand');

  const n = gs.phase === 'war' ? Math.min(4, player.hand.length) : 1;
  const played = player.hand.slice(0, n);
  const remaining = player.hand.slice(n);

  const nextPlayers = updatePlayerHand(players, playerId, remaining);
  const roundCards = { ...gs.roundCards, [playerId]: played };

  if (Object.keys(roundCards).length < players.length) {
    return { game: { ...game, gameState: { ...gs, roundCards } }, players: nextPlayers };
  }

  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const p1 = sorted[0];
  const p2 = sorted[1];
  const p1c = roundCards[p1.id][roundCards[p1.id].length - 1];
  const p2c = roundCards[p2.id][roundCards[p2.id].length - 1];
  const cmp = compareCards(p1c, p2c);

  if (cmp === 'tie') {
    const cardsAtStake = [...(gs.cardsAtStake ?? []), ...roundCards[p1.id], ...roundCards[p2.id]];
    return {
      game: { ...game, gameState: { ...gs, phase: 'war', roundCards: {}, cardsAtStake, roundWinnerId: null } },
      players: nextPlayers,
    };
  }

  const winnerId = cmp === 'a' ? p1.id : p2.id;
  return {
    game: { ...game, gameState: { ...gs, phase: 'reveal', roundCards, roundWinnerId: winnerId } },
    players: nextPlayers,
  };
}

export function warCollect(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as WarGameState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (gs.roundWinnerId !== playerId) throw new EngineError('You did not win this round');

  const allWon = [...(gs.cardsAtStake ?? []), ...Object.values(gs.roundCards ?? {}).flat()];
  const newHand = [...player.hand, ...shuffleDeck(allWon)];
  const loser = players.find((p) => p.id !== playerId);
  const isGameOver = (loser?.hand.length ?? 0) === 0;

  return {
    game: {
      ...game,
      status: isGameOver ? 'finished' : 'playing',
      gameState: {
        ...gs,
        phase: isGameOver ? 'finished' : 'battle',
        roundCards: {},
        cardsAtStake: [],
        roundWinnerId: null,
        lastWinnerSeat: player.seat,
        winner: isGameOver ? playerId : null,
        lastTiedCards: null,
      },
    },
    players: updatePlayerHand(players, playerId, newHand),
  };
}

export const warGame: CardGame = {
  type: 'war',
  config: GAME_CONFIGS.war,
  family: 'compare',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealCount = Math.floor(52 / players.length);
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
          phase: 'battle',
          roundCards: {},
          cardsAtStake: [],
          roundWinnerId: null,
          lastWinnerSeat: null,
          winner: null,
          lastTiedCards: null,
        },
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    if (action.intent === 'war-play') return warFlip(state, action.playerId!);
    if (action.intent === 'war-collect') return warCollect(state, action.playerId!);
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    const gs = state.game.gameState as WarGameState;
    return gs.phase === 'finished' || !!gs.winner;
  },
  score(state) {
    const gs = state.game.gameState as WarGameState;
    return gs.winner ? { [gs.winner]: 1 } : {};
  },
};
