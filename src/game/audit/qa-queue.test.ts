import { describe, expect, it } from 'vitest';
import { GAME_CATALOG } from '../registry/catalog';
import { resolveTableKind } from './playability-registry-pure';
import {
  applyVerdict,
  emptyTracker,
  nextQaTarget,
  qaOrder,
  startCurrent,
  verdictOf,
} from './qa-queue-pure';

describe('qa queue', () => {
  const order = qaOrder(GAME_CATALOG);

  it('puts stock-battle (War) first, specials last', () => {
    expect(order[0]).toBe('war');
    const firstKind = resolveTableKind(GAME_CATALOG.find((e) => e.type === order[0])!);
    const lastKind = resolveTableKind(GAME_CATALOG.find((e) => e.type === order[order.length - 1])!);
    expect(firstKind).toBe('stock-battle');
    expect(lastKind === 'special' || lastKind === 'tableau').toBe(true);
    expect(order).toHaveLength(GAME_CATALOG.length);
  });

  it('starts War and stays there until pass', () => {
    const started = startCurrent(order, emptyTracker());
    expect(started.current).toBe('war');
    expect(verdictOf(started, 'war')).toBe('in_progress');
    expect(nextQaTarget(order, started)).toBe('war');

    const failed = applyVerdict(order, started, 'war', 'fail', 'flicker on collect');
    expect(failed.current).toBe('war');
    expect(verdictOf(failed, 'war')).toBe('fail');
    expect(nextQaTarget(order, failed)).toBe('war');
  });

  it('advances to the next unpassed game after pass', () => {
    const started = startCurrent(order, emptyTracker());
    const passed = applyVerdict(order, started, 'war', 'pass');
    expect(verdictOf(passed, 'war')).toBe('pass');
    expect(passed.current).not.toBe('war');
    expect(passed.current).toBe(order[1]);
    expect(verdictOf(passed, order[1])).toBe('in_progress');
  });
});
