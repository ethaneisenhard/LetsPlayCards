import { describe, it, expect } from 'vitest';
import { solitaireRaceGame, type SolitaireRaceState } from './solitaireRace';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import type { KlondikeState } from './klondike';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

function lobby(players: [string, string][]): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'solitaire_race', { dealCount: 0, maxPlayers: 2 });
  for (const [id, name] of players) s = addPlayer(s, id, name);
  return s;
}

function raceState(state: SolitaireRaceState): EngineState {
  const { boards, winner } = state;
  return {
    game: {
      id: 'g1', code: 'ABC123', status: winner ? 'finished' : 'playing', gameType: 'solitaire_race',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 0, maxPlayers: 2 }, gameState: { boards, winner } as SolitaireRaceState,
    },
    players: [
      { id: 'p1', name: 'Alice', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'Bob', seat: 1, hand: [], isCreator: false, isReady: true },
    ],
  };
}

const emptyBoard = (): KlondikeState => ({
  columns: Array.from({ length: 7 }, () => []),
  foundations: [[], [], [], []],
  stock: [],
  waste: [],
  won: false,
});

describe('solitaire race setup', () => {
  it('deals the IDENTICAL tableau to both players (fair race)', () => {
    const s = solitaireRaceGame.setup(lobby([['p1', 'Alice'], ['p2', 'Bob']]));
    const gs = s.game.gameState as SolitaireRaceState;
    const b1 = gs.boards.p1;
    const b2 = gs.boards.p2;
    expect(b1.columns).toHaveLength(7);
    expect(b1.columns.map((col) => col.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(b1.stock).toHaveLength(24);
    // Identical card order across boards.
    expect(b2.columns.map((col) => col.map((card) => card.id))).toEqual(b1.columns.map((col) => col.map((card) => card.id)));
    expect(b2.stock.map((card) => card.id)).toEqual(b1.stock.map((card) => card.id));
    expect(s.game.status).toBe('playing');
  });

  it('supports solo play with a single player', () => {
    const s = solitaireRaceGame.setup(lobby([['p1', 'Solo']]));
    const gs = s.game.gameState as SolitaireRaceState;
    expect(Object.keys(gs.boards)).toEqual(['p1']);
  });
});

describe('solitaire race actions', () => {
  it('draw-stock only affects the acting player', () => {
    const gs: SolitaireRaceState = {
      boards: {
        p1: { ...emptyBoard(), stock: [c('A', 'hearts'), c('2', 'clubs')] },
        p2: { ...emptyBoard(), stock: [c('3', 'spades')] },
      },
      winner: null,
    };
    const after = solitaireRaceGame.reduce(raceState(gs), { intent: 'draw-stock', playerId: 'p1' });
    const next = after.game.gameState as SolitaireRaceState;
    expect(next.boards.p1.stock).toHaveLength(1);
    expect(next.boards.p1.waste).toEqual([c('2', 'clubs')]);
    expect(next.boards.p2.stock).toHaveLength(1); // untouched
  });

  it('moves a card on the acting player\'s board only', () => {
    const gs: SolitaireRaceState = {
      boards: {
        p1: { ...emptyBoard(), waste: [c('A', 'hearts')] },
        p2: { ...emptyBoard(), waste: [c('A', 'spades')] },
      },
      winner: null,
    };
    const after = solitaireRaceGame.reduce(raceState(gs), {
      intent: 'move', playerId: 'p1', from: 'waste', to: 'foundation', toIndex: 0, cardId: c('A', 'hearts').id,
    });
    const next = after.game.gameState as SolitaireRaceState;
    expect(next.boards.p1.foundations[0]).toEqual([c('A', 'hearts')]);
    expect(next.boards.p2.foundations[0]).toEqual([]); // untouched
  });

  it('rejects an illegal move (EngineError)', () => {
    const gs: SolitaireRaceState = {
      boards: { p1: { ...emptyBoard(), waste: [c('2', 'hearts')] }, p2: emptyBoard() },
      winner: null,
    };
    expect(() =>
      solitaireRaceGame.reduce(raceState(gs), {
        intent: 'move', playerId: 'p1', from: 'waste', to: 'foundation', toIndex: 0, cardId: c('2', 'hearts').id,
      }),
    ).toThrow(EngineError);
  });
});

describe('solitaire race win detection', () => {
  it('first player to complete all four foundations wins', () => {
    const foundations = SUITS.map((suit) => RANKS.map((r) => c(r, suit)));
    foundations[3] = RANKS.slice(0, 12).map((r) => c(r, 'spades')); // A..Q of spades
    const gs: SolitaireRaceState = {
      boards: {
        p1: { ...emptyBoard(), foundations, waste: [c('K', 'spades')] },
        p2: emptyBoard(),
      },
      winner: null,
    };
    const after = solitaireRaceGame.reduce(raceState(gs), {
      intent: 'move', playerId: 'p1', from: 'waste', to: 'foundation', toIndex: 3, cardId: c('K', 'spades').id,
    });
    const next = after.game.gameState as SolitaireRaceState;
    expect(next.winner).toBe('p1');
    expect(after.game.status).toBe('finished');
    expect(solitaireRaceGame.isTerminal(after)).toBe(true);
    expect(solitaireRaceGame.score(after)).toEqual({ p1: 1 });
  });
});

describe('solitaire race view masking', () => {
  it('hides the opponent\'s cards, revealing only foundation progress', () => {
    const s = solitaireRaceGame.setup(lobby([['p1', 'Alice'], ['p2', 'Bob']]));
    const view = solitaireRaceGame.view!(s, 'p1') as {
      game: { gameState: { boards: Record<string, unknown> } };
    };
    const boards = view.game.gameState.boards;
    expect(boards.p1).toHaveProperty('columns');
    expect(boards.p1).toHaveProperty('stock');
    expect(boards.p2).not.toHaveProperty('columns');
    expect(boards.p2).not.toHaveProperty('stock');
    expect(boards.p2).toHaveProperty('foundations');
    expect(boards.p2).toHaveProperty('won');
  });
});
