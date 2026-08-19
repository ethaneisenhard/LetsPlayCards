import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EnginePlayer, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface CribbageState {
  phase: 'discard' | 'pegging' | 'counting' | 'finished';
  dealerId: string;
  crib: Card[];
  starter: Card | null;
  peggingPlays: { playerId: string; card: Card }[];
  pegTotal: number;
  pegPassed: string[];
  countQueue: { playerId: string; source: 'hand' | 'crib' }[];
  scores: Record<string, number>;
  winner: string | null;
}

const WIN = 121;

const seatOf = (players: EnginePlayer[], id: string): number => players.find((p) => p.id === id)!.seat;

// ─── Cribbage scoring helpers ────────────────────────────────────────────────

/** Pegging / counting card value: A=1, 2-10 face, J/Q/K=10. */
export function cribValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return Number(card.rank);
}

/** Rank order for runs: A=1 … 10=10, J=11, Q=12, K=13. */
export function cribRank(card: Card): number {
  const map: Record<string, number> = { A: 1, J: 11, Q: 12, K: 13 };
  return map[card.rank] ?? Number(card.rank);
}

/** 2 points for every combination summing to 15. */
export function countFifteens(cards: Card[]): number {
  const vals = cards.map(cribValue);
  let count = 0;
  for (let mask = 1; mask < 1 << vals.length; mask++) {
    let sum = 0;
    for (let i = 0; i < vals.length; i++) if (mask & (1 << i)) sum += vals[i];
    if (sum === 15) count++;
  }
  return count * 2;
}

/** Pair = 2, three of a kind = 6, four = 12 (n * (n - 1)). */
export function countPairs(cards: Card[]): number {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  let pts = 0;
  for (const n of counts.values()) pts += n * (n - 1);
  return pts;
}

/** Longest consecutive run of distinct ranks, times multiplicity. */
export function countRuns(cards: Card[]): number {
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(cribRank(c), (counts.get(cribRank(c)) ?? 0) + 1);
  const ranks = [...counts.keys()].sort((a, b) => a - b);
  let bestLen = 0;
  let bestStart = 0;
  for (let i = 0; i < ranks.length; i++) {
    let j = i;
    while (j + 1 < ranks.length && ranks[j + 1] === ranks[j] + 1) j++;
    if (j - i + 1 > bestLen) {
      bestLen = j - i + 1;
      bestStart = i;
    }
  }
  if (bestLen < 3) return 0;
  let mult = 1;
  for (let k = bestStart; k < bestStart + bestLen; k++) mult *= counts.get(ranks[k])!;
  return bestLen * mult;
}

/** Flush: 4 (or 5 with starter) for a hand; crib needs all 5 for 5. */
export function countFlush(hand: Card[], starter: Card | null, isCrib = false): number {
  if (!starter) return 0;
  if (isCrib) {
    if (hand.length === 0) return 0;
    const all = [...hand, starter];
    return all.every((c) => c.suit === all[0].suit) ? 5 : 0;
  }
  if (hand.length >= 4 && hand.every((c) => c.suit === hand[0].suit)) {
    return starter.suit === hand[0].suit ? 5 : 4;
  }
  return 0;
}

/** Nobs: a Jack whose suit matches the starter. */
export function countNobs(cards: Card[], starter: Card | null): number {
  if (!starter) return 0;
  return cards.some((c) => c.rank === 'J' && c.suit === starter.suit) ? 1 : 0;
}

/** Total points for a hand/crib combined with the starter. */
export function scoreHand(cards: Card[], starter: Card | null, isCrib = false): number {
  const all = starter ? [...cards, starter] : cards;
  return (
    countFifteens(all) +
    countPairs(all) +
    countRuns(all) +
    countFlush(cards, starter, isCrib) +
    countNobs(cards, starter)
  );
}

function isRun(vals: number[]): boolean {
  const set = new Set(vals);
  if (set.size !== vals.length) return false;
  const sorted = [...set].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] === sorted.length - 1;
}

/** Points earned by the most-recently-played card in a pegging sequence. */
export function pegScore(plays: Card[]): number {
  const total = plays.reduce((s, c) => s + cribValue(c), 0);
  let pts = 0;
  if (total === 15) pts += 2;
  if (total === 31) pts += 2;
  const ranks = plays.map((c) => c.rank);
  let pairCount = 1;
  for (let i = ranks.length - 2; i >= 0 && ranks[i] === ranks[ranks.length - 1]; i--) pairCount++;
  if (pairCount >= 2) pts += pairCount * (pairCount - 1);
  const vals = plays.map(cribRank);
  for (let n = Math.min(7, vals.length); n >= 3; n--) {
    if (isRun(vals.slice(vals.length - n))) {
      pts += n;
      break;
    }
  }
  return pts;
}

