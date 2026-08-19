import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EnginePlayer, type EngineState } from '../state';
import { bridgeGame } from './bridge';
import type { Card, Rank, Suit } from '../types';
import type { GameType } from '../gameTypes';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(gameType: GameType, n: number, settings = { dealCount: 0, maxPlayers: 4 }): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

const mk = (id: string, seat: number, hand: Card[]): EnginePlayer => ({
  id, name: id.toUpperCase(), seat, hand, isCreator: seat === 0, isReady: true,
});

function playingState(level: number): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'bridge',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 0, maxPlayers: 4 },
      gameState: {
        phase: 'playing', dealerId: 'p1', bids: [],
        contract: { level, trump: 'spades' }, declarerId: 'p1', dummyId: 'p3',
        dummyHand: [c('10', 'hearts')], currentTrick: [], leadSuit: null,
        tricksWon: { p1: 8, p2: 0, p3: 0, p4: 0 }, tricksPlayed: 12,
        teamScore: [0, 0], winner: null,
      },
    },
    players: [
      mk('p1', 0, [c('9', 'hearts')]),
      mk('p2', 1, [c('A', 'hearts')]),
      mk('p3', 2, [c('10', 'hearts')]),
      mk('p4', 3, [c('K', 'hearts')]),
    ],
  };
}

describe('bridge', () => {
  it('deals 13 cards each to 4 players', () => {
    const s = bridgeGame.setup(lobby('bridge', 4));
    expect(s.players.every((p) => p.hand.length === 13)).toBe(true);
    expect((s.game.gameState as { phase: string }).phase).toBe('bidding');
  });

  it('resolves the auction to a contract, declarer, and exposed dummy', () => {
    const s = bridgeGame.setup(lobby('bridge', 4));
    let next = bridgeGame.reduce(s, { intent: 'bid', playerId: 'p1', level: 1, trump: 'clubs' });
    next = bridgeGame.reduce(next, { intent: 'bid', playerId: 'p2', level: 1, trump: 'spades' });
    next = bridgeGame.reduce(next, { intent: 'bid', playerId: 'p3', level: 2, trump: 'hearts' });
    next = bridgeGame.reduce(next, { intent: 'bid', playerId: 'p4', level: 1, trump: 'nt' });
    const gs = next.game.gameState as {
      phase: string; contract: { level: number; trump: string }; declarerId: string; dummyId: string; dummyHand: Card[];
    };
    expect(gs.phase).toBe('playing');
    expect(gs.contract).toEqual({ level: 2, trump: 'hearts' });
    expect(gs.declarerId).toBe('p3'); // first to bid the winning trump
    expect(gs.dummyId).toBe('p1'); // partner of seat 2 is seat 0
    expect(gs.dummyHand).toHaveLength(13);
    expect(next.game.currentSeat).toBe(3); // left of declarer leads
  });

  it('plays a trick through the dummy and scores a made contract', () => {
    const s = playingState(2); // 2♠ needs 8 tricks; declarer team has 8
    let next = bridgeGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9h' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p2', cardId: 'Ah' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p1', cardId: '10h', hand: 'dummy' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p4', cardId: 'Kh' });
    const gs = next.game.gameState as { phase: string; teamScore: [number, number]; winner: string };
    expect(gs.phase).toBe('finished');
    expect(gs.teamScore).toEqual([60, 0]); // 2 spades = 2 * 30
    expect(gs.winner).toBe('0');
  });

  it('scores -50 per undertrick when the contract fails', () => {
    const s = playingState(3); // 3♠ needs 9 tricks; declarer team has only 8
    let next = bridgeGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9h' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p2', cardId: 'Ah' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p1', cardId: '10h', hand: 'dummy' });
    next = bridgeGame.reduce(next, { intent: 'play', playerId: 'p4', cardId: 'Kh' });
    const gs = next.game.gameState as { teamScore: [number, number]; winner: string };
    expect(gs.teamScore).toEqual([-50, 0]); // one undertrick
    expect(gs.winner).toBe('1');
  });

  it('requires the declarer to play from the dummy hand', () => {
    const s = playingState(2);
    const lead = bridgeGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9h' });
    const second = bridgeGame.reduce(lead, { intent: 'play', playerId: 'p2', cardId: 'Ah' });
    expect(() => bridgeGame.reduce(second, { intent: 'play', playerId: 'p1', cardId: '10h' })).toThrow(EngineError);
  });
});
