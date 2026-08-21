import type { EngineState } from '../state';
import type { GameAction } from '../registry/types';
import type { Card, Suit } from '../types';
import { defaultBotCandidates, firstLegalAction } from '../bots/bot-pure';
import { applyAction } from '../engine';
import { findMelds } from '../primitives/meld';
import { RANK_SEQ } from '../games/iDoubtIt';

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const TRUMPS = ['clubs', 'diamonds', 'hearts', 'spades', 'nt'] as const;
const PINOCHLE_MELDS = ['marriage', 'pinochle', 'run', 'around'] as const;

function gs(state: EngineState): Record<string, unknown> {
  return (state.game.gameState ?? {}) as Record<string, unknown>;
}

function groupByRank(hand: Card[]): Map<string, Card[]> {
  const map = new Map<string, Card[]>();
  for (const card of hand) {
    const list = map.get(card.rank) ?? [];
    list.push(card);
    map.set(card.rank, list);
  }
  return map;
}

function klondikeMoves(board: Record<string, unknown>, playerId?: string): GameAction[] {
  const out: GameAction[] = [];
  const columns = Array.isArray(board.columns) ? (board.columns as Card[][]) : [];
  const waste = Array.isArray(board.waste) ? (board.waste as Card[]) : [];
  const buried = Array.isArray(board.buried) ? (board.buried as number[]) : [];
  const tag = playerId ? { playerId } : {};

  const wasteTop = waste[waste.length - 1];
  if (wasteTop) {
    for (let i = 0; i < 4; i++) {
      out.push({ intent: 'move', from: 'waste', to: 'foundation', toIndex: i, cardId: wasteTop.id, ...tag });
    }
    for (let i = 0; i < columns.length; i++) {
      out.push({ intent: 'move', from: 'waste', to: 'column', toIndex: i, cardId: wasteTop.id, ...tag });
    }
  }

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i] ?? [];
    const hide = typeof buried[i] === 'number' ? buried[i] : Math.max(0, col.length - 1);
    for (let j = hide; j < col.length; j++) {
      const card = col[j];
      const count = col.length - j;
      if (count === 1) {
        for (let t = 0; t < 4; t++) {
          out.push({
            intent: 'move',
            from: 'column',
            fromIndex: i,
            to: 'foundation',
            toIndex: t,
            cardId: card.id,
            ...tag,
          });
        }
      }
      for (let t = 0; t < columns.length; t++) {
        if (t === i) continue;
        out.push({
          intent: 'move',
          from: 'column',
          fromIndex: i,
          to: 'column',
          toIndex: t,
          cardId: card.id,
          count,
          ...tag,
        });
      }
    }
  }

  out.push({ intent: 'draw-stock', ...tag });
  return out;
}

function freecellMoves(board: Record<string, unknown>): GameAction[] {
  const out: GameAction[] = [];
  const columns = Array.isArray(board.columns) ? (board.columns as Card[][]) : [];
  const freecells = Array.isArray(board.freecells) ? (board.freecells as (Card | null)[]) : [];

  const sources: Array<{ from: string; fromIndex: number; card: Card }> = [];
  columns.forEach((col, i) => {
    const top = col[col.length - 1];
    if (top) sources.push({ from: 'column', fromIndex: i, card: top });
  });
  freecells.forEach((cell, i) => {
    if (cell) sources.push({ from: 'freecell', fromIndex: i, card: cell });
  });

  for (const src of sources) {
    for (let t = 0; t < 4; t++) {
      out.push({
        intent: 'move',
        from: src.from,
        fromIndex: src.fromIndex,
        to: 'foundation',
        toIndex: t,
        cardId: src.card.id,
      });
    }
    for (let t = 0; t < columns.length; t++) {
      if (src.from === 'column' && src.fromIndex === t) continue;
      out.push({
        intent: 'move',
        from: src.from,
        fromIndex: src.fromIndex,
        to: 'column',
        toIndex: t,
        cardId: src.card.id,
      });
    }
    for (let t = 0; t < freecells.length; t++) {
      out.push({
        intent: 'move',
        from: src.from,
        fromIndex: src.fromIndex,
        to: 'freecell',
        toIndex: t,
        cardId: src.card.id,
      });
    }
  }
  return out;
}

