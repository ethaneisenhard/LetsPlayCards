import { describe, it, expect } from 'vitest';
import { freecellGame, type FreeCellState } from './freecell';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function lobby(): EngineState {
  return addPlayer(createLobbyState('g1', 'ABC123', 'freecell', { dealCount: 0, maxPlayers: 1 }), 'p1', 'Solo');
}

function freecellState(gs: FreeCellState): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'freecell',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 0, maxPlayers: 1 }, gameState: gs,
    },
    players: [{ id: 'p1', name: 'Solo', seat: 0, hand: [], isCreator: true, isReady: true }],
  };
}

describe('freecell solitaire', () => {
  it('deals all 52 cards into 8 columns (4×7 + 4×6)', () => {
    const s = freecellGame.setup(lobby());
    const gs = s.game.gameState as FreeCellState;
    expect(gs.columns).toHaveLength(8);
    expect(gs.columns.map((col) => col.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6]);
    expect(gs.columns.reduce((a, b) => a + b.length, 0)).toBe(52);
    expect(gs.freecells).toEqual([null, null, null, null]);
    expect(gs.foundations).toEqual([[], [], [], []]);
  });

  it('moves a card into an empty freecell', () => {
    const gs: FreeCellState = {
      columns: [[c('7', 'spades')], [], [], [], [], [], [], []],
      freecells: [null, null, null, null],
      foundations: [[], [], [], []],
      won: false,
    };
    const after = freecellGame.reduce(freecellState(gs), {
      intent: 'move', from: 'column', fromIndex: 0, to: 'freecell', toIndex: 0, cardId: c('7', 'spades').id,
    });
    const gs2 = after.game.gameState as FreeCellState;
    expect(gs2.freecells[0]).toEqual(c('7', 'spades'));
    expect(gs2.columns[0]).toEqual([]);
  });

  it('rejects a move into an occupied freecell', () => {
    const gs: FreeCellState = {
      columns: [[c('7', 'spades')], [], [], [], [], [], [], []],
      freecells: [c('A', 'hearts'), null, null, null],
      foundations: [[], [], [], []],
      won: false,
    };
    expect(() =>
      freecellGame.reduce(freecellState(gs), {
        intent: 'move', from: 'column', fromIndex: 0, to: 'freecell', toIndex: 0, cardId: c('7', 'spades').id,
      }),
    ).toThrow(EngineError);
  });

  it('empty column accepts any card (not just a King)', () => {
    const gs: FreeCellState = {
      columns: [[c('5', 'diamonds')], [], [], [], [], [], [], []],
      freecells: [null, null, null, null],
      foundations: [[], [], [], []],
      won: false,
    };
    const after = freecellGame.reduce(freecellState(gs), {
      intent: 'move', from: 'column', fromIndex: 0, to: 'column', toIndex: 1, cardId: c('5', 'diamonds').id,
    });
    const gs2 = after.game.gameState as FreeCellState;
    expect(gs2.columns[1]).toEqual([c('5', 'diamonds')]);
    expect(gs2.columns[0]).toEqual([]);
  });

  it('builds a foundation from a freecell', () => {
    const gs: FreeCellState = {
      columns: Array.from({ length: 8 }, () => []),
      freecells: [c('A', 'hearts'), null, null, null],
      foundations: [[], [], [], []],
      won: false,
    };
    const after = freecellGame.reduce(freecellState(gs), {
      intent: 'move', from: 'freecell', fromIndex: 0, to: 'foundation', toIndex: 0, cardId: c('A', 'hearts').id,
    });
    const gs2 = after.game.gameState as FreeCellState;
    expect(gs2.foundations[0]).toEqual([c('A', 'hearts')]);
    expect(gs2.freecells[0]).toBeNull();
  });

  it('wins when the final King completes all four foundations', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundations = suits.map((suit) => RANKS.map((r) => c(r, suit)));
    foundations[3] = RANKS.slice(0, 12).map((r) => c(r, 'spades')); // A..Q of spades
    const gs: FreeCellState = {
      columns: Array.from({ length: 8 }, () => []),
      freecells: [c('K', 'spades'), null, null, null],
      foundations,
      won: false,
    };
    const after = freecellGame.reduce(freecellState(gs), {
      intent: 'move', from: 'freecell', fromIndex: 0, to: 'foundation', toIndex: 3, cardId: c('K', 'spades').id,
    });
    expect(after.game.status).toBe('finished');
    expect((after.game.gameState as FreeCellState).won).toBe(true);
    expect(freecellGame.isTerminal(after)).toBe(true);
  });
});
