import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import {
  cribbageGame,
  cribValue,
  countFifteens,
  countPairs,
  countRuns,
  countFlush,
  countNobs,
  scoreHand,
  pegScore,
} from './cribbage';
import type { Card, Rank, Suit } from '../types';
import type { GameType } from '../gameTypes';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(gameType: GameType, n: number, settings = { dealCount: 6, maxPlayers: 4 }): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

describe('cribbage setup', () => {
  it('deals 6 cards each to 2 players and flips a starter', () => {
    const s = cribbageGame.setup(lobby('cribbage', 2, { dealCount: 6, maxPlayers: 4 }));
    expect(s.game.status).toBe('playing');
    expect(s.players.every((p) => p.hand.length === 6)).toBe(true);
    const gs = s.game.gameState as { phase: string; starter: Card | null; dealerId: string };
    expect(gs.phase).toBe('discard');
    expect(gs.starter).toBeTruthy();
    expect(gs.dealerId).toBe('p1'); // seat 0 deals first
    expect(s.game.currentSeat).toBe(1); // non-dealer discards first
  });

  it('deals 5 cards each to 3 players', () => {
    const s = cribbageGame.setup(lobby('cribbage', 3, { dealCount: 6, maxPlayers: 4 }));
    expect(s.players.every((p) => p.hand.length === 5)).toBe(true);
  });

  it('discard-to-crib collects 2 from each player then begins pegging', () => {
    const s = cribbageGame.setup(lobby('cribbage', 2, { dealCount: 6, maxPlayers: 4 }));
    const p2 = s.players.find((p) => p.seat === 1)!;
    const p1 = s.players.find((p) => p.seat === 0)!;
    const d2 = [p2.hand[0].id, p2.hand[1].id];
    let next = cribbageGame.reduce(s, { intent: 'discard-to-crib', playerId: p2.id, cards: d2 });
    expect((next.game.gameState as { crib: Card[] }).crib).toHaveLength(2);
    const d1 = [p1.hand[0].id, p1.hand[1].id];
    next = cribbageGame.reduce(next, { intent: 'discard-to-crib', playerId: p1.id, cards: d1 });
    const gs = next.game.gameState as { crib: Card[]; phase: string };
    expect(gs.crib).toHaveLength(4);
    expect(gs.phase).toBe('pegging');
  });

  it('rejects discarding the wrong number of cards', () => {
    const s = cribbageGame.setup(lobby('cribbage', 2, { dealCount: 6, maxPlayers: 4 }));
    const p2 = s.players.find((p) => p.seat === 1)!;
    expect(() => cribbageGame.reduce(s, { intent: 'discard-to-crib', playerId: p2.id, cards: [p2.hand[0].id] })).toThrow(EngineError);
  });
});

