import { describe, it, expect } from 'vitest';
import { createDeck, buildDeck, shuffleDeck, generateGameCode } from './deck';
import {
  addPlayer,
  applyAction,
  createLobbyState,
  publicView,
  startGame,
  EngineError,
  type EngineState,
} from './engine';
import { warFlip, warCollect } from './games/war';
import { goFishAsk } from './games/goFish';
import { drawCard, playCard, discardCard, pickupCard } from './games/freeplay';
import type { Card, Rank, Suit, GameSettings } from './types';
import type { GameType } from './gameTypes';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

const SETTINGS: GameSettings = { dealCount: 7, maxPlayers: 8 };

function lobby(gameType: GameType, n: number, settings?: GameSettings): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings ?? SETTINGS);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function warState(
  p1Hand: Card[],
  p2Hand: Card[],
  phase: 'battle' | 'war' | 'reveal' | 'finished' = 'battle',
  roundCards: Record<string, Card[]> = {},
  cardsAtStake: Card[] = [],
  roundWinnerId: string | null = null,
): EngineState {
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'war',
      deck: [], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { dealCount: 26, maxPlayers: 2 },
      gameState: { phase, roundCards, cardsAtStake, roundWinnerId, lastWinnerSeat: null, winner: null, lastTiedCards: null },
    },
    players: [
      { id: 'p1', name: 'P1', seat: 0, hand: p1Hand, isCreator: true, isReady: true },
      { id: 'p2', name: 'P2', seat: 1, hand: p2Hand, isCreator: false, isReady: true },
    ],
  };
}

describe('deck', () => {
  it('creates a 52-card deck', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('buildDeck supports subsets and copies', () => {
    expect(buildDeck()).toHaveLength(52);
    expect(buildDeck({ ranks: ['9', '10', 'J', 'Q', 'K', 'A'] })).toHaveLength(24); // euchre
    expect(buildDeck({ copies: 2 })).toHaveLength(104);
  });

  it('shuffle preserves cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...deck].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('generates a 6-char code', () => {
    expect(generateGameCode()).toMatch(/^[A-Z2-9]{6}$/);
  });
});

describe('envelope', () => {
  it('adds players with creator + seat assignment', () => {
    const s = lobby('freeplay', 3);
    expect(s.players).toHaveLength(3);
    expect(s.players[0].isCreator).toBe(true);
    expect(s.players.map((p) => p.seat)).toEqual([0, 1, 2]);
  });

  it('rejects join when full', () => {
    const s = createLobbyState('g1', 'ABC123', 'war', { dealCount: 0, maxPlayers: 2 });
    const s2 = addPlayer(addPlayer(s, 'p1', 'P1'), 'p2', 'P2');
    expect(() => addPlayer(s2, 'p3', 'P3')).toThrow(EngineError);
  });

  it('applyAction throws for unregistered games', () => {
    const s = createLobbyState('g1', 'ABC123', 'not_a_game' as never, SETTINGS);
    expect(() => applyAction(s, { intent: 'start' })).toThrow(/not implemented/);
  });
});

describe('startGame', () => {
  it('deals war 26 cards each', () => {
    const s = startGame(lobby('war', 2, { dealCount: 0, maxPlayers: 2 }));
    expect(s.game.status).toBe('playing');
    expect(s.players[0].hand).toHaveLength(26);
    expect(s.players[1].hand).toHaveLength(26);
    expect((s.game.gameState as { phase: string }).phase).toBe('battle');
  });

  it('deals go_fish 7 cards each', () => {
    const s = startGame(lobby('go_fish', 2));
    expect(s.players.every((p) => p.hand.length === 7)).toBe(true);
    expect(s.game.deck).toHaveLength(52 - 14);
  });

  it('deals freeplay per settings', () => {
    const s = startGame(lobby('freeplay', 2, { dealCount: 10, maxPlayers: 8 }));
    expect(s.players.every((p) => p.hand.length === 10)).toBe(true);
  });
});

describe('publicView', () => {
  it('hides stock-game ranks even from the viewer', () => {
    const s = startGame(lobby('war', 2, { dealCount: 0, maxPlayers: 2 }));
    const view = publicView(s, 'p1');
    expect(view.players[0].handCount).toBe(26);
    expect(view.players[0].hand).toEqual([]);
    expect(view.players[1].hand).toEqual([]);
  });

  it('counts stacked stock games without leaking the stack', () => {
    const s = startGame(lobby('egyptian_ratscrew', 2, { dealCount: 0, maxPlayers: 6 }));
    const view = publicView(s, 'p1');
    expect(view.players[0].handCount).toBe(26);
    expect(view.players[0].hand).toEqual([]);
    expect((view.game.gameState as { stacks?: unknown }).stacks).toBeUndefined();
    expect(Array.isArray((view.game.gameState as { center?: unknown }).center)).toBe(true);
  });

  it('shows the viewer an open hand in freeplay', () => {
    const s = startGame(lobby('freeplay', 2, { dealCount: 7, maxPlayers: 8 }));
    const view = publicView(s, 'p1');
    expect(view.players[0].hand).toHaveLength(7);
    expect(view.players[1].hand).toEqual([]);
  });
});

