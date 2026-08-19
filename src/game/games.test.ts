import { describe, it, expect } from 'vitest';
import { orderedSeats, nextSeat } from './primitives/turn';
import { legalPlays, trickWinner, trickPoints } from './primitives/trick';
import { findMelds, cardValue, deadwood } from './primitives/meld';
import { isValidMeld } from './games/rummy';
import { handValue } from './games/blackjack';
import { heartsGame } from './games/hearts';
import { crazyEightsGame } from './games/crazyEights';
import { rummyGame } from './games/rummy';
import { blackjackGame } from './games/blackjack';
import { addPlayer, createLobbyState, EngineError, type EngineState } from './engine';
import type { Card, Rank, Suit } from './types';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(gameType: Parameters<typeof createLobbyState>[2], n: number, settings = { dealCount: 7, maxPlayers: 8 }): EngineState {
  let s = createLobbyState('g1', 'ABC123', gameType, settings);
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

describe('primitives', () => {
  it('nextSeat rotates and wraps', () => {
    const seats = [0, 1, 2, 3];
    expect(orderedSeats([{ seat: 2 }, { seat: 0 }, { seat: 1 }])).toEqual([0, 1, 2]);
    expect(nextSeat(seats, 3)).toBe(0);
    expect(nextSeat(seats, 1)).toBe(2);
    expect(nextSeat(seats, 2, -1)).toBe(1); // reverse
  });

  it('legalPlays forces follow-suit', () => {
    const hand = [c('2', 'hearts'), c('K', 'spades')];
    expect(legalPlays(hand, 'spades')).toEqual([c('K', 'spades')]);
    expect(legalPlays(hand, 'clubs')).toEqual(hand); // void → any
    expect(legalPlays(hand, null)).toEqual(hand);
  });

  it('trickWinner: trump beats lead, lead beats off-suit', () => {
    const lead = 'hearts';
    expect(trickWinner([{ playerId: 'p1', card: c('A', 'hearts') }, { playerId: 'p2', card: c('2', 'spades') }], lead, 'spades')).toBe('p2');
    expect(trickWinner([{ playerId: 'p1', card: c('A', 'hearts') }, { playerId: 'p2', card: c('K', 'hearts') }], lead)).toBe('p1');
  });

  it('trickPoints scores hearts + queen of spades', () => {
    expect(trickPoints([c('2', 'hearts'), c('Q', 'spades'), c('A', 'clubs')])).toBe(14);
  });

  it('findMelds detects sets and runs', () => {
    const melds = findMelds([
      c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'),
      c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds'),
    ]);
    expect(melds).toHaveLength(2);
    expect(melds.find((m) => m.kind === 'set')).toBeDefined();
    expect(melds.find((m) => m.kind === 'run')).toBeDefined();
  });

  it('cardValue and deadwood', () => {
    expect(cardValue(c('A'))).toBe(1);
    expect(cardValue(c('K'))).toBe(10);
    expect(cardValue(c('7'))).toBe(7);
    expect(deadwood([c('A'), c('K'), c('7')])).toBe(18);
  });

  it('isValidMeld rejects invalid', () => {
    expect(isValidMeld([c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades')])).toBe(true);
    expect(isValidMeld([c('5', 'diamonds'), c('6', 'diamonds'), c('7', 'diamonds')])).toBe(true);
    expect(isValidMeld([c('5', 'diamonds'), c('6', 'diamonds')])).toBe(false); // < 3
    expect(isValidMeld([c('5', 'diamonds'), c('6', 'hearts'), c('7', 'diamonds')])).toBe(false); // mixed suit
    expect(isValidMeld([c('5', 'diamonds'), c('7', 'diamonds'), c('9', 'diamonds')])).toBe(false); // not consecutive
  });
});

describe('hearts', () => {
  it('deals 13 each to 4 players and 2♣ leads', () => {
    const s = heartsGame.setup(lobby('hearts', 4, { dealCount: 0, maxPlayers: 4 }));
    expect(s.players.every((p) => p.hand.length === 13)).toBe(true);
    const leader = s.players.find((p) => p.seat === s.game.currentSeat)!;
    expect(leader.hand.some((x) => x.rank === '2' && x.suit === 'clubs')).toBe(true);
  });

  it('enforces leading the 2 of clubs on the first trick', () => {
    const s = heartsGame.setup(lobby('hearts', 4, { dealCount: 0, maxPlayers: 4 }));
    const leaderId = s.players.find((p) => p.seat === s.game.currentSeat)!.id;
    const nonClub = s.players.find((p) => p.id === leaderId)!.hand.find((x) => !(x.rank === '2' && x.suit === 'clubs'))!;
    expect(() => heartsGame.reduce(s, { intent: 'play', playerId: leaderId, cardId: nonClub.id })).toThrow(EngineError);
  });
});

describe('crazy eights', () => {
  function ceState(hand: Card[], deck: Card[], discard: Card[], currentSeat = 0, chosenSuit: Suit | null = null): EngineState {
    return {
      game: {
        id: 'g1', code: 'ABC123', status: 'playing', gameType: 'crazy_eights',
        deck, tableCards: [], discardPile: discard, currentSeat,
        settings: { dealCount: 7, maxPlayers: 7 }, gameState: { chosenSuit, winner: null },
      },
      players: [
        { id: 'p1', name: 'P1', seat: 0, hand, isCreator: true, isReady: true },
        { id: 'p2', name: 'P2', seat: 1, hand: [], isCreator: false, isReady: true },
      ],
    };
  }

  it('plays a matching card and wins on empty hand', () => {
    const s = ceState([c('7', 'spades')], [c('A')], [c('7', 'hearts')]);
    const next = crazyEightsGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7s' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as { winner: string }).winner).toBe('p1');
  });

  it('rejects non-matching card', () => {
    const s = ceState([c('3', 'clubs')], [c('A')], [c('7', 'hearts')]);
    expect(() => crazyEightsGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '3c' })).toThrow(EngineError);
  });

  it('8 is wild and sets chosen suit', () => {
    const s = ceState([c('8', 'clubs')], [c('A')], [c('7', 'hearts')]);
    const next = crazyEightsGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '8c', suit: 'spades' });
    expect((next.game.gameState as { chosenSuit: Suit }).chosenSuit).toBe('spades');
  });
});

