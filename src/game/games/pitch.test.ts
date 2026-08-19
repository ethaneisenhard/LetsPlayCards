import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EnginePlayer, type EngineState } from '../state';
import { pitchGame } from './pitch';
import type { Card, Rank, Suit } from '../types';
import type { GameType } from '../gameTypes';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(gameType: GameType, n: number, settings = { dealCount: 6, maxPlayers: 7 }): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

const mk = (id: string, seat: number, hand: Card[]): EnginePlayer => ({
  id, name: id.toUpperCase(), seat, hand, isCreator: seat === 0, isReady: true,
});

function finalTrickState(highBid: number): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'pitch',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 6, maxPlayers: 7 },
      gameState: {
        phase: 'playing', bids: { p1: highBid, p2: 0 }, highBid, highBidder: 'p1', trump: 'spades',
        currentTrick: [], leadSuit: null,
        captured: {
          p1: [c('A', 'spades'), c('K', 'spades'), c('J', 'spades'), c('Q', 'spades'), c('10', 'spades')],
          p2: [c('2', 'spades'), c('3', 'spades'), c('4', 'spades'), c('5', 'spades'), c('6', 'spades')],
        },
        tricksPlayed: 5, scores: { p1: 0, p2: 0 }, winner: null,
      },
    },
    players: [mk('p1', 0, [c('9', 'spades')]), mk('p2', 1, [c('8', 'spades')])],
  };
}

describe('pitch', () => {
  it('deals 6 cards each and starts bidding', () => {
    const s = pitchGame.setup(lobby('pitch', 3));
    expect(s.players.every((p) => p.hand.length === 6)).toBe(true);
    expect((s.game.gameState as { phase: string }).phase).toBe('bidding');
  });

  it('highest bidder wins the bid and names trump', () => {
    const s = pitchGame.setup(lobby('pitch', 2));
    let next = pitchGame.reduce(s, { intent: 'bid', playerId: 'p1', amount: 2 });
    next = pitchGame.reduce(next, { intent: 'bid', playerId: 'p2', amount: 3 });
    const gs = next.game.gameState as { phase: string; highBidder: string; highBid: number };
    expect(gs.phase).toBe('trump');
    expect(gs.highBidder).toBe('p2');
    expect(gs.highBid).toBe(3);
    next = pitchGame.reduce(next, { intent: 'set-trump', playerId: 'p2', suit: 'hearts' });
    expect((next.game.gameState as { phase: string; trump: Suit }).phase).toBe('playing');
    expect((next.game.gameState as { trump: Suit }).trump).toBe('hearts');
  });

  it('requires a bid to exceed the current high', () => {
    const s = pitchGame.setup(lobby('pitch', 2));
    const next = pitchGame.reduce(s, { intent: 'bid', playerId: 'p1', amount: 3 });
    expect(() => pitchGame.reduce(next, { intent: 'bid', playerId: 'p2', amount: 1 })).toThrow(EngineError);
  });

  it('only the highest bidder may name trump', () => {
    const s = pitchGame.setup(lobby('pitch', 2));
    let next = pitchGame.reduce(s, { intent: 'bid', playerId: 'p1', amount: 2 });
    next = pitchGame.reduce(next, { intent: 'bid', playerId: 'p2', amount: 3 });
    expect(() => pitchGame.reduce(next, { intent: 'set-trump', playerId: 'p1', suit: 'hearts' })).toThrow(EngineError);
  });

  it('awards High, Low, Jack, and Game after 6 tricks when the bid is made', () => {
    const s = finalTrickState(3);
    let next = pitchGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9s' });
    next = pitchGame.reduce(next, { intent: 'play', playerId: 'p2', cardId: '8s' });
    const gs = next.game.gameState as { phase: string; scores: Record<string, number> };
    // p1: High (A♠) + Jack (J♠) + Game (20 vs 0) = 3; p2: Low (2♠) = 1
    expect(gs.scores.p1).toBe(3);
    expect(gs.scores.p2).toBe(1);
    expect(gs.phase).toBe('bidding'); // nobody at 21 yet → redeal
  });

  it('penalizes the bidder the bid amount when they fail to make it', () => {
    const s = finalTrickState(4);
    let next = pitchGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9s' });
    next = pitchGame.reduce(next, { intent: 'play', playerId: 'p2', cardId: '8s' });
    const gs = next.game.gameState as { scores: Record<string, number> };
    // p1 earned 3 but bid 4 → loses 4 (3 - 4 = -1); p2 still +1 for Low
    expect(gs.scores.p1).toBe(-1);
    expect(gs.scores.p2).toBe(1);
  });
});
