import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditGame } from '../src/game/audit/playability-pure';
import { resolveTableKind } from '../src/game/audit/playability-registry-pure';
import {
  nextQaTarget,
  qaOrder,
  startCurrent,
  type QaTracker,
  visualChecksFor,
} from '../src/game/audit/qa-queue-pure';
import { GAME_CATALOG, GAME_CONFIGS } from '../src/game/registry/catalog';

const TRACKER = resolve(process.cwd(), '.scratch/game-qa.json');
const DRAIN = resolve(process.cwd(), '.scratch/game-drain.md');

function loadTracker(): QaTracker {
  try {
    return JSON.parse(readFileSync(TRACKER, 'utf8')) as QaTracker;
  } catch {
    return { current: null, records: {} };
  }
}

function saveTracker(tracker: QaTracker) {
  writeFileSync(TRACKER, `${JSON.stringify(tracker, null, 2)}\n`);
}

const order = qaOrder(GAME_CATALOG);
let tracker = loadTracker();
const current = nextQaTarget(order, tracker);
if (current && tracker.current !== current) {
  tracker = startCurrent(order, tracker);
  saveTracker(tracker);
}

const lines = [
  '# Game drain',
  '',
  `Current: **${tracker.current ?? 'none'}**`,
  '',
  '| # | Game | Kind | Engine | Table | QA |',
  '| --- | --- | --- | --- | --- | --- |',
];
order.forEach((t, i) => {
  const e = GAME_CATALOG.find((x) => x.type === t)!;
  const r = auditGame(t);
  const qa = tracker.records[t]?.verdict ?? 'untested';
  lines.push(
    `| ${i + 1} | ${GAME_CONFIGS[t].emoji} ${e.config.name} | ${resolveTableKind(e)} | ${r.engineReady ? 'ok' : 'FAIL'} | ${r.tableReady ? 'ready' : 'not built'} | ${qa} |`,
  );
});
lines.push('');
writeFileSync(DRAIN, `${lines.join('\n')}\n`);

const type = tracker.current;
if (!type) {
  console.log('QA queue empty — every catalog game has a human pass.');
  process.exit(0);
}

const entry = GAME_CATALOG.find((e) => e.type === type)!;
const kind = resolveTableKind(entry);
const report = auditGame(type);
const cfg = GAME_CONFIGS[type];
const passed = order.filter((t) => tracker.records[t]?.verdict === 'pass').length;

console.log(`${cfg.emoji} ${cfg.name}  (${type})`);
console.log(`queue  ${passed}/${order.length} passed   kind=${kind}`);
console.log(`engine ${report.engineReady ? 'ok' : 'FAIL'}   table ${report.tableReady ? 'ok' : 'needs board'}   bot ${report.botReady ? 'ok' : 'no'}`);
for (const check of report.checks) {
  console.log(`  ${check.ok ? '✓' : '✗'} ${check.id}  ${check.detail}`);
}
console.log('');
console.log('Human visual:');
for (const line of visualChecksFor(kind)) {
  console.log(`  [ ] ${line}`);
}
console.log('');
console.log(`http://localhost:8789/playground/${type}`);
console.log(`http://localhost:8789/solo/${type}`);
console.log('');
console.log('Reply:  pass   |   fail: <what you saw>');
