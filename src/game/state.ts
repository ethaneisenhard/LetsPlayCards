import type { Card, TableCard, GameSettings } from './types';
import type { GameType, AnyGameState } from './gameTypes';
import { GAME_CONFIGS } from './registry/catalog';

export type GameStatus = 'lobby' | 'playing' | 'finished';

export interface EngineGame {
  id: string;
  code: string;
  status: GameStatus;
  gameType: GameType;
  deck: Card[];
  tableCards: TableCard[];
  discardPile: Card[];
  currentSeat: number;
  settings: GameSettings;
  gameState: AnyGameState;
}

export interface EnginePlayer {
  id: string;
  name: string;
  seat: number;
  hand: Card[];
  isCreator: boolean;
  isReady: boolean;
}

export interface EngineState {
  game: EngineGame;
  players: EnginePlayer[];
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export const findPlayer = (players: EnginePlayer[], id: string): EnginePlayer | undefined =>
  players.find((p) => p.id === id);

export const updatePlayer = (
  players: EnginePlayer[],
  id: string,
  patch: Partial<EnginePlayer>,
): EnginePlayer[] => players.map((p) => (p.id === id ? { ...p, ...patch } : p));

export const updatePlayerHand = (players: EnginePlayer[], id: string, hand: Card[]) =>
  updatePlayer(players, id, { hand });

export function removeCard(hand: Card[], cardId: string): Card[] {
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new EngineError(`Card ${cardId} not found in hand`);
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

export function removeCardByRank(hand: Card[], rank: string): Card[] {
  return hand.filter((c) => c.rank !== rank);
}

// ─── Lobby / envelope ─────────────────────────────────────────────────────────

export function createLobbyState(
  id: string,
  code: string,
  gameType: GameType,
  settings: GameSettings,
): EngineState {
  return {
    game: {
      id,
      code,
      status: 'lobby',
      gameType,
      deck: [],
      tableCards: [],
      discardPile: [],
      currentSeat: 0,
      settings,
      gameState: {},
    },
    players: [],
  };
}

export function addPlayer(state: EngineState, id: string, name: string): EngineState {
  const { game, players } = state;
  const maxPlayers = game.settings.maxPlayers;
  if (players.length >= maxPlayers) throw new EngineError('This game is full');

  const usedSeats = new Set(players.map((p) => p.seat));
  let seat = 0;
  while (usedSeats.has(seat)) seat++;

  const player: EnginePlayer = {
    id,
    name,
    seat,
    hand: [],
    isCreator: players.length === 0,
    isReady: false,
  };
  return { game, players: [...players, player] };
}

export function updateSettings(state: EngineState, patch: Partial<GameSettings>): EngineState {
  return {
    ...state,
    game: { ...state.game, settings: { ...state.game.settings, ...patch } },
  };
}

// ─── Public projection (hides other players' hands + the deck) ────────────────

export interface PublicState {
  game: {
    id: string;
    code: string;
    status: GameStatus;
    gameType: GameType;
    deckCount: number;
    tableCards: TableCard[];
    discardPile: Card[];
    currentSeat: number;
    settings: GameSettings;
    gameState: AnyGameState;
  };
  players: Array<{
    id: string;
    name: string;
    seat: number;
    isCreator: boolean;
    isReady: boolean;
    handCount: number;
    hand: Card[];
  }>;
}

function stackSize(gameState: unknown, playerId: string): number | null {
  if (!gameState || typeof gameState !== 'object') return null;
  const stacks = (gameState as { stacks?: unknown }).stacks;
  if (!stacks || typeof stacks !== 'object' || Array.isArray(stacks)) return null;
  const pile = (stacks as Record<string, unknown>)[playerId];
  return Array.isArray(pile) ? pile.length : 0;
}

/** Drop face-down stacks from the public projection. Counts go on `handCount`. */
function redactHiddenPiles(gameState: AnyGameState): AnyGameState {
  if (!gameState || typeof gameState !== 'object') return gameState;
  if (!('stacks' in gameState)) return gameState;
  const { stacks: _hidden, ...rest } = gameState as AnyGameState & { stacks?: unknown };
  return rest as AnyGameState;
}

export function publicView(state: EngineState, viewerId?: string): PublicState {
  const g = state.game;
  return {
    game: {
      id: g.id,
      code: g.code,
      status: g.status,
      gameType: g.gameType,
      deckCount: g.deck.length,
      tableCards: g.tableCards,
      discardPile: g.discardPile,
      currentSeat: g.currentSeat,
      settings: g.settings,
      gameState: redactHiddenPiles(g.gameState),
    },
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      seat: p.seat,
      isCreator: p.isCreator,
      isReady: p.isReady,
      handCount: p.hand.length > 0 ? p.hand.length : (stackSize(g.gameState, p.id) ?? 0),
      hand: p.id === viewerId && GAME_CONFIGS[g.gameType]?.handReveal !== 'stock' ? p.hand : [],
    })),
  };
}
