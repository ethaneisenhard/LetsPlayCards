import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

export interface CassinoBuild {
  id: string;
  cards: Card[];
  value: number;
  ownerId: string;
}

export interface CassinoState {
  /** Loose cards face-up on the table. */
  table: Card[];
  /** Combined builds awaiting capture by their owner. */
  builds: CassinoBuild[];
  /** Captured piles, one per player. */
  captures: Record<string, Card[]>;
  /** Cumulative score across rounds. */
  scores: Record<string, number>;
  winner: string | null;
}

const HAND_SIZE = 4;
const TABLE_SIZE = 4;
const WIN_SCORE = 21;

/** Capture value: A=1, 2–10 face value, face cards cannot be summed. */
export function captureValue(rank: string): number | null {
  if (rank === 'A') return 1;
  const n = Number(rank);
  if (Number.isInteger(n) && n >= 2 && n <= 10) return n;
  return null;
}

/** Points earned from a round's captures: most cards, most spades, big/little cassino, aces. */
export function scoreRound(captures: Record<string, Card[]>): Record<string, number> {
  const ids = Object.keys(captures);
  const points: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));

  const counts = ids.map((id) => captures[id].length);
  const maxCards = Math.max(0, ...counts);
  const cardLeaders = ids.filter((id) => captures[id].length === maxCards);
  if (maxCards > 0 && cardLeaders.length === 1) points[cardLeaders[0]] += 3;

  const spades = ids.map((id) => captures[id].filter((c) => c.suit === 'spades').length);
  const maxSpades = Math.max(0, ...spades);
  const spadeLeaders = ids.filter((id) => captures[id].filter((c) => c.suit === 'spades').length === maxSpades);
  if (maxSpades > 0 && spadeLeaders.length === 1) points[spadeLeaders[0]] += 1;

  for (const id of ids) {
    if (captures[id].some((c) => c.rank === '10' && c.suit === 'diamonds')) points[id] += 2;
    if (captures[id].some((c) => c.rank === '2' && c.suit === 'spades')) points[id] += 1;
    points[id] += captures[id].filter((c) => c.rank === 'A').length;
  }
  return points;
}

