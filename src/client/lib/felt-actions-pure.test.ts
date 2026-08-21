import { describe, expect, it } from 'vitest';
import { applyAction } from '../../game/engine';
import { GAME_CATALOG } from '../../game/registry/catalog';
import { createLocalMatch, LOCAL_HUMAN_ID } from '../../game/bots/local-match-pure';
import { resolveTableKind } from '../../game/audit/playability-registry-pure';
import { isUnknownIntentError, resolveFeltActions } from './felt-actions-pure';

describe('resolveFeltActions', () => {
  it('hides generic hand actions on stock and special boards', () => {
    expect(resolveFeltActions({ tableKind: 'stock-battle' })).toMatchObject({ allowPlay: false, allowDraw: false });
    expect(resolveFeltActions({ tableKind: 'special' })).toMatchObject({ allowPlay: false, allowDraw: false });
    expect(resolveFeltActions({ tableKind: 'draw-from' })).toMatchObject({ allowPlay: false, allowDraw: false });
    expect(resolveFeltActions({ tableKind: 'ask-rank' })).toMatchObject({ allowPlay: false, allowDraw: false });
    expect(resolveFeltActions({ tableKind: 'hit-stand' })).toMatchObject({ allowPlay: false, allowDraw: false });
    expect(resolveFeltActions({ tableKind: 'trick' }).allowPlay).toBe(true);
    expect(resolveFeltActions({ tableKind: 'open-felt', family: 'meld' }).allowPlay).toBe(false);
    expect(resolveFeltActions({ tableKind: 'open-felt', family: 'meld', gameType: 'gin_rummy' }).allowDrawDiscard).toBe(true);
    expect(resolveFeltActions({ tableKind: 'open-felt', gameType: 'crazy_eights' }).allowDraw).toBe(true);
    expect(resolveFeltActions({ tableKind: 'open-felt', gameType: 'president' }).allowDraw).toBe(false);
  });
});

describe('catalog felt intents', () => {
  it('never offers Unknown intent from the generic felt', () => {
    for (const entry of GAME_CATALOG) {
      const n = Math.max(entry.config.minPlayers, entry.config.minPlayers === 1 ? 1 : 2);
      const state = createLocalMatch(entry.type, n);
      const felt = resolveFeltActions({
        tableKind: resolveTableKind(entry),
        family: entry.family,
        gameType: entry.type,
      });
      const human = state.players.find((p) => p.id === LOCAL_HUMAN_ID) ?? state.players[0];
      const probes: { intent: string; cardId?: string }[] = [];
      if (felt.allowPlay) {
        for (const card of human.hand) probes.push({ intent: 'play', cardId: card.id });
      }
      if (felt.allowDiscard) {
        for (const card of human.hand) probes.push({ intent: 'discard', cardId: card.id });
      }
      if (felt.allowDraw) probes.push({ intent: 'draw' });
      if (felt.allowPickup) {
        for (const card of state.game.tableCards) probes.push({ intent: 'pickup', cardId: card.id });
      }
      for (const probe of probes) {
        try {
          applyAction(state, { ...probe, playerId: human.id });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          expect(isUnknownIntentError(message), `${entry.type} ${probe.intent}: ${message}`).toBe(false);
        }
      }
    }
  });
});
