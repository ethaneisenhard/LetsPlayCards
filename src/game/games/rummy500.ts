import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EnginePlayer, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import { rankValue } from '../gameTypes';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface TableMeld {
  id: string;
  kind: 'set' | 'run';
  cards: Card[];
}

interface Rummy500State {
  melds: TableMeld[];
  scores: Record<string, number>;
  /** Cards each player has melded or laid off, for end-of-hand scoring. */
  playerMelded: Record<string, Card[]>;
  winner: string | null;
  hasDrawn: boolean;
}

const WIN_SCORE = 500;

/** Rummy 500 point value: A=15, face=10, others face value. */
export function rummyCardValue(card: Card): number {
  if (card.rank === 'A') return 15;
  if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') return 10;
  return rankValue(card.rank) + 2; // 2..10
}

function isConsecutive(vals: number[]): boolean {
  const s = [...vals].sort((a, b) => a - b);
  for (let i = 1; i < s.length; i++) if (s[i] !== s[i - 1] + 1) return false;
  return true;
}

/** Returns consecutive run values (ace can be low 1 or high 14), or null. */
function runValues(cards: Card[]): number[] | null {
  const aces = cards.filter((c) => c.rank === 'A');
  const rest = cards.filter((c) => c.rank !== 'A').map((c) => rankValue(c.rank) + 2);
  if (aces.length === 0) {
    return isConsecutive(rest) ? [...rest].sort((a, b) => a - b) : null;
  }
  const low = [...rest, ...aces.map((_, i) => 1 + i)];
  const high = [...rest, ...aces.map((_, i) => 14 - i)];
  if (isConsecutive(low)) return low.sort((a, b) => a - b);
  if (isConsecutive(high)) return high.sort((a, b) => a - b);
  return null;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  if (!cards.every((c) => c.suit === cards[0].suit)) return false;
  return runValues(cards) !== null;
}

export function isValidSet(cards: Card[]): boolean {
  return cards.length >= 3 && cards.every((c) => c.rank === cards[0].rank);
}

export function isValidMeld(cards: Card[]): boolean {
  return isValidSet(cards) || isValidRun(cards);
}

function dealHands(players: EnginePlayer[]): { dealt: EnginePlayer[]; deck: Card[] } {
  const deck = shuffleDeck(createDeck());
  const dealCount = players.length === 2 ? 13 : 7;
  let idx = 0;
  const dealt = players.map((p) => {
    const hand = deck.slice(idx, idx + dealCount);
    idx += dealCount;
    return { ...p, hand };
  });
  return { dealt, deck: deck.slice(idx) };
}

