import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { beggarMyNeighborGame, faceValue } from './beggarMyNeighbor';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'beggar_my_neighbor', n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 0, maxPlayers: 2 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface BeggarGS {
  stacks: Record<string, Card[]>;
  center: Card[];
  owe: number;
  payerId: string | null;
  collectorId: string | null;
  winner: string | null;
}

function bState(
  p1Stack: Card[],
  p2Stack: Card[],
  center: Card[] = [],
  owe = 0,
  payerId: string | null = null,
  collectorId: string | null = null,
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'beggar_my_neighbor',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 0, maxPlayers: 2 },
      gameState: { stacks: { p1: p1Stack, p2: p2Stack }, center, owe, payerId, collectorId, winner: null } as BeggarGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('beggar-my-neighbor', () => {
  it('deals all 52 cards evenly into two stacks', () => {
    const s = beggarMyNeighborGame.setup(lobby('beggar_my_neighbor', 2));
    expect(s.game.status).toBe('playing');
    const gs = s.game.gameState as BeggarGS;
    expect(gs.stacks.p1).toHaveLength(26);
    expect(gs.stacks.p2).toHaveLength(26);
    expect(s.players[0].hand).toHaveLength(0);
  });

  it('maps face values A=4 K=3 Q=2 J=1', () => {
    expect(faceValue('A')).toBe(4);
    expect(faceValue('K')).toBe(3);
    expect(faceValue('Q')).toBe(2);
    expect(faceValue('J')).toBe(1);
    expect(faceValue('7')).toBe(0);
  });

  it('flipping a face card makes the opponent owe the payment', () => {
    const s = bState([c('K', 'spades')], [c('3'), c('5')]);
    const next = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    const gs = next.game.gameState as BeggarGS;
    expect(gs.owe).toBe(3);
    expect(gs.payerId).toBe('p2');
    expect(gs.collectorId).toBe('p1');
    expect(gs.center.map((x) => x.rank)).toEqual(['K']);
  });

  it('reverses the debt when the payer reveals a face card', () => {
    let s = bState([c('K')], [c('Q')]);
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p1' }); // p1 plays K → p2 owes 3
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p2' }); // p2 plays Q → reverses
    const gs = s.game.gameState as BeggarGS;
    expect(gs.owe).toBe(2);
    expect(gs.payerId).toBe('p1');
    expect(gs.collectorId).toBe('p2');
  });

  it('collects the center pile when the payer flips the full count without a face card', () => {
    let s = bState([c('K')], [c('3'), c('5'), c('7')]);
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p1' }); // K → p2 owes 3
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p2' });
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p2' });
    s = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p2' }); // 3rd non-face → p1 collects
    const gs = s.game.gameState as BeggarGS;
    expect(gs.owe).toBe(0);
    expect(gs.center).toHaveLength(0);
    expect(gs.stacks.p1).toHaveLength(4);
    expect(gs.stacks.p2).toHaveLength(0);
  });

  it('enforces turn order and payer restrictions', () => {
    const s = bState([c('K')], [c('3')]);
    expect(() => beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p2' })).toThrow(EngineError);
    const afterFace = beggarMyNeighborGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    expect(() => beggarMyNeighborGame.reduce(afterFace, { intent: 'flip', playerId: 'p1' })).toThrow(EngineError);
  });
});
