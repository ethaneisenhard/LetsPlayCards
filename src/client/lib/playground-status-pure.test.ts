import { describe, expect, it } from 'vitest';
import { auditGame } from '../../game/audit/playability-pure';
import { playgroundBuildStatus } from './playground-status-pure';

describe('playgroundBuildStatus', () => {
  it('is ready only when engine and table both work', () => {
    expect(playgroundBuildStatus({ engineReady: true, tableReady: true })).toBe('ready');
    expect(playgroundBuildStatus({ engineReady: true, tableReady: false })).toBe('not-built');
    expect(playgroundBuildStatus({ engineReady: false, tableReady: true })).toBe('not-built');
  });

  it('marks catalog games from the live audit', () => {
    expect(playgroundBuildStatus(auditGame('go_fish'))).toBe('ready');
    expect(playgroundBuildStatus(auditGame('war'))).toBe('ready');
    expect(playgroundBuildStatus(auditGame('cribbage'))).toBe('ready');
  });
});