export const rummy500Game: CardGame = {
  type: 'rummy_500',
  config: GAME_CONFIGS.rummy_500,
  family: 'meld',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const { dealt, deck } = dealHands(players);
    return {
      game: {
        ...game,
        status: 'playing',
        deck,
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          melds: [],
          scores: Object.fromEntries(players.map((p) => [p.id, 0])),
          playerMelded: Object.fromEntries(players.map((p) => [p.id, []])),
          winner: null,
          hasDrawn: false,
        } satisfies Rummy500State,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as Rummy500State;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');

    if (action.intent === 'draw') {
      if (gs.hasDrawn) throw new EngineError('Already drew this turn');
      const fromDiscard = action.source === 'discard';
      let deck = [...game.deck];
      let discardPile = [...game.discardPile];
      let drawn: Card[];
      if (fromDiscard) {
        if (discardPile.length === 0) throw new EngineError('Discard pile is empty');
        const idx = discardPile.findIndex((c) => c.id === action.cardId);
        if (idx === -1) throw new EngineError('Card not in discard pile');
        drawn = discardPile.slice(idx); // the chosen card and everything above it
        discardPile = discardPile.slice(0, idx);
      } else {
        if (deck.length === 0) {
          if (discardPile.length === 0) throw new EngineError('No cards to draw');
          deck = shuffleDeck(discardPile);
          discardPile = [];
        }
        drawn = [deck[0]];
        deck = deck.slice(1);
      }
      return {
        game: { ...game, deck, discardPile, gameState: { ...gs, hasDrawn: true } },
        players: updatePlayerHand(players, player.id, [...player.hand, ...drawn]),
      };
    }

    if (action.intent === 'meld') {
      if (!gs.hasDrawn) throw new EngineError('Draw first');
      const raw = (action.cards ?? action.cardIds) as string[] | undefined;
      const ids = raw ?? [];
      const cards = ids.map((id) => player.hand.find((c) => c.id === id)).filter(Boolean) as Card[];
      if (cards.length !== ids.length) throw new EngineError('Card not in hand');
      if (!isValidMeld(cards)) throw new EngineError('Not a valid set or run');
      let hand = player.hand;
      for (const id of ids) hand = removeCard(hand, id);
      const meld: TableMeld = { id: `meld-${gs.melds.length}`, kind: isValidSet(cards) ? 'set' : 'run', cards };
      return {
        game: {
          ...game,
          gameState: {
            ...gs,
            melds: [...gs.melds, meld],
            playerMelded: { ...gs.playerMelded, [player.id]: [...(gs.playerMelded[player.id] ?? []), ...cards] },
          },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'layoff') {
      if (!gs.hasDrawn) throw new EngineError('Draw first');
      const cardId = String(action.cardId);
      const meldId = String(action.meldId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const meld = gs.melds.find((m) => m.id === meldId);
      if (!meld) throw new EngineError('Meld not found');
      if (meld.kind === 'set') {
        if (card.rank !== meld.cards[0].rank) throw new EngineError('Card does not match set rank');
      } else if (!isValidRun([...meld.cards, card])) {
        throw new EngineError('Card does not extend run');
      }
      const hand = removeCard(player.hand, cardId);
      const melds = gs.melds.map((m) => (m.id === meldId ? { ...m, cards: [...m.cards, card] } : m));
      return {
        game: {
          ...game,
          gameState: {
            ...gs,
            melds,
            playerMelded: { ...gs.playerMelded, [player.id]: [...(gs.playerMelded[player.id] ?? []), card] },
          },
        },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'discard') {
      if (!gs.hasDrawn) throw new EngineError('Draw first');
      const cardId = String(action.cardId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, cardId);
      const nextPlayers = updatePlayerHand(players, player.id, hand);
      const wentOut = hand.length === 0;
      const nextSeatVal = nextSeat(orderedSeats(players), player.seat);

      if (wentOut) {
        const scores = { ...gs.scores };
        for (const p of nextPlayers) {
          const meldedVal = (gs.playerMelded[p.id] ?? []).reduce((s, c) => s + rummyCardValue(c), 0);
          const deadVal = p.hand.reduce((s, c) => s + rummyCardValue(c), 0);
          scores[p.id] = (scores[p.id] ?? 0) + meldedVal - deadVal;
        }
        const winningEntry = Object.entries(scores).find(([, v]) => v >= WIN_SCORE);
        if (winningEntry) {
          return {
            game: {
              ...game,
              status: 'finished',
              discardPile: [...game.discardPile, card],
              gameState: { ...gs, scores, winner: winningEntry[0], hasDrawn: false },
            },
            players: nextPlayers,
          };
        }
        const redealt = dealHands(nextPlayers);
        return {
          game: {
            ...game,
            status: 'playing',
            deck: redealt.deck,
            discardPile: [],
            currentSeat: nextSeatVal,
            gameState: {
              melds: [],
              scores,
              playerMelded: Object.fromEntries(nextPlayers.map((p) => [p.id, []])),
              winner: null,
              hasDrawn: false,
            },
          },
          players: redealt.dealt,
        };
      }

      return {
        game: {
          ...game,
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeatVal,
          gameState: { ...gs, hasDrawn: false },
        },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as Rummy500State).winner;
  },
  score(state) {
    return (state.game.gameState as Rummy500State).scores;
  },
};
