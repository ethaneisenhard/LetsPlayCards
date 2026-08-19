import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../registry/catalog';
import { GAME_REGISTRY } from '../registry/registry';
import { auditAllGames, auditGame, auditSummary } from './playability-pure';

describe('playability audit', () => {
  it('catalog and registry list the same games', () => {
    expect(GAME_CATALOG.map((e) => e.type).sort()).toEqual(Object.keys(GAME_REGISTRY).sort());
  });

  it('every catalog game starts and deals', () => {
    const broken = auditAllGames().filter((r) => !r.engineReady);
    expect(broken.map((r) => `${r.type}: ${r.checks.map((c) => `${c.id}=${c.ok}`).join(',')}`)).toEqual([]);
  });

  it('War / Free Play / Hearts can show on the generic felt', () => {
    expect(auditGame('war').tableReady).toBe(true);
    expect(auditGame('freeplay').tableReady).toBe(true);
    expect(auditGame('hearts').tableReady).toBe(true);
    expect(auditGame('old_maid').tableReady).toBe(true);
    expect(auditGame('go_fish').tableReady).toBe(true);
    expect(auditGame('blackjack').tableReady).toBe(true);
    expect(auditGame('klondike').tableReady).toBe(true);
    expect(auditGame('sevens').tableReady).toBe(true);
    expect(auditGame('texas_holdem').tableReady).toBe(true);
    expect(auditGame('concentration').tableReady).toBe(true);
    expect(auditGame('cribbage').tableReady).toBe(true);
    expect(auditGame('cassino').tableReady).toBe(true);
    expect(auditGame('kings_in_the_corner').tableReady).toBe(true);
  });

  it('summary counts stay in range', () => {
    const s = auditSummary();
    expect(s.total).toBe(GAME_CATALOG.length);
    expect(s.engineReady).toBe(s.total);
    expect(s.playableNow).toBeGreaterThan(0);
    expect(s.playableNow).toBeLessThanOrEqual(s.total);
  });
});
