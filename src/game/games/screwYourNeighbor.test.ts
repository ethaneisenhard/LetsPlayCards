import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { screwYourNeighborGame } from './screwYourNeighbor';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'screw_your_neighbor', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 1, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface ScrewGS {
  cards: Record<string, Card>;
  tokens: Record<string, number>;
  acted: string[];
  safe: string[];
  dealerSeat: number;
  stock: Card[];
  lastLosers: string[];
  winner: string | null;
}

function snState(
  cards: Record<string, Card>,
  tokens: Record<string, number>,
  acted: string[] = [],
  safe: string[] = [],
  stock: Card[] = [c('9')],
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'screw_your_neighbor',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 1, maxPlayers: 8 },
      gameState: { cards, tokens, acted, safe, dealerSeat: 0, stock, lastLosers: [], winner: null } as ScrewGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      { id: 'p3', name: 'P3', seat: 2, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('screw-your-neighbor', () => {
  it('deals one card and three tokens per player', () => {
    const s = screwYourNeighborGame.setup(lobby('screw_your_neighbor', 3, 8));
    const gs = s.game.gameState as ScrewGS;
    expect(Object.keys(gs.cards)).toHaveLength(3);
    expect(gs.tokens.p1).toBe(3);
  });

  it('a King is safe and cannot swap', () => {
    const s = snState({ p1: c('K'), p2: c('5'), p3: c('7') }, { p1: 3, p2: 3, p3: 3 });
    expect(() => screwYourNeighborGame.reduce(s, { intent: 'swap', playerId: 'p1' })).toThrow(EngineError);
  });

  it('skips King-holders in the acting rotation', () => {
    // p2 holds a King → safe. p1 swaps with the next non-King player (p3).
    const s = snState({ p1: c('5'), p2: c('K'), p3: c('A') }, { p1: 3, p2: 3, p3: 3 }, [], ['p2'], [c('9')], 0);
    const t = screwYourNeighborGame.reduce(s, { intent: 'swap', playerId: 'p1' });
    expect(t.game.currentSeat).toBe(2); // p3, not the King-holder p2
    expect((t.game.gameState as ScrewGS).cards.p1.rank).toBe('A');
  });

  it('the lowest card loses a token each round', () => {
    // p3 holds a King (safe). p1 and p2 swap; p2 ends up with the Ace → loses.
    const s = snState({ p1: c('5'), p2: c('A'), p3: c('K') }, { p1: 3, p2: 3, p3: 3 });
    let t = screwYourNeighborGame.reduce(s, { intent: 'swap', playerId: 'p1' }); // p1↔p2
    t = screwYourNeighborGame.reduce(t, { intent: 'swap', playerId: 'p2' }); // p2 (last actor) ↺ p1
    const gs = t.game.gameState as ScrewGS;
    expect(gs.tokens.p2).toBe(2);
    expect(gs.lastLosers).toEqual(['p2']);
  });

  it('declares the last player standing the winner', () => {
    // No Kings. p1 and p2 tie-low (Ace) with one token → both eliminated → p3 wins.
    const s = snState({ p1: c('A'), p2: c('Q'), p3: c('A') }, { p1: 1, p2: 1, p3: 3 });
    let t = screwYourNeighborGame.reduce(s, { intent: 'swap', playerId: 'p1' });
    t = screwYourNeighborGame.reduce(t, { intent: 'swap', playerId: 'p2' });
    t = screwYourNeighborGame.reduce(t, { intent: 'swap', playerId: 'p3' });
    const gs = t.game.gameState as ScrewGS;
    expect(t.game.status).toBe('finished');
    expect(gs.winner).toBe('p3');
  });
});
