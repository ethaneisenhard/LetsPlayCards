import { describe, it, expect } from 'vitest';
import { cassinoGame, captureValue, scoreRound, type CassinoState } from './cassino';
import type { EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function casState(
  hands: Card[][],
  table: Card[],
  opts: Partial<CassinoState> = {},
  deck: Card[] = [],
  currentSeat = 0,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'cassino',
      deck, tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 4, maxPlayers: 4 },
      gameState: {
        table,
        builds: opts.builds ?? [],
        captures: opts.captures ?? { p1: [], p2: [] },
        scores: opts.scores ?? { p1: 0, p2: 0 },
        winner: opts.winner ?? null,
      } satisfies CassinoState,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands[0], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands[1] ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('cassino', () => {
  it('deals 4 cards each and 4 face-up table cards', () => {
    const lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'cassino',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 4, maxPlayers: 4 }, gameState: {},
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      ],
    };
    const s = cassinoGame.setup(lobby);
    const gs = s.game.gameState as CassinoState;
    expect(s.players.every((p) => p.hand.length === 4)).toBe(true);
    expect(gs.table).toHaveLength(4);
  });

  it('captureValue: number cards + A sum, face cards do not', () => {
    expect(captureValue('A')).toBe(1);
    expect(captureValue('5')).toBe(5);
    expect(captureValue('10')).toBe(10);
    expect(captureValue('J')).toBeNull();
    expect(captureValue('K')).toBeNull();
  });

  it('captures a single matching card', () => {
    const s = casState([[c('5', 'spades')], []], [c('5', 'hearts')], {}, [c('K', 'clubs')], 0);
    const next = cassinoGame.reduce(s, { intent: 'capture', playerId: 'p1', cardId: '5s', targetIds: ['5h'] });
    const gs = next.game.gameState as CassinoState;
    expect(gs.table).toHaveLength(0);
    expect(gs.captures.p1.map((x) => x.id)).toEqual(['5h', '5s']);
  });

  it('captures by summing table cards', () => {
    const s = casState([[c('5', 'spades')], []], [c('2', 'hearts'), c('3', 'clubs')], {}, [c('K', 'clubs')], 0);
    const next = cassinoGame.reduce(s, { intent: 'capture', playerId: 'p1', cardId: '5s', targetIds: ['2h', '3c'] });
    const gs = next.game.gameState as CassinoState;
    expect(gs.table).toHaveLength(0);
    expect(gs.captures.p1.map((x) => x.id).sort()).toEqual(['2h', '3c', '5s']);
  });

  it('rejects a sum that does not match', () => {
    const s = casState([[c('5', 'spades')], []], [c('2', 'hearts'), c('2', 'clubs')], {}, [], 0);
    expect(() => cassinoGame.reduce(s, { intent: 'capture', playerId: 'p1', cardId: '5s', targetIds: ['2h', '2c'] })).toThrow(/Illegal capture/);
  });

  it('face cards capture only by exact rank match', () => {
    const match = casState([[c('J', 'spades')], []], [c('J', 'hearts')], {}, [c('K', 'clubs')], 0);
    const ok = cassinoGame.reduce(match, { intent: 'capture', playerId: 'p1', cardId: 'Js', targetIds: ['Jh'] });
    expect((ok.game.gameState as CassinoState).captures.p1).toHaveLength(2);

    const sumAttempt = casState([[c('J', 'spades')], []], [c('3', 'hearts'), c('7', 'clubs')], {}, [], 0);
    expect(() => cassinoGame.reduce(sumAttempt, { intent: 'capture', playerId: 'p1', cardId: 'Js', targetIds: ['3h', '7c'] })).toThrow(/Illegal capture/);
  });

  it('builds a combined pile owned by the player', () => {
    const s = casState([[c('5', 'spades')], []], [c('2', 'hearts'), c('3', 'clubs')], {}, [c('K', 'clubs')], 0);
    const next = cassinoGame.reduce(s, { intent: 'build', playerId: 'p1', cardId: '5s', targetIds: ['2h', '3c'] });
    const gs = next.game.gameState as CassinoState;
    expect(gs.table).toHaveLength(0);
    expect(gs.builds).toHaveLength(1);
    expect(gs.builds[0]).toMatchObject({ value: 5, ownerId: 'p1' });
    expect(gs.builds[0].cards.map((x) => x.id).sort()).toEqual(['2h', '3c', '5s']);
  });

  it('trails a card onto the table', () => {
    const s = casState([[c('5', 'spades')], []], [c('2', 'hearts')], {}, [c('K', 'clubs')], 0);
    const next = cassinoGame.reduce(s, { intent: 'trail', playerId: 'p1', cardId: '5s' });
    expect((next.game.gameState as CassinoState).table.map((x) => x.id)).toEqual(['2h', '5s']);
  });

  it('scores a round correctly', () => {
    const points = scoreRound({
      p1: [c('A', 'spades'), c('2', 'spades'), c('10', 'diamonds'), c('4', 'clubs')],
      p2: [c('3', 'hearts')],
    });
    // p1: most cards (+3), most spades (+1), 2♠ (+1), 10♦ (+2), ace (+1) = 8
    expect(points.p1).toBe(8);
    expect(points.p2).toBe(0);
  });

  it('declares a winner at 21 when the round ends', () => {
    const s = casState(
      [[c('9', 'clubs')], []],
      [c('2', 'hearts')],
      { scores: { p1: 19, p2: 0 }, captures: { p1: [c('A', 'spades'), c('K', 'spades'), c('4', 'spades')], p2: [] } },
      [],
      0,
    );
    const next = cassinoGame.reduce(s, { intent: 'trail', playerId: 'p1', cardId: '9c' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as CassinoState).winner).toBe('p1');
    expect(cassinoGame.score(next).p1).toBeGreaterThanOrEqual(21);
  });
});