describe('rummy', () => {
  it('melds a valid set and wins on discard', () => {
    const s = lobby('rummy', 2, { dealCount: 10, maxPlayers: 6 });
    const playing = rummyGame.setup(s);
    // Force a known hand for determinism
    const forced: EngineState = {
      ...playing,
      game: { ...playing.game, deck: [c('9', 'diamonds')], discardPile: [] },
      players: [
        { ...playing.players[0], hand: [c('2', 'hearts'), c('2', 'clubs'), c('2', 'spades'), c('5', 'diamonds')] },
        playing.players[1],
      ],
    };
    const melded = rummyGame.reduce(forced, { intent: 'meld', playerId: 'p1', cardIds: ['2h', '2c', '2s'] });
    expect(melded.players[0].hand.map((x) => x.id)).toEqual(['5d']);
    const won = rummyGame.reduce(melded, { intent: 'discard', playerId: 'p1', cardId: '5d' });
    expect(won.game.status).toBe('finished');
  });
});

describe('blackjack', () => {
  it('handValue handles soft aces', () => {
    expect(handValue([c('A'), c('10', 'spades')])).toBe(21);
    expect(handValue([c('A'), c('A')])).toBe(12);
    expect(handValue([c('A'), c('A'), c('K', 'spades')])).toBe(12);
    expect(handValue([c('K', 'spades'), c('Q', 'spades')])).toBe(20);
  });

  it('hit that busts marks the player bust', () => {
    const s = blackjackGame.setup(lobby('blackjack', 1, { dealCount: 2, maxPlayers: 7 }));
    const forced: EngineState = {
      ...s,
      game: { ...s.game, deck: [c('K', 'spades')] },
      players: [{ ...s.players[0], hand: [c('10', 'spades'), c('10', 'clubs')] }],
    };
    const next = blackjackGame.reduce(forced, { intent: 'hit', playerId: 'p1' });
    const gs = next.game.gameState as { results: Record<string, string>; phase: string };
    expect(gs.results.p1).toBe('bust');
    expect(gs.phase).toBe('finished');
  });
});
