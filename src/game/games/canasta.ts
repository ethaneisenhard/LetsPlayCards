import { buildDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EnginePlayer, type EngineState } from '../state';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface CanastaMeld {
  id: string;
  team: string;
  /** Natural rank of the meld (wilds substitute for this rank). */
  rank: string;
  cards: Card[];
}

interface CanastaState {
  /** 'draw' = must draw two; 'play' = may meld, then must discard or go out. */
  phase: 'draw' | 'play';
  melds: CanastaMeld[];
  redThrees: Record<string, Card[]>;
  scores: Record<string, number>;
  winner: string | null;
}

const WIN_SCORE = 5000;
const NATURAL_CANASTA = 500;
const MIXED_CANASTA = 300;
const RED_THREE_POINTS = 100;
const CARDS_PER_HAND = 11;

/** Wilds are jokers (id-prefixed JOKER) and all twos. */
export function isWild(card: Card): boolean {
  return card.id.startsWith('JOKER') || card.rank === '2';
}

export function isRedThree(card: Card): boolean {
  return card.rank === '3' && (card.suit === 'hearts' || card.suit === 'diamonds');
}

export function teamOf(seat: number): string {
  return `team-${seat % 2}`;
}

export function buildCanastaDeck(): Card[] {
  const deck = buildDeck({ copies: 2 });
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `JOKER-${i}`, suit: 'clubs', rank: 'J' });
  }
  return deck;
}

/** Moves red 3s into the team's redThrees, drawing a replacement from stock for each. */
function settleRedThrees(
  incoming: Card[],
  team: string,
  redThrees: Record<string, Card[]>,
  stock: Card[],
): { kept: Card[]; redThrees: Record<string, Card[]>; stock: Card[] } {
  const kept: Card[] = [];
  const rt = { ...redThrees };
  let stockLeft = [...stock];
  const queue = [...incoming];
  while (queue.length > 0) {
    const card = queue.shift()!;
    if (isRedThree(card)) {
      rt[team] = [...(rt[team] ?? []), card];
      if (stockLeft.length > 0) {
        queue.push(stockLeft[0]);
        stockLeft = stockLeft.slice(1);
      }
    } else {
      kept.push(card);
    }
  }
  return { kept, redThrees: rt, stock: stockLeft };
}

function validateMeld(cards: Card[]): string | null {
  if (cards.length < 3) return 'A meld needs at least 3 cards';
  const wilds = cards.filter(isWild);
  const naturals = cards.filter((c) => !isWild(c));
  if (naturals.length === 0) return 'Cannot meld all wilds';
  if (wilds.length > 3) return 'A meld can have at most 3 wilds';
  const rank = naturals[0].rank;
  if (!naturals.every((c) => c.rank === rank)) return 'Meld cards must share one natural rank';
  return null;
}

export function isCanasta(meld: CanastaMeld): boolean {
  return meld.cards.length >= 7;
}

export function isNaturalCanasta(meld: CanastaMeld): boolean {
  return meld.cards.length >= 7 && !meld.cards.some(isWild);
}

function teamHandScore(gs: CanastaState, team: string): number {
  let pts = 0;
  for (const m of gs.melds) {
    if (m.team !== team) continue;
    if (isCanasta(m)) pts += isNaturalCanasta(m) ? NATURAL_CANASTA : MIXED_CANASTA;
  }
  pts += RED_THREE_POINTS * (gs.redThrees[team]?.length ?? 0);
  return pts;
}

function dealHands(players: EnginePlayer[]): { dealt: EnginePlayer[]; deck: Card[]; redThrees: Record<string, Card[]> } {
  let stock = shuffleDeck(buildCanastaDeck());
  const dealt: EnginePlayer[] = [];
  let redThrees: Record<string, Card[]> = {};
  for (const p of players) {
    const hand = stock.slice(0, CARDS_PER_HAND);
    stock = stock.slice(CARDS_PER_HAND);
    const settled = settleRedThrees(hand, teamOf(p.seat), redThrees, stock);
    redThrees = settled.redThrees;
    stock = settled.stock;
    dealt.push({ ...p, hand: settled.kept });
  }
  return { dealt, deck: stock, redThrees };
}

