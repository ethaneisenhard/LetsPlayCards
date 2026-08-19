import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import { fiveCardDrawGame } from './fiveCardDraw';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'five_card_draw', { dealCount: 5, maxPlayers: 6 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

type FCD = {
  phase: string;
  pot: number;
  chips: Record<string, number>;
  drawn: Record<string, boolean>;
  winners: string[];
};

const gs = (s: EngineState): FCD => s.game.gameState as unknown as FCD;

describe('five-card draw', () => {
  it('deals 5 cards each and antes 1 chip from a 100-chip stack', () => {
    const s = fiveCardDrawGame.setup(lobby(3));
    expect(s.game.status).toBe('playing');
    expect(s.players.every((p) => p.hand.length === 5)).toBe(true);
    expect(gs(s).pot).toBe(3);
    expect(gs(s).chips).toEqual({ p1: 99, p2: 99, p3: 99 });
    expect(s.game.deck).toHaveLength(52 - 15);
  });

  it('draw discards cards and draws the same count from the deck', () => {
    const s = fiveCardDrawGame.setup(lobby(2));
    const forced: EngineState = {
      ...s,
      game: { ...s.game, deck: [c('9', 'clubs'), c('8', 'clubs'), c('7', 'clubs'), c('K', 'spades')] },
      players: [
        { ...s.players[0], hand: [c('A'), c('2', 'diamonds'), c('3', 'diamonds'), c('4', 'diamonds'), c('5', 'diamonds')] },
        s.players[1],
      ],
    };
    const next = fiveCardDrawGame.reduce(forced, { intent: 'draw', playerId: 'p1', cardIds: ['2d', '3d', '4d'] });
    expect(next.players[0].hand.map((x) => x.id).sort()).toEqual(['9c', '8c', '7c', 'Ah', '5d'].sort());
    expect(next.game.deck).toHaveLength(1);
    expect(gs(next).drawn.p1).toBe(true);
  });

  it('draw with an empty array declares a stand', () => {
    const s = fiveCardDrawGame.setup(lobby(2));
    const before = s.players[0].hand.map((x) => x.id);
    const next = fiveCardDrawGame.reduce(s, { intent: 'draw', playerId: 'p1', cardIds: [] });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(before);
    expect(gs(next).drawn.p1).toBe(true);
  });

  it('rejects drawing twice and showdown before everyone has drawn', () => {
    const s = fiveCardDrawGame.setup(lobby(2));
    const drawn = fiveCardDrawGame.reduce(s, { intent: 'draw', playerId: 'p1', cardIds: [] });
    expect(() => fiveCardDrawGame.reduce(drawn, { intent: 'draw', playerId: 'p1', cardIds: [] })).toThrow(EngineError);
    expect(() => fiveCardDrawGame.reduce(drawn, { intent: 'showdown', playerId: 'p1' })).toThrow(EngineError);
  });

  it('awards the pot to the best hand at showdown', () => {
    const s = fiveCardDrawGame.setup(lobby(2));
    const forced: EngineState = {
      ...s,
      game: { ...s.game, gameState: { ...s.game.gameState, drawn: { p1: true, p2: true }, pot: 10 } },
      players: [
        { ...s.players[0], hand: [c('A'), c('A', 'clubs'), c('2', 'diamonds'), c('3', 'diamonds'), c('4', 'diamonds')] },
        { ...s.players[1], hand: [c('K'), c('K', 'clubs'), c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds')] },
      ],
    };
    const next = fiveCardDrawGame.reduce(forced, { intent: 'showdown', playerId: 'p1' });
    expect(next.game.status).toBe('finished');
    expect(gs(next).winners).toEqual(['p1']);
    expect(gs(next).chips.p1).toBe(109); // 99 + 10
    expect(gs(next).chips.p2).toBe(99);
    expect(fiveCardDrawGame.isTerminal(next)).toBe(true);
  });

  it('splits the pot evenly on a tie (remainder to the first winner)', () => {
    const s = fiveCardDrawGame.setup(lobby(2));
    const flush = (suit: Suit) => [c('A', suit), c('K', suit), c('Q', suit), c('J', suit), c('9', suit)];
    const forced: EngineState = {
      ...s,
      game: { ...s.game, gameState: { ...s.game.gameState, drawn: { p1: true, p2: true }, pot: 11 } },
      players: [
        { ...s.players[0], hand: flush('hearts') },
        { ...s.players[1], hand: flush('spades') },
      ],
    };
    const next = fiveCardDrawGame.reduce(forced, { intent: 'showdown', playerId: 'p1' });
    expect(gs(next).winners).toEqual(['p1', 'p2']);
    expect(gs(next).chips.p1).toBe(105); // 99 + 5 + 1 remainder
    expect(gs(next).chips.p2).toBe(104); // 99 + 5
    expect(fiveCardDrawGame.score(next)).toEqual({ p1: 105, p2: 104 });
  });
});
