import { describe, it, expect } from 'vitest';
import { speedGame, isSpeedPlayable, type SpeedState } from './speed';
import type { EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function spdState(hands: Card[][], stacks: Card[][], center: [Card[], Card[]], stock: Card[] = []): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'speed',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 5, maxPlayers: 2 },
      gameState: {
        stacks: { p1: stacks[0], p2: stacks[1] },
        center,
        stock,
        winner: null,
      } satisfies SpeedState,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands[0], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands[1] ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('speed', () => {
  it('deals 20-card stacks + 5-card hands and starts two center piles', () => {
    let lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'speed',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 5, maxPlayers: 2 }, gameState: {},
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      ],
    };
    const s = speedGame.setup(lobby);
    const gs = s.game.gameState as SpeedState;
    expect(s.game.status).toBe('playing');
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[1].hand).toHaveLength(5);
    expect(gs.stacks.p1).toHaveLength(20);
    expect(gs.stacks.p2).toHaveLength(20);
    expect(gs.center[0]).toHaveLength(1);
    expect(gs.center[1]).toHaveLength(1);
    expect(gs.stock).toHaveLength(0);
  });

  it('rejects a non-2-player lobby', () => {
    const lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'speed',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 5, maxPlayers: 2 }, gameState: {},
      },
      players: [{ id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true }],
    };
    expect(() => speedGame.setup(lobby)).toThrow(/exactly 2 players/);
  });

  it('plays a card one rank higher and refills from the stack', () => {
    const s = spdState(
      [[c('7')], [c('3')]],
      [[c('8', 'clubs')], [c('4', 'clubs')]],
      [[c('6', 'spades')], [c('2', 'diamonds')]],
    );
    const next = speedGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7h' });
    const gs = next.game.gameState as SpeedState;
    expect(gs.center[0].map((x) => x.id)).toEqual(['6s', '7h']);
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['8c']);
    expect(gs.stacks.p1).toHaveLength(0);
    expect(next.game.status).toBe('playing');
  });

  it('rejects a card that is not one rank higher or lower', () => {
    const s = spdState(
      [[c('7')], [c('3')]],
      [[], []],
      [[c('9', 'spades')], [c('K', 'clubs')]],
    );
    expect(() => speedGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7h' })).toThrow(/one rank higher or lower/);
  });

  it('wraps A↔K and A↔2', () => {
    expect(isSpeedPlayable('A', 'K')).toBe(true);
    expect(isSpeedPlayable('K', 'A')).toBe(true);
    expect(isSpeedPlayable('2', 'A')).toBe(true);
    expect(isSpeedPlayable('A', '2')).toBe(true);
    expect(isSpeedPlayable('3', 'A')).toBe(false);
  });

  it('wins when both hand and stack are emptied', () => {
    const s = spdState(
      [[c('7')], [c('3')]],
      [[], [c('4', 'clubs')]],
      [[c('6', 'spades')], [c('2', 'diamonds')]],
    );
    const next = speedGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7h' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as SpeedState).winner).toBe('p1');
    expect(speedGame.isTerminal(next)).toBe(true);
    expect(speedGame.score(next)).toEqual({ p1: 1 });
  });

  it('draw-center flips one card onto each center pile from stock', () => {
    const s = spdState(
      [[c('7')], [c('3')]],
      [[], []],
      [[c('6', 'spades')], [c('2', 'diamonds')]],
      [c('A', 'clubs'), c('9', 'hearts')],
    );
    const next = speedGame.reduce(s, { intent: 'draw-center' });
    const gs = next.game.gameState as SpeedState;
    expect(gs.center[0].map((x) => x.id)).toEqual(['6s', 'Ac']);
    expect(gs.center[1].map((x) => x.id)).toEqual(['2d', '9h']);
    expect(gs.stock).toHaveLength(0);
  });
});
