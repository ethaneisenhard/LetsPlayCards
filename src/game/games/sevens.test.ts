import { describe, it, expect } from 'vitest';
import { addPlayer, createLobbyState, EngineError, type EngineState } from '../state';
import type { Card, Rank, Suit } from '../types';
import { sevensGame, emptyPlayed, legalSevensPlays } from './sevens';

const c = (rank: Rank, suit: Suit = 'hearts'): Card => ({ id: `${rank}${suit[0]}`, suit, rank });

function lobby(n: number): EngineState {
  let s = createLobbyState('g1', 'ABC123', 'sevens', { dealCount: 7, maxPlayers: 7 });
  for (let i = 0; i < n; i++) s = addPlayer(s, `p${i + 1}`, `P${i + 1}`);
  return s;
}

function sevState(hands: Card[][], played: Record<string, { min: number; max: number } | null> | null = null, currentSeat = 0): EngineState {
  const players = hands.map((hand, i) => ({
    id: `p${i + 1}`, name: `P${i + 1}`, seat: i, hand,
    isCreator: i === 0, isReady: true,
  }));
  return {
    game: {
      id: 'g1', code: 'ABC123', status: 'playing', gameType: 'sevens',
      deck: [], tableCards: [], discardPile: [], currentSeat,
      settings: { dealCount: 7, maxPlayers: 7 },
      gameState: { played: played ?? emptyPlayed(), winner: null },
    },
    players,
  };
}

const hearts = (min: number, max: number) => ({ min, max });

describe('sevens', () => {
  it('deals all 52 cards', () => {
    const s = sevensGame.setup(lobby(3));
    expect(s.players.reduce((n, p) => n + p.hand.length, 0)).toBe(52);
    expect(s.game.status).toBe('playing');
  });

  it('a 7 opens a suit', () => {
    const s = sevState([[c('7', 'hearts'), c('8', 'hearts')], [c('7', 'spades')], [c('7', 'diamonds')]]);
    const next = sevensGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '7h' });
    const gs = next.game.gameState as { played: Record<string, { min: number; max: number } | null> };
    expect(gs.played.hearts).toEqual(hearts(7, 7));
    expect(next.players[0].hand.map((x) => x.id)).toEqual(['8h']);
  });

  it('an adjacent card (one up or down) is playable', () => {
    const s = sevState([[c('7', 'hearts'), c('8', 'hearts'), c('6', 'hearts')]], { ...emptyPlayed(), hearts: hearts(7, 7) });
    expect(legalSevensPlays([c('7', 'hearts'), c('8', 'hearts'), c('6', 'hearts'), c('9', 'hearts')], s.game.gameState.played).map((x) => x.id)).toEqual(['8h', '6h']);
    const next = sevensGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '8h' });
    const gs = next.game.gameState as { played: Record<string, { min: number; max: number } | null> };
    expect(gs.played.hearts).toEqual(hearts(7, 8));
  });

  it('rejects a non-adjacent card', () => {
    const s = sevState([[c('7', 'hearts'), c('9', 'hearts')]], { ...emptyPlayed(), hearts: hearts(7, 7) });
    expect(() => sevensGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '9h' })).toThrow(EngineError);
  });

  it('passes only when there is no legal play', () => {
    const noPlay = sevState([[c('2', 'clubs')], [c('3', 'spades')]], { ...emptyPlayed(), hearts: hearts(7, 7) });
    const passed = sevensGame.reduce(noPlay, { intent: 'pass', playerId: 'p1' });
    expect(passed.game.currentSeat).toBe(1);

    const hasPlay = sevState([[c('7', 'clubs')], [c('3', 'spades')]], { ...emptyPlayed(), hearts: hearts(7, 7) });
    expect(() => sevensGame.reduce(hasPlay, { intent: 'pass', playerId: 'p1' })).toThrow(EngineError);
  });

  it('the first player to empty their hand wins', () => {
    const s = sevState([[c('8', 'hearts')]], { ...emptyPlayed(), hearts: hearts(7, 7) });
    const next = sevensGame.reduce(s, { intent: 'play', playerId: 'p1', cardId: '8h' });
    expect(next.game.status).toBe('finished');
    expect((next.game.gameState as { winner: string }).winner).toBe('p1');
  });
});