describe('freeplay actions', () => {
  const base = (): EngineState => ({
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'freeplay',
      deck: [c('A'), c('K')], tableCards: [], discardPile: [], currentSeat: 0,
      settings: { ...SETTINGS, freeplay: { winCondition: 'never', drawCount: 1, playRule: 'any' } },
      gameState: { drawsLeft: 1, winner: null },
    },
    players: [{ id: 'p1', name: 'P1', seat: 0, hand: [c('2')], isCreator: true, isReady: true }],
  });

  it('drawCard moves top of deck to hand', () => {
    const s = drawCard(base(), 'p1');
    expect(s.players[0].hand.map((x) => x.rank)).toEqual(['2', 'A']);
  });

  it('playCard moves hand -> table with metadata', () => {
    const s = playCard(base(), 'p1', '2h', 'P1');
    expect(s.game.tableCards[0]).toMatchObject({ id: '2h', playedBy: 'p1' });
  });

  it('discardCard + pickupCard round-trip', () => {
    let s = playCard(base(), 'p1', '2h', 'P1');
    s = pickupCard(s, 'p1', '2h');
    expect(s.game.tableCards).toHaveLength(0);
    expect(s.players[0].hand[0]).toEqual({ id: '2h', suit: 'hearts', rank: '2' });
  });
});

describe('war', () => {
  it('resolves a winning battle to reveal', () => {
    const s0 = warState([c('A', 'spades')], [c('K', 'spades')]);
    const s1 = warFlip(s0, 'p1');
    const s2 = warFlip(s1, 'p2');
    const gs = s2.game.gameState as { phase: string; roundWinnerId: string };
    expect(gs.phase).toBe('reveal');
    expect(gs.roundWinnerId).toBe('p1');
  });

  it('ties into war phase', () => {
    const s0 = warState([c('A', 'spades')], [c('A', 'hearts')]);
    const s1 = warFlip(warFlip(s0, 'p1'), 'p2');
    expect((s1.game.gameState as { phase: string }).phase).toBe('war');
  });

  it('blocks double flip and collecting out of turn', () => {
    const s0 = warState([c('A', 'spades')], [c('K', 'spades')]);
    const s1 = warFlip(s0, 'p1');
    expect(() => warFlip(s1, 'p1')).toThrow(EngineError);
    expect(() => warCollect(s1, 'p1')).toThrow(EngineError);
  });

  it('winner collects and finishes when loser is out', () => {
    const s0 = warState([], [], 'reveal', { p1: [c('Q', 'spades')], p2: [c('J', 'spades')] }, [], 'p1');
    const s1 = warCollect(s0, 'p1');
    expect(s1.game.status).toBe('finished');
    expect(s1.players[0].hand).toHaveLength(2);
  });
});

describe('go fish', () => {
  function goFishState(askerHand: Card[], targetHand: Card[], deck: Card[], currentSeat = 0): EngineState {
    return {
      game: {
        id: 'g1', code: 'ABC123', status: 'playing', gameType: 'go_fish',
        deck, tableCards: [], discardPile: [], currentSeat,
        settings: SETTINGS, gameState: { currentSeat, books: {}, lastAsk: null, winner: null },
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand: askerHand, isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: targetHand, isCreator: false, isReady: true },
      ],
    };
  }

  it('successful ask transfers matching cards', () => {
    const s = goFishAsk(goFishState([c('2', 'clubs')], [c('2', 'spades'), c('2', 'diamonds')], []), 'p1', '2', 'p2');
    expect(s.players[0].hand.map((x) => x.rank)).toEqual(['2', '2', '2']);
    expect(s.game.currentSeat).toBe(0);
  });

  it('go_fish draws and advances turn', () => {
    const s = goFishAsk(goFishState([c('2', 'clubs')], [c('3', 'spades')], [c('A')]), 'p1', '2', 'p2');
    expect(s.players[0].hand.map((x) => x.rank)).toEqual(['2', 'A']);
    expect(s.game.currentSeat).toBe(1);
  });

  it('rejects asking a rank you do not hold', () => {
    expect(() =>
      goFishAsk(goFishState([c('2', 'clubs')], [c('3', 'spades')], []), 'p1', 'K', 'p2'),
    ).toThrow('You must hold that rank');
  });
});
