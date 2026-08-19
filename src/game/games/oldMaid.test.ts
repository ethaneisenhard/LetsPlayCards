import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { oldMaidGame, discardPairs } from './oldMaid';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'old_maid', { dealCount: 7, maxPlayers: 8 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function omState(hands: Card[][], currentSeat = 0): EngineState {
  const players = hands.map((hand, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand,
    isCreator: i === 0, isReady: true,
  }));
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'old_maid',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 8 }, gameState: { winners: [], loser: null },
    },
    players,
  };
}

describe('old maid', () => {
  it('removes one queen and deals all 51 cards, pairing initial pairs', () => {
    const s = oldMaidGame.setup(lobby(3));
    expect(s.game.status).toBe('playing');
    expect(s.game.deck).toHaveLength(0);
    const total = s.players.reduce((n, p) => n + p.hand.length, 0);
    // 51 cards (one queen removed) → an odd number of unpaired cards remain;
    // a full 52-card deck would pair down to an even total.
    expect(total % 2).toBe(1);
    expect(total).toBeGreaterThan(0);
    // No player may hold a pair after setup.
    for (const p of s.players) {
      expect(new Set(p.hand.map((x) => x.rank)).size).toBe(p.hand.length);
    }
  });

  it('discardPairs removes matching-rank pairs, keeping the unmatched card', () => {
    expect(discardPairs([c('2', 'hearts'), c('2', 'clubs'), c('Q', 'spades')]).map((x) => x.id)).toEqual(['Qs']);
    expect(discardPairs([c('3', 'hearts'), c('4', 'clubs')]).map((x) => x.id)).toEqual(['3h', '4c']);
  });

  it('drawing a matching card forms a pair and ends the game', () => {
    const s = omState([[c('Q', 'spades'), c('2', 'hearts')], [c('2', 'clubs')], []]);
    const next = oldMaidGame.reduce(s, { intent: 'draw-from', playerId: 'p1', targetId: 'p2' });
    expect(next.game.status).toBe('finished');
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['Qs']);
    expect(next.players[1].hand).toHaveLength(0);
    expect(oldMaidGame.isTerminal(next)).toBe(true);
    expect(oldMaidGame.score(next)).toEqual({ p1: 0, p2: 1, p3: 1 });
  });

  it('drawing a non-matching card keeps the turn moving', () => {
    const s = omState([[c('Q', 'spades'), c('2', 'hearts')], [c('3', 'clubs')], [c('4', 'diamonds')]]);
    const next = oldMaidGame.reduce(s, { intent: 'draw-from', playerId: 'p1', targetId: 'p2' });
    expect(next.game.status).toBe('playing');
    expect(next.players[0].hand).toHaveLength(3);
    expect(next.game.currentSeat).toBe(2); // p1 emptied p2, so turn skips to p3
  });

  it('rejects drawing from yourself or an empty hand', () => {
    expect(() => oldMaidGame.reduce(omState([[c('Q', 'spades')], [c('2', 'hearts')]]), { intent: 'draw-from', playerId: 'p1', targetId: 'p1' })).toThrow(EngineError);
    expect(() => oldMaidGame.reduce(omState([[c('Q', 'spades')], []]), { intent: 'draw-from', playerId: 'p1', targetId: 'p2' })).toThrow(EngineError);
  });
});