function spiderMoves(board: Record<string, unknown>): GameAction[] {
  const out: GameAction[] = [];
  const columns = Array.isArray(board.columns) ? (board.columns as Card[][]) : [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i] ?? [];
    for (let count = 1; count <= Math.min(col.length, 13); count++) {
      const card = col[col.length - count];
      if (!card) continue;
      for (let t = 0; t < columns.length; t++) {
        if (t === i) continue;
        out.push({ intent: 'move', fromIndex: i, toIndex: t, cardId: card.id, count });
      }
    }
  }
  out.push({ intent: 'deal-row' });
  return out;
}

function extraCandidates(state: EngineState, playerId: string): GameAction[] {
  const player = state.players.find((p) => p.id === playerId);
  const hand = player?.hand ?? [];
  const cur = gs(state);
  const type = state.game.gameType;
  const out: GameAction[] = [];

  if (type === 'spades') {
    for (const amount of [3, 4, 2, 1]) out.push({ intent: 'bid', amount });
  }
  if (type === 'oh_hell') {
    out.push({ intent: 'bid', amount: 0 }, { intent: 'bid', amount: 1 });
  }
  if (type === 'pitch') {
    out.push({ intent: 'bid', amount: 2 }, { intent: 'bid', amount: 3 }, { intent: 'bid', amount: 4 }, { intent: 'bid', amount: 0 });
  }
  if (type === 'bridge') {
    out.push({ intent: 'bid', level: 1, trump: 'clubs' }, { intent: 'bid', level: 1, trump: 'nt' });
  }
  if (type === 'thirty_one') out.push({ intent: 'knock' });
  if (type === 'spite_and_malice') {
    const payoff = ((cur.payoff ?? {}) as Record<string, Card[]>)[playerId] ?? [];
    if (payoff[0]) {
      for (let i = 0; i < 4; i++) out.push({ intent: 'play', cardId: payoff[0].id, centerPile: i });
    }
    const incoming = state.game.deck[0];
    if (incoming && hand.length === 0) {
      for (let i = 0; i < 4; i++) {
        out.push({ intent: 'play', cardId: incoming.id, centerPile: i });
        out.push({ intent: 'side-pile', cardId: incoming.id, sidePile: i });
      }
    }
  }

  for (const suit of SUITS) {
    out.push({ intent: 'set-trump', suit });
    for (const card of hand) {
      if (card.rank === '8') out.push({ intent: 'play', cardId: card.id, suit });
    }
  }

  const handSize = typeof cur.handSize === 'number' ? cur.handSize : hand.length;
  for (let n = 0; n <= Math.min(handSize, 13); n++) out.push({ intent: 'bid', amount: n });
  for (let level = 1; level <= 3; level++) {
    for (const trump of TRUMPS) out.push({ intent: 'bid', level, trump });
  }
  out.push({ intent: 'bid', level: 0 });

  const lastPlay = cur.lastPlay as { cards?: Card[] } | null | undefined;
  const byRank = groupByRank(hand);
  if (type === 'president') {
    const need = lastPlay?.cards?.length ?? 0;
    for (const cards of byRank.values()) {
      if (need === 0) {
        for (let n = 1; n <= cards.length; n++) {
          out.push({ intent: 'play', cards: cards.slice(0, n).map((c) => c.id) });
        }
      } else if (cards.length >= need) {
        out.push({ intent: 'play', cards: cards.slice(0, need).map((c) => c.id) });
      }
    }
    if (need > 0) out.push({ intent: 'pass' });
  }

  if (type === 'i_doubt_it' || type === 'cheat') {
    const rankIndex = typeof cur.rankIndex === 'number' ? cur.rankIndex : 0;
    const declared = RANK_SEQ[rankIndex % RANK_SEQ.length];
    const matching = hand.filter((c) => c.rank === declared);
    const playSet = matching.length > 0 ? matching : hand.slice(0, 1);
    if (playSet.length > 0) {
      out.push({
        intent: 'play',
        cards: playSet.slice(0, Math.min(4, playSet.length)).map((c) => c.id),
        declaredRank: declared,
      });
      out.push({ intent: 'play', cards: [playSet[0].id], declaredRank: declared });
    }
    if (cur.pendingPlay) {
      for (const other of state.players) {
        if (other.id !== playerId) out.push({ intent: 'doubt', challengerId: other.id });
      }
    }
  }

  for (const meld of findMelds(hand)) {
    const ids = meld.cards.map((c) => c.id);
    out.push({ intent: 'meld', cardIds: ids, cards: ids });
  }
  const tableMelds = Array.isArray(cur.melds) ? (cur.melds as { id?: string }[]) : [];
  for (const card of hand) {
    for (const meld of tableMelds) {
      if (meld.id) out.push({ intent: 'layoff', cardId: card.id, meldId: meld.id });
    }
  }

  if (hand.length >= 2) {
    out.push({ intent: 'discard-to-crib', cards: [hand[0].id, hand[1].id] });
  }
  out.push({ intent: 'go' }, { intent: 'count' });

  const widow = Array.isArray(cur.widow) ? (cur.widow as unknown[]) : [];
  for (const card of hand) {
    out.push({ intent: 'swap', cardId: card.id, from: 'stock' });
    for (let i = 0; i < widow.length; i++) {
      out.push({ intent: 'swap', cardId: card.id, from: 'widow', widowIndex: i });
    }
  }

  const tableCards = Array.isArray(cur.table) ? (cur.table as { id: string }[]) : [];
  for (const card of hand) {
    for (const t of tableCards) {
      out.push({ intent: 'capture', cardId: card.id, targetIds: [t.id] });
    }
    out.push({ intent: 'trail', cardId: card.id });
    for (let corner = 0; corner < 4; corner++) {
      out.push({ intent: 'play', cardId: card.id, corner });
      out.push({ intent: 'play', cardId: card.id, centerPile: corner });
      out.push({ intent: 'side-pile', cardId: card.id, sidePile: corner });
    }
    out.push({ intent: 'play-center', cardId: card.id });
  }

  const grid = Array.isArray(cur.grid) ? (cur.grid as { matched?: boolean; faceUp?: boolean }[]) : [];
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]?.matched) out.push({ intent: 'flip', index: i });
  }

  out.push({ intent: 'draw-center' }, { intent: 'deal-row' }, { intent: 'draw-stock' });
  out.push({ intent: 'draw', cardIds: [] }, { intent: 'showdown' });
  out.push({ intent: 'draw', source: 'deck' }, { intent: 'draw', source: 'discard' });
  if (state.game.discardPile.length > 0) {
    const top = state.game.discardPile[state.game.discardPile.length - 1];
    out.push({ intent: 'draw', source: 'discard', cardId: top.id });
  }

  for (const other of state.players) {
    if (other.id === playerId) continue;
    out.push({ intent: 'draw-from', targetId: other.id });
    const ranks = hand.length > 0 ? [...new Set(hand.map((c) => c.rank))] : [...RANK_SEQ];
    for (const rank of ranks) {
      out.push({ intent: 'gofish-ask', rank, targetId: other.id });
    }
  }

  if (type === 'klondike') out.push(...klondikeMoves(cur));
  if (type === 'freecell') out.push(...freecellMoves(cur));
  if (type === 'spider') out.push(...spiderMoves(cur));
  if (type === 'solitaire_race') {
    const boards = (cur.boards ?? {}) as Record<string, Record<string, unknown>>;
    const board = boards[playerId];
    if (board) out.push(...klondikeMoves(board, playerId));
  }

  for (const typeName of PINOCHLE_MELDS) out.push({ intent: 'meld', type: typeName });

  const dummyHand = Array.isArray(cur.dummyHand) ? (cur.dummyHand as Card[]) : [];
  for (const card of dummyHand) {
    out.push({ intent: 'play', cardId: card.id, hand: 'dummy' });
  }

  out.push({ intent: 'war-play' }, { intent: 'war-collect' }, { intent: 'flip' }, { intent: 'slap' }, { intent: 'snap' });
  out.push({ intent: 'hit' }, { intent: 'stand' }, { intent: 'check' }, { intent: 'call' }, { intent: 'fold' });
  out.push({ intent: 'raise', amount: 2 }, { intent: 'knock' }, { intent: 'swap' }, { intent: 'pass' });
  out.push({ intent: 'bet', side: 'player', amount: 10 }, { intent: 'bet', side: 'banker', amount: 10 });
  out.push({ intent: 'go-out' });

  for (const card of hand) {
    out.push({ intent: 'play', cardId: card.id });
    out.push({ intent: 'discard', cardId: card.id });
  }

  return out;
}

