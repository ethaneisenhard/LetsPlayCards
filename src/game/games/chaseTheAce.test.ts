import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { chaseTheAceGame, chaseValue } from './chaseTheAce';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'chase_the_ace', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 1, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface ChaseGS {
  cards: Record<string, Card>;
  tokens: Record<string, number>;
  acted: string[];
  dealerSeat: number;
  stock: Card[];
  lastLosers: string[];
  winner: string | null;
}

function caState(
  cards: Record<string, Card>,
  tokens: Record<string, number>,
  acted: string[] = [],
  stock: Card[] = [c('9')],
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'chase_the_ace',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 1, maxPlayers: 8 },
      gameState: { cards, tokens, acted, dealerSeat: 0, stock, lastLosers: [], winner: null } as ChaseGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      { id: 'p3', name: 'P3', seat: 2, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('chase-the-ace', () => {
  it('deals one card and three tokens per player', () => {
    const s = chaseTheAceGame.setup(lobby('chase_the_ace', 3, 8));
    expect(s.game.status).toBe('playing');
    const gs = s.game.gameState as ChaseGS;
    expect(Object.keys(gs.cards)).toHaveLength(3);
    expect(gs.tokens.p1).toBe(3);
    expect(gs.tokens.p2).toBe(3);
    expect(gs.tokens.p3).toBe(3);
  });

  it('ranks the cards A=1 … K=13', () => {
    expect(chaseValue('A')).toBe(1);
    expect(chaseValue('7')).toBe(7);
    expect(chaseValue('K')).toBe(13);
  });

  it('swap exchanges your card with the left neighbor', () => {
    const s = caState({ p1: c('A'), p2: c('K'), p3: c('5') }, { p1: 3, p2: 3, p3: 3 });
    const next = chaseTheAceGame.reduce(s, { intent: 'swap', playerId: 'p1' });
    const gs = next.game.gameState as ChaseGS;
    expect(gs.cards.p1.rank).toBe('K');
    expect(gs.cards.p2.rank).toBe('A');
    expect(gs.acted).toEqual(['p1']);
    expect(next.game.currentSeat).toBe(1);
  });

  it('the lowest card loses a token after everyone acts', () => {
    // Final layout after 3 swaps: p1=5, p2=K, p3=A (lowest → p3 loses).
    const s = caState({ p1: c('5'), p2: c('A'), p3: c('K') }, { p1: 3, p2: 3, p3: 3 });
    let t = chaseTheAceGame.reduce(s, { intent: 'swap', playerId: 'p1' });
    t = chaseTheAceGame.reduce(t, { intent: 'swap', playerId: 'p2' });
    t = chaseTheAceGame.reduce(t, { intent: 'swap', playerId: 'p3' });
    const gs = t.game.gameState as ChaseGS;
    expect(gs.tokens.p3).toBe(2);
    expect(gs.lastLosers).toEqual(['p3']);
  });

  it('only the player left of the dealer may draw', () => {
    const s = caState({ p1: c('5'), p2: c('A'), p3: c('K') }, { p1: 3, p2: 3, p3: 3 });
    expect(() => chaseTheAceGame.reduce(s, { intent: 'draw', playerId: 'p1' })).toThrow(EngineError);
  });

  it('declares the last player standing the winner', () => {
    // p1 and p2 tie for lowest with one token each → both eliminated → p3 wins.
    const s = caState({ p1: c('A'), p2: c('K'), p3: c('A') }, { p1: 1, p2: 1, p3: 3 });
    let t = chaseTheAceGame.reduce(s, { intent: 'swap', playerId: 'p1' });
    t = chaseTheAceGame.reduce(t, { intent: 'swap', playerId: 'p2' });
    t = chaseTheAceGame.reduce(t, { intent: 'swap', playerId: 'p3' });
    const gs = t.game.gameState as ChaseGS;
    expect(t.game.status).toBe('finished');
    expect(gs.winner).toBe('p3');
  });
});
