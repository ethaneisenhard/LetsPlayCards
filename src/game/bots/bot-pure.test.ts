import { describe, expect, it } from 'vitest';
import { addPlayer, applyAction, createLobbyState, startGame } from '../engine';
import { nextBotReply, nextMatchStep, respondAfterHuman } from './bot-pure';
import { botPolicyFor, settlePolicyFor } from './bot-registry-pure';

function warStarted() {
  let s = createLobbyState('g1', 'ABC123', 'war', { dealCount: 0, maxPlayers: 2 });
  s = addPlayer(s, 'fake-0', 'You');
  s = addPlayer(s, 'fake-1', 'Alice');
  return startGame(s);
}

describe('respondAfterHuman', () => {
  it('does not let Alice open the round', () => {
    const s = warStarted();
    expect(nextBotReply(s, 'fake-0', botPolicyFor('war'))).toBeNull();
  });

  it('Alice answers your flip, then waits', () => {
    let s = warStarted();
    // First cards are shuffled; a tie goes to war and there is no collect yet.
    for (let i = 0; i < 40; i++) {
      const you = s.players[0]?.hand[0];
      const alice = s.players[1]?.hand[0];
      if (you && alice && you.rank !== alice.rank) break;
      s = warStarted();
    }
    s = applyAction(s, { intent: 'war-play', playerId: 'fake-0' });
    expect(nextBotReply(s, 'fake-0', botPolicyFor('war'))).toEqual({
      intent: 'war-play',
      playerId: 'fake-1',
    });

    const first = nextMatchStep(s, 'fake-0', botPolicyFor('war'), settlePolicyFor('war'));
    expect(first).toEqual({ intent: 'war-play', playerId: 'fake-1' });
    s = applyAction(s, first!);
    const second = nextMatchStep(s, 'fake-0', botPolicyFor('war'), settlePolicyFor('war'));
    expect(second?.intent).toBe('war-collect');

    s = respondAfterHuman(s, 'fake-0', botPolicyFor('war'), applyAction, settlePolicyFor('war'));
    const phase = (s.game.gameState as { phase?: string }).phase;
    expect(phase === 'battle' || phase === 'finished').toBe(true);
    expect(nextBotReply(s, 'fake-0', botPolicyFor('war'))).toBeNull();
  });
});
