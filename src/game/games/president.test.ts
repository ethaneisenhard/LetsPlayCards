import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { presidentGame, presidentRank } from './president';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'president', { dealCount: 7, maxPlayers: 7 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function prezState(hands: Card[][], currentSeat = 0, gameState: Record<string, unknown> = {}): EngineState {
  const players = hands.map((hand, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand,
    isCreator: i === 0, isReady: true,
  }));
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'president',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 7 },
      gameState: { lastPlay: null, passedSince: [], rankOrder: [], winner: null, ...gameState },
    },
    players,
  };
}

describe('president', () => {
  it('deals all 52 cards', () => {
    const s = presidentGame.setup(lobby(3));
    expect(s.players.reduce((n, p) => n + p.hand.length, 0)).toBe(52);
    expect(s.game.status).toBe('playing');
  });

  it('rank power: 3 lowest, 2 highest', () => {
    expect(presidentRank('3')).toBe(0);
    expect(presidentRank('A')).toBe(11);
    expect(presidentRank('2')).toBe(12);
  });

  it('a chain of beating plays ends when a hand empties', () => {
    let s = prezState([[c('3', 'hearts'), c('4', 'hearts')], [c('5', 'clubs'), c('6', 'clubs')], [c('2', 'diamonds')]]);
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['3h'] });
    expect(s.game.currentSeat).toBe(1);
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p2', cards: ['5c'] });
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p3', cards: ['2d'] });
    expect(s.game.status).toBe('finished');
    expect((s.game.gameState as { winner: string }).winner).toBe('p3');
  });

  it('everyone else passing clears the pile and returns the lead', () => {
    let s = prezState([[c('3', 'hearts'), c('3', 'diamonds')], [c('4', 'clubs')], [c('2', 'diamonds')]]);
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['3h'] });
    s = presidentGame.reduce(s, { intent: 'pass', playerId: 'p2' });
    s = presidentGame.reduce(s, { intent: 'pass', playerId: 'p3' });
    expect(s.game.currentSeat).toBe(0);
    expect((s.game.gameState as { lastPlay: null }).lastPlay).toBeNull();
  });

  it('rejects a play that does not beat the previous play', () => {
    let s = prezState([[c('5', 'hearts')], [c('4', 'clubs')], [c('2', 'diamonds')]]);
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['5h'] });
    expect(() => presidentGame.reduce(s, { intent: 'play', playerId: 'p2', cards: ['4c'] })).toThrow(EngineError);
  });

  it('rejects a play with a mismatched card count', () => {
    let s = prezState([[c('3', 'hearts'), c('3', 'diamonds')], [c('5', 'clubs')], [c('2', 'diamonds')]]);
    s = presidentGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['3h', '3d'] });
    expect(() => presidentGame.reduce(s, { intent: 'play', playerId: 'p2', cards: ['5c'] })).toThrow(EngineError);
  });
});
