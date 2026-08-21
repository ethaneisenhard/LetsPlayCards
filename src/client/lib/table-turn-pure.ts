/**
 * One instructional line for the felt. Replaces competing header / panel / hand hints.
 * Everyday words — whose turn, then the next legal move.
 */

export type TurnStripTone = 'you' | 'them' | 'busy' | 'deal' | 'won';

export type TurnStrip = {
  line: string;
  tone: TurnStripTone;
};

export function askInstruction(rank: string | null): string {
  return rank
    ? `Your turn — ask someone for ${rank}s`
    : 'Your turn — pick a number you already have, then ask';
}

export function drawFromInstruction(): string {
  return 'Your turn — take a card from another player';
}

function joinMoves(moves: string[]): string {
  if (moves.length === 0) return 'Your turn';
  if (moves.length === 1) return `Your turn — ${moves[0]}`;
  if (moves.length === 2) return `Your turn — ${moves[0]}, or ${moves[1]}`;
  return `Your turn — ${moves.slice(0, -1).join(', ')}, or ${moves[moves.length - 1]}`;
}

export function yourMoveLine(input: {
  askRank?: boolean;
  pickedRank?: string | null;
  drawFrom?: boolean;
  canDraw?: boolean;
  canDrawDiscard?: boolean;
  canPlay?: boolean;
  canDiscard?: boolean;
  legalButtonLabels?: string[];
  turnButtonLabels?: string[];
}): string {
  if (input.askRank) return askInstruction(input.pickedRank ?? null);
  if (input.drawFrom) return drawFromInstruction();

  const moves: string[] = [];
  if (input.canDraw && input.canDrawDiscard) {
    moves.push('take a card from the leftover pile or the face-down pile');
  } else if (input.canDrawDiscard) {
    moves.push('take the leftover card');
  } else if (input.canDraw) {
    moves.push('take a card from the pile');
  }
  if (input.canPlay) moves.push('play a card');
  if (input.canDiscard) moves.push('put one card aside');
  for (const label of input.legalButtonLabels ?? []) {
    const needle = label.toLowerCase();
    if (!moves.some((m) => m.includes(needle))) moves.push(needle);
  }
  if (moves.length === 0 && (input.turnButtonLabels?.length ?? 0) > 0) {
    return joinMoves((input.turnButtonLabels ?? []).map((l) => l.toLowerCase()));
  }
  return joinMoves(moves);
}

export function waitingLine(name?: string | null): string {
  return name ? `${name} is taking a turn` : 'Waiting for the next player';
}

export function resolveTurnStrip(input: {
  dealing?: boolean;
  busy?: boolean;
  busyHint?: string;
  isMyTurn?: boolean;
  actorName?: string | null;
  wonLine?: string | null;
  askRank?: boolean;
  pickedRank?: string | null;
  drawFrom?: boolean;
  canDraw?: boolean;
  canDrawDiscard?: boolean;
  canPlay?: boolean;
  canDiscard?: boolean;
  legalButtonLabels?: string[];
  turnButtonLabels?: string[];
}): TurnStrip {
  if (input.dealing) {
    return { line: 'Cards are being given out — skip if you want to start', tone: 'deal' };
  }
  if (input.wonLine) {
    return { line: input.wonLine, tone: 'won' };
  }
  if (input.busy) {
    return { line: input.busyHint ?? 'Someone else is taking a turn', tone: 'busy' };
  }
  if (!input.isMyTurn) {
    return { line: waitingLine(input.actorName), tone: 'them' };
  }
  return {
    line: yourMoveLine(input),
    tone: 'you',
  };
}

export function disabledActionReason(input: {
  intent: string;
  isMyTurn: boolean;
  busy: boolean;
  legal: boolean;
}): string | null {
  if (input.legal) return null;
  if (input.busy) return 'Wait…';
  if (!input.isMyTurn) return 'Wait for your turn';
  if (input.intent === 'knock') {
    return 'You can stop when leftover cards you could not group total 10 or less';
  }
  if (input.intent === 'draw') return 'No card to take right now';
  return 'Not allowed right now';
}

export function seatAriaLabel(input: {
  name: string;
  you: boolean;
  isTurn: boolean;
  cardCount: number;
  scoreLabel?: string;
}): string {
  const who = input.you ? `You, ${input.name}` : input.name;
  const turn = input.isTurn ? (input.you ? 'your turn' : 'taking a turn') : 'waiting';
  const cards = input.cardCount === 1 ? '1 card' : `${input.cardCount} cards`;
  const score = input.scoreLabel ? `, ${input.scoreLabel}` : '';
  return `${who}, ${turn}, ${cards}${score}`;
}

export function youSeatLine(name: string, isTurn: boolean): string {
  return isTurn ? `You · ${name} · your turn` : `You · ${name}`;
}
