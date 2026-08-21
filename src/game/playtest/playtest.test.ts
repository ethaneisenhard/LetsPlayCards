import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../registry/catalog';
import { playtestGame } from './play-pure';
import { formatPlaytestReport } from './report-pure';
import { playtestCatalog } from './run-catalog-pure';

describe('catalog playtest harness', () => {
  it('plays every catalog game at a multiplayer table and reports pass/fail', () => {
    const summary = playtestCatalog();
    expect(summary.results.map((r) => r.type).sort()).toEqual(GAME_CATALOG.map((e) => e.type).sort());
    expect(summary.total).toBe(GAME_CATALOG.length);
    expect(summary.passed + summary.failed + summary.skipped).toBe(summary.total);
    expect(summary.results.every((r) => r.players >= 1 || r.status === 'skipped')).toBe(true);
    // eslint-disable-next-line no-console
    console.log(`\n${formatPlaytestReport(summary)}\n`);

    const leaked = summary.results.filter((r) => /ViewLeak|leaked hidden|raw deck/.test(r.reason));
    expect(leaked.map((r) => `${r.type}: ${r.reason}`)).toEqual([]);
  }, 180_000);

  it('War sits two players, deals, and takes legal turns', () => {
    const result = playtestGame('war', 80);
    expect(result.status).not.toBe('skipped');
    expect(result.players).toBe(2);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.reason).not.toMatch(/leaked|ViewLeak/i);
  });
});
