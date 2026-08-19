import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, startGame } from '../engine';
import { drawCard, playCard, discardCard, pickupCard } from './freeplay';
import type { Card, GameSettings, TableCard } from '../types';
import type { FreePlayRules, FreePlayWinCondition, FreePlayPlayRule } from '../types';
import type { EngineState } from '../state';

const c = (rank: Card['rank'], suit: Card['suit'] = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function rules(
  winCondition: FreePlayWinCondition,
  drawCount = 1,
  playRule: FreePlayPlayRule = 'any',
): GameSettings {
  return { dealCount: 7, maxPlayers: 8, freeplay: { winCondition, drawCount, playRule } };
}

function st(partial: {
  hands?: [Card[], Card[]];
  deck?: Card[];
  discard?: Card[];
  table?: TableCard[];
  currentSeat?: number;
  settings?: GameSettings;
  gameState?: FreePlayRules & { drawsLeft?: number; winner?: string | null };
} = {}): EngineState {
  const settings = partial.settings ?? rules('empty-hand');
  const gs = partial.gameState ?? { drawsLeft: settings.freeplay!.drawCount, winner: null };
  return {
    game: {
      id: 'g1',
      code: 'ABC123',
      status: 'playing',
      gameType: 'freeplay',
      deck: partial.deck ?? [],
      tableCards: partial.table ?? [],
      discardPile: partial.discard ?? [],
      currentSeat: partial.currentSeat ?? 0,
      settings,
      gameState: gs,
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: partial.hands?.[0] ?? [], isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: partial.hands?.[1] ?? [], isCreator: false, isReady: true },
    ],
  };
}

describe('freeplay setup', () => {
  it('deals per settings and initializes turn state', () => {
    let s = createLobbyState('g1', 'ABC123', 'freeplay', rules('empty-hand', 2));
    s = addPlayer(addPlayer(s, 'p1', 'P1'), 'p2', 'P2');
    const playing = startGame(s);
    expect(playing.game.status).toBe('playing');
    expect(playing.players.every((p) => p.hand.length === 7)).toBe(true);
    expect(playing.game.gameState).toMatchObject({ drawsLeft: 2, winner: null });
  });
});

describe('freeplay turns', () => {
  it('blocks actions when it is not your turn', () => {
    const s = st({ hands: [[c('2')], [c('3')]], currentSeat: 0, settings: rules('never') });
    expect(() => drawCard(s, 'p2')).toThrow('Not your turn');
    expect(() => playCard(s, 'p2', '3h', 'P2')).toThrow('Not your turn');
    expect(() => discardCard(s, 'p2', '3h')).toThrow('Not your turn');
  });

  it('draw respects the drawCount budget', () => {
    const s = st({ hands: [[c('2')], [c('3')]], deck: [c('A'), c('K')], settings: rules('never', 2) });
    const s1 = drawCard(s, 'p1');
    expect(s1.players[0].hand).toHaveLength(2);
    const s2 = drawCard(s1, 'p1');
    expect(s2.players[0].hand).toHaveLength(3);
    expect(() => drawCard(s2, 'p1')).toThrow('No draws left');
  });

  it('discard ends the turn and resets the draw budget', () => {
    const s = st({ hands: [[c('2'), c('3')], [c('9')]], deck: [c('A')], settings: rules('never', 1) });
    const s1 = discardCard(s, 'p1', '2h');
    expect(s1.game.currentSeat).toBe(1);
    expect(s1.game.gameState.drawsLeft).toBe(1);
  });
});

describe('freeplay win conditions', () => {
  it('empty-hand finishes when a player empties their hand', () => {
    const s = st({ hands: [[c('2')], [c('3', 'spades'), c('4', 'spades')]], settings: rules('empty-hand') });
    const s1 = playCard(s, 'p1', '2h', 'P1');
    expect(s1.game.status).toBe('finished');
    expect(s1.game.gameState.winner).toBe('p1');
  });

  it('never win condition keeps the game running', () => {
    const s = st({ hands: [[c('2')], [c('3')]], settings: rules('never') });
    const s1 = playCard(s, 'p1', '2h', 'P1');
    expect(s1.game.status).toBe('playing');
    expect(s1.game.gameState.winner).toBeNull();
  });

  it('most-table wins when the deck runs out', () => {
    const table: TableCard[] = [
      { id: 'Ah', suit: 'hearts', rank: 'A', playedBy: 'p1', playedByName: 'P1' },
      { id: 'Kh', suit: 'hearts', rank: 'K', playedBy: 'p1', playedByName: 'P1' },
      { id: 'Qh', suit: 'hearts', rank: 'Q', playedBy: 'p2', playedByName: 'P2' },
    ];
    const s = st({ hands: [[c('2')], [c('3')]], deck: [], table, settings: rules('most-table') });
    const s1 = playCard(s, 'p1', '2h', 'P1');
    expect(s1.game.status).toBe('finished');
    expect(s1.game.gameState.winner).toBe('p1');
  });

  it('highest-total wins by card value when the deck runs out', () => {
    const table: TableCard[] = [
      { id: 'Ah', suit: 'hearts', rank: 'A', playedBy: 'p2', playedByName: 'P2' },
    ];
    const s = st({ hands: [[c('K', 'spades')], [c('3')]], deck: [], table, settings: rules('highest-total') });
    const s1 = playCard(s, 'p1', 'Ks', 'P1');
    expect(s1.game.gameState.winner).toBe('p2');
  });
});

describe('freeplay play rules', () => {
  it('match-rank requires the same rank as the top discard', () => {
    const s = st({
      hands: [[c('2', 'clubs'), c('5')], [c('9')]],
      discard: [c('2', 'spades')],
      settings: rules('never', 1, 'match-rank'),
    });
    expect(() => playCard(s, 'p1', '5h', 'P1')).toThrow(/matching rank/);
    expect(() => playCard(s, 'p1', '2c', 'P1')).not.toThrow();
  });

  it('match-suit requires the same suit as the top discard', () => {
    const s = st({
      hands: [[c('5', 'hearts')], [c('9')]],
      discard: [c('2', 'spades')],
      settings: rules('never', 1, 'match-suit'),
    });
    expect(() => playCard(s, 'p1', '5h', 'P1')).toThrow(/matching suit/);
  });

  it('match-rank-or-suit accepts either', () => {
    const base = {
      hands: [[c('2', 'clubs'), c('5', 'spades'), c('9', 'hearts')], [c('9')]] as [Card[], Card[]],
      discard: [c('2', 'spades')],
      settings: rules('never', 1, 'match-rank-or-suit'),
    };
    expect(() => playCard(st(base), 'p1', '2c', 'P1')).not.toThrow(); // rank match
    expect(() => playCard(st(base), 'p1', '5s', 'P1')).not.toThrow(); // suit match
    expect(() => playCard(st(base), 'p1', '9h', 'P1')).toThrow(/matching rank or suit/);
  });

  it('pickup returns a table card to your hand', () => {
    const table: TableCard[] = [
      { id: 'Ah', suit: 'hearts', rank: 'A', playedBy: 'p2', playedByName: 'P2' },
    ];
    const s = st({ hands: [[c('2')], [c('3')]], table, settings: rules('never') });
    const s1 = pickupCard(s, 'p1', 'Ah');
    expect(s1.game.tableCards).toHaveLength(0);
    expect(s1.players[0].hand).toContainEqual({ id: 'Ah', suit: 'hearts', rank: 'A' });
  });
});
