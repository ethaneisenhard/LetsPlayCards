import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import { canastaGame, isWild, isRedThree, teamOf, buildCanastaDeck, isCanasta, isNaturalCanasta } from './canasta';
import type { Card, Rank, Suit } from '../types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });
const joker = (i: number): Card => ({ id: `JOKER-${i}`, suit: 'clubs', rank: 'J' });
const five = (s: Suit, i: number): Card => ({ id: `5-${s}-${i}`, suit: s, rank: '5' });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'canasta', { dealCount: 11, maxPlayers: 4 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface CanastaGS {
  phase: string;
  melds: { id: string; team: string; rank: string; cards: Card[] }[];
  redThrees: Record<string, Card[]>;
  scores: Record<string, number>;
  winner: string | null;
}

function canastaState(
  hands: Card[][],
  opts: {
    deck?: Card[];
    discardPile?: Card[];
    currentSeat?: number;
    phase?: 'draw' | 'play';
    melds?: { id: string; team: string; rank: string; cards: Card[] }[];
    redThrees?: Record<string, Card[]>;
    scores?: Record<string, number>;
  } = {},
): EngineState {
  const players = hands.map((hand, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand, isCreator: i === 0, isReady: true,
  }));
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'canasta',
      deck: opts.deck ?? [], tableCards: [], discardPile: opts.discardPile ?? [],
      currentSeat: opts.currentSeat ?? 0,
      settings: { dealCount: 11, maxPlayers: 4 },
      gameState: {
        phase: opts.phase ?? 'draw',
        melds: opts.melds ?? [],
        redThrees: opts.redThrees ?? { 'team-0': [], 'team-1': [] },
        scores: opts.scores ?? { 'team-0': 0, 'team-1': 0 },
        winner: null,
      },
    },
    players,
  };
}

const sevenFives = [
  five('hearts', 0), five('hearts', 1), five('clubs', 0), five('clubs', 1),
  five('diamonds', 0), five('diamonds', 1), five('spades', 0),
];

