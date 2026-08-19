import { describe, expect, it } from 'vitest';
import { applyAction } from '../engine';
import { nextMatchStep } from './bot-pure';
import { botPolicyFor, settlePolicyFor } from './bot-registry-pure';
import { createLocalMatch, LOCAL_HUMAN_ID, stepDelayMs } from './local-match-pure';

describe('createLocalMatch', () => {
  it('deals War to you and Alice', () => {
    const s = createLocalMatch('war', 2);
    expect(s.game.status).toBe('playing');
    expect(s.players.map((p) => p.name)).toEqual(['You', 'Alice']);
    expect(s.players[0].id).toBe(LOCAL_HUMAN_ID);
    expect(s.players[0].hand.length).toBe(26);
    expect(s.players[1].hand.length).toBe(26);
  });
});

describe('stepDelayMs', () => {
  it('pauses longer on collect so cards can fly out', () => {
    expect(stepDelayMs({ intent: 'war-play' })).toBe(850);
    expect(stepDelayMs({ intent: 'war-collect' })).toBe(1400);
  });
});

describe('stepped War vs bot', () => {
  it('shows Alice then collect as two separate steps', () => {
    let s = createLocalMatch('war', 2);
    s = applyAction(s, { intent: 'war-play', playerId: LOCAL_HUMAN_ID });
    const alice = nextMatchStep(s, LOCAL_HUMAN_ID, botPolicyFor('war'), settlePolicyFor('war'));
    expect(alice).toEqual({ intent: 'war-play', playerId: 'fake-1' });
    s = applyAction(s, alice!);
    const collect = nextMatchStep(s, LOCAL_HUMAN_ID, botPolicyFor('war'), settlePolicyFor('war'));
    const phase = (s.game.gameState as { phase?: string }).phase;
    if (phase === 'war') {
      expect(collect == null || collect.intent === 'war-play').toBe(true);
    } else {
      expect(collect?.intent).toBe('war-collect');
    }
  });
});
