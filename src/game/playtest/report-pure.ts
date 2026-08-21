import type { PlaytestResult, PlaytestSummary } from './types';

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value + ' '.repeat(width - value.length);
}

export function summarizePlaytests(results: PlaytestResult[]): PlaytestSummary {
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    results,
  };
}

export function formatPlaytestReport(summary: PlaytestSummary): string {
  const header = [
    pad('GAME', 22),
    pad('PLAYERS', 8),
    pad('TURNS', 7),
    pad('STATUS', 8),
    'REASON',
  ].join('  ');
  const lines = [header, '-'.repeat(88)];
  for (const r of summary.results) {
    lines.push(
      [
        pad(r.type, 22),
        pad(String(r.players), 8),
        pad(String(r.turns), 7),
        pad(r.status, 8),
        r.reason + (r.stuck && r.status === 'failed' ? ` | ${r.stuck}` : ''),
      ].join('  '),
    );
  }
  lines.push('-'.repeat(88));
  lines.push(
    `${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped  (${summary.total} total)`,
  );
  lines.push(
    'Path: in-process Durable Object protocol (createRoomState → join → start → applyAction → publicView).',
  );
  return lines.join('\n');
}
