import { describe, it, expect } from 'vitest';
import { createLobbyState, addPlayer, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { spiteAndMaliceGame, centerIndex } from './spiteAndMalice';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(type: 'spite_and_malice', n: number, maxPlayers: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', type, { dealCount: 5, maxPlayers });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

interface SAMGS {
  payoff: Record<string, Card[]>;
  sidePiles: Record<string, Card[][]>;
  center: Card[][];
  lastActor: string | null;
  winner: string | null;
}

function sState(
  hand: Card[],
  payoff: Record<string, Card[]>,
  deck: Card[] = [],
  center: Card[][] = [[], [], [], []],
  sidePiles: Record<string, Card[][]> = { p1: [[], [], [], []], p2: [[], [], [], []] },
  lastActor: string | null = null,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'spite_and_malice',
      deck, tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 5, maxPlayers: 2 },
      gameState: { payoff, sidePiles, center, lastActor, winner: null } as SAMGS,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
    ],
  };
}

describe('spite-and-malice', () => {
  it('deals a 20-card payoff pile and a 5-card hand to each player', () => {
    const s = spiteAndMaliceGame.setup(lobby('spite_and_malice', 2, 2));
    const gs = s.game.gameState as SAMGS;
    expect(gs.payoff.p1).toHaveLength(20);
    expect(gs.payoff.p2).toHaveLength(20);
    expect(s.players[0].hand).toHaveLength(5);
    expect(s.players[1].hand).toHaveLength(5);
    expect(gs.center).toHaveLength(4);
    expect(gs.sidePiles.p1).toHaveLength(4);
  });

  it('ranks center piles from Ace to Queen', () => {
    expect(centerIndex('A')).toBe(0);
    expect(centerIndex('Q')).toBe(11);
    expect(centerIndex('K')).toBe(-1);
  });

  it('plays an Ace on an empty pile, then the next card on top', () => {
    const s = sState([c('A'), c('2')], { p1: [c('K')], p2: [c('K')] });
    let t = spiteAndMaliceGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Ah', centerPile: 0 });
    expect((t.game.gameState as SAMGS).center[0].map((x) => x.rank)).toEqual(['A']);
    t = spiteAndMaliceGame.reduce(t, { intent: 'play', playerId: 'p1', cardId: '2h', centerPile: 0 });
    expect((t.game.gameState as SAMGS).center[0].map((x) => x.rank)).toEqual(['A', '2']);
  });

  it('rejects a card that is not one higher than the pile top', () => {
    const s = sState([c('4')], { p1: [c('K')], p2: [c('K')] }, [], [[], [c('2')], [], []]);
    expect(() => spiteAndMaliceGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '4h', centerPile: 1 })).toThrow(EngineError);
    const empty = sState([c('3')], { p1: [c('K')], p2: [c('K')] });
    expect(() => spiteAndMaliceGame.reduce(empty, { intent: 'play', playerId: 'p1', cardId: '3h', centerPile: 0 })).toThrow(EngineError);
  });

  it('stashes a card on a side pile', () => {
    const s = sState([c('K', 'spades'), c('3')], { p1: [c('K')], p2: [c('K')] });
    const t = spiteAndMaliceGame.reduce(s, { intent: 'side-pile', playerId: 'p1', cardId: 'Ks' });
    const gs = t.game.gameState as SAMGS;
    expect(gs.sidePiles.p1[0].map((x) => x.rank)).toEqual(['K']);
    expect(t.players[0].hand.map((x) => x.id)).toEqual(['3h']);
  });

  it('emptying the payoff pile wins the game', () => {
    const s = sState([c('5')], { p1: [c('A')], p2: [c('K')] });
    const t = spiteAndMaliceGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Ah', centerPile: 0 });
    expect(t.game.status).toBe('finished');
    expect((t.game.gameState as SAMGS).winner).toBe('p1');
  });

  it('draws back up to five cards at the start of a turn', () => {
    const s = sState([c('A')], { p1: [c('K')], p2: [c('K')] }, [c('2'), c('3'), c('4'), c('5')]);
    const t = spiteAndMaliceGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: 'Ah', centerPile: 0 });
    expect(t.players[0].hand).toHaveLength(4);
    expect(t.game.deck).toHaveLength(0);
  });
});
