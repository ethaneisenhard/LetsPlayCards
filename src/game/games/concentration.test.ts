import { describe, it, expect } from 'vitest';
import { concentrationGame, type ConcentrationState, type ConcentrationCell } from './concentration';
import type { EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function concState(
  cells: ConcentrationCell[],
  pairs: Record<string, number> = { p1: 0, p2: 0 },
  currentSeat = 0,
  flipped: number[] = [],
  winner: string | null = null,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'concentration',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 0, maxPlayers: 6 },
      gameState: { grid: cells, flipped, pairs, winner } satisfies ConcentrationState,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
    ],
  };
}

const faceDown = (card: Card): ConcentrationCell => ({ card, faceUp: false, matched: false });

describe('concentration', () => {
  it('lays 52 cards face-down with no matches', () => {
    const lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'concentration',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 0, maxPlayers: 6 }, gameState: {},
      },
      players: [{ id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true }],
    };
    const s = concentrationGame.setup(lobby);
    const gs = s.game.gameState as ConcentrationState;
    expect(gs.grid).toHaveLength(52);
    expect(gs.grid.every((cell) => !cell.faceUp && !cell.matched)).toBe(true);
    expect(gs.pairs.p1).toBe(0);
    expect(concentrationGame.isTerminal(s)).toBe(false);
  });

  it('flips the first card face-up and keeps the turn', () => {
    const grid = [faceDown(c('A', 'hearts')), faceDown(c('A', 'spades')), faceDown(c('2', 'hearts')), faceDown(c('3', 'clubs'))];
    const s = concState(grid);
    const next = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 });
    const gs = next.game.gameState as ConcentrationState;
    expect(gs.grid[0].faceUp).toBe(true);
    expect(gs.flipped).toEqual([0]);
    expect(next.game.currentSeat).toBe(0);
  });

  it('keeps a matching pair and the player goes again', () => {
    const grid = [faceDown(c('A', 'hearts')), faceDown(c('A', 'spades')), faceDown(c('2', 'hearts')), faceDown(c('3', 'clubs'))];
    let s = concState(grid);
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 });
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 1 });
    const gs = s.game.gameState as ConcentrationState;
    expect(gs.grid[0].matched).toBe(true);
    expect(gs.grid[1].matched).toBe(true);
    expect(gs.pairs.p1).toBe(1);
    expect(gs.flipped).toEqual([]);
    expect(s.game.currentSeat).toBe(0);
  });

  it('flips non-matching cards back down and advances the turn', () => {
    const grid = [faceDown(c('2', 'hearts')), faceDown(c('3', 'clubs')), faceDown(c('4', 'hearts')), faceDown(c('5', 'clubs'))];
    let s = concState(grid);
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 });
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 1 });
    const gs = s.game.gameState as ConcentrationState;
    expect(gs.grid[0].faceUp).toBe(false);
    expect(gs.grid[1].faceUp).toBe(false);
    expect(gs.pairs.p1).toBe(0);
    expect(s.game.currentSeat).toBe(1);
  });

  it('rejects flipping a card already face-up', () => {
    const grid = [faceDown(c('A', 'hearts')), faceDown(c('A', 'spades'))];
    let s = concState(grid);
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 });
    expect(() => concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 })).toThrow(/already face up/);
  });

  it('finishes when the board is cleared and awards the most pairs', () => {
    const grid = [faceDown(c('A', 'hearts')), faceDown(c('A', 'spades'))];
    let s = concState(grid);
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 0 });
    s = concentrationGame.reduce(s, { intent: 'flip', playerId: 'p1', index: 1 });
    const gs = s.game.gameState as ConcentrationState;
    expect(s.game.status).toBe('finished');
    expect(gs.winner).toBe('p1');
    expect(concentrationGame.isTerminal(s)).toBe(true);
    expect(concentrationGame.score(s)).toEqual({ p1: 1, p2: 0 });
  });
});
