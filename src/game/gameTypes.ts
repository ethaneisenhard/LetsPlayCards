import type { Card } from './types';

export type GameType =
  | 'war'
  | 'go_fish'
  | 'freeplay'
  | 'hearts'
  | 'crazy_eights'
  | 'rummy'
  | 'blackjack'
  | 'spades'
  | 'bridge'
  | 'euchre'
  | 'whist'
  | 'oh_hell'
  | 'gin_rummy'
  | 'rummy_500'
  | 'canasta'
  | 'texas_holdem'
  | 'five_card_draw'
  | 'baccarat'
  | 'old_maid'
  | 'slapjack'
  | 'president'
  | 'klondike'
  | 'freecell'
  | 'spider'
  | 'cribbage'
  | 'pinochle'
  | 'snap'
  | 'concentration'
  | 'sevens'
  | 'thirty_one'
  | 'cassino'
  | 'kings_in_the_corner'
  | 'speed'
  | 'spite_and_malice'
  | 'beggar_my_neighbor'
  | 'i_doubt_it'
  | 'cheat'
  | 'chase_the_ace'
  | 'screw_your_neighbor'
  | 'egyptian_ratscrew'
  | 'pitch'
  | 'solitaire_race';

export interface GameTypeConfig {
  id: GameType;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  minPlayers: number;
  maxPlayers: number;
  dealCount: number | 'all';
  rules: string[];
  color: string;
  /** Optional catalog default table surface id (`felt`, `beach`, …). User prefs win. */
  tableTheme?: string;
  /**
   * How this game reveals the player's cards.
   * `open` (default) = fan the hand. `stock` = face-down pile; ranks stay hidden.
   */
  handReveal?: 'open' | 'stock';
}

// ─── War game state ───────────────────────────────────────────────────────────
export interface WarGameState {
  phase: 'battle' | 'war' | 'reveal' | 'finished';
  roundCards: Record<string, Card[]>;
  cardsAtStake: Card[];
  roundWinnerId: string | null;
  lastWinnerSeat: number | null;
  winner: string | null;
  lastTiedCards: Record<string, Card[]> | null;
}

// ─── Go Fish game state ───────────────────────────────────────────────────────
export interface GoFishGameState {
  currentSeat: number;
  books: Record<string, Card[][]>;
  lastAsk: {
    fromId: string;
    fromName: string;
    toId: string;
    toName: string;
    rank: string;
    result: 'success' | 'go_fish';
  } | null;
  winner: string | null;
}

export type AnyGameState = Record<string, any>;

// ─── Free Play game state ─────────────────────────────────────────────────────
export interface FreePlayGameState {
  /** Draws remaining in the current player's turn. */
  drawsLeft: number;
  /** Player id when the game is finished, else null. */
  winner: string | null;
}

// ─── Card rank values ─────────────────────────────────────────────────────────
const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function rankValue(rank: string): number {
  return RANK_ORDER.indexOf(rank);
}

export function compareCards(a: Card, b: Card): 'a' | 'b' | 'tie' {
  const va = rankValue(a.rank);
  const vb = rankValue(b.rank);
  if (va > vb) return 'a';
  if (vb > va) return 'b';
  return 'tie';
}

// ─── Go Fish helpers ──────────────────────────────────────────────────────────
export function detectBooks(hand: Card[]): { books: Card[][]; remaining: Card[] } {
  const byRank: Record<string, Card[]> = {};
  for (const card of hand) {
    byRank[card.rank] = [...(byRank[card.rank] ?? []), card];
  }
  const books: Card[][] = [];
  const remaining: Card[] = [];
  for (const cards of Object.values(byRank)) {
    if (cards.length >= 4) {
      books.push(cards.slice(0, 4));
      remaining.push(...cards.slice(4));
    } else {
      remaining.push(...cards);
    }
  }
  return { books, remaining };
}
