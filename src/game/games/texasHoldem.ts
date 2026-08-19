import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EnginePlayer, type EngineState } from '../state';
import { best5of7, compareHands } from '../primitives/poker';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

const STARTING_CHIPS = 100;
const SMALL_BLIND = 1;
const BIG_BLIND = 2;

type Phase = 'pre_flop' | 'flop' | 'turn' | 'river' | 'finished';

interface TexasHoldemState {
  phase: Phase;
  /** Single pot only — no side pots are tracked (see note below). */
  pot: number;
  chips: Record<string, number>;
  /** Chips each player has committed during the current betting round. */
  committed: Record<string, number>;
  /** Highest bet so far this round. */
  currentBet: number;
  /** Whose turn it is to act (null when everyone is all-in). */
  currentPlayerId: string | null;
  /** The dealer button (rotates each hand; fixed at seat 0 for a single hand). */
  dealerSeat: number;
  folded: Record<string, boolean>;
  allIn: Record<string, boolean>;
  acted: Record<string, boolean>;
  community: Card[];
  winners: string[];
}

function gs(state: EngineState): TexasHoldemState {
  return state.game.gameState as TexasHoldemState;
}

/** Next non-folded, non-all-in player clockwise of `afterSeat`. */
function findNextActor(
  players: EnginePlayer[],
  folded: Record<string, boolean>,
  allIn: Record<string, boolean>,
  afterSeat: number,
): EnginePlayer | null {
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  const n = sorted.length;
  if (n === 0) return null;
  let start = sorted.findIndex((p) => p.seat === afterSeat);
  if (start === -1) start = 0;
  for (let i = 1; i <= n; i++) {
    const p = sorted[(start + i) % n];
    if (!folded[p.id] && !allIn[p.id]) return p;
  }
  return null;
}

function isRoundComplete(players: EnginePlayer[], s: TexasHoldemState): boolean {
  for (const p of players) {
    if (s.folded[p.id] || s.allIn[p.id]) continue;
    if (!s.acted[p.id]) return false;
    if (s.committed[p.id] < s.currentBet) return false;
  }
  return true;
}

function showdown(state: EngineState, game: EngineState['game'], players: EnginePlayer[], s: TexasHoldemState): EngineState {
  const active = players.filter((p) => !s.folded[p.id]);
  const evaluated = active.map((p) => ({ id: p.id, ev: best5of7([...p.hand, ...s.community]) }));
  let best = evaluated[0];
  for (const e of evaluated) if (compareHands(e.ev, best.ev) > 0) best = e;
  const winnerIds = evaluated.filter((e) => compareHands(e.ev, best.ev) === 0).map((e) => e.id);

  const seatOrder = [...players].sort((a, b) => a.seat - b.seat).map((p) => p.id);
  const winners = seatOrder.filter((id) => winnerIds.includes(id));

  const pot = s.pot;
  const base = Math.floor(pot / winners.length);
  const remainder = pot - base * winners.length;
  const chips = { ...s.chips };
  winners.forEach((id, i) => {
    chips[id] += base + (i === 0 ? remainder : 0);
  });

  return {
    ...state,
    game: { ...game, status: 'finished', gameState: { ...s, phase: 'finished', pot: 0, winners, chips } },
  };
}

/** Deal community cards / reset for the next betting round, or go to showdown. */
function advancePhase(state: EngineState, game: EngineState['game'], players: EnginePlayer[], s: TexasHoldemState): EngineState {
  if (s.phase === 'river') return showdown(state, game, players, s);

  let deck = game.deck;
  const community = [...s.community];
  const dealCount = s.phase === 'pre_flop' ? 3 : 1;
  for (let i = 0; i < dealCount; i++) {
    if (deck.length === 0) throw new EngineError('Not enough cards left to deal the board');
    community.push(deck[0]);
    deck = deck.slice(1);
  }

  const nextPhase: Phase = s.phase === 'pre_flop' ? 'flop' : s.phase === 'flop' ? 'turn' : 'river';
  const committed = Object.fromEntries(players.map((p) => [p.id, 0]));
  const acted = Object.fromEntries(players.map((p) => [p.id, false]));
  const first = findNextActor(players, s.folded, s.allIn, s.dealerSeat);
  const nextGS: TexasHoldemState = {
    ...s,
    phase: nextPhase,
    community,
    currentBet: 0,
    committed,
    acted,
    currentPlayerId: first ? first.id : null,
  };
  const next: EngineState = {
    ...state,
    game: { ...game, deck, currentSeat: first ? first.seat : game.currentSeat, gameState: nextGS },
  };

  // If no one can act (everyone all-in), cascade through the remaining streets.
  if (nextGS.currentPlayerId === null) return advancePhase(next, next.game, next.players, gs(next));
  return next;
}

