import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { slapjackGame } from './slapjack';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'slapjack', { dealCount: 7, maxPlayers: 8 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function sjState(stacks: Card[][], center: Card[] = [], currentSeat = 0): EngineState {
  const players = stacks.map((stack, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand: stack,
    isCreator: i === 0, isReady: true,
  }));
  const stackMap: Record<string, Card[]> = {};
  players.forEach((p) => { stackMap[p.id] = p.hand; });
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'slapjack',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 8 },
      gameState: { stacks: stackMap, center, out: [], winner: null },
    },
    players,
  };
}

describe('slapjack', () => {
  it('deals all 52 cards face-down into stacks', () => {
    const s = slapjackGame.setup(lobby(4));
    const total = s.players.reduce((n, p) => n + p.hand.length, 0);
    expect(total).toBe(52);
    expect(s.game.status).toBe('playing');
  });

  it('flip moves the top card to center and advances the turn', () => {
    const s = sjState([[c('3', 'diamonds'), c('5', 'hearts')], [c('2', 'spades')]]);
    const next = slapjackGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['3d']);
    expect((next.game.gameState as { center: Card[] }).center.map((x) => x.id)).toEqual(['5h']);
    expect(next.game.currentSeat).toBe(1);
  });

  it('slapping a jack wins the center pile', () => {
    const s = sjState([[c('3', 'diamonds')], []], [c('7', 'clubs'), c('J', 'hearts')]);
    const next = slapjackGame.reduce(s, { intent: 'slap', playerId: 'p2' });
    const gs = next.game.gameState as { stacks: Record<string, Card[]>; center: Card[] };
    expect(gs.stacks.p2.map((x) => x.id)).toEqual(['7c', 'Jh']);
    expect(gs.center).toHaveLength(0);
  });

  it('a wrong slap gives your top card to the center', () => {
    const s = sjState([[c('3', 'diamonds'), c('5', 'hearts')], [c('2', 'spades')]], [c('7', 'clubs'), c('K', 'diamonds')]);
    const next = slapjackGame.reduce(s, { intent: 'slap', playerId: 'p1' });
    const gs = next.game.gameState as { stacks: Record<string, Card[]>; center: Card[] };
    expect(gs.stacks.p1.map((x) => x.id)).toEqual(['3d']);
    expect(gs.center.map((x) => x.id)).toEqual(['7c', 'Kd', '5h']);
  });

  it('the last player with cards wins', () => {
    const s = sjState([[c('3', 'diamonds'), c('5', 'hearts')], []]);
    const next = slapjackGame.reduce(s, { intent: 'flip', playerId: 'p1' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as { winner: string }).winner).toBe('p1');
  });

  it('rejects flipping with an empty stack', () => {
    const s = sjState([[], [c('2', 'spades')]]);
    expect(() => slapjackGame.reduce(s, { intent: 'flip', playerId: 'p1' })).toThrow(EngineError);
  });
});
