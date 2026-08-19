import type { GameType } from '../gameTypes';
import type { CardGame } from './types';
import { warGame } from '../games/war';
import { goFishGame } from '../games/goFish';
import { freeplayGame } from '../games/freeplay';
import { heartsGame } from '../games/hearts';
import { crazyEightsGame } from '../games/crazyEights';
import { rummyGame } from '../games/rummy';
import { blackjackGame } from '../games/blackjack';
import { spadesGame } from '../games/spades';
import { whistGame } from '../games/whist';
import { ohHellGame } from '../games/ohHell';
import { euchreGame } from '../games/euchre';
import { ginRummyGame } from '../games/ginRummy';
import { rummy500Game } from '../games/rummy500';
import { canastaGame } from '../games/canasta';
import { fiveCardDrawGame } from '../games/fiveCardDraw';
import { texasHoldemGame } from '../games/texasHoldem';
import { baccaratGame } from '../games/baccarat';
import { oldMaidGame } from '../games/oldMaid';
import { slapjackGame } from '../games/slapjack';
import { presidentGame } from '../games/president';
import { snapGame } from '../games/snap';
import { sevensGame } from '../games/sevens';
import { speedGame } from '../games/speed';
import { kingsInTheCornerGame } from '../games/kingsInTheCorner';
import { thirtyOneGame } from '../games/thirtyOne';
import { cassinoGame } from '../games/cassino';
import { concentrationGame } from '../games/concentration';
import { beggarMyNeighborGame } from '../games/beggarMyNeighbor';
import { egyptianRatscrewGame } from '../games/egyptianRatscrew';
import { iDoubtItGame } from '../games/iDoubtIt';
import { cheatGame } from '../games/cheat';
import { chaseTheAceGame } from '../games/chaseTheAce';
import { screwYourNeighborGame } from '../games/screwYourNeighbor';
import { spiteAndMaliceGame } from '../games/spiteAndMalice';
import { klondikeGame } from '../games/klondike';
import { freecellGame } from '../games/freecell';
import { spiderGame } from '../games/spider';
import { cribbageGame } from '../games/cribbage';
import { pinochleGame } from '../games/pinochle';
import { bridgeGame } from '../games/bridge';
import { pitchGame } from '../games/pitch';
import { solitaireRaceGame } from '../games/solitaireRace';

/** Behavior registry: every game maps its type to a CardGame module. */
export const GAME_REGISTRY: Record<GameType, CardGame> = {
  war: warGame,
  go_fish: goFishGame,
  freeplay: freeplayGame,
  hearts: heartsGame,
  crazy_eights: crazyEightsGame,
  rummy: rummyGame,
  blackjack: blackjackGame,
  spades: spadesGame,
  whist: whistGame,
  oh_hell: ohHellGame,
  euchre: euchreGame,
  gin_rummy: ginRummyGame,
  rummy_500: rummy500Game,
  canasta: canastaGame,
  five_card_draw: fiveCardDrawGame,
  texas_holdem: texasHoldemGame,
  baccarat: baccaratGame,
  old_maid: oldMaidGame,
  slapjack: slapjackGame,
  president: presidentGame,
  snap: snapGame,
  sevens: sevensGame,
  speed: speedGame,
  kings_in_the_corner: kingsInTheCornerGame,
  thirty_one: thirtyOneGame,
  cassino: cassinoGame,
  concentration: concentrationGame,
  beggar_my_neighbor: beggarMyNeighborGame,
  egyptian_ratscrew: egyptianRatscrewGame,
  i_doubt_it: iDoubtItGame,
  cheat: cheatGame,
  chase_the_ace: chaseTheAceGame,
  screw_your_neighbor: screwYourNeighborGame,
  spite_and_malice: spiteAndMaliceGame,
  klondike: klondikeGame,
  freecell: freecellGame,
  spider: spiderGame,
  cribbage: cribbageGame,
  pinochle: pinochleGame,
  bridge: bridgeGame,
  pitch: pitchGame,
  solitaire_race: solitaireRaceGame,
};

export function getGame(type: GameType): CardGame | undefined {
  return GAME_REGISTRY[type];
}
