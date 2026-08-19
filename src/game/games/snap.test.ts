import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { snapGame } from './snap';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'snap', { dealCount: 7, maxPlayers: 6 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function snapState(stacks: Card[][], center: Card[] = [], currentSeat = 0): EngineState {
  const players = stacks.map((stack, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand: stack,
    isCreator: i === 0, isReady: true,
  }));
  const stackMap: Record<string, Card[]> = {};
  players.forEach((p) => { stackMap[p.id] = p.hand; });
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'snap',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 6 },
      gameState: { stacks: stackMap, center, out: [], winner: null },
    },
    players,
  };
}

describe('snap', () => {
  it('deals all 52 cards face-down', () => {
    const s = snapGame.setup(lobby(4));
    expect(s.players.reduce((n, p) => n + p.hand.length, 0)).toBe(52);
    expect(s.game.status).toBe('playing');
  });

  it('flip moves the top card to the center', () => {
    const s = snapState([[c('3', 'diamonds'), c('5', 'hearts')], [c('2', 'spades')]]);
    const next = snapGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['3d']);
    expect((next.game.gameState as { center: Card[] }).center.map((x) => x.id)).toEqual(['5h']);
    expect(next.game.currentSeat).toBe(1);
  });

  it('snapping a rank match wins the center pile', () => {
    const s = snapState([[c('3', 'diamonds')], [c('2', 'spades')]], [c('7', 'clubs'), c('7', 'hearts')]);
    const next = snapGame.reduce(s, { intent: 'snap', playerId: 'p2' });
    const gs = next.game.gameState as { stacks: Record<string, Card[]>; center: Card[] };
    expect(gs.stacks.p2.map((x) => x.id)).toEqual(['7c', '7h', '2s']);
    expect(gs.center).toHaveLength(0);
  });

  it('a wrong snap gives a card to the center', () => {
    const s = snapState([[c('3', 'diamonds'), c('5', 'hearts')], [c('2', 'spades')]], [c('7', 'clubs'), c('K', 'diamonds')]);
    const next = snapGame.reduce(s, { intent: 'snap', playerId: 'p1' });
    const gs = next.game.gameState as { stacks: Record<string, Card[]>; center: Card[] };
    expect(gs.stacks.p1.map((x) => x.id)).toEqual(['3d']);
    expect(gs.center.map((x) => x.id)).toEqual(['7c', 'Kd', '5h']);
  });

  it('the last player with cards wins', () => {
    const s = snapState([[c('3', 'diamonds'), c('5', 'hearts')], []]);
    const next = snapGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as { winner: string }).winner).toBe('p1');
  });

  it('cannot snap with fewer than two center cards', () => {
    const s = snapState([[c('3', 'diamonds')], [c('2', 'spades')]], [c('7', 'clubs')]);
    expect(() => snapGame.reduce(s, { intent: 'snap', playerId: 'p1' })).toThrow(EngineError);
  });
});