export const texasHoldemGame: CardGame = {
  type: 'texas_holdem',
  config: GAME_CONFIGS.texas_holdem,
  family: 'betting',
  deck: {},

  setup(state) {
    const { game, players } = state;
    if (players.length < 2) throw new EngineError("Texas Hold'em needs at least 2 players");
    if (players.length > 10) throw new EngineError("Texas Hold'em supports at most 10 players");

    const deck = shuffleDeck(createDeck());
    let idx = 0;
    const dealt = players.map((p) => {
      const hand = deck.slice(idx, idx + 2);
      idx += 2;
      return { ...p, hand };
    });

    const chips = Object.fromEntries(players.map((p) => [p.id, STARTING_CHIPS]));
    const committed = Object.fromEntries(players.map((p) => [p.id, 0]));

    // Small blind (seat 0) and big blind (seat 1) are auto-posted.
    const sb = players.find((p) => p.seat === 0)!;
    const bb = players.find((p) => p.seat === 1)!;
    chips[sb.id] -= SMALL_BLIND;
    chips[bb.id] -= BIG_BLIND;
    committed[sb.id] = SMALL_BLIND;
    committed[bb.id] = BIG_BLIND;

    const pot = SMALL_BLIND + BIG_BLIND;
    const first = findNextActor(players, {}, {}, 1 /* left of the big blind */);

    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(idx),
        tableCards: [],
        discardPile: [],
        currentSeat: first ? first.seat : 0,
        gameState: {
          phase: 'pre_flop',
          pot,
          chips,
          committed,
          currentBet: BIG_BLIND,
          currentPlayerId: first ? first.id : null,
          dealerSeat: 0,
          folded: {},
          allIn: {},
          acted: {},
          community: [],
          winners: [],
        } satisfies TexasHoldemState,
      },
      players: dealt,
    };
  },

  reduce(state, action) {
    const { game, players } = state;
    const s = gs(state);
    const playerId = action.playerId!;
    const player = findPlayer(players, playerId);
    if (!player) throw new EngineError('Player not found');
    if (game.status !== 'playing' || s.phase === 'finished') throw new EngineError('Game is finished');
    if (s.currentPlayerId !== playerId) throw new EngineError('Not your turn');

    const chips = { ...s.chips };
    const committed = { ...s.committed };
    const folded = { ...s.folded };
    const allIn = { ...s.allIn };
    const acted = { ...s.acted };
    let currentBet = s.currentBet;
    let pot = s.pot;

    if (action.intent === 'fold') {
      folded[playerId] = true;
      acted[playerId] = true;
    } else if (action.intent === 'check') {
      if (committed[playerId] < currentBet) throw new EngineError('Cannot check with a bet to call');
      acted[playerId] = true;
    } else if (action.intent === 'call') {
      const toCall = currentBet - committed[playerId];
      if (toCall > 0) {
        const pay = Math.min(toCall, chips[playerId]);
        chips[playerId] -= pay;
        committed[playerId] += pay;
        pot += pay;
        if (chips[playerId] === 0) allIn[playerId] = true;
      }
      acted[playerId] = true;
    } else if (action.intent === 'raise') {
      const amount = Number(action.amount);
      if (!Number.isFinite(amount) || amount < 1) throw new EngineError('Raise amount must be positive');
      // Minimum raise = the current bet (or the big blind on an unopened street).
      const minRaise = currentBet > 0 ? currentBet : BIG_BLIND;
      if (amount < minRaise) throw new EngineError(`Minimum raise is ${minRaise}`);
      const target = currentBet + amount;
      const toAdd = target - committed[playerId];
      if (toAdd > chips[playerId]) throw new EngineError('Not enough chips to raise');
      chips[playerId] -= toAdd;
      committed[playerId] = target;
      pot += toAdd;
      currentBet = target;
      acted[playerId] = true;
      for (const p of players) {
        if (p.id !== playerId && !folded[p.id] && !allIn[p.id]) acted[p.id] = false;
      }
    } else {
      throw new EngineError(`Unknown intent: ${action.intent}`);
    }

    const nextGS: TexasHoldemState = { ...s, chips, committed, folded, allIn, acted, currentBet, pot };

    // A fold that leaves a single player awards them the pot immediately.
    const remaining = players.filter((p) => !nextGS.folded[p.id]);
    if (remaining.length === 1) {
      const winner = remaining[0];
      return {
        ...state,
        game: {
          ...game,
          status: 'finished',
          currentSeat: winner.seat,
          gameState: { ...nextGS, phase: 'finished', pot: 0, winners: [winner.id], chips: { ...chips, [winner.id]: chips[winner.id] + pot } },
        },
      };
    }

    if (isRoundComplete(players, nextGS)) return advancePhase(state, game, players, nextGS);

    const next = findNextActor(players, nextGS.folded, nextGS.allIn, player.seat);
    return {
      ...state,
      game: {
        ...game,
        currentSeat: next ? next.seat : game.currentSeat,
        gameState: { ...nextGS, currentPlayerId: next ? next.id : null },
      },
    };
  },

  isTerminal(state) {
    return gs(state).phase === 'finished';
  },

  score(state) {
    return { ...gs(state).chips };
  },
};