describe('cribbage scoring helpers', () => {
  it('cribValue uses ace-low and 10-count faces', () => {
    expect(cribValue(c('A'))).toBe(1);
    expect(cribValue(c('7'))).toBe(7);
    expect(cribValue(c('10', 'spades'))).toBe(10);
    expect(cribValue(c('J'))).toBe(10);
    expect(cribValue(c('Q'))).toBe(10);
    expect(cribValue(c('K'))).toBe(10);
  });

  it('countFifteens finds every 15 combination', () => {
    expect(countFifteens([c('10', 'spades'), c('5')])).toBe(2);
    expect(countFifteens([c('7'), c('8', 'spades')])).toBe(2);
    expect(countFifteens([c('5'), c('10', 'spades'), c('10', 'clubs')])).toBe(4); // two ways
  });

  it('countPairs scores pairs, pairs royal, and double pairs royal', () => {
    expect(countPairs([c('5'), c('5', 'spades')])).toBe(2);
    expect(countPairs([c('5'), c('5', 'spades'), c('5', 'clubs')])).toBe(6);
    expect(countPairs([c('5'), c('5', 'spades'), c('5', 'clubs'), c('5', 'diamonds')])).toBe(12);
  });

  it('countRuns scores the longest run times multiplicity', () => {
    expect(countRuns([c('4'), c('5', 'spades'), c('6', 'clubs')])).toBe(3);
    expect(countRuns([c('4'), c('5', 'spades'), c('6', 'clubs'), c('7', 'diamonds')])).toBe(4);
    expect(countRuns([c('4'), c('5', 'spades'), c('5', 'clubs'), c('6', 'diamonds')])).toBe(6); // double run of 3
    expect(countRuns([c('2'), c('9'), c('Q')])).toBe(0);
  });

  it('countFlush scores 4 or 5 for hands, all-5 for crib', () => {
    const hand = [c('2'), c('4'), c('6'), c('8')];
    expect(countFlush(hand, c('K', 'spades'))).toBe(4);
    expect(countFlush(hand, c('K'))).toBe(5);
    expect(countFlush(hand, c('K', 'spades'), true)).toBe(0); // crib needs all five
    expect(countFlush(hand, c('K'), true)).toBe(5);
  });

  it('countNobs scores a jack matching the starter suit', () => {
    expect(countNobs([c('J')], c('A'))).toBe(1);
    expect(countNobs([c('J', 'spades')], c('A'))).toBe(0);
  });

  it('scoreHand scores the 29 hand', () => {
    const hand = [c('5'), c('5', 'spades'), c('5', 'clubs'), c('J', 'diamonds')];
    expect(scoreHand(hand, c('5', 'diamonds'))).toBe(29);
  });

  it('pegScore scores fifteens, pairs, and runs', () => {
    expect(pegScore([c('5')])).toBe(0);
    expect(pegScore([c('10', 'spades'), c('5')])).toBe(2); // 15
    expect(pegScore([c('5'), c('5', 'spades'), c('5', 'clubs')])).toBe(8); // 15 + pair royal
    expect(pegScore([c('7'), c('8', 'spades'), c('9', 'clubs')])).toBe(3); // run of 3
    expect(pegScore([c('A'), c('2', 'spades'), c('3', 'clubs'), c('4', 'diamonds')])).toBe(4); // run of 4
    expect(pegScore([c('K', 'spades'), c('Q', 'clubs'), c('J', 'diamonds'), c('A', 'spades')])).toBe(2); // 31
  });
});

describe('cribbage counting phase', () => {
  function countingState(): EngineState {
    return {
      game: {
        id: 'g1', code: 'ABC123', status: 'playing', gameType: 'cribbage',
        deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        settings: { dealCount: 6, maxPlayers: 4 },
        gameState: {
          phase: 'counting', dealerId: 'p1', crib: [], starter: c('5', 'diamonds'),
          peggingPlays: [], pegTotal: 0, pegPassed: [],
          countQueue: [
            { playerId: 'p2', source: 'hand' },
            { playerId: 'p1', source: 'hand' },
            { playerId: 'p1', source: 'crib' },
          ],
          scores: { p1: 0, p2: 0 }, winner: null,
        },
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: [c('5'), c('5', 'spades'), c('5', 'clubs'), c('J', 'diamonds')], isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [c('7'), c('8', 'spades'), c('9', 'clubs'), c('A', 'spades')], isCreator: false, isReady: true },
      ],
    };
  }

  it('counts each hand and the crib in order, then redeals', () => {
    let s = countingState();
    s = cribbageGame.reduce(s, { intent: 'count', playerId: 'p2' });
    expect((s.game.gameState as { scores: Record<string, number> }).scores.p2).toBe(7);
    s = cribbageGame.reduce(s, { intent: 'count', playerId: 'p1' });
    expect((s.game.gameState as { scores: Record<string, number> }).scores.p1).toBe(29);
    s = cribbageGame.reduce(s, { intent: 'count', playerId: 'p1' });
    const gs = s.game.gameState as { phase: string; dealerId: string };
    expect(gs.phase).toBe('discard'); // no winner at 29 → new hand
    expect(gs.dealerId).toBe('p2');
  });

  it('rejects a count from the wrong player', () => {
    const s = countingState();
    expect(() => cribbageGame.reduce(s, { intent: 'count', playerId: 'p1' })).toThrow(EngineError);
  });
});
