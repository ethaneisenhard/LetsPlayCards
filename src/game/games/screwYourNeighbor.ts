import { createDeck, shuffleDeck } from '../deck';
import type { Card } from '../types';
import { EngineError, findPlayer, publicView, type EnginePlayer, type EngineState } from '../state';
import { nextSeat } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';
import { chaseValue } from './chaseTheAce';

interface ScrewState {
  cards: Record<string, Card>;
  tokens: Record<string, number>;
  /** Non-safe players who have acted this round. */
  acted: string[];
  /** Players revealed as safe (holding a King) this round. */
  safe: string[];
  dealerSeat: number;
  stock: Card[];
  lastLosers: string[];
  winner: string | null;
}

function activePlayers(players: EnginePlayer[], tokens: Record<string, number>): EnginePlayer[] {
  return players.filter((p) => (tokens[p.id] ?? 0) > 0).sort((a, b) => a.seat - b.seat);
}

/** Players who still need to act: alive and NOT holding a King (Kings are safe). */
function actingPlayers(
  players: EnginePlayer[],
  cards: Record<string, Card>,
  tokens: Record<string, number>,
): EnginePlayer[] {
  return players
    .filter((p) => (tokens[p.id] ?? 0) > 0 && cards[p.id]?.rank !== 'K')
    .sort((a, b) => a.seat - b.seat);
}

function dealRound(
  players: EnginePlayer[],
  tokens: Record<string, number>,
  dealerSeat: number,
): { cards: Record<string, Card>; stock: Card[]; safe: string[]; currentSeat: number } {
  const active = activePlayers(players, tokens);
  const deck = shuffleDeck(createDeck());
  const cards: Record<string, Card> = {};
  for (let i = 0; i < active.length; i++) cards[active[i].id] = deck[i];
  const safe = active.filter((p) => cards[p.id].rank === 'K').map((p) => p.id);
  const acting = actingPlayers(players, cards, tokens);
  const dealer = active.some((p) => p.seat === dealerSeat) ? dealerSeat : active[0].seat;
  const currentSeat = acting.length ? acting[0].seat : dealer;
  return { cards, stock: deck.slice(active.length), safe, currentSeat };
}

function resolveRound(
  state: EngineState,
  cards: Record<string, Card>,
  tokens: Record<string, number>,
  lastLosers: string[],
  dealerSeat: number,
): EngineState {
  const { game, players } = state;
  const active = activePlayers(players, tokens);
  const minVal = Math.min(...active.map((p) => chaseValue(cards[p.id].rank)));
  const losers = active.filter((p) => chaseValue(cards[p.id].rank) === minVal).map((p) => p.id);

  const nextTokens = { ...tokens };
  for (const id of losers) nextTokens[id] = (nextTokens[id] ?? 0) - 1;

  const remaining = activePlayers(players, nextTokens);
  if (remaining.length <= 1) {
    const winner = remaining[0]?.id ?? null;
    return {
      game: {
        ...game,
        status: 'finished',
        currentSeat: remaining[0]?.seat ?? game.currentSeat,
        gameState: { ...(game.gameState as ScrewState), cards, tokens: nextTokens, acted: [], safe: [], lastLosers: losers, winner },
      },
      players,
    };
  }

  const next = dealRound(players, nextTokens, dealerSeat);
  return {
    game: {
      ...game,
      currentSeat: next.currentSeat,
      gameState: {
        ...(game.gameState as ScrewState),
        cards: next.cards,
        tokens: nextTokens,
        acted: [],
        safe: next.safe,
        stock: next.stock,
        lastLosers: losers,
        winner: null,
      },
    },
    players,
  };
}

export function swap(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as ScrewState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if ((gs.tokens[playerId] ?? 0) <= 0) throw new EngineError('Player is eliminated');
  if (gs.cards[playerId]?.rank === 'K') throw new EngineError('You hold a King — you are safe');
  if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
  if (gs.acted.includes(playerId)) throw new EngineError('Already acted this round');

  const active = actingPlayers(players, gs.cards, gs.tokens);
  const seats = active.map((p) => p.seat);
  const leftSeat = nextSeat(seats, player.seat);
  const neighbor = active.find((p) => p.seat === leftSeat);
  if (!neighbor || neighbor.id === playerId) throw new EngineError('Need at least two active players to swap');

  const cards = { ...gs.cards, [playerId]: gs.cards[neighbor.id], [neighbor.id]: gs.cards[playerId] };
  const acted = [...gs.acted, playerId];
  if (acted.length >= active.length) return resolveRound(state, cards, gs.tokens, gs.lastLosers, gs.dealerSeat);
  return {
    game: { ...game, currentSeat: leftSeat, gameState: { ...gs, cards, acted } },
    players,
  };
}

export function draw(state: EngineState, playerId: string): EngineState {
  const { game, players } = state;
  const gs = game.gameState as ScrewState;
  const player = findPlayer(players, playerId);
  if (!player) throw new EngineError('Player not found');
  if ((gs.tokens[playerId] ?? 0) <= 0) throw new EngineError('Player is eliminated');
  if (gs.cards[playerId]?.rank === 'K') throw new EngineError('You hold a King — you are safe');
  if (player.seat !== game.currentSeat) throw new EngineError('Not your turn');
  if (gs.acted.includes(playerId)) throw new EngineError('Already acted this round');

  const active = actingPlayers(players, gs.cards, gs.tokens);
  const lastActorSeat = active[active.length - 1].seat;
  if (player.seat !== lastActorSeat) throw new EngineError('Only the player left of the dealer may draw');

  if (gs.stock.length === 0) throw new EngineError('No cards left to draw');
  const drawn = gs.stock[0];
  const cards = { ...gs.cards, [playerId]: drawn };
  const stock = [...gs.stock.slice(1), gs.cards[playerId]];

  const acted = [...gs.acted, playerId];
  if (acted.length >= active.length) return resolveRound(state, cards, gs.tokens, gs.lastLosers, gs.dealerSeat);
  return {
    game: { ...game, currentSeat: nextSeat(active.map((p) => p.seat), player.seat), gameState: { ...gs, cards, stock, acted } },
    players,
  };
}

export const screwYourNeighborGame: CardGame = {
  type: 'screw_your_neighbor',
  config: GAME_CONFIGS.screw_your_neighbor,
  family: 'unique',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const tokens = Object.fromEntries(players.map((p) => [p.id, 3]));
    const { cards, stock, safe, currentSeat } = dealRound(players, tokens, 0);
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat,
        gameState: {
          cards,
          tokens,
          acted: [],
          safe,
          dealerSeat: 0,
          stock,
          lastLosers: [],
          winner: null,
        } satisfies ScrewState,
      },
      players,
    };
  },
  reduce(state, action) {
    if (action.intent === 'swap') return swap(state, String(action.playerId));
    if (action.intent === 'draw') return draw(state, String(action.playerId));
    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  view(state, viewerId) {
    const pv = publicView(state, viewerId);
    const cur = state.game.gameState as ScrewState;
    const cards = viewerId && cur.cards[viewerId] ? { [viewerId]: cur.cards[viewerId] } : {};
    return { ...pv, game: { ...pv.game, gameState: { ...cur, cards } } };
  },
  isTerminal(state) {
    return !!(state.game.gameState as ScrewState).winner;
  },
  score(state) {
    const gs = state.game.gameState as ScrewState;
    return gs.winner ? { [gs.winner]: 1 } : { ...gs.tokens };
  },
};
