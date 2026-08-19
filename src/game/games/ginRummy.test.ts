import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import { ginRummyGame, bestDeadwood } from './ginRummy';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'gin_rummy', { dealCount: 10, maxPlayers: 2 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function ginState(
  p1: Card[],
  p2: Card[],
  deck: Card[] = [],
  discardPile: Card[] = [],
  phase: 'draw' | 'discard' = 'draw',
  scores: Record<string, number> = { p1: 0, p2: 0 },
  drewFromDiscard: string | null = null,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'gin_rummy',
      deck, tableCards: [], discardPile, currentSeat: 0,
      settings: { dealCount: 10, maxPlayers: 2 },
      gameState: { phase, scores, winner: null, drewFromDiscard },
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: p1, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: p2, isCreator: false, isReady: true },
    ],
  };
}

const ginHand: Card[] = [
  c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'), c('2', 'diamonds'),
  c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds'),
  c('9', 'hearts'), c('10', 'hearts'), c('J', 'hearts'),
];

const messyHand: Card[] = [
  c('A'), c('K', 'clubs'), c('Q', 'diamonds'), c('J', 'spades'), c('9', 'clubs'),
  c('8', 'diamonds'), c('7', 'hearts'), c('6', 'spades'), c('5', 'clubs'), c('4', 'diamonds'),
];

describe('gin rummy', () => {
  it('bestDeadwood subtracts the best disjoint melds', () => {
    const hand = [
      c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'),
      c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds'),
      c('K', 'spades'),
    ];
    expect(bestDeadwood(hand)).toBe(10); // 24 melded, 34 total
    expect(bestDeadwood(ginHand)).toBe(0); // gin
  });

  it('deals 10 each and flips an upcard', () => {
    const s = ginRummyGame.setup(lobby(2));
    expect(s.game.status).toBe('playing');
    expect(s.players.every((p) => p.hand.length === 10)).toBe(true);
    expect(s.game.discardPile).toHaveLength(1);
    expect(s.game.deck).toHaveLength(52 - 20 - 1);
  });

  it('requires a draw before discarding', () => {
    const s = ginState([c('A')], [c('2', 'clubs')]);
    expect(() => ginRummyGame.reduce(s, { intent: 'discard', playerId: 'p1', cardId: 'Ah' })).toThrow(EngineError);
  });

  it('cannot discard the card drawn from the discard pile', () => {
    const s = ginState([c('A')], [c('2', 'clubs')], [c('3', 'clubs')], [c('K', 'spades')], 'draw');
    const drawn = ginRummyGame.reduce(s, { intent: 'draw', playerId: 'p1', source: 'discard' });
    expect(drawn.players[0].hand.map((x) => x.id)).toEqual(['Ah', 'Ks']);
    expect(() => ginRummyGame.reduce(drawn, { intent: 'discard', playerId: 'p1', cardId: 'Ks' })).toThrow(EngineError);
    const done = ginRummyGame.reduce(drawn, { intent: 'discard', playerId: 'p1', cardId: 'Ah' });
    expect(done.game.currentSeat).toBe(1);
  });

  it('rejects knock when deadwood is above 10', () => {
    const s = ginState(messyHand, [c('2', 'clubs')], [], [c('3', 'clubs')], 'discard');
    expect(() => ginRummyGame.reduce(s, { intent: 'knock', playerId: 'p1' })).toThrow(EngineError);
  });

  it('gin scores 25 + opponent deadwood', () => {
    const s = ginState(ginHand, messyHand, [], [c('K', 'spades')], 'discard');
    const next = ginRummyGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    const gs = next.game.gameState as { scores: Record<string, number> };
    expect(gs.scores.p1).toBe(25 + bestDeadwood(messyHand));
    expect(gs.scores.p2).toBe(0);
  });

  it('knock with lower deadwood scores the difference', () => {
    const p1 = [
      c('5', 'hearts'), c('5', 'clubs'), c('5', 'spades'),
      c('6', 'diamonds'), c('7', 'diamonds'), c('8', 'diamonds'),
      c('2', 'clubs'), c('3', 'hearts'), c('4', 'spades'), c('A', 'hearts'),
    ];
    const s = ginState(p1, messyHand, [], [c('K', 'spades')], 'discard');
    expect(bestDeadwood(p1)).toBe(10);
    const next = ginRummyGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    const gs = next.game.gameState as { scores: Record<string, number> };
    expect(gs.scores.p1).toBe(bestDeadwood(messyHand) - 10);
    expect(gs.scores.p2).toBe(0);
  });

  it('undercut scores the opponent 25 + difference', () => {
    const p1 = [
      c('5', 'hearts'), c('5', 'clubs'), c('5', 'spades'),
      c('6', 'diamonds'), c('7', 'diamonds'), c('8', 'diamonds'),
      c('2', 'clubs'), c('3', 'hearts'), c('4', 'spades'), c('A', 'hearts'),
    ];
    const p2 = [
      c('9', 'hearts'), c('10', 'hearts'), c('J', 'hearts'),
      c('5', 'clubs'), c('6', 'clubs'), c('7', 'clubs'),
      c('2', 'diamonds'), c('3', 'diamonds'), c('4', 'diamonds'), c('2', 'spades'),
    ];
    const s = ginState(p1, p2, [], [c('K', 'spades')], 'discard');
    expect(bestDeadwood(p1)).toBe(10);
    expect(bestDeadwood(p2)).toBe(2);
    const next = ginRummyGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    const gs = next.game.gameState as { scores: Record<string, number> };
    expect(gs.scores.p1).toBe(0);
    expect(gs.scores.p2).toBe(25 + (10 - 2));
  });

  it('first to 100 wins', () => {
    const s = ginState(ginHand, messyHand, [], [c('K', 'spades')], 'discard', { p1: 90, p2: 0 });
    const next = ginRummyGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    expect(next.game.status).toBe('finished');
    expect(ginRummyGame.isTerminal(next)).toBe(true);
    expect(ginRummyGame.score(next).p1).toBeGreaterThanOrEqual(100);
  });
});
