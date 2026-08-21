/**
 * When the under-hand action bar is open, and which pills it shows.
 * Card-tied moves wait for a pick. Turn-only moves show on your turn.
 */

export type ActionPillKind = 'target' | 'primary' | 'secondary';

export type ActionPill = {
  id: string;
  label: string;
  kind: ActionPillKind;
  pressed?: boolean;
  disabled?: boolean;
};

export type ActionBarReason = 'card' | 'turn' | 'hidden';

export type ActionBarModel = {
  open: boolean;
  reason: ActionBarReason;
  pills: ActionPill[];
};

export type ActionBarInput = {
  isMyTurn: boolean;
  busy?: boolean;
  selectedCardId?: string | null;
  selectedRank?: string | null;
  askRank?: boolean;
  drawFrom?: boolean;
  allowPlay?: boolean;
  allowDiscard?: boolean;
  canPlaySelected?: boolean;
  canDiscardSelected?: boolean;
  canDraw?: boolean;
  canDrawDiscard?: boolean;
  canSlap?: boolean;
  slapLabel?: string;
  turnButtons?: { id: string; label: string; legal?: boolean }[];
  targets?: { id: string; name: string }[];
  includeAnyone?: boolean;
  selectedTargetId?: string | null;
  anyoneId?: string;
};

export function actionPillLabels(bar: ActionBarModel): string[] {
  return bar.pills.map((p) => p.label);
}

function hasCardPick(input: ActionBarInput): boolean {
  return Boolean(input.selectedCardId || input.selectedRank);
}

function cardTied(input: ActionBarInput): boolean {
  return Boolean(input.askRank || input.allowPlay || input.allowDiscard);
}

function cardPills(input: ActionBarInput): ActionPill[] {
  const pills: ActionPill[] = [];
  if (input.askRank || input.drawFrom) {
    const anyoneId = input.anyoneId ?? 'anyone';
    const selected = input.selectedTargetId ?? (input.includeAnyone ? anyoneId : null);
    if (input.includeAnyone) {
      pills.push({
        id: anyoneId,
        label: 'Anyone',
        kind: 'target',
        pressed: selected === anyoneId,
      });
    }
    for (const t of input.targets ?? []) {
      pills.push({
        id: t.id,
        label: t.name,
        kind: 'target',
        pressed: selected === t.id,
      });
    }
    pills.push({
      id: 'submit-ask',
      label: input.askRank
        ? input.selectedRank
          ? `Ask for ${input.selectedRank}s`
          : 'Ask'
        : 'Draw',
      kind: 'primary',
    });
  }
  if (input.allowPlay) {
    pills.push({
      id: 'play',
      label: 'Play',
      kind: 'primary',
      disabled: input.canPlaySelected === false,
    });
  }
  if (input.allowDiscard) {
    pills.push({
      id: 'discard',
      label: 'Put aside',
      kind: 'secondary',
      disabled: input.canDiscardSelected === false,
    });
  }
  appendTurnButtons(pills, input);
  return pills;
}

function appendTurnButtons(pills: ActionPill[], input: ActionBarInput) {
  for (const b of input.turnButtons ?? []) {
    pills.push({
      id: b.id,
      label: b.label,
      kind: 'primary',
      disabled: b.legal === false,
    });
  }
}

function turnPills(input: ActionBarInput): ActionPill[] {
  const pills: ActionPill[] = [];
  if (input.drawFrom && !input.askRank) {
    for (const t of input.targets ?? []) {
      pills.push({ id: t.id, label: t.name, kind: 'target' });
    }
  }
  appendTurnButtons(pills, input);
  if (input.canSlap) {
    pills.push({ id: 'slap', label: input.slapLabel ?? 'Slap', kind: 'primary' });
  }
  // Draw waits until it is the only card move — Play / Ask still need a pick.
  if (input.canDraw && !input.allowPlay && !input.askRank) {
    pills.push({ id: 'draw', label: 'Take a card', kind: 'primary' });
  }
  if (input.canDrawDiscard && !input.allowDiscard) {
    pills.push({ id: 'draw-discard', label: 'Take leftover', kind: 'secondary' });
  }
  return pills;
}

export function resolveActionBar(input: ActionBarInput): ActionBarModel {
  if (!input.isMyTurn || input.busy) {
    return { open: false, reason: 'hidden', pills: [] };
  }
  if (cardTied(input) && hasCardPick(input)) {
    const pills = cardPills(input);
    return { open: pills.length > 0, reason: pills.length ? 'card' : 'hidden', pills };
  }
  const pills = turnPills(input);
  if (pills.length === 0) return { open: false, reason: 'hidden', pills: [] };
  return { open: true, reason: 'turn', pills };
}