export const canastaGame: CardGame = {
  type: 'canasta',
  config: GAME_CONFIGS.canasta,
  family: 'meld',
  deck: { copies: 2 },
  setup(state) {
    const { game, players } = state;
    const { dealt, deck, redThrees } = dealHands(players);
    const teams = [...new Set(players.map((p) => teamOf(p.seat)))];
    return {
      game: {
        ...game,
        status: 'playing',
        deck,
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'draw',
          melds: [],
          redThrees,
          scores: Object.fromEntries(teams.map((t) => [t, 0])),
          winner: null,
        } satisfies CanastaState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as CanastaState;
    const player = findPlayer(players, action.playerId!);
    if (!player) throw new EngineError('Player not found');
    if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
    const team = teamOf(player.seat);

    if (action.intent === 'draw') {
      if (gs.phase !== 'draw') throw new EngineError('Already drew this turn');
      let stock = [...game.deck];
      const drawn: Card[] = [];
      for (let i = 0; i < 2; i++) {
        if (stock.length === 0) break;
        drawn.push(stock[0]);
        stock = stock.slice(1);
      }
      const settled = settleRedThrees(drawn, team, gs.redThrees, stock);
      return {
        game: {
          ...game,
          deck: settled.stock,
          gameState: { ...gs, phase: 'play', redThrees: settled.redThrees },
        },
        players: updatePlayerHand(players, player.id, [...player.hand, ...settled.kept]),
      };
    }

    if (action.intent === 'meld') {
      if (gs.phase !== 'play') throw new EngineError('Draw first');
      const raw = (action.cards ?? action.cardIds) as string[] | undefined;
      const ids = raw ?? [];
      const cards = ids.map((id) => player.hand.find((c) => c.id === id)).filter(Boolean) as Card[];
      if (cards.length !== ids.length) throw new EngineError('Card not in hand');
      let hand = player.hand;
      for (const id of ids) hand = removeCard(hand, id);

      if (action.meldId) {
        const meld = gs.melds.find((m) => m.id === action.meldId);
        if (!meld) throw new EngineError('Meld not found');
        if (meld.team !== team) throw new EngineError('Not your team meld');
        const combined = [...meld.cards, ...cards];
        const err = validateMeld(combined);
        if (err) throw new EngineError(err);
        const melds = gs.melds.map((m) => (m.id === meld.id ? { ...m, cards: combined } : m));
        return { game: { ...game, gameState: { ...gs, melds } }, players: updatePlayerHand(players, player.id, hand) };
      }

      const err = validateMeld(cards);
      if (err) throw new EngineError(err);
      const rank = cards.find((c) => !isWild(c))!.rank;
      const meld: CanastaMeld = { id: `meld-${gs.melds.length}`, team, rank, cards };
      return {
        game: { ...game, gameState: { ...gs, melds: [...gs.melds, meld] } },
        players: updatePlayerHand(players, player.id, hand),
      };
    }

    if (action.intent === 'discard' || action.intent === 'go-out') {
      if (gs.phase !== 'play') throw new EngineError('Draw first');
      const cardId = String(action.cardId);
      const card = player.hand.find((c) => c.id === cardId);
      if (!card) throw new EngineError('Card not in hand');
      const hand = removeCard(player.hand, cardId);
      const wentOut = hand.length === 0;
      if (action.intent === 'go-out' && !wentOut) throw new EngineError('Going out requires discarding your last card');
      const nextPlayers = updatePlayerHand(players, player.id, hand);

      if (wentOut) {
        const hasCanasta = gs.melds.some((m) => m.team === team && isCanasta(m));
        if (!hasCanasta) throw new EngineError('Need a canasta to go out');
        const scores = { ...gs.scores };
        for (const t of Object.keys(scores)) scores[t] += teamHandScore(gs, t);
        const winningEntry = Object.entries(scores).find(([, v]) => v >= WIN_SCORE);
        if (winningEntry) {
          return {
            game: {
              ...game,
              status: 'finished',
              discardPile: [...game.discardPile, card],
              gameState: { ...gs, scores, winner: winningEntry[0] },
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
            currentSeat: nextSeat(orderedSeats(players), player.seat),
            gameState: { phase: 'draw', melds: [], redThrees: redealt.redThrees, scores, winner: null },
          },
          players: redealt.dealt,
        };
      }

      return {
        game: {
          ...game,
          discardPile: [...game.discardPile, card],
          currentSeat: nextSeat(orderedSeats(players), player.seat),
          gameState: { ...gs, phase: 'draw' },
        },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return !!(state.game.gameState as CanastaState).winner;
  },
  score(state) {
    return (state.game.gameState as CanastaState).scores;
  },
};
