import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { cheatGame } from './cheat';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'cheat', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 0, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface CheatGS {
  rankIndex: number;
  center: Card[];
  pendingPlay: { playerId: string; declaredRank: string; cards: Card[] } | null;
  winner: string | null;
}

function chState(
  hands: Record<string, Card[]>,
  rankIndex: number,
  center: Card[] = [],
  pendingPlay: CheatGS['pendingPlay'] = null,
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'cheat',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 0, maxPlayers: 6 },
      gameState: { rankIndex, center, pendingPlay, winner: null } as CheatGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands.p1, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands.p2, isCreator: false, isReady: true },
      { id: 'p3', name: 'P3', seat: 2, hand: hands.p3 ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('cheat', () => {
  it('deals all cards', () => {
    const s = cheatGame.setup(lobby('cheat', 3, 6));
    expect(s.players.every((p) => p.hand.length === 17)).toBe(true);
  });

  it('implies the declared rank from the sequence', () => {
    const s = chState({ p1: [c('2', 'clubs'), c('3', 'clubs')], p2: [c('K')] }, 1);
    const next = cheatGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'] });
    const gs = next.game.gameState as CheatGS;
    expect(gs.pendingPlay?.declaredRank).toBe('2');
    expect(gs.rankIndex).toBe(2);
  });

  it('a lie (card not matching the implied rank) is caught by doubt', () => {
    const s = chState({ p1: [c('K', 'spades')], p2: [c('3', 'clubs')] }, 1); // implies "2", plays K
    const played = cheatGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['Ks'] });
    const next = cheatGame.reduce(played, { intent: 'doubt', challengerId: 'p2' });
    expect(next.players[0].hand.map((x) => x.rank)).toEqual(['K']);
  });

  it('a truthful play punishes the challenger', () => {
    const s = chState({ p1: [c('2', 'clubs')], p2: [] }, 1);
    const played = cheatGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'] });
    const next = cheatGame.reduce(played, { intent: 'doubt', challengerId: 'p2' });
    expect(next.players[1].hand.map((x) => x.id)).toEqual(['2c']);
  });

  it('wins when a player empties their hand', () => {
    const s = chState({ p1: [c('2', 'clubs')], p2: [c('K')] }, 1);
    const next = cheatGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c'] });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as CheatGS).winner).toBe('p1');
  });

  it('rejects playing more than four cards', () => {
    const s = chState({ p1: [c('2', 'clubs'), c('2', 'diamonds'), c('2', 'spades'), c('3', 'clubs'), c('3', 'diamonds')], p2: [c('K')] }, 1);
    expect(() => cheatGame.reduce(s, { intent: 'play', playerId: 'p1', cards: ['2c', '2d', '2s', '3c', '3d'] })).toThrow(EngineError);
  });
});