// ─── Dealing ─────────────────────────────────────────────────────────────────

function dealHand(players: EnginePlayer[]): { players: EnginePlayer[]; starter: Card } {
  const deck = shuffleDeck(createDeck());
  const handSize = players.length === 2 ? 6 : 5;
  const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * handSize, (i + 1) * handSize) }));
  return { players: dealt, starter: deck[players.length * handSize] };
}

function buildCountQueue(players: EnginePlayer[], dealerId: string): { playerId: string; source: 'hand' | 'crib' }[] {
  const seats = orderedSeats(players);
  const dealerSeat = seatOf(players, dealerId);
  const queue: { playerId: string; source: 'hand' | 'crib' }[] = [];
  for (let step = 1; step < seats.length; step++) {
    const seat = nextSeat(seats, dealerSeat, step);
    const p = players.find((x) => x.seat === seat)!;
    queue.push({ playerId: p.id, source: 'hand' });
  }
  queue.push({ playerId: dealerId, source: 'hand' });
  queue.push({ playerId: dealerId, source: 'crib' });
  return queue;
}

function nextPegSeat(players: EnginePlayer[], seats: number[], fromSeat: number, passed: string[]): number {
  for (let step = 1; step <= seats.length; step++) {
    const seat = nextSeat(seats, fromSeat, step);
    const p = players.find((x) => x.seat === seat)!;
    if (p.hand.length > 0 && !passed.includes(p.id)) return seat;
  }
  return fromSeat;
}

// ─── Game module ─────────────────────────────────────────────────────────────

