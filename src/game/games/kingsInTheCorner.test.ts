import { describe, it, expect } from 'vitest';
import { kingsInTheCornerGame, faceValue, type KingsCornerState } from './kingsInTheCorner';
import type { EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function kcState(hands: Card[][], corners: Card[][], currentSeat = 0, deck: Card[] = []): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'kings_in_the_corner',
      deck, tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 6 },
      gameState: { corners, center: [], discard: [], winner: null } satisfies KingsCornerState,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands[0], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands[1] ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('kings in the corner', () => {
  it('deals 7 cards each and four empty corners', () => {
    const lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'kings_in_the_corner',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 7, maxPlayers: 6 }, gameState: {},
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      ],
    };
    const s = kingsInTheCornerGame.setup(lobby);
    const gs = s.game.gameState as KingsCornerState;
    expect(s.players.every((p) => p.hand.length === 7)).toBe(true);
    expect(gs.corners).toEqual([[], [], [], []]);
  });

  it('only a King can start an empty corner', () => {
    const s = kcState([[c('7', 'hearts'), c('K', 'spades')]], [[], [], [], []]);
    expect(() => kingsInTheCornerGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7h', corner: 0 })).toThrow(/Only a King/);
    const next = kingsInTheCornerGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Ks', corner: 0 });
    expect((next.game.gameState as KingsCornerState).corners[0].map((x) => x.id)).toEqual(['Ks']);
  });

  it('builds descending and alternating color', () => {
    const s = kcState([[c('Q', 'spades')]], [[c('K', 'hearts')], [], [], []]);
    const next = kingsInTheCornerGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Qs', corner: 0 });
    expect((next.game.gameState as KingsCornerState).corners[0].map((x) => x.id)).toEqual(['Kh', 'Qs']);
  });

  it('rejects same color and non-consecutive plays', () => {
    const sameColor = kcState([[c('Q', 'diamonds')]], [[c('K', 'hearts')], [], [], []]);
    expect(() => kingsInTheCornerGame.reduce(sameColor, { intent: 'play', playerId: 'p1', cardId: 'Qd', corner: 0 })).toThrow(/alternate color/);

    const skip = kcState([[c('10', 'spades')]], [[c('K', 'hearts')], [], [], []]);
    expect(() => kingsInTheCornerGame.reduce(skip, { intent: 'play', playerId: 'p1', cardId: '10s', corner: 0 })).toThrow(/one rank lower/);
  });

  it('play-center starts a new center pile with any card', () => {
    const s = kcState([[c('4', 'clubs')]], [[], [], [], []]);
    const next = kingsInTheCornerGame.reduce(s, { intent: 'play-center', playerId: 'p1', cardId: '4c' });
    expect((next.game.gameState as KingsCornerState).center).toEqual([[c('4', 'clubs')]]);
  });

  it('draw takes one from stock and advances the turn', () => {
    const s = kcState([[c('4', 'clubs')]], [[], [], [], []], 0, [c('A', 'spades')]);
    const next = kingsInTheCornerGame.reduce(s, { intent: 'draw', playerId: 'p1' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['4c', 'As']);
    expect(next.game.currentSeat).toBe(1);
  });

  it('wins on an empty hand', () => {
    const s = kcState([[c('Q', 'spades')]], [[c('K', 'hearts')], [], [], []]);
    const next = kingsInTheCornerGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Qs', corner: 0 });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as KingsCornerState).winner).toBe('p1');
    expect(kingsInTheCornerGame.score(next)).toEqual({ p1: 1 });
  });

  it('faceValue maps A=1 … K=13', () => {
    expect(faceValue('A')).toBe(1);
    expect(faceValue('10')).toBe(10);
    expect(faceValue('K')).toBe(13);
  });
});
