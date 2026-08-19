import type { TableKind } from '../../game/audit/playability-registry-pure';

export type FeltActions = {
  allowPlay: boolean;
  allowDiscard: boolean;
  allowDraw: boolean;
  allowPickup: boolean;
};

const NONE: FeltActions = {
  allowPlay: false,
  allowDiscard: false,
  allowDraw: false,
  allowPickup: false,
};

const OPEN_FELT_DRAW = new Set(['freeplay', 'crazy_eights']);
const OPEN_FELT_DISCARD = new Set(['freeplay']);
const OPEN_FELT_PICKUP = new Set(['freeplay']);

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
    return { allowPlay: true, allowDiscard: false, allowDraw: false, allowPickup: false };
  }
  if (input.tableKind === 'trick') {
    return { allowPlay: true, allowDiscard: false, allowDraw: false, allowPickup: false };
  }
  if (input.family === 'meld') {
    return { allowPlay: false, allowDiscard: true, allowDraw: true, allowPickup: false };
  }
  const type = input.gameType ?? '';
  return {
    allowPlay: true,
    allowDiscard: OPEN_FELT_DISCARD.has(type),
    allowDraw: OPEN_FELT_DRAW.has(type),
    allowPickup: OPEN_FELT_PICKUP.has(type),
  };
}

export function isUnknownIntentError(message: string): boolean {
  return /^Unknown intent/i.test(message);
}
