import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, type EnginePlayer, type EngineState } from '../state';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

const STARTING_CHIPS = 100;

type Side = 'player' | 'banker' | 'tie';

interface BaccaratState {
  phase: 'betting' | 'resolved';
  chips: Record<string, number>;
  /** Each player's single wager. */
  bets: Record<string, { side: Side; amount: number }>;
  playerHand: Card[];
  bankerHand: Card[];
  playerTotal: number;
  bankerTotal: number;
  result: Side | null;
  /** Net profit paid out to each player (0 on a loss). */
  payouts: Record<string, number>;
}

function gs(state: EngineState): BaccaratState {
  return state.game.gameState as BaccaratState;
}

/** A=1, 2–9 face value, 10/J/Q/K = 0. */
export function baccaratValue(card: Card): number {
  if (card.rank === 'A') return 1;
  if (card.rank === '10' || card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 0;
  return Number(card.rank);
}

function handTotal(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + baccaratValue(c), 0) % 10;
}

/** Player draws a 3rd card on 0–5 (stands on 6–7, naturals 8–9 never draw). */
function playerShouldDraw(playerTotal: number, bankerTotal: number): boolean {
  if (playerTotal >= 8 || bankerTotal >= 8) return false;
  return playerTotal <= 5;
}

/** Banker's 3rd-card rule (depends on banker total + whether/what the player drew). */
function bankerShouldDraw(bankerTotal: number, playerDrew: boolean, playerThird: number | null): boolean {
  if (!playerDrew) return bankerTotal <= 5;
  const p3 = playerThird!;
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return p3 !== 8;
  if (bankerTotal === 4) return p3 >= 2 && p3 <= 7;
  if (bankerTotal === 5) return p3 >= 4 && p3 <= 7;
  if (bankerTotal === 6) return p3 === 6 || p3 === 7;
  return false; // 7 stands
}

function resolve(state: EngineState, game: EngineState['game'], players: EnginePlayer[], s: BaccaratState): EngineState {
  let deck = game.deck;
  let playerHand = [...s.playerHand];
  let bankerHand = [...s.bankerHand];
  const playerTotal = handTotal(playerHand);
  const bankerTotal = handTotal(bankerHand);

  const natural = playerTotal >= 8 || bankerTotal >= 8;
  let playerDrew = false;
  let playerThird: number | null = null;
  if (!natural && playerTotal <= 5) {
    if (deck.length === 0) throw new EngineError('Not enough cards left');
    const card = deck[0];
    deck = deck.slice(1);
    playerHand = [...playerHand, card];
    playerDrew = true;
    playerThird = baccaratValue(card);
  }

  if (!natural && bankerShouldDraw(bankerTotal, playerDrew, playerThird)) {
    if (deck.length === 0) throw new EngineError('Not enough cards left');
    const card = deck[0];
    deck = deck.slice(1);
    bankerHand = [...bankerHand, card];
  }

  const finalPlayer = handTotal(playerHand);
  const finalBanker = handTotal(bankerHand);
  const result: Side = finalPlayer > finalBanker ? 'player' : finalBanker > finalPlayer ? 'banker' : 'tie';

  // Payouts: player 1:1, banker 1:1 (5% commission ignored), tie 8:1.
  // Player/banker wagers lose on a tie (simplification; real baccarat pushes them).
  const odds: Record<Side, number> = { player: 1, banker: 1, tie: 8 };
  const chips = { ...s.chips };
  const payouts: Record<string, number> = {};
  for (const [id, bet] of Object.entries(s.bets)) {
    if (bet.side === result) {
      const profit = bet.amount * odds[bet.side];
      chips[id] += bet.amount + profit;
      payouts[id] = profit;
    } else {
      payouts[id] = 0;
    }
  }

  return {
    ...state,
    game: {
      ...game,
      status: 'finished',
      deck,
      gameState: {
        ...s,
        phase: 'resolved',
        chips,
        playerHand,
        bankerHand,
        playerTotal: finalPlayer,
        bankerTotal: finalBanker,
        result,
        payouts,
      },
    },
  };
}

export const baccaratGame: CardGame = {
  type: 'baccarat',
  config: GAME_CONFIGS.baccarat,
  family: 'betting',
  deck: {},

  setup(state) {
    const { game, players } = state;
    if (players.length < 2) throw new EngineError('Baccarat needs at least 2 players');
    if (players.length > 14) throw new EngineError('Baccarat supports at most 14 players');

    const deck = shuffleDeck(createDeck());
    const playerHand = deck.slice(0, 2);
    const bankerHand = deck.slice(2, 4);

    return {
      game: {
        ...game,
        status: 'playing',
        deck: deck.slice(4),
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'betting',
          chips: Object.fromEntries(players.map((p) => [p.id, STARTING_CHIPS])),
          bets: {},
          playerHand,
          bankerHand,
          playerTotal: handTotal(playerHand),
          bankerTotal: handTotal(bankerHand),
          result: null,
          payouts: {},
        } satisfies BaccaratState,
      },
      players,
    };
  },

  reduce(state, action) {
    const { game, players } = state;
    const s = gs(state);
    const playerId = action.playerId!;
    const player = findPlayer(players, playerId);
    if (!player) throw new EngineError('Player not found');
    if (s.phase !== 'betting') throw new EngineError('Betting is closed');
    if (action.intent !== 'bet') throw new EngineError(`Unknown intent: ${action.intent}`);
    if (s.bets[playerId]) throw new EngineError('You have already bet');

    const side = action.side as Side;
    if (side !== 'player' && side !== 'banker' && side !== 'tie') throw new EngineError('Invalid side');
    const amount = Number(action.amount);
    if (!Number.isInteger(amount) || amount <= 0) throw new EngineError('Bet amount must be a positive integer');
    if (amount > s.chips[playerId]) throw new EngineError('Not enough chips');

    const chips = { ...s.chips, [playerId]: s.chips[playerId] - amount };
    const bets = { ...s.bets, [playerId]: { side, amount } };
    const nextGS: BaccaratState = { ...s, chips, bets };

    // Everyone has bet once → resolve the hand automatically.
    if (Object.keys(bets).length === players.length) return resolve(state, game, players, nextGS);

    return { ...state, game: { ...game, gameState: nextGS } };
  },

  isTerminal(state) {
    return gs(state).phase === 'resolved';
  },

  score(state) {
    return { ...gs(state).chips };
  },
};
