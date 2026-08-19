import { createDeck, shuffleDeck } from '../deck';
import type { Card, TableCard, FreePlayPlayRule } from '../types';
import { DEFAULT_FREEPLAY_RULES } from '../types';
import type { FreePlayGameState } from '../gameTypes';
import { rankValue } from '../gameTypes';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

function rules(state: EngineState) {
  return { ...DEFAULT_FREEPLAY_RULES, ...(state.game.settings.freeplay ?? {}) };
}

function gs(state: EngineState): FreePlayGameState {
  return state.game.gameState as FreePlayGameState;
}

/** Is `card` a legal play given the top discard card and the play rule? */
function matchesRule(card: Card, top: Card | undefined, playRule: FreePlayPlayRule): boolean {
  if (!top) return true; // first play is always allowed
  switch (playRule) {
    case 'match-rank':
      return card.rank === top.rank;
    case 'match-suit':
      return card.suit === top.suit;
    case 'match-rank-or-suit':
      return card.rank === top.rank || card.suit === top.suit;
    default:
      return true; // 'any'
  }
}

/** Compute the winner (or null) for the current win condition. */
function winnerFor(winCondition: string, game: EngineState['game'], players: EngineState['players']): string | null {
  if (winCondition === 'never') return null;
  if (winCondition === 'empty-hand') {
    const empty = players.find((p) => p.hand.length === 0);
    return empty ? empty.id : null;
  }
  // 'most-table' / 'highest-total' — only when the deck is exhausted.
  if (game.deck.length !== 0) return null;
  const scored = players.map((p) => {
    const mine = game.tableCards.filter((c) => c.playedBy === p.id);
    const value =
      winCondition === 'most-table'
        ? mine.length
        : mine.reduce((sum, c) => sum + rankValue(c.rank) + 1, 0);
    return { id: p.id, value };
  });
  const max = Math.max(0, ...scored.map((s) => s.value));
  const leaders = scored.filter((s) => s.value === max);
  return leaders.length === 1 ? leaders[0].id : null;
}

/** Stamp `status: 'finished'` + winner onto a pending state when the game is won. */
function withWin(
  game: EngineState['game'],
  players: EngineState['players'],
  state: EngineState,
): { game: EngineState['game']; players: EngineState['players'] } {
  const current = gs(state);
  const winner = winnerFor(rules(state).winCondition, game, players);
  if (winner && !current.winner) {
    return {
      game: { ...game, status: 'finished', gameState: { ...(game.gameState as FreePlayGameState), winner } },
      players,
    };
  }
  return { game, players };
}

function requireTurn(state: EngineState, playerId: string): void {
  const player = findPlayer(state.players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (state.game.currentSeat !== player.seat) throw new EngineError('Not your turn');
}

export function drawCard(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const cur = gs(state);
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if (game.currentSeat !== player.seat) throw new EngineError('Not your turn');
  if (cur.drawsLeft <= 0) throw new EngineError('No draws left this turn');
  if (game.deck.length === 0) throw new EngineError('No cards remaining in deck');

  const card = game.deck[0];
  const next = {
    game: { ...game, deck: game.deck.slice(1), gameState: { ...cur, drawsLeft: cur.drawsLeft - 1 } },
    players: updatePlayerHand(players, playerId, [...player.hand, card]),
  };
  return withWin(next.game, next.players, state) as EngineState;
}

export function playCard(
  state: EngineState,
  playerId: string,
  cardId: string,
  playerName: string,
): EngineState {
  const { game, players } = state;
  requireTurn(state, playerId);
  const player = findPlayer(players, playerId)!;
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) throw new EngineError(`Card ${cardId} not found in player hand`);

  const topDiscard = game.discardPile[game.discardPile.length - 1];
  const playRule = rules(state).playRule;
  if (!matchesRule(card, topDiscard, playRule)) {
    const label =
      playRule === 'match-suit'
        ? 'matching suit'
        : playRule === 'match-rank'
          ? 'matching rank'
          : 'matching rank or suit';
    throw new EngineError(`Must play a ${label} card`);
  }

  const tableCard: TableCard = { ...card, playedBy: playerId, playedByName: playerName };
  const next = {
    game: { ...game, tableCards: [...game.tableCards, tableCard] },
    players: updatePlayerHand(players, playerId, removeCard(player.hand, cardId)),
  };
  return withWin(next.game, next.players, state) as EngineState;
}

export function discardCard(state: EngineState, playerId: string, cardId: string): EngineState {
  const { game, players } = state;
  requireTurn(state, playerId);
  const player = findPlayer(players, playerId)!;
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) throw new EngineError(`Card ${cardId} not found in player hand`);

  // Discarding ends your turn: advance the seat and reset the draw budget.
  const seats = orderedSeats(players);
  const nextSeatVal = nextSeat(seats, player.seat);
  const next = {
    game: {
      ...game,
      discardPile: [...game.discardPile, card],
      currentSeat: nextSeatVal,
      gameState: { drawsLeft: rules(state).drawCount, winner: gs(state).winner },
    },
    players: updatePlayerHand(players, playerId, removeCard(player.hand, cardId)),
  };
  return withWin(next.game, next.players, state) as EngineState;
}

export function pickupCard(state: EngineState, playerId: string, cardId: string): EngineState {
  const { game, players } = state;
  requireTurn(state, playerId);
  const player = findPlayer(players, playerId)!;
  const idx = game.tableCards.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new EngineError(`Card ${cardId} not found on table`);
  const tableCard = game.tableCards[idx];
  const { playedBy: _p, playedByName: _n, ...card } = tableCard;
  const next = {
    game: { ...game, tableCards: [...game.tableCards.slice(0, idx), ...game.tableCards.slice(idx + 1)] },
    players: updatePlayerHand(players, playerId, [...player.hand, card]),
  };
  return withWin(next.game, next.players, state) as EngineState;
}

export const freeplayGame: CardGame = {
  type: 'freeplay',
  config: GAME_CONFIGS.freeplay,
  family: 'shedding',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const r = rules(state);
    const deck = shuffleDeck(createDeck());
    const dealCount = game.settings.dealCount ?? 7;
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
        gameState: { drawsLeft: r.drawCount, winner: null },
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    switch (action.intent) {
      case 'draw':
        return drawCard(state, action.playerId!);
      case 'play':
        return playCard(state, action.playerId!, String(action.cardId), action.name ?? 'Unknown');
      case 'discard':
        return discardCard(state, action.playerId!, String(action.cardId));
      case 'pickup':
        return pickupCard(state, action.playerId!, String(action.cardId));
      default:
        throw new EngineError(`Unknown intent: ${action.intent}`);
    }
  },
  isTerminal(state) {
    return gs(state).winner !== null;
  },
  score(state) {
    const winner = gs(state).winner;
    return winner ? { [winner]: 1 } : {};
  },
};
