import { describe, expect, it } from 'vitest';
import { viewFor } from '../../durable/room-handler';
import { PlaytestSession } from './session-pure';
import { findViewLeaks } from './leaks-pure';

describe('PlaytestSession (Durable Object protocol)', () => {
  it('creates a room, joins two players, deals, and hides the other hand', () => {
    const session = new PlaytestSession('crazy_eights', 'EIGHTS');
    const a = session.join('Alice');
    const b = session.join('Bob');
    expect(a.playerId).not.toBe(b.playerId);
    session.act({ intent: 'start', playerId: a.playerId });
    expect(session.state.game.status).toBe('playing');
    expect(session.state.players).toHaveLength(2);

    const viewA = viewFor(session.state, a.playerId);
    const viewB = viewFor(session.state, b.playerId);
    expect(findViewLeaks(viewA, session.state, a.playerId)).toEqual([]);
    expect(findViewLeaks(viewB, session.state, b.playerId)).toEqual([]);
  });
});
