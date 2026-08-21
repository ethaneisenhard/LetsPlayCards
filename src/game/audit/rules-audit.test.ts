import { describe, expect, it } from 'vitest';
import { GAME_CATALOG, GAME_CONFIGS } from '../registry/catalog';
import { GLOSSARY } from '../../content/glossary';
import { rulesCardFor } from '../../client/lib/game-rules-pure';
import { auditAllRules, auditGameRules, formatRulesAudit } from './rules-audit-pure';

describe('rules audit', () => {
  it('covers every catalog game', () => {
    const reports = auditAllRules();
    expect(reports.map((r) => r.type).sort()).toEqual(GAME_CATALOG.map((e) => e.type).sort());
  });

  it('prints a report and is green for the catalog', () => {
    const reports = auditAllRules();
    const failed = reports.filter((r) => !r.ok).map((r) => `${r.type}: ${r.fails.map((f) => f.detail).join(' | ')}`);
    if (failed.length) {
      // eslint-disable-next-line no-console
      console.log(`\n${formatRulesAudit(reports)}\n`);
    }
    expect(failed).toEqual([]);
  });

  it('requires Go Fish to teach Ask on this table', () => {
    const r = auditGameRules('go_fish');
    expect(r.firstIntent).toBe('gofish-ask');
    expect(r.ok).toBe(true);
    const card = rulesCardFor(GAME_CONFIGS.go_fish, GLOSSARY.go_fish);
    const sheet = `${card.win} ${card.steps.join(' ')}`;
    expect(sheet).toMatch(/pick/i);
    expect(sheet).toMatch(/anyone|seat/i);
    expect(sheet).toMatch(/hold/i);
    expect(sheet).toMatch(/book/i);
    expect(sheet).toMatch(/four|4/i);
    expect(sheet).toMatch(/empty/i);
  });
});
