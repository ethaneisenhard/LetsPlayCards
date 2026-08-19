import type { Card, Suit, Rank } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export interface DeckSpec {
  ranks?: Rank[];
  suits?: Suit[];
  copies?: number;
}

export function buildDeck(spec: DeckSpec = {}): Card[] {
  const ranks = spec.ranks ?? RANKS;
  const suits = spec.suits ?? SUITS;
  const copies = spec.copies ?? 1;
  const deck: Card[] = [];
  for (let c = 0; c < copies; c++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ id: `${rank}-${suit}-${c}`, suit, rank });
      }
    }
  }
  return deck;
}

export function createDeck(): Card[] {
  return buildDeck();
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function getSuitSymbol(suit: Suit): string {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit];
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function getSuitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-slate-800';
}
