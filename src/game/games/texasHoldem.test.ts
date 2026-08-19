import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import { texasHoldemGame } from './texasHoldem';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'texas_holdem', { dealCount: 2, maxPlayers: 10 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

type TH = {
  phase: string;
  pot: number;
  chips: Record<string, number>;
  currentBet: number;
  currentPlayerId: string | null;
  community: Card[];
  winners: string[];
};

const gs = (s: EngineState): TH => s.game.gameState as unknown as TH;

function riverState(pot: number, community: Card[], hands: Record<string, Card[]>, chips: Record<string, number>): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'texas_holdem',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 2, maxPlayers: 10 },
      gameState: {
        phase: 'river', pot, chips: { ...chips },
        committed: { p1: 0, p2: 0 }, currentBet: 0, currentPlayerId: 'p1',
        dealerSeat: 0, folded: {}, allIn: {}, acted: {}, community, winners: [],
      },
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands.p1, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands.p2, isCreator: false, isReady: true },
    ],
  };
}

describe('texas holdem', () => {
  it('deals 2 hole cards and auto-posts small/big blinds', () => {
    const s = texasHoldemGame.setup(lobby(3));
    expect(s.game.status).toBe('playing');
    expect(s.players.every((p) => p.hand.length === 2)).toBe(true);
    expect(gs(s).chips).toEqual({ p1: 99, p2: 98, p3: 100 });
    expect(gs(s).pot).toBe(3);
    expect(gs(s).currentBet).toBe(2);
    expect(gs(s).phase).toBe('pre_flop');
    expect(gs(s).currentPlayerId).toBe('p3'); // left of the big blind (seat 2)
  });

  it('folding leaves a single player who wins the pot immediately', () => {
    const s = texasHoldemGame.setup(lobby(2));
    const next = texasHoldemGame.reduce(s, { intent: 'fold', playerId: 'p1' });
    expect(next.game.status).toBe('finished');
    expect(gs(next).winners).toEqual(['p2']);
    expect(gs(next).chips.p2).toBe(101); // 98 + pot of 3
    expect(texasHoldemGame.isTerminal(next)).toBe(true);
  });

  it('rejects a check when there is a bet to call', () => {
    const s = texasHoldemGame.setup(lobby(3));
    expect(() => texasHoldemGame.reduce(s, { intent: 'check', playerId: 'p3' })).toThrow(EngineError);
  });

  it('raise increases the current bet', () => {
    const s = texasHoldemGame.setup(lobby(3));
    const next = texasHoldemGame.reduce(s, { intent: 'raise', playerId: 'p3', amount: 2 });
    expect(gs(next).currentBet).toBe(4);
    expect(gs(next).chips.p3).toBe(96);
  });

  it('awards the pot to the best 5-of-7 hand at showdown', () => {
    const community = [c('2'), c('7', 'clubs'), c('9', 'diamonds'), c('J', 'spades'), c('3', 'clubs')];
    const s = riverState(
      10,
      community,
      { p1: [c('A', 'clubs'), c('A', 'spades')], p2: [c('K', 'clubs'), c('K', 'spades')] },
      { p1: 90, p2: 90 },
    );
    let next = texasHoldemGame.reduce(s, { intent: 'check', playerId: 'p1' });
    expect(gs(next).currentPlayerId).toBe('p2');
    next = texasHoldemGame.reduce(next, { intent: 'check', playerId: 'p2' });
    expect(next.game.status).toBe('finished');
    expect(gs(next).winners).toEqual(['p1']);
    expect(gs(next).chips.p1).toBe(100);
    expect(gs(next).chips.p2).toBe(90);
  });

  it('splits the pot evenly on a tie', () => {
    const community = [c('2'), c('7', 'clubs'), c('9', 'diamonds'), c('J', 'spades'), c('3', 'clubs')];
    const s = riverState(
      11,
      community,
      { p1: [c('A', 'hearts'), c('K', 'hearts')], p2: [c('A', 'spades'), c('K', 'spades')] },
      { p1: 90, p2: 90 },
    );
    let next = texasHoldemGame.reduce(s, { intent: 'check', playerId: 'p1' });
    next = texasHoldemGame.reduce(next, { intent: 'check', playerId: 'p2' });
    expect(gs(next).winners).toEqual(['p1', 'p2']);
    expect(gs(next).chips.p1).toBe(96); // 90 + 5 + 1 remainder
    expect(gs(next).chips.p2).toBe(95); // 90 + 5
    expect(texasHoldemGame.score(next)).toEqual({ p1: 96, p2: 95 });
  });
});