export const cassinoGame: CardGame = {
  type: 'cassino',
  config: GAME_CONFIGS.cassino,
  family: 'collecting',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + HAND_SIZE);
      idx += HAND_SIZE;
      return { ...p, hand };
    });
    const table = deck.slice(idx, idx + TABLE_SIZE);
    idx += TABLE_SIZE;
    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          table,
          builds: [],
          captures: Object.fromEntries(players.map((p) => [p.id, []])),
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
        } satisfies CassinoState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as CassinoState;
    const player = findPlayer(players, String(action.playerId));
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    const card = player.hand.find((c) => c.id === String(action.cardId));
    if (!card) throw new EngineError('Card not in hand');

    let table = [...gs.table];
    let builds = [...gs.builds];
    let captures = { ...gs.captures };
    let newHand = player.hand;

    if (action.intent === 'capture') {
      const targetIds = (Array.isArray(action.targetIds) ? action.targetIds : []).map(String);
      if (targetIds.length === 0) throw new EngineError('Choose cards to capture');
      const targets = targetIds.map((id) => table.find((t) => t.id === id));
      if (targets.some((t) => !t)) throw new EngineError('Target card not on table');
      const targetCards = targets as Card[];

      const v = captureValue(card.rank);
      let legal = false;
      if (v === null) {
        legal = targetCards.length === 1 && targetCards[0].rank === card.rank;
      } else if (targetCards.length === 1 && targetCards[0].rank === card.rank) {
        legal = true;
      } else {
        const allNumber = targetCards.every((t) => captureValue(t.rank) !== null);
        const sum = targetCards.reduce((acc, t) => acc + (captureValue(t.rank) ?? 0), 0);
        legal = allNumber && sum === v;
      }
      if (!legal) throw new EngineError('Illegal capture');

      const capturedSet = new Set(targetIds);
      table = table.filter((t) => !capturedSet.has(t.id));
      captures = { ...captures, [player.id]: [...(captures[player.id] ?? []), ...targetCards, card] };
      newHand = removeCard(player.hand, card.id);
    } else if (action.intent === 'build') {
      const targetIds = (Array.isArray(action.targetIds) ? action.targetIds : []).map(String);
      const v = captureValue(card.rank);
      if (v === null) throw new EngineError('Face cards cannot build');
      if (targetIds.length < 2) throw new EngineError('A build needs at least two table cards');
      const targets = targetIds.map((id) => table.find((t) => t.id === id));
      if (targets.some((t) => !t)) throw new EngineError('Target card not on table');
      const targetCards = targets as Card[];
      const allNumber = targetCards.every((t) => captureValue(t.rank) !== null);
      const sum = targetCards.reduce((acc, t) => acc + (captureValue(t.rank) ?? 0), 0);
      if (!allNumber || sum !== v) throw new EngineError('Build must sum to the played card');

      const capturedSet = new Set(targetIds);
      table = table.filter((t) => !capturedSet.has(t.id));
      builds = [
        ...builds,
        { id: `build-${builds.length}-${card.id}`, cards: [...targetCards, card], value: v, ownerId: player.id },
      ];
      newHand = removeCard(player.hand, card.id);
    } else if (action.intent === 'trail') {
      table = [...table, card];
      newHand = removeCard(player.hand, card.id);
    } else if (action.intent === 'capture-build') {
      const build = builds.find((b) => b.id === String(action.buildId));
      if (!build) throw new EngineError('Build not found');
      if (build.ownerId !== player.id) throw new EngineError('Only the build owner can capture it');
      const v = captureValue(card.rank);
      if (v === null || v !== build.value) throw new EngineError('Card must match the build value');
      captures = { ...captures, [player.id]: [...(captures[player.id] ?? []), ...build.cards, card] };
      builds = builds.filter((b) => b.id !== build.id);
      newHand = removeCard(player.hand, card.id);
    } else {
      throw new EngineError(`Unknown intent: ${action.intent}`);
    }

    // Replenish to a 4-card hand while stock remains.
    let deck = [...game.deck];
    if (deck.length > 0) {
      const [drawn, ...rest] = deck;
      deck = rest;
      newHand = [...newHand, drawn];
    }

    const allHandsEmpty = players.every((p) => (p.id === player.id ? newHand : p.hand).length === 0);
    if (deck.length === 0 && allHandsEmpty) {
      const roundPoints = scoreRound(captures);
      const scores: Record<string, number> = {};
      for (const p of players) scores[p.id] = (gs.scores[p.id] ?? 0) + (roundPoints[p.id] ?? 0);
      const leader = players
        .map((p) => ({ id: p.id, score: scores[p.id] }))
        .sort((a, b) => b.score - a.score)[0];

      if (leader.score >= WIN_SCORE) {
        return {
          game: {
            ...game,
            status: 'finished',
            deck,
            gameState: { ...gs, scores, winner: leader.id } satisfies CassinoState,
          },
          players: updatePlayerHand(players, player.id, newHand),
        };
      }

      const fresh = shuffleDeck(createDeck());
      let idx = 0;
      const dealt = players.map((p) => {
        const hand = fresh.slice(idx, idx + HAND_SIZE);
        idx += HAND_SIZE;
        return { ...p, hand };
      });
      const table2 = fresh.slice(idx, idx + TABLE_SIZE);
      idx += TABLE_SIZE;
      return {
        game: {
          ...game,
          status: 'playing',
          deck: fresh.slice(idx),
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: {
            table: table2,
            builds: [],
            captures: Object.fromEntries(players.map((p) => [p.id, []])),
            scores,
            winner: null,
          } satisfies CassinoState,
        },
        players: dealt,
      };
    }

    return {
      game: {
        ...game,
        deck,
        currentSeat: nextSeat(orderedSeats(players), player.seat),
        gameState: { ...gs, table, builds, captures } satisfies CassinoState,
      },
      players: updatePlayerHand(players, player.id, newHand),
    };
  },
  isTerminal(state) {
    return !!(state.game.gameState as CassinoState).winner;
  },
  score(state) {
    return (state.game.gameState as CassinoState).scores;
  },
};
