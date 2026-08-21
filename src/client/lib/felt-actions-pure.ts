import type { TableKind } from '../../game/audit/playability-registry-pure';

export type FeltActions = {
  allowPlay: boolean;
  allowDiscard: boolean;
  allowDraw: boolean;
  allowPickup: boolean;
  /** Leftover pile is a legal take (`draw` + source: discard). */
  allowDrawDiscard: boolean;
};

const NONE: FeltActions = {
  allowPlay: false,
  allowDiscard: false,
  allowDraw: false,
  allowPickup: false,
  allowDrawDiscard: false,
};

const OPEN_FELT_DRAW = new Set(['freeplay', 'crazy_eights']);
const OPEN_FELT_DISCARD = new Set(['freeplay']);
const OPEN_FELT_PICKUP = new Set(['freeplay']);
const DRAW_LEFTOVER = new Set(['gin_rummy', 'rummy', 'rummy_500']);

/** Which generic felt buttons this table kind may show. Probe still gates each click. */
export function resolveFeltActions(input: {
  tableKind: TableKind;
  family?: string;
  gameType?: string;
}): FeltActions {
  if (
    input.tableKind === 'stock-battle' ||
    input.tableKind === 'tableau' ||
    input.tableKind === 'special' ||
    input.tableKind === 'draw-from' ||
    input.tableKind === 'ask-rank' ||
    input.tableKind === 'hit-stand' ||
    input.tableKind === 'poker' ||
    input.tableKind === 'betting-table' ||
    input.tableKind === 'memory' ||
    input.tableKind === 'single-card' ||
    input.tableKind === 'widow-swap' ||
    input.tableKind === 'corner-piles' ||
    input.tableKind === 'fishing-table'
  ) {
    return NONE;
  }
  if (input.tableKind === 'peg-board' || input.tableKind === 'suit-ladders') {
    return { allowPlay: true, allowDiscard: false, allowDraw: false, allowPickup: false, allowDrawDiscard: false };
  }
  if (input.tableKind === 'trick') {
    return { allowPlay: true, allowDiscard: false, allowDraw: false, allowPickup: false, allowDrawDiscard: false };
  }
  if (input.family === 'meld') {
    const type = input.gameType ?? '';
    return {
      allowPlay: false,
      allowDiscard: true,
      allowDraw: true,
      allowPickup: false,
      allowDrawDiscard: DRAW_LEFTOVER.has(type),
    };
  }
  const type = input.gameType ?? '';
  return {
    allowPlay: true,
    allowDiscard: OPEN_FELT_DISCARD.has(type),
    allowDraw: OPEN_FELT_DRAW.has(type),
    allowPickup: OPEN_FELT_PICKUP.has(type),
    allowDrawDiscard: false,
  };
}

export function isUnknownIntentError(message: string): boolean {
  return /^Unknown intent/i.test(message);
}
