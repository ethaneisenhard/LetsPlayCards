import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { egyptianRatscrewGame, validSlap } from './egyptianRatscrew';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'egyptian_ratscrew', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 0, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface ERSGS {
  stacks: Record<string, Card[]>;
  center: Card[];
  owe: number;
  payerId: string | null;
  collectorId: string | null;
  winner: string | null;
}

function eState(
  stacks: Record<string, Card[]>,
  center: Card[] = [],
  owe = 0,
  payerId: string | null = null,
  collectorId: string | null = null,
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'egyptian_ratscrew',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 0, maxPlayers: 6 },
      gameState: { stacks, center, owe, payerId, collectorId, winner: null } as ERSGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('egyptian-ratscrew', () => {
  it('deals all cards into stacks', () => {
    const s = egyptianRatscrewGame.setup(lobby('egyptian_ratscrew', 2, 6));
    const gs = s.game.gameState as ERSGS;
    expect(gs.stacks.p1).toHaveLength(26);
    expect(gs.stacks.p2).toHaveLength(26);
  });

  it('detects doubles and sandwiches, rejects otherwise', () => {
    expect(validSlap([c('5'), c('5')])).toBe(true); // double
    expect(validSlap([c('5'), c('7'), c('5')])).toBe(true); // sandwich
    expect(validSlap([c('5'), c('7'), c('9')])).toBe(false);
    expect(validSlap([c('5')])).toBe(false);
  });

  it('a valid slap wins the center pile', () => {
    const s = eState({ p1: [c('2'), c('3')], p2: [c('9')] }, [c('5'), c('7'), c('5')]);
    const next = egyptianRatscrewGame.reduce(s, { intent: 'slap', playerId: 'p1' });
    const gs = next.game.gameState as ERSGS;
    expect(gs.stacks.p1).toHaveLength(5);
    expect(gs.center).toHaveLength(0);
  });

  it('an invalid slap pays a card to the center', () => {
    const s = eState({ p1: [c('2')], p2: [c('9')] }, [c('5'), c('7'), c('9')]);
    const next = egyptianRatscrewGame.reduce(s, { intent: 'slap', playerId: 'p1' });
    const gs = next.game.gameState as ERSGS;
    expect(gs.stacks.p1).toHaveLength(0);
    expect(gs.center.map((x) => x.rank)).toEqual(['5', '7', '9', '2']);
  });

  it('face cards force payment and the collector wins after the count', () => {
    let s = eState({ p1: [c('K')], p2: [c('3'), c('5'), c('7')] });
    s = egyptianRatscrewGame.reduce(s, { intent: 'flip', playerId: 'p1' }); // K → p2 owes 3
    const mid = s.game.gameState as ERSGS;
    expect(mid.owe).toBe(3);
    expect(mid.payerId).toBe('p2');
    s = egyptianRatscrewGame.reduce(s, { intent: 'flip', playerId: 'p2' });
    s = egyptianRatscrewGame.reduce(s, { intent: 'flip', playerId: 'p2' });
    s = egyptianRatscrewGame.reduce(s, { intent: 'flip', playerId: 'p2' });
    const gs = s.game.gameState as ERSGS;
    expect(gs.center).toHaveLength(0);
    expect(gs.stacks.p1).toHaveLength(4);
  });

  it('rejects a flip from the wrong player', () => {
    const s = eState({ p1: [c('3')], p2: [c('4')] }, [], 0, null, null, 0);
    expect(() => egyptianRatscrewGame.reduce(s, { intent: 'flip', playerId: 'p2' })).toThrow(EngineError);
  });
});
