import { describe, it, expect } from 'vitest';
import { spiderGame, type SpiderState } from './spider';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank } from '../types';

const c = (rank: Rank, suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' = 'hearts'): Card =>
  ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(): EngineState {
  return addPlayer(createLobbyState('g1', 'ABC123', 'spider', { dealCount: 0, maxPlayers: 1 }), 'p1', 'Solo');
}

function spiderState(gs: SpiderState): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'spider',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 0, maxPlayers: 1 }, gameState: gs,
    },
    players: [{ id: 'p1', name: 'Solo', seat: 0, hand: [], isCreator: true, isReady: true }],
  };
}

const emptyColumns = (n: number): Card[][] => Array.from({ length: n }, () => []);

describe('spider solitaire', () => {
  it('deals 104 cards: 10 columns (4×6 + 6×5), 50 stock', () => {
    const s = spiderGame.setup(lobby());
    const gs = s.game.gameState as SpiderState;
    expect(gs.columns).toHaveLength(10);
    expect(gs.columns.map((col) => col.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(gs.columns.reduce((a, b) => a + b.length, 0)).toBe(54);
    expect(gs.stock).toHaveLength(50);
    expect(gs.removedSequences).toBe(0);
  });

  it('deal-row adds one face-up card to each column', () => {
    const s = spiderGame.setup(lobby());
    const after = spiderGame.reduce(s, { intent: 'deal-row' });
    const gs = after.game.gameState as SpiderState;
    expect(gs.columns.map((col) => col.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6, 6, 6]);
    expect(gs.stock).toHaveLength(40);
  });

  it('rejects deal-row when a column is empty', () => {
    const gs: SpiderState = {
      columns: [[], ...emptyColumns(9).map(() => [c('A', 'hearts')])],
      stock: Array.from({ length: 10 }, () => c('2', 'hearts')),
      removedSequences: 0,
      won: false,
    };
    expect(() => spiderGame.reduce(spiderState(gs), { intent: 'deal-row' })).toThrow(EngineError);
  });

  it('moves a same-suit descending run of multiple cards', () => {
    const gs: SpiderState = {
      columns: [
        [c('9', 'hearts'), c('8', 'hearts'), c('7', 'hearts')],
        [c('9', 'hearts')],
        ...emptyColumns(8),
      ],
      stock: [],
      removedSequences: 0,
      won: false,
    };
    // Move the 8+7 run (base = 8) onto the lone 9.
    const after = spiderGame.reduce(spiderState(gs), {
      intent: 'move', fromIndex: 0, toIndex: 1, cardId: c('8', 'hearts').id, count: 2,
    });
    const gs2 = after.game.gameState as SpiderState;
    expect(gs2.columns[0]).toEqual([c('9', 'hearts')]);
    expect(gs2.columns[1]).toEqual([c('9', 'hearts'), c('8', 'hearts'), c('7', 'hearts')]);
  });

  it('rejects a run of mixed suits', () => {
    const gs: SpiderState = {
      columns: [[c('9', 'hearts'), c('8', 'spades')], ...emptyColumns(9)],
      stock: [],
      removedSequences: 0,
      won: false,
    };
    expect(() =>
      spiderGame.reduce(spiderState(gs), {
        intent: 'move', fromIndex: 0, toIndex: 1, cardId: c('8', 'spades').id, count: 2,
      }),
    ).toThrow(EngineError);
  });

  it('rejects a run that is not descending', () => {
    const gs: SpiderState = {
      columns: [[c('9', 'hearts'), c('7', 'hearts')], ...emptyColumns(9)],
      stock: [],
      removedSequences: 0,
      won: false,
    };
    expect(() =>
      spiderGame.reduce(spiderState(gs), {
        intent: 'move', fromIndex: 0, toIndex: 1, cardId: c('7', 'hearts').id, count: 2,
      }),
    ).toThrow(EngineError);
  });

  it('removes a completed K→A sequence', () => {
    const ranks: Rank[] = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const run = ranks.map((r) => c(r, 'hearts')); // K..2 of hearts
    const gs: SpiderState = {
      columns: [run, [c('A', 'hearts')], ...emptyColumns(8)],
      stock: [],
      removedSequences: 0,
      won: false,
    };
    const after = spiderGame.reduce(spiderState(gs), {
      intent: 'move', fromIndex: 1, toIndex: 0, cardId: c('A', 'hearts').id, count: 1,
    });
    const gs2 = after.game.gameState as SpiderState;
    expect(gs2.removedSequences).toBe(1);
    expect(gs2.columns[0]).toEqual([]);
    expect(gs2.columns[1]).toEqual([]);
  });

  it('wins when the 8th sequence is removed', () => {
    const ranks: Rank[] = ['K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const run = ranks.map((r) => c(r, 'hearts'));
    const gs: SpiderState = {
      columns: [run, [c('A', 'hearts')], ...emptyColumns(8)],
      stock: [],
      removedSequences: 7,
      won: false,
    };
    const after = spiderGame.reduce(spiderState(gs), {
      intent: 'move', fromIndex: 1, toIndex: 0, cardId: c('A', 'hearts').id, count: 1,
    });
    expect(after.game.status).toBe('finished');
    expect((after.game.gameState as SpiderState).won).toBe(true);
    expect(spiderGame.isTerminal(after)).toBe(true);
  });
});