describe('canasta', () => {
  it('classifies wilds, red threes, and teams', () => {
    expect(isWild(joker(0))).toBe(true);
    expect(isWild(c('2', 'hearts'))).toBe(true);
    expect(isWild(c('J', 'clubs'))).toBe(false);
    expect(isRedThree(c('3', 'hearts'))).toBe(true);
    expect(isRedThree(c('3', 'diamonds'))).toBe(true);
    expect(isRedThree(c('3', 'clubs'))).toBe(false);
    expect(teamOf(0)).toBe('team-0');
    expect(teamOf(2)).toBe('team-0');
    expect(teamOf(1)).toBe('team-1');
  });

  it('builds a 108-card deck with 4 jokers', () => {
    const deck = buildCanastaDeck();
    expect(deck).toHaveLength(108);
    expect(deck.filter((x) => x.id.startsWith('JOKER'))).toHaveLength(4);
  });

  it('deals 11 each and conserves all 108 cards', () => {
    const s = canastaGame.setup(lobby(4));
    expect(s.players.every((p) => p.hand.length === 11)).toBe(true);
    const gs = s.game.gameState as CanastaGS;
    const redCount = Object.values(gs.redThrees).reduce((a, arr) => a + arr.length, 0);
    const handCount = s.players.reduce((a, p) => a + p.hand.length, 0);
    expect(s.game.deck.length + handCount + redCount).toBe(108);
  });

  it('lays down red threes automatically on draw', () => {
    const s = canastaState([[c('2', 'clubs')], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], {
      deck: [c('3', 'hearts'), c('A', 'clubs'), c('K', 'spades')],
      phase: 'draw',
    });
    const next = canastaGame.reduce(s, { intent: 'draw', playerId: 'p1' });
    const gs = next.game.gameState as CanastaGS;
    expect(gs.redThrees['team-0'].map((x) => x.id)).toEqual(['3h']);
    expect(next.players[0].hand.map((x) => x.id).sort()).toEqual(['2c', 'Ac', 'Ks']);
  });

  it('rejects all-wild and too-many-wild melds, accepts a natural set', () => {
    const allWild = canastaState([[joker(0), joker(1), joker(2)], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], { phase: 'play' });
    expect(() => canastaGame.reduce(allWild, { intent: 'meld', playerId: 'p1', cards: ['JOKER-0', 'JOKER-1', 'JOKER-2'] })).toThrow(/wilds/);

    const tooMany = canastaState([[c('5', 'hearts'), c('5', 'clubs'), joker(0), joker(1), joker(2), joker(3)], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], { phase: 'play' });
    expect(() => canastaGame.reduce(tooMany, { intent: 'meld', playerId: 'p1', cards: ['5h', '5c', 'JOKER-0', 'JOKER-1', 'JOKER-2', 'JOKER-3'] })).toThrow(/wilds/);

    const ok = canastaState([[c('5', 'hearts'), c('5', 'clubs'), c('5', 'spades')], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], { phase: 'play' });
    const next = canastaGame.reduce(ok, { intent: 'meld', playerId: 'p1', cards: ['5h', '5c', '5s'] });
    const gs = next.game.gameState as CanastaGS;
    expect(gs.melds).toHaveLength(1);
    expect(gs.melds[0].team).toBe('team-0');
  });

  it('adds cards to an existing meld to build a canasta', () => {
    const baseMeld = { id: 'meld-0', team: 'team-0', rank: '5', cards: [five('hearts', 0), five('hearts', 1), five('clubs', 0)] };
    const s = canastaState([
      [five('clubs', 1), five('diamonds', 0), five('diamonds', 1), five('spades', 0), c('9', 'spades')],
      [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')],
    ], { phase: 'play', melds: [baseMeld] });
    const next = canastaGame.reduce(s, { intent: 'meld', playerId: 'p1', meldId: 'meld-0', cards: ['5-clubs-1', '5-diamonds-0', '5-diamonds-1', '5-spades-0'] });
    const gs = next.game.gameState as CanastaGS;
    expect(gs.melds[0].cards).toHaveLength(7);
    expect(isCanasta(gs.melds[0])).toBe(true);
    expect(isNaturalCanasta(gs.melds[0])).toBe(true);
  });

  it('classifies natural and mixed canastas', () => {
    const natural = { id: 'meld-0', team: 'team-0', rank: '5', cards: sevenFives };
    expect(isCanasta(natural)).toBe(true);
    expect(isNaturalCanasta(natural)).toBe(true);
    const mixed = { ...natural, cards: [...sevenFives.slice(0, 6), joker(0)] };
    expect(isCanasta(mixed)).toBe(true);
    expect(isNaturalCanasta(mixed)).toBe(false);
  });

  it('requires a canasta to go out', () => {
    const s = canastaState([[c('9', 'spades')], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], { phase: 'play' });
    expect(() => canastaGame.reduce(s, { intent: 'go-out', playerId: 'p1', cardId: '9s' })).toThrow(/canasta/);
  });

  it('scores a natural canasta (500) and red three (100) on going out', () => {
    const naturalMeld = { id: 'meld-0', team: 'team-0', rank: '5', cards: sevenFives };
    const s = canastaState([[c('9', 'spades')], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], {
      phase: 'play',
      melds: [naturalMeld],
      redThrees: { 'team-0': [c('3', 'hearts')], 'team-1': [] },
    });
    const next = canastaGame.reduce(s, { intent: 'go-out', playerId: 'p1', cardId: '9s' });
    const gs = next.game.gameState as CanastaGS;
    expect(gs.scores['team-0']).toBe(600);
    expect(gs.scores['team-1']).toBe(0);
    expect(next.game.status).toBe('playing'); // redeals
  });

  it('first to 5000 wins', () => {
    const naturalMeld = { id: 'meld-0', team: 'team-0', rank: '5', cards: sevenFives };
    const s = canastaState([[c('9', 'spades')], [c('K', 'clubs')], [c('Q', 'clubs')], [c('J', 'spades')]], {
      phase: 'play',
      melds: [naturalMeld],
      scores: { 'team-0': 4600, 'team-1': 0 },
    });
    const next = canastaGame.reduce(s, { intent: 'go-out', playerId: 'p1', cardId: '9s' });
    const gs = next.game.gameState as CanastaGS;
    expect(gs.scores['team-0']).toBe(5100);
    expect(next.game.status).toBe('finished');
    expect(gs.winner).toBe('team-0');
    expect(canastaGame.isTerminal(next)).toBe(true);
  });
});
