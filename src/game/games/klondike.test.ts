import { describe, it, expect } from 'vitest';
import { klondikeGame, canStackSolitaire, canBuildSolitaire, type KlondikeState } from './klondike';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function lobby(): EngineState {
  return addPlayer(createLobbyState('g1', 'ABC123', 'klondike', { dealCount: 0, maxPlayers: 1 }), 'p1', 'Solo');
}

function klondikeState(gs: KlondikeState): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'klondike',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 0, maxPlayers: 1 }, gameState: gs,
    },
    players: [{ id: 'p1', name: 'Solo', seat: 0, hand: [], isCreator: true, isReady: true }],
  };
}

describe('klondike solitaire', () => {
  it('deals 7 columns (1..7 cards), 24 stock, 4 empty foundations', () => {
    const s = klondikeGame.setup(lobby());
    const gs = s.game.gameState as KlondikeState;
    expect(gs.columns).toHaveLength(7);
    expect(gs.columns.map((col) => col.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(gs.buried).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(gs.stock).toHaveLength(24);
    expect(gs.waste).toHaveLength(0);
    expect(gs.foundations).toEqual([[], [], [], []]);
    expect(s.game.status).toBe('playing');
  });

  it('draw-stock moves one card to the waste', () => {
    const s = klondikeGame.setup(lobby());
    const before = (s.game.gameState as KlondikeState).stock.length;
    const after = klondikeGame.reduce(s, { intent: 'draw-stock' });
    const gs = after.game.gameState as KlondikeState;
    expect(gs.stock).toHaveLength(before - 1);
    expect(gs.waste).toHaveLength(1);
  });

  it('recycles the waste back into the stock when the stock is empty', () => {
    const gs: KlondikeState = {
      columns: Array.from({ length: 7 }, () => []),
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('A', 'hearts'), c('2', 'clubs')],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), { intent: 'draw-stock' });
    const gs2 = after.game.gameState as KlondikeState;
    expect(gs2.waste).toHaveLength(0);
    expect(gs2.stock).toHaveLength(2);
  });

  it('moves an Ace from the waste onto an empty foundation', () => {
    const gs: KlondikeState = {
      columns: Array.from({ length: 7 }, () => []),
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('A', 'hearts')],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), {
      intent: 'move', from: 'waste', to: 'foundation', toIndex: 0, cardId: c('A', 'hearts').id,
    });
    const gs2 = after.game.gameState as KlondikeState;
    expect(gs2.foundations[0]).toEqual([c('A', 'hearts')]);
    expect(gs2.waste).toHaveLength(0);
  });

  it('rejects a 2 onto an empty foundation (needs an Ace first)', () => {
    const gs: KlondikeState = {
      columns: Array.from({ length: 7 }, () => []),
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('2', 'hearts')],
      won: false,
    };
    expect(() =>
      klondikeGame.reduce(klondikeState(gs), {
        intent: 'move', from: 'waste', to: 'foundation', toIndex: 0, cardId: c('2', 'hearts').id,
      }),
    ).toThrow(EngineError);
  });

  it('moves a red 6 onto a black 7 column', () => {
    const gs: KlondikeState = {
      columns: [[], [], [], [], [], [], [c('7', 'spades')]],
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('6', 'hearts')],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), {
      intent: 'move', from: 'waste', to: 'column', toIndex: 6, cardId: c('6', 'hearts').id,
    });
    const gs2 = after.game.gameState as KlondikeState;
    expect(gs2.columns[6]).toEqual([c('7', 'spades'), c('6', 'hearts')]);
  });

  it('rejects a same-color stack', () => {
    const gs: KlondikeState = {
      columns: [[], [], [], [], [], [], [c('7', 'spades')]],
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('6', 'spades')],
      won: false,
    };
    expect(() =>
      klondikeGame.reduce(klondikeState(gs), {
        intent: 'move', from: 'waste', to: 'column', toIndex: 6, cardId: c('6', 'spades').id,
      }),
    ).toThrow(EngineError);
  });

  it('only a King can start an empty column', () => {
    const gs: KlondikeState = {
      columns: [[], [], [], [], [], [], []],
      foundations: [[], [], [], []],
      stock: [],
      waste: [c('Q', 'hearts')],
      won: false,
    };
    expect(() =>
      klondikeGame.reduce(klondikeState(gs), {
        intent: 'move', from: 'waste', to: 'column', toIndex: 0, cardId: c('Q', 'hearts').id,
      }),
    ).toThrow(EngineError);
  });

  it('moves a face-up run and flips the exposed card', () => {
    const buried = c('Q', 'diamonds');
    const eight = c('8', 'spades');
    const seven = c('7', 'hearts');
    const nine = c('9', 'diamonds');
    const gs: KlondikeState = {
      columns: [[buried, eight, seven], [nine], [], [], [], [], []],
      buried: [1, 0, 0, 0, 0, 0, 0],
      foundations: [[], [], [], []],
      stock: [],
      waste: [],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), {
      intent: 'move',
      from: 'column',
      fromIndex: 0,
      to: 'column',
      toIndex: 1,
      cardId: eight.id,
      count: 2,
    });
    const gs2 = after.game.gameState as KlondikeState;
    expect(gs2.columns[0]).toEqual([buried]);
    expect(gs2.buried?.[0]).toBe(0);
    expect(gs2.columns[1]).toEqual([nine, eight, seven]);
  });

  it('rejects moving a face-down card', () => {
    const down = c('K', 'spades');
    const up = c('6', 'hearts');
    const gs: KlondikeState = {
      columns: [[down, up], [], [], [], [], [], []],
      buried: [1, 0, 0, 0, 0, 0, 0],
      foundations: [[], [], [], []],
      stock: [],
      waste: [],
      won: false,
    };
    expect(() =>
      klondikeGame.reduce(klondikeState(gs), {
        intent: 'move',
        from: 'column',
        fromIndex: 0,
        to: 'column',
        toIndex: 1,
        cardId: down.id,
      }),
    ).toThrow(EngineError);
  });

  it('recycles the waste in reverse without shuffling', () => {
    const first = c('A', 'hearts');
    const second = c('2', 'clubs');
    const gs: KlondikeState = {
      columns: Array.from({ length: 7 }, () => []),
      foundations: [[], [], [], []],
      stock: [],
      waste: [first, second],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), { intent: 'draw-stock' });
    const gs2 = after.game.gameState as KlondikeState;
    expect(gs2.waste).toHaveLength(0);
    expect(gs2.stock.map((card) => card.id)).toEqual([second.id, first.id]);
  });

  it('wins when the final King completes all four foundations', () => {
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const foundations = suits.map((suit) => RANKS.map((r) => c(r, suit)));
    foundations[3] = RANKS.slice(0, 12).map((r) => c(r, 'spades')); // A..Q of spades
    const gs: KlondikeState = {
      columns: Array.from({ length: 7 }, () => []),
      foundations,
      stock: [],
      waste: [c('K', 'spades')],
      won: false,
    };
    const after = klondikeGame.reduce(klondikeState(gs), {
      intent: 'move', from: 'waste', to: 'foundation', toIndex: 3, cardId: c('K', 'spades').id,
    });
    expect(after.game.status).toBe('finished');
    expect((after.game.gameState as KlondikeState).won).toBe(true);
    expect(klondikeGame.isTerminal(after)).toBe(true);
  });
});

describe('solitaire stack helpers', () => {
  it('treats Ace as low (Ace stacks on a 2)', () => {
    expect(canStackSolitaire(c('2', 'hearts'), c('A', 'spades'))).toBe(true);
    expect(canStackSolitaire(c('2', 'hearts'), c('A', 'hearts'))).toBe(false); // same color
  });

  it('does not stack a King on an Ace', () => {
    expect(canStackSolitaire(c('A', 'hearts'), c('K', 'spades'))).toBe(false);
  });

  it('builds a foundation 2 on Ace', () => {
    expect(canBuildSolitaire([c('A', 'hearts')], c('2', 'hearts'))).toBe(true);
    expect(canBuildSolitaire([c('A', 'hearts')], c('2', 'spades'))).toBe(false); // wrong suit
  });
});
