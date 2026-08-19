import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EnginePlayer, type EngineState } from '../state';
import { pinochleGame } from './pinochle';
import type { Card, Rank, Suit } from '../types';
import type { GameType } from '../gameTypes';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(gameType: GameType, n: number, settings = { dealCount: 12, maxPlayers: 4 }): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

const mk = (id: string, seat: number, hand: Card[]): EnginePlayer => ({
  id, name: id.toUpperCase(), seat, hand, isCreator: seat === 0, isReady: true,
});

function meldState(hand: Card[]): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'pinochle',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 12, maxPlayers: 4 },
      gameState: {
        phase: 'meld', trump: 'spades', trumpSetter: 'p1', meldDone: [], declared: {},
        currentTrick: [], leadSuit: null, tricksPlayed: 0,
        scores: { p1: 0, p2: 0, p3: 0, p4: 0 }, winner: null,
      },
    },
    players: [mk('p1', 0, hand), mk('p2', 1, []), mk('p3', 2, []), mk('p4', 3, [])],
  };
}

describe('pinochle', () => {
  it('deals 12 cards each from a 48-card deck', () => {
    const s = pinochleGame.setup(lobby('pinochle', 4));
    expect(s.players.every((p) => p.hand.length === 12)).toBe(true);
    const total = s.players.reduce((n, p) => n + p.hand.length, 0);
    expect(total).toBe(48);
    expect((s.game.gameState as { phase: string }).phase).toBe('trump');
  });

  it('set-trump moves to the meld phase', () => {
    const s = pinochleGame.setup(lobby('pinochle', 4));
    const next = pinochleGame.reduce(s, { intent: 'set-trump', playerId: 'p1', suit: 'hearts' });
    const gs = next.game.gameState as { phase: string; trump: Suit };
    expect(gs.phase).toBe('meld');
    expect(gs.trump).toBe('hearts');
  });

  it('scores a marriage meld (K-Q of trump) at 40', () => {
    const s = meldState([c('K', 'spades'), c('Q', 'spades')]);
    const next = pinochleGame.reduce(s, { intent: 'meld', playerId: 'p1', type: 'marriage' });
    expect((next.game.gameState as { scores: Record<string, number> }).scores.p1).toBe(40);
  });

  it('scores a pinochle meld (Q♠ + J♦) at 40', () => {
    const s = meldState([c('Q', 'spades'), c('J', 'diamonds')]);
    const next = pinochleGame.reduce(s, { intent: 'meld', playerId: 'p1', type: 'pinochle' });
    expect((next.game.gameState as { scores: Record<string, number> }).scores.p1).toBe(40);
  });

  it('rejects a meld the player does not hold', () => {
    const s = meldState([c('9', 'clubs')]);
    expect(() => pinochleGame.reduce(s, { intent: 'meld', playerId: 'p1', type: 'marriage' })).toThrow(EngineError);
  });

  it('trump wins the trick and counts A/10/K=10, Q/J=5', () => {
    const s: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'playing', gameType: 'pinochle',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 12, maxPlayers: 4 },
        gameState: {
          phase: 'playing', trump: 'spades', trumpSetter: 'p1', meldDone: ['p1', 'p2', 'p3', 'p4'],
          declared: {}, currentTrick: [], leadSuit: null, tricksPlayed: 0,
          scores: { p1: 0, p2: 0, p3: 0, p4: 0 }, winner: null,
        },
      },
      players: [
        mk('p1', 0, [c('9', 'hearts')]),
        mk('p2', 1, [c('A', 'hearts')]),
        mk('p3', 2, [c('10', 'spades')]),
        mk('p4', 3, [c('K', 'hearts')]),
      ],
    };
    let next = pinochleGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9h' });
    next = pinochleGame.reduce(next, { intent: 'play', playerId: 'p2', cardId: 'Ah' });
    next = pinochleGame.reduce(next, { intent: 'play', playerId: 'p3', cardId: '10s' });
    next = pinochleGame.reduce(next, { intent: 'play', playerId: 'p4', cardId: 'Kh' });
    const gs = next.game.gameState as { scores: Record<string, number>; tricksPlayed: number };
    expect(gs.scores.p3).toBe(30); // A(10) + 10(10) + K(10) + 9(0)
    expect(gs.tricksPlayed).toBe(1);
    expect(next.game.currentSeat).toBe(2);
  });

  it('enforces follow suit', () => {
    const s: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'playing', gameType: 'pinochle',
        deck: [], tableCards: [], discardPile: [], currentSeat: 1,
        settings: { dealCount: 12, maxPlayers: 4 },
        gameState: {
          phase: 'playing', trump: 'spades', trumpSetter: 'p1', meldDone: ['p1', 'p2', 'p3', 'p4'],
          declared: {}, currentTrick: [{ playerId: 'p1', card: c('9', 'hearts') }], leadSuit: 'hearts', tricksPlayed: 0,
          scores: { p1: 0, p2: 0, p3: 0, p4: 0 }, winner: null,
        },
      },
      players: [
        mk('p1', 0, []),
        mk('p2', 1, [c('A', 'hearts'), c('K', 'spades')]),
        mk('p3', 2, []),
        mk('p4', 3, []),
      ],
    };
    expect(() => pinochleGame.reduce(s, { intent: 'play', playerId: 'p2', cardId: 'Ks' })).toThrow(EngineError);
  });
});