const FALLBACK_INTENTS = new Set([
  'draw',
  'draw-stock',
  'draw-center',
  'deal-row',
  'pass',
  'fold',
  'side-pile',
]);

/** Legal-move candidates for one seat, built from that player's own cards + public state. */
export function playtestCandidates(state: EngineState, playerId: string): GameAction[] {
  const all = [...extraCandidates(state, playerId), ...defaultBotCandidates(state, playerId)];
  const primary = all.filter((action) => !FALLBACK_INTENTS.has(action.intent));
  const later = all.filter((action) => FALLBACK_INTENTS.has(action.intent));
  return [...primary, ...later];
}

export function firstPlaytestAction(state: EngineState, playerId: string): GameAction | null {
  return firstLegalAction(state, playerId, playtestCandidates(state, playerId), applyAction);
}

function currentPlayerId(state: EngineState): string | undefined {
  const id = gs(state).currentPlayerId;
  if (typeof id === 'string') return id;
  return state.players.find((p) => p.seat === state.game.currentSeat)?.id;
}

/** Whose turn it might be — current seat first, then everyone else (slap / race / betting). */
export function actorOrder(state: EngineState): string[] {
  const first = currentPlayerId(state);
  const ids = state.players.map((p) => p.id);
  if (!first) return ids;
  return [first, ...ids.filter((id) => id !== first)];
}

function concentrationFlip(state: EngineState, playerId: string): GameAction | null {
  const grid = gs(state).grid as Array<{ card: Card; faceUp: boolean; matched: boolean }> | undefined;
  const flipped = Array.isArray(gs(state).flipped) ? (gs(state).flipped as number[]) : [];
  if (!grid) return null;
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.seat !== state.game.currentSeat) return null;
  const unmatched = grid
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => !cell.matched && !cell.faceUp);
  if (flipped.length === 1) {
    const first = grid[flipped[0]];
    const match = unmatched.find(({ cell }) => cell.card.rank === first.card.rank);
    if (match) return { intent: 'flip', index: match.index, playerId };
  }
  if (unmatched[0]) return { intent: 'flip', index: unmatched[0].index, playerId };
  return null;
}

export function nextLegalPlay(state: EngineState): GameAction | null {
  if (state.game.gameType === 'concentration') {
    for (const playerId of actorOrder(state)) {
      const action = concentrationFlip(state, playerId);
      if (action) return action;
    }
  }
  for (const playerId of actorOrder(state)) {
    const action = firstPlaytestAction(state, playerId);
    if (action) return { ...action, playerId };
  }
  return null;
}
