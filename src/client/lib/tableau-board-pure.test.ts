import { describe, expect, it } from 'vitest';
import { projectTableauBoard, tableauMoveAction } from './tableau-board-pure';

const ace = { id: 'AS', suit: 'spades' as const, rank: 'A' as const };
const two = { id: '2H', suit: 'hearts' as const, rank: '2' as const };

describe('projectTableauBoard', () => {
  it('projects Klondike with buried cards and a stock', () => {
    const board = projectTableauBoard('klondike', {
      columns: [[ace, two]],
      buried: [0],
      foundations: [[]],
      stock: [ace],
      waste: [],
    });
    expect(board?.columns[0].buried).toBe(0);
    expect(board?.stockIntent).toBe('draw-stock');
    expect(board?.stock?.cards).toHaveLength(1);
  });

  it('falls back to top-only when buried is missing', () => {
    const board = projectTableauBoard('klondike', {
      columns: [[ace, two]],
      foundations: [[]],
      stock: [],
      waste: [],
    });
    expect(board?.columns[0].buried).toBe(1);
  });

  it('projects Spider as all-up columns + deal-row', () => {
    const board = projectTableauBoard('spider', { columns: [[ace, two]], stock: [ace] });
    expect(board?.columns[0].buried).toBe(0);
    expect(board?.stockIntent).toBe('deal-row');
  });

  it('builds a spider move with count', () => {
    expect(
      tableauMoveAction('spider', { kind: 'column', index: 1, cardId: 'AS', count: 3 }, {
        key: 'column-4',
        kind: 'column',
        index: 4,
        cards: [],
        buried: 0,
      }),
    ).toMatchObject({ intent: 'move', fromIndex: 1, toIndex: 4, count: 3 });
  });
});
