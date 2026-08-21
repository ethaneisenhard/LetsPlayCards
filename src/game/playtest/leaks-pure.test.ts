import { describe, expect, it } from 'vitest';
import { addPlayer, createLobbyState, publicView, startGame } from '../engine';
import { findViewLeaks } from './leaks-pure';

describe('findViewLeaks', () => {
  it('flags an opponent hand left in the view', () => {
    let state = createLobbyState('g1', 'ABC123', 'freeplay', { dealCount: 7, maxPlayers: 8 });
    state = addPlayer(state, 'p1', 'Alice');
    state = addPlayer(state, 'p2', 'Bob');
    state = startGame(state);
    const view = publicView(state, 'p1');
    const leaked = {
      ...view,
      players: view.players.map((p) =>
        p.id === 'p2' ? { ...p, hand: state.players[1].hand } : p,
      ),
    };
    expect(findViewLeaks(leaked, state, 'p1').some((e) => e.includes('opponent'))).toBe(true);
  });

  it('accepts a real publicView for freeplay', () => {
    let state = createLobbyState('g1', 'ABC123', 'freeplay', { dealCount: 7, maxPlayers: 8 });
    state = addPlayer(state, 'p1', 'Alice');
    state = addPlayer(state, 'p2', 'Bob');
    state = startGame(state);
    expect(findViewLeaks(publicView(state, 'p1'), state, 'p1')).toEqual([]);
    expect(findViewLeaks(publicView(state, 'p2'), state, 'p2')).toEqual([]);
  });

  it('accepts a stock-game publicView without stacks or ranks', () => {
    let state = createLobbyState('g1', 'ABC123', 'war', { dealCount: 0, maxPlayers: 2 });
    state = addPlayer(state, 'p1', 'Alice');
    state = addPlayer(state, 'p2', 'Bob');
    state = startGame(state);
    expect(findViewLeaks(publicView(state, 'p1'), state, 'p1')).toEqual([]);
  });
});
