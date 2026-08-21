import { describe, it, expect } from 'vitest';
import { thirtyOneGame, cardValue, bestSuitTotal, type ThirtyOneState } from './thirtyOne';
import type { EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function tState(hands: Card[][], opts: Partial<ThirtyOneState> = {}, deck: Card[] = [], currentSeat = 0): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'thirty_one',
      deck, tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 3, maxPlayers: 9 },
      gameState: {
        widow: opts.widow ?? [c('2', 'clubs'), c('4', 'spades'), c('9', 'diamonds')],
        lives: opts.lives ?? { p1: 3, p2: 3 },
        phase: opts.phase ?? 'playing',
        knockedBy: opts.knockedBy ?? null,
        finalTurnQueue: opts.finalTurnQueue ?? [],
        eliminated: opts.eliminated ?? [],
        winner: opts.winner ?? null,
      } satisfies ThirtyOneState,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: hands[0], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: hands[1] ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('thirty-one', () => {
  it('deals 3 cards each, 3 lives, and a 3-card widow', () => {
    const lobby: EngineState = {
      game: {
        id: 'g1', code: 'ABC123', status: 'lobby', gameType: 'thirty_one',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 3, maxPlayers: 9 }, gameState: {},
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: [], isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      ],
    };
    const s = thirtyOneGame.setup(lobby);
    const gs = s.game.gameState as ThirtyOneState;
    expect(s.players.every((p) => p.hand.length === 3)).toBe(true);
    expect(gs.widow).toHaveLength(3);
    expect(gs.lives).toEqual({ p1: 3, p2: 3 });
  });

  it('scores a same-suit hand', () => {
    expect(cardValue('A')).toBe(11);
    expect(cardValue('K')).toBe(10);
    expect(cardValue('7')).toBe(7);
    expect(bestSuitTotal([c('A', 'hearts'), c('K', 'hearts'), c('Q', 'hearts')])).toBe(31);
    expect(bestSuitTotal([c('A', 'hearts'), c('K', 'spades'), c('2', 'clubs')])).toBe(11);
  });

  it('swaps from the stock and discards to the widow', () => {
    const s = tState(
      [[c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')], [c('5', 'spades'), c('6', 'diamonds'), c('3', 'clubs')]],
      {},
      [c('9', 'hearts')],
    );
    const next = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p1', cardId: '2c', from: 'stock' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['Ah', 'Kh', '9h']);
    expect((next.game.gameState as ThirtyOneState).widow).toHaveLength(4);
    expect(next.game.currentSeat).toBe(1);
  });

  it('swaps with a widow card and keeps the widow at 3', () => {
    const s = tState(
      [[c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')], [c('5', 'spades'), c('6', 'diamonds'), c('3', 'clubs')]],
      { widow: [c('2', 'clubs'), c('4', 'spades'), c('9', 'diamonds')] },
    );
    const next = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p1', cardId: '2c', from: 'widow', widowIndex: 1 });
    const gs = next.game.gameState as ThirtyOneState;
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['Ah', 'Kh', '4s']);
    expect(gs.widow).toHaveLength(3);
  });

  it('wins instantly on a hand totaling 31', () => {
    const s = tState(
      [[c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')], [c('5', 'spades'), c('6', 'diamonds'), c('3', 'clubs')]],
      {},
      [c('Q', 'hearts')],
    );
    const next = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p1', cardId: '2c', from: 'stock' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as ThirtyOneState).winner).toBe('p1');
  });

  it('knock gives the opponent one final turn then the lowest hand loses a life', () => {
    // p1 holds A♥K♥2♣ (21); p2 holds a weak hand (6).
    let s = tState(
      [[c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')], [c('5', 'spades'), c('6', 'diamonds'), c('3', 'clubs')]],
      {},
      [c('2', 'hearts'), c('4', 'clubs')],
    );
    s = thirtyOneGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    let gs = s.game.gameState as ThirtyOneState;
    expect(gs.phase).toBe('knocked');
    expect(gs.finalTurnQueue).toEqual(['p2']);

    // p2 takes their final turn (swap from stock, still weak).
    s = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p2', cardId: '5s', from: 'stock' });
    gs = s.game.gameState as ThirtyOneState;
    expect(gs.lives.p2).toBe(2);
    expect(gs.lives.p1).toBe(3);
    expect(gs.phase).toBe('playing');
    expect(gs.knockedBy).toBeNull();
  });

  it('eliminates a player out of lives and crowns the last standing', () => {
    // p2 has only 1 life and the weaker hand; losing knocks them out.
    let s = tState(
      [[c('A', 'hearts'), c('K', 'hearts'), c('2', 'clubs')], [c('5', 'spades'), c('6', 'diamonds'), c('3', 'clubs')]],
      { lives: { p1: 3, p2: 1 } },
      [c('2', 'hearts'), c('4', 'clubs')],
    );
    s = thirtyOneGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    s = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p2', cardId: '5s', from: 'stock' });
    const gs = s.game.gameState as ThirtyOneState;
    expect(gs.eliminated).toContain('p2');
    expect(gs.winner).toBe('p1');
    expect(s.game.status).toBe('finished');
  });

  it('finishes when a knock takes the last life from every remaining player', () => {
    let s = tState(
      [[c('5', 'hearts'), c('6', 'diamonds'), c('3', 'clubs')], [c('5', 'spades'), c('6', 'clubs'), c('3', 'diamonds')]],
      { lives: { p1: 1, p2: 1 } },
      [c('2', 'hearts'), c('4', 'clubs')],
    );
    s = thirtyOneGame.reduce(s, { intent: 'knock', playerId: 'p1' });
    s = thirtyOneGame.reduce(s, { intent: 'swap', playerId: 'p2', cardId: '5s', from: 'stock' });
    const gs = s.game.gameState as ThirtyOneState;
    expect(s.game.status).toBe('finished');
    expect(gs.eliminated).toEqual(expect.arrayContaining(['p1', 'p2']));
    expect(s.game.deck).toHaveLength(1);
  });
});
