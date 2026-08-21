import { describe, expect, it } from 'vitest';
import { applyAction } from '../engine';
import type { GoFishGameState } from '../gameTypes';
import { nextMatchStep } from './bot-pure';
import { botPolicyFor, settlePolicyFor } from './bot-registry-pure';
import { createLocalMatch, LOCAL_HUMAN_ID, stepDelayMs } from './local-match-pure';
import type { EngineState } from '../state';

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

function lastAsk(state: EngineState) {
  return (state.game.gameState as GoFishGameState).lastAsk;
}

/** Force a miss so the seat passes to the bot. */
function humanAskUntilBotTurn(start: EngineState): EngineState {
  let s = start;
  for (let i = 0; i < 12; i++) {
    if (s.game.status !== 'playing') return s;
    if (s.game.currentSeat !== 0) return s;
    const human = s.players[0];
    const bot = s.players[1];
    if (human.hand.length === 0) return s;
    const miss = human.hand.find((c) => !bot.hand.some((x) => x.rank === c.rank));
    const rank = miss?.rank ?? human.hand[0].rank;
    s = applyAction(s, { intent: 'gofish-ask', rank, targetId: bot.id, playerId: LOCAL_HUMAN_ID });
  }
  return s;
}

describe('local Go Fish vs bot', () => {
  it('lets the human ask and the bot reply', () => {
    let s = createLocalMatch('go_fish', 2);
    const human = s.players[0];
    const bot = s.players[1];
    expect(human.id).toBe(LOCAL_HUMAN_ID);
    expect(human.hand.length).toBe(7);
    expect(human.hand.some((c) => c.rank)).toBe(true);

    const rank = human.hand[0].rank;
    s = applyAction(s, { intent: 'gofish-ask', rank, targetId: bot.id, playerId: LOCAL_HUMAN_ID });

    const afterHuman = lastAsk(s);
    expect(afterHuman).toMatchObject({ fromId: LOCAL_HUMAN_ID, toId: bot.id, rank });
    expect(afterHuman?.result === 'success' || afterHuman?.result === 'go_fish').toBe(true);

    s = humanAskUntilBotTurn(s);
    expect(s.game.status).toBe('playing');
    expect(s.game.currentSeat).toBe(1);

    const step = nextMatchStep(s, LOCAL_HUMAN_ID, botPolicyFor('go_fish'), settlePolicyFor('go_fish'));
    expect(step?.intent).toBe('gofish-ask');
    expect(step?.playerId).toBe(bot.id);
    expect(typeof step?.rank).toBe('string');
    expect(step?.targetId).toBe(LOCAL_HUMAN_ID);

    s = applyAction(s, step!);
    const afterBot = lastAsk(s);
    expect(afterBot?.fromId).toBe(bot.id);
    expect(afterBot?.toId).toBe(LOCAL_HUMAN_ID);
  });

  it('keeps the human on seat after a hit so they can ask again', () => {
    let s = createLocalMatch('go_fish', 2);
    const human = s.players[0];
    const bot = s.players[1];
    const hit = human.hand.find((c) => bot.hand.some((x) => x.rank === c.rank));
    if (!hit) return;
    s = applyAction(s, { intent: 'gofish-ask', rank: hit.rank, targetId: bot.id, playerId: LOCAL_HUMAN_ID });
    expect(lastAsk(s)?.result).toBe('success');
    expect(s.game.currentSeat).toBe(0);
    expect(nextMatchStep(s, LOCAL_HUMAN_ID, botPolicyFor('go_fish'), settlePolicyFor('go_fish'))).toBeNull();
    const again = s.players[0].hand.find((c) => c.rank === hit.rank) ?? s.players[0].hand[0];
    expect(again).toBeTruthy();
    s = applyAction(s, { intent: 'gofish-ask', rank: again.rank, targetId: bot.id, playerId: LOCAL_HUMAN_ID });
    expect(lastAsk(s)?.fromId).toBe(LOCAL_HUMAN_ID);
  });
});
