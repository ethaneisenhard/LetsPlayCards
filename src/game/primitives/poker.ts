import type { Card } from '../types';
import { rankValue } from '../gameTypes';

export type HandCategory =
  | 'high_card' | 'pair' | 'two_pair' | 'three_kind' | 'straight'
  | 'flush' | 'full_house' | 'four_kind' | 'straight_flush';

export interface EvaluatedHand {
  category: HandCategory;
  rank: number;
  tiebreak: number[];
}

const CAT_RANK: Record<HandCategory, number> = {
  high_card: 0, pair: 1, two_pair: 2, three_kind: 3, straight: 4,
  flush: 5, full_house: 6, four_kind: 7, straight_flush: 8,
};

/** Evaluate exactly 5 cards into a rank + descending tiebreak. */
export function evaluate5(cards: Card[]): EvaluatedHand {
  const values = cards.map((c) => rankValue(c.rank)).sort((a, b) => b - a);
  const flush = new Set(cards.map((c) => c.suit)).size === 1;

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const uniq = [...new Set(values)].sort((a, b) => b - a);
  let straight = false;
  let straightHigh = -1;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { straight = true; straightHigh = uniq[0]; }
    else if (uniq[0] === 12 && uniq[1] === 3) { straight = true; straightHigh = 3; } // wheel A-2-3-4-5
  }

  const [c0, c1] = groups;
  if (flush && straight) return { category: 'straight_flush', rank: CAT_RANK.straight_flush, tiebreak: [straightHigh] };
  if (c0[1] === 4) return { category: 'four_kind', rank: CAT_RANK.four_kind, tiebreak: [c0[0], c1[0]] };
  if (c0[1] === 3 && c1[1] === 2) return { category: 'full_house', rank: CAT_RANK.full_house, tiebreak: [c0[0], c1[0]] };
  if (flush) return { category: 'flush', rank: CAT_RANK.flush, tiebreak: values };
  if (straight) return { category: 'straight', rank: CAT_RANK.straight, tiebreak: [straightHigh] };
  if (c0[1] === 3) return { category: 'three_kind', rank: CAT_RANK.three_kind, tiebreak: [c0[0], ...groups.slice(1).map((g) => g[0])] };
  if (c0[1] === 2 && c1[1] === 2) {
    const pairVals = groups.filter((g) => g[1] === 2).map((g) => g[0]).sort((a, b) => b - a);
    const kicker = groups.find((g) => g[1] === 1)![0];
    return { category: 'two_pair', rank: CAT_RANK.two_pair, tiebreak: [pairVals[0], pairVals[1], kicker] };
  }
  if (c0[1] === 2) return { category: 'pair', rank: CAT_RANK.pair, tiebreak: [c0[0], ...groups.slice(1).map((g) => g[0])] };
  return { category: 'high_card', rank: CAT_RANK.high_card, tiebreak: values };
}

/** Best 5-card hand out of 5–7 cards (Hold'em). */
export function best5of7(cards: Card[]): EvaluatedHand {
  let best: EvaluatedHand | null = null;
  const n = cards.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++)
          for (let m = l + 1; m < n; m++) {
            const e = evaluate5([cards[i], cards[j], cards[k], cards[l], cards[m]]);
            if (!best || compareHands(e, best) > 0) best = e;
          }
  return best!;
}

/** Positive if a beats b. */
export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
