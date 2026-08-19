export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface TableCard extends Card {
  playedBy: string;
  playedByName: string;
}

export type FreePlayWinCondition = 'empty-hand' | 'most-table' | 'highest-total' | 'never';
export type FreePlayPlayRule = 'any' | 'match-rank' | 'match-suit' | 'match-rank-or-suit';

/** Host-configurable rules for the Free Play engine. */
export interface FreePlayRules {
  /** How the game ends. 'never' = sandbox (no winner). */
  winCondition: FreePlayWinCondition;
  /** Cards drawn per turn (1–3). */
  drawCount: number;
  /** Constraint on what card you may play (matched against the top discard). */
  playRule: FreePlayPlayRule;
}

export const DEFAULT_FREEPLAY_RULES: FreePlayRules = {
  winCondition: 'empty-hand',
  drawCount: 1,
  playRule: 'any',
};

export interface GameSettings {
  dealCount: number;
  maxPlayers: number;
  /** Only the Free Play engine reads this. */
  freeplay?: FreePlayRules;
}