export const cribbageGame: CardGame = {
  type: 'cribbage',
  config: GAME_CONFIGS.cribbage,
  family: 'unique',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const dealer = players.find((p) => p.seat === 0) ?? players[0];
    const { players: dealt, starter } = dealHand(players);
    const seats = orderedSeats(players);
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: nextSeat(seats, dealer.seat),
        gameState: {
          phase: 'discard',
          dealerId: dealer.id,
          crib: [],
          starter,
          peggingPlays: [],
          pegTotal: 0,
          pegPassed: [],
          countQueue: [],
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          winner: null,
        } satisfies CribbageState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as CribbageState;
    const seats = orderedSeats(players);

    if (action.intent === 'discard-to-crib') {
      if (gs.phase !== 'discard') throw new EngineError('Not discarding');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const raw = Array.isArray(action.cards) ? (action.cards as unknown[]).map(String) : [];
      if (raw.length !== 2 || new Set(raw).size !== 2) throw new EngineError('Discard exactly 2 distinct cards');
      for (const id of raw) if (!player.hand.some((c) => c.id === id)) throw new EngineError('Card not in hand');
      let hand = player.hand;
      for (const id of raw) hand = removeCard(hand, id);
      const newPlayers = updatePlayerHand(players, player.id, hand);
      const crib = [...gs.crib, ...raw.map((id) => player.hand.find((c) => c.id === id)!)];
      const target = (players.length === 2 ? 6 : 5) - 2;
      const allDiscarded = newPlayers.every((p) => p.hand.length === target);
      if (allDiscarded) {
        return {
          game: {
            ...game,
            currentSeat: nextSeat(seats, seatOf(players, gs.dealerId)),
            gameState: { ...gs, crib, phase: 'pegging', peggingPlays: [], pegTotal: 0, pegPassed: [] },
          },
          players: newPlayers,
        };
      }
      return {
        game: { ...game, currentSeat: nextSeat(seats, player.seat), gameState: { ...gs, crib } },
        players: newPlayers,
      };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'pegging') throw new EngineError('Not pegging');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      if (cribValue(card) + gs.pegTotal > 31) throw new EngineError('Cannot exceed 31');

      const newPlayers = updatePlayerHand(players, player.id, removeCard(player.hand, card.id));
      const newPlays = [...gs.peggingPlays, { playerId: player.id, card }];
      const newTotal = gs.pegTotal + cribValue(card);
      const scores = { ...gs.scores };
      scores[player.id] += pegScore(newPlays.map((p) => p.card));

      const allOut = newPlayers.every((p) => p.hand.length === 0);
      if (allOut) {
        scores[player.id] += 1; // 1 for last card
        return {
          game: {
            ...game,
            currentSeat: player.seat,
            gameState: {
              ...gs,
              phase: 'counting',
              countQueue: buildCountQueue(newPlayers, gs.dealerId),
              peggingPlays: [],
              pegTotal: 0,
              pegPassed: [],
              scores,
            },
          },
          players: newPlayers,
        };
      }

      const others = newPlayers.filter((p) => p.id !== player.id && !gs.pegPassed.includes(p.id));
      const anyoneCanPlay = others.some((p) => p.hand.some((c) => cribValue(c) <= 31 - newTotal));

      if (newTotal === 31) {
        return {
          game: {
            ...game,
            currentSeat: nextPegSeat(newPlayers, seats, player.seat, []),
            gameState: { ...gs, peggingPlays: [], pegTotal: 0, pegPassed: [], scores },
          },
          players: newPlayers,
        };
      }
      if (!anyoneCanPlay) {
        scores[player.id] += 1; // 1 for go
        return {
          game: {
            ...game,
            currentSeat: nextPegSeat(newPlayers, seats, player.seat, []),
            gameState: { ...gs, peggingPlays: [], pegTotal: 0, pegPassed: [], scores },
          },
          players: newPlayers,
        };
      }
      return {
        game: {
          ...game,
          currentSeat: nextPegSeat(newPlayers, seats, player.seat, gs.pegPassed),
          gameState: { ...gs, peggingPlays: newPlays, pegTotal: newTotal, scores },
        },
        players: newPlayers,
      };
    }

    if (action.intent === 'go') {
      if (gs.phase !== 'pegging') throw new EngineError('Not pegging');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      if (player.hand.some((c) => cribValue(c) <= 31 - gs.pegTotal)) {
        throw new EngineError('You can play a card');
      }
      const pegPassed = [...new Set([...gs.pegPassed, player.id])];
      const lastPlayed = gs.peggingPlays.length ? gs.peggingPlays[gs.peggingPlays.length - 1].playerId : null;
      const others = players.filter((p) => p.id !== lastPlayed);
      const sequenceOver = others.every((p) => p.hand.length === 0 || pegPassed.includes(p.id));
      if (sequenceOver && lastPlayed) {
        const scores = { ...gs.scores };
        scores[lastPlayed] += 1; // 1 for go
        return {
          game: {
            ...game,
            currentSeat: nextPegSeat(players, seats, seatOf(players, lastPlayed), []),
            gameState: { ...gs, peggingPlays: [], pegTotal: 0, pegPassed: [], scores },
          },
          players,
        };
      }
      return {
        game: {
          ...game,
          currentSeat: nextPegSeat(players, seats, player.seat, pegPassed),
          gameState: { ...gs, pegPassed },
        },
        players,
      };
    }

    if (action.intent === 'count') {
      if (gs.phase !== 'counting') throw new EngineError('Not counting');
      const current = gs.countQueue[0];
      if (!current) throw new EngineError('Nothing to count');
      if (action.playerId && action.playerId !== current.playerId) throw new EngineError('Not your count');
      const scores = { ...gs.scores };
      const cards = current.source === 'crib' ? gs.crib : (findPlayer(players, current.playerId)?.hand ?? []);
      scores[current.playerId] += scoreHand(cards, gs.starter, current.source === 'crib');
      const queue = gs.countQueue.slice(1);

      if (queue.length > 0) {
        return { game: { ...game, gameState: { ...gs, countQueue: queue, scores } }, players };
      }

      const over = Object.entries(scores).find(([, s]) => s >= WIN);
      if (over) {
        return {
          game: {
            ...game,
            status: 'finished',
            gameState: { ...gs, phase: 'finished', winner: over[0], countQueue: [], scores },
          },
          players,
        };
      }

      const newDealerSeat = nextSeat(seats, seatOf(players, gs.dealerId));
      const newDealerId = players.find((p) => p.seat === newDealerSeat)!.id;
      const { players: redealt, starter } = dealHand(players);
      return {
        game: {
          ...game,
          currentSeat: nextSeat(seats, newDealerSeat),
          gameState: {
            ...gs,
            phase: 'discard',
            dealerId: newDealerId,
            crib: [],
            starter,
            peggingPlays: [],
            pegTotal: 0,
            pegPassed: [],
            countQueue: [],
            scores,
          },
        },
        players: redealt,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as CribbageState).phase === 'finished';
  },
  score(state) {
    return (state.game.gameState as CribbageState).scores;
  },
};
