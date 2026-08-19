import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import { rummy500Game, isValidRun, isValidSet, isValidMeld, rummyCardValue } from './rummy500';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'rummy_500', { dealCount: 7, maxPlayers: 8 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface Meld {
  id: string;
  kind: 'set' | 'run';
  cards: Card[];
}

interface R500GS {
  melds: Meld[];
  scores: Record<string, number>;
  playerMelded: Record<string, Card[]>;
  winner: string | null;
  hasDrawn: boolean;
}

function r500State(
  p1: Card[],
  p2: Card[],
  opts: {
    deck?: Card[];
    discardPile?: Card[];
    currentSeat?: number;
    hasDrawn?: boolean;
    melds?: Meld[];
    playerMelded?: Record<string, Card[]>;
    scores?: Record<string, number>;
  } = {},
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'rummy_500',
      deck: opts.deck ?? [], tableCards: [], discardPile: opts.discardPile ?? [],
      currentSeat: opts.currentSeat ?? 0,
      settings: { dealCount: 7, maxPlayers: 8 },
      gameState: {
        melds: opts.melds ?? [],
        scores: opts.scores ?? { p1: 0, p2: 0 },
        playerMelded: opts.playerMelded ?? { p1: [], p2: [] },
        winner: null,
        hasDrawn: opts.hasDrawn ?? false,
      },
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: p1, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: p2, isCreator: false, isReady: true },
    ],
  };
}

describe('rummy 500', () => {
  it('deals 13 to two players and 7 to four', () => {
    const s2 = rummy500Game.setup(lobby(2));
    expect(s2.players.every((p) => p.hand.length === 13)).toBe(true);
    const s4 = rummy500Game.setup(lobby(4));
    expect(s4.players.every((p) => p.hand.length === 7)).toBe(true);
  });

  it('scores aces at 15 and face cards at 10', () => {
    expect(rummyCardValue(c('A'))).toBe(15);
    expect(rummyCardValue(c('K'))).toBe(10);
    expect(rummyCardValue(c('7'))).toBe(7);
  });

  it('accepts ace-low and ace-high runs', () => {
    expect(isValidRun([c('A', 'hearts'), c('2', 'hearts'), c('3', 'hearts')])).toBe(true);
    expect(isValidRun([c('Q', 'hearts'), c('K', 'hearts'), c('A', 'hearts')])).toBe(true);
    expect(isValidRun([c('K', 'hearts'), c('A', 'hearts'), c('2', 'hearts')])).toBe(false);
    expect(isValidSet([c('7', 'hearts'), c('7', 'clubs'), c('7', 'spades')])).toBe(true);
    expect(isValidMeld([c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds')])).toBe(true);
  });

  it('draws a card and everything above it from the discard pile', () => {
    const s = r500State([c('A')], [c('2', 'clubs')], {
      discardPile: [c('A', 'spades'), c('2', 'spades'), c('3', 'spades'), c('4', 'spades')],
    });
    const next = rummy500Game.reduce(s, { intent: 'draw', playerId: 'p1', source: 'discard', cardId: '3s' });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['Ah', '3s', '4s']);
    expect(next.game.discardPile.map((x) => x.id)).toEqual(['As', '2s']);
  });

  it('melds a valid set and rejects an invalid meld', () => {
    const s = r500State([c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'), c('9', 'diamonds')], [c('K', 'clubs')], { hasDrawn: true });
    const next = rummy500Game.reduce(s, { intent: 'meld', playerId: 'p1', cards: ['2h', '2c', '2s'] });
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['9d']);
    const gs = next.game.gameState as R500GS;
    expect(gs.melds).toHaveLength(1);
    expect(gs.playerMelded.p1.map((x) => x.id).sort()).toEqual(['2c', '2h', '2s']);

    const bad = r500State([c('2', 'hearts'), c('2', 'clubs'), c('9', 'diamonds')], [c('K', 'clubs')], { hasDrawn: true });
    expect(() => rummy500Game.reduce(bad, { intent: 'meld', playerId: 'p1', cards: ['2h', '2c', '9d'] })).toThrow(EngineError);
  });

  it('lays off onto a set and a run', () => {
    const setMeld: Meld = { id: 'meld-0', kind: 'set', cards: [c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades')] };
    const s = r500State([c('2', 'diamonds')], [c('K', 'clubs')], { hasDrawn: true, melds: [setMeld] });
    const next = rummy500Game.reduce(s, { intent: 'layoff', playerId: 'p1', cardId: '2d', meldId: 'meld-0' });
    expect(next.players[0].hand).toHaveLength(0);
    expect((next.game.gameState as R500GS).melds[0].cards).toHaveLength(4);

    const runMeld: Meld = { id: 'meld-0', kind: 'run', cards: [c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds')] };
    const s2 = r500State([c('8', 'diamonds')], [c('K', 'clubs')], { hasDrawn: true, melds: [runMeld] });
    const next2 = rummy500Game.reduce(s2, { intent: 'layoff', playerId: 'p1', cardId: '8d', meldId: 'meld-0' });
    expect((next2.game.gameState as R500GS).melds[0].cards).toHaveLength(4);

    const s3 = r500State([c('9', 'clubs')], [c('K', 'clubs')], { hasDrawn: true, melds: [runMeld] });
    expect(() => rummy500Game.reduce(s3, { intent: 'layoff', playerId: 'p1', cardId: '9c', meldId: 'meld-0' })).toThrow(EngineError);
  });

  it('going out scores melds positive and deadwood negative', () => {
    const s = r500State([c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'), c('5', 'diamonds')], [c('A')], { hasDrawn: true });
    const melded = rummy500Game.reduce(s, { intent: 'meld', playerId: 'p1', cards: ['2h', '2c', '2s'] });
    const out = rummy500Game.reduce(melded, { intent: 'discard', playerId: 'p1', cardId: '5d' });
    const gs = out.game.gameState as R500GS;
    expect(gs.scores.p1).toBe(6); // 2+2+2 melded, empty hand
    expect(gs.scores.p2).toBe(-15); // A = 15 deadwood
    expect(out.game.status).toBe('playing'); // redeals, no winner yet
  });

  it('first to 500 wins', () => {
    const s = r500State([c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'), c('5', 'diamonds')], [c('A')], {
      hasDrawn: true,
      scores: { p1: 495, p2: 0 },
    });
    const melded = rummy500Game.reduce(s, { intent: 'meld', playerId: 'p1', cards: ['2h', '2c', '2s'] });
    const out = rummy500Game.reduce(melded, { intent: 'discard', playerId: 'p1', cardId: '5d' });
    const gs = out.game.gameState as R500GS;
    expect(gs.scores.p1).toBe(501);
    expect(out.game.status).toBe('finished');
    expect(gs.winner).toBe('p1');
    expect(rummy500Game.isTerminal(out)).toBe(true);
  });
});
