import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import { baccaratGame, baccaratValue } from './baccarat';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'baccarat', { dealCount: 2, maxPlayers: 14 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

type B = {
  phase: string;
  chips: Record<string, number>;
  bets: Record<string, { side: string; amount: number }>;
  playerHand: Card[];
  bankerHand: Card[];
  playerTotal: number;
  bankerTotal: number;
  result: string | null;
  payouts: Record<string, number>;
};

const gs = (s: EngineState): B => s.game.gameState as unknown as B;

function baccaratState(playerHand: Card[], bankerHand: Card[], deck: Card[] = []): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'baccarat',
      deck, tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 2, maxPlayers: 14 },
      gameState: {
        phase: 'betting', chips: { p1: 100, p2: 100, p3: 100 }, bets: {},
        playerHand, bankerHand, playerTotal: 0, bankerTotal: 0, result: null, payouts: {},
      },
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      { id: 'p3', name: 'P3', seat: 2, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('baccarat', () => {
  it('deals player and banker hands and starts in the betting phase', () => {
    const s = baccaratGame.setup(lobby(3));
    expect(s.game.status).toBe('playing');
    expect(gs(s).phase).toBe('betting');
    expect(gs(s).playerHand).toHaveLength(2);
    expect(gs(s).bankerHand).toHaveLength(2);
    expect(gs(s).chips).toEqual({ p1: 100, p2: 100, p3: 100 });
    expect(s.game.deck).toHaveLength(48);
  });

  it('values cards A=1, faces=0', () => {
    expect(baccaratValue(c('A'))).toBe(1);
    expect(baccaratValue(c('7'))).toBe(7);
    expect(baccaratValue(c('10', 'spades'))).toBe(0);
    expect(baccaratValue(c('K'))).toBe(0);
  });

  it('resolves when everyone bets and pays player bets 1:1', () => {
    // Player total 7 (9+8), banker total 5 (2+3); banker draws a K (0) and stays on 5.
    const s = baccaratState([c('9'), c('8', 'clubs')], [c('2'), c('3', 'clubs')], [c('K', 'spades')]);
    let next = baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'player', amount: 10 });
    expect(gs(next).phase).toBe('betting');
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p2', side: 'banker', amount: 10 });
    expect(gs(next).phase).toBe('betting');
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p3', side: 'tie', amount: 5 });
    expect(next.game.status).toBe('finished');
    expect(gs(next).result).toBe('player');
    expect(gs(next).chips.p1).toBe(110); // 100 - 10 + 20
    expect(gs(next).chips.p2).toBe(90);
    expect(gs(next).chips.p3).toBe(95);
    expect(baccaratGame.isTerminal(next)).toBe(true);
  });

  it('pays banker bets 1:1 on a banker natural', () => {
    // Player 6 (K+6), banker natural 8 (9+9) → banker wins, no third cards.
    const s = baccaratState([c('K'), c('6')], [c('9'), c('9', 'diamonds')]);
    let next = baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'player', amount: 10 });
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p2', side: 'banker', amount: 20 });
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p3', side: 'tie', amount: 5 });
    expect(gs(next).result).toBe('banker');
    expect(gs(next).chips.p2).toBe(120); // 100 - 20 + 40
    expect(gs(next).chips.p1).toBe(90);
  });

  it('pays tie bets 8:1', () => {
    // Both natural 9 (A+8) → tie.
    const s = baccaratState([c('A'), c('8', 'clubs')], [c('A', 'diamonds'), c('8', 'diamonds')]);
    let next = baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'tie', amount: 10 });
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p2', side: 'player', amount: 10 });
    next = baccaratGame.reduce(next, { intent: 'bet', playerId: 'p3', side: 'banker', amount: 10 });
    expect(gs(next).result).toBe('tie');
    expect(gs(next).chips.p1).toBe(180); // 100 - 10 + 10 + 80
    expect(baccaratGame.score(next)).toEqual({ p1: 180, p2: 90, p3: 90 });
  });

  it('rejects duplicate bets, over-bets, and invalid sides', () => {
    const s = baccaratState([c('9'), c('8')], [c('2'), c('3')]);
    const bet = baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'player', amount: 10 });
    expect(() => baccaratGame.reduce(bet, { intent: 'bet', playerId: 'p1', side: 'tie', amount: 5 })).toThrow(EngineError);
    expect(() => baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'player', amount: 101 })).toThrow(EngineError);
    expect(() => baccaratGame.reduce(s, { intent: 'bet', playerId: 'p1', side: 'joker', amount: 10 })).toThrow(EngineError);
  });
});
