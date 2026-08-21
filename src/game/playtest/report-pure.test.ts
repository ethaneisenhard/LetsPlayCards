import { describe, expect, it } from 'vitest';
import { formatPlaytestReport, summarizePlaytests } from './report-pure';
import type { PlaytestResult } from './types';

const sample: PlaytestResult[] = [
  {
    type: 'war',
    name: 'War',
    status: 'passed',
    players: 2,
    turns: 12,
    path: 'in-process-do',
    reason: 'bounded session',
  },
  {
    type: 'go_fish',
    name: 'Go Fish',
    status: 'failed',
    players: 2,
    turns: 3,
    path: 'in-process-do',
    reason: 'deadlock',
    stuck: 'status=playing seat=0',
  },
];

describe('playtest report', () => {
  it('counts statuses', () => {
    const summary = summarizePlaytests(sample);
    expect(summary).toMatchObject({ total: 2, passed: 1, failed: 1, skipped: 0 });
  });

  it('prints a per-game table', () => {
    const text = formatPlaytestReport(summarizePlaytests(sample));
    expect(text).toContain('war');
    expect(text).toContain('go_fish');
    expect(text).toContain('1 passed, 1 failed, 0 skipped');
    expect(text).toContain('deadlock');
  });
});
