export type HandReveal = 'open' | 'stock';

export type TurnButton = { intent: string; label: string; amount?: number; side?: string };

export type TableChrome = {
  handReveal: HandReveal;
  stockIntent: string;
  slapIntent: string | null;
  drawFromIntent: string | null;
  askRankIntent: string | null;
  turnButtons: TurnButton[];
  showSharedPiles: boolean;
  reserveBattleLane: boolean;
  actWhen: 'seat' | 'betting' | 'undrawn' | 'always';
  drawPicked: boolean;
  showTableau: boolean;
  showMemory: boolean;
  showLadders: boolean;
  widowSwap: boolean;
  holeFromState: boolean;
  showCorners: boolean;
  showFishing: boolean;
  showPeg: boolean;
  cribDiscard: boolean;
};

const DEFAULT_CHROME: TableChrome = {
  handReveal: 'open',
  stockIntent: 'play',
  slapIntent: null,
  drawFromIntent: null,
  askRankIntent: null,
  turnButtons: [],
  showSharedPiles: true,
  reserveBattleLane: false,
  actWhen: 'seat',
  drawPicked: false,
  showTableau: false,
  showMemory: false,
  showLadders: false,
  widowSwap: false,
  holeFromState: false,
  showCorners: false,
  showFishing: false,
  showPeg: false,
  cribDiscard: false,
};

/** Stock-pile flip intent per game. Add here when a new stock game lands. */
export const STOCK_INTENT: Record<string, string> = {
  war: 'war-play',
  slapjack: 'flip',
  snap: 'flip',
  beggar_my_neighbor: 'flip',
  egyptian_ratscrew: 'flip',
};

/** Race-the-pile intent. Missing = display-only center. */
export const SLAP_INTENT: Record<string, string> = {
  slapjack: 'slap',
  snap: 'snap',
  egyptian_ratscrew: 'slap',
};

/** Click an opponent to take a card from their hand. */
export const DRAW_FROM_INTENT: Record<string, string> = {
  old_maid: 'draw-from',
};

/** Select a rank in hand, then click a player to ask. */
export const ASK_RANK_INTENT: Record<string, string> = {
  go_fish: 'gofish-ask',
};

/** Seat-level buttons (no card target). */
export const TURN_BUTTONS: Record<string, TurnButton[]> = {
  blackjack: [
    { intent: 'hit', label: 'Hit' },
    { intent: 'stand', label: 'Stand' },
  ],
  sevens: [{ intent: 'pass', label: 'Pass' }],
  chase_the_ace: [
    { intent: 'swap', label: 'Swap' },
    { intent: 'draw', label: 'Draw' },
  ],
  screw_your_neighbor: [
    { intent: 'swap', label: 'Swap' },
    { intent: 'draw', label: 'Draw' },
  ],
  thirty_one: [{ intent: 'knock', label: 'Knock' }],
  texas_holdem: [
    { intent: 'check', label: 'Check' },
    { intent: 'call', label: 'Call' },
    { intent: 'raise', label: 'Raise' },
    { intent: 'fold', label: 'Fold' },
  ],
  five_card_draw: [
    { intent: 'draw', label: 'Draw / Stand' },
    { intent: 'showdown', label: 'Showdown' },
  ],
  baccarat: [
    { intent: 'bet', label: 'Player 10', side: 'player', amount: 10 },
    { intent: 'bet', label: 'Banker 10', side: 'banker', amount: 10 },
    { intent: 'bet', label: 'Tie 10', side: 'tie', amount: 10 },
  ],
  kings_in_the_corner: [
    { intent: 'draw', label: 'Draw' },
    { intent: 'play-center', label: 'To center' },
    { intent: 'discard', label: 'Discard' },
  ],
  cassino: [
    { intent: 'capture', label: 'Capture' },
    { intent: 'build', label: 'Build' },
    { intent: 'trail', label: 'Trail' },
    { intent: 'capture-build', label: 'Take build' },
  ],
  cribbage: [
    { intent: 'discard-to-crib', label: 'To crib' },
    { intent: 'go', label: 'Go' },
    { intent: 'count', label: 'Count' },
  ],
};

const ACT_WHEN: Record<string, TableChrome['actWhen']> = {
  baccarat: 'betting',
  five_card_draw: 'undrawn',
  klondike: 'always',
  freecell: 'always',
  spider: 'always',
  solitaire_race: 'always',
};

const TABLEAU_TYPES = new Set(['klondike', 'freecell', 'spider', 'solitaire_race']);
const MEMORY_TYPES = new Set(['concentration']);
const LADDER_TYPES = new Set(['sevens']);
const WIDOW_TYPES = new Set(['thirty_one']);
const HOLE_TYPES = new Set(['chase_the_ace', 'screw_your_neighbor']);
const DRAW_PICKED = new Set(['five_card_draw']);
const CORNER_TYPES = new Set(['kings_in_the_corner']);
const FISHING_TYPES = new Set(['cassino']);
const PEG_TYPES = new Set(['cribbage']);
const CRIB_DISCARD = new Set(['cribbage']);

export function resolveTableChrome(input: {
  gameType: string;
  handReveal?: string;
  family?: string;
}): TableChrome {
  const handReveal: HandReveal = input.handReveal === 'stock' ? 'stock' : 'open';
  const trick = input.family === 'trick';
  const drawFromIntent = DRAW_FROM_INTENT[input.gameType] ?? null;
  const askRankIntent = ASK_RANK_INTENT[input.gameType] ?? null;
  const turnButtons = TURN_BUTTONS[input.gameType] ?? DEFAULT_CHROME.turnButtons;
  const showTableau = TABLEAU_TYPES.has(input.gameType);
  const showMemory = MEMORY_TYPES.has(input.gameType);
  const showLadders = LADDER_TYPES.has(input.gameType);
  const widowSwap = WIDOW_TYPES.has(input.gameType);
  const holeFromState = HOLE_TYPES.has(input.gameType);
  const showCorners = CORNER_TYPES.has(input.gameType);
  const showFishing = FISHING_TYPES.has(input.gameType);
  const showPeg = PEG_TYPES.has(input.gameType);
  const cribDiscard = CRIB_DISCARD.has(input.gameType);
  return {
    handReveal,
    stockIntent: STOCK_INTENT[input.gameType] ?? DEFAULT_CHROME.stockIntent,
    slapIntent: SLAP_INTENT[input.gameType] ?? null,
    drawFromIntent,
    askRankIntent,
    turnButtons,
    showSharedPiles:
      handReveal !== 'stock' &&
      !trick &&
      !drawFromIntent &&
      !showTableau &&
      !showMemory &&
      !showCorners &&
      !showFishing &&
      !showPeg &&
      turnButtons.length === 0,
    reserveBattleLane: handReveal === 'stock' || trick,
    actWhen: ACT_WHEN[input.gameType] ?? DEFAULT_CHROME.actWhen,
    drawPicked: DRAW_PICKED.has(input.gameType),
    showTableau,
    showMemory,
    showLadders,
    widowSwap,
    holeFromState,
    showCorners,
    showFishing,
    showPeg,
    cribDiscard,
  };
}
