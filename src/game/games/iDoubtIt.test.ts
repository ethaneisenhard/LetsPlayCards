import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { iDoubtItGame, RANK_SEQ } from './iDoubtIt';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'i_doubt_it', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 0, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface IDGS {
  rankIndex: number;
  center: Card[];
  pendingPlay: { playerId: string; declaredRank: string; cards: Card[] } | null;
  winner: string | null;
}

function dState(
  hands: Record<string, Card[]>,
  rankIndex: number,
  center: Card[] = [],
  pendingPlay: IDGS['pendingPlay'] = null,
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'i_doubt_it',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 0, maxPlayers: 6 },
      gameState: { rankIndex, center, pendingPlay, winner: null } as IDGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands.p1, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands.p2, isCreator: false, isReady: true },
      { id: 'p3', name: 'P3', seat: 2, hand: hands.p3 ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('i-doubt-it', () => {
  it('deals all cards', () => {
    const s = iDoubtItGame.setup(lobby('i_doubt_it', 3, 6));
    expect(s.players.every((p) => p.hand.length === 17)).toBe(true);
    expect((s.game.gameState as IDGS).rankIndex).toBe(0);
  });

  it('rank sequence starts at aces', () => {
    expect(RANK_SEQ[0]).toBe('A');
    expect(RANK_SEQ[12]).toBe('K');
  });

  it('plays face-down cards declaring the expected rank', () => {
    const s = dState({ p1: [c('2', 'clubs'), c('3', 'clubs')], p2: [c('K')] }, 1); // declare "2"
    const next = iDoubtItGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'], declaredRank: '2' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['3c']);
    const gs = next.game.gameState as IDGS;
    expect(gs.rankIndex).toBe(2);
    expect(gs.pendingPlay?.declaredRank).toBe('2');
  });

  it('rejects a declared rank that does not follow the sequence', () => {
    const s = dState({ p1: [c('2', 'clubs')], p2: [c('K')] }, 1);
    expect(() => iDoubtItGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'], declaredRank: '5' })).toThrow(EngineError);
  });

  it('a liar caught by doubt takes the center pile', () => {
    const s = dState({ p1: [c('K', 'spades')], p2: [c('3', 'clubs')] }, 1); // declaring "2", playing K (lie)
    const played = iDoubtItGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['Ks'], declaredRank: '2' });
    const next = iDoubtItGame.reduce(played, { intent: 'doubt', challengerId: 'p2' });
    expect(next.players[0].hand.map((x) => x.rank)).toEqual(['K']); // liar takes it back
    expect((next.game.gameState as IDGS).center).toHaveLength(0);
  });

  it('a truthful player forces the challenger to take the pile', () => {
    const s = dState({ p1: [c('2', 'clubs')], p2: [] }, 1);
    const played = iDoubtItGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'], declaredRank: '2' });
    const next = iDoubtItGame.reduce(played, { intent: 'doubt', challengerId: 'p2' });
    expect(next.players[1].hand.map((x) => x.id)).toEqual(['2c']);
  });

  it('declares a winner when a player empties their hand', () => {
    const s = dState({ p1: [c('2', 'clubs')], p2: [c('K')] }, 1);
    const next = iDoubtItGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'], declaredRank: '2' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as IDGS).winner).toBe('p1');
  });
});
