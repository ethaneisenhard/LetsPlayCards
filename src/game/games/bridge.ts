import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

type BridgeTrump = Suit | 'nt';

interface BridgeState {
  phase: 'bidding' | 'playing' | 'finished';
  dealerId: string;
  bids: { playerId: string; level: number; trump: BridgeTrump }[];
  contract: { level: number; trump: BridgeTrump } | null;
  declarerId: string | null;
  dummyId: string | null;
  dummyHand: Card[];
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  tricksWon: Record<string, number>;
  tricksPlayed: number;
  teamScore: [number, number];
  winner: string | null;
}

const SUITS: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const TRUMPS: BridgeTrump[] = ['clubs', 'diamonds', 'hearts', 'spades', 'nt'];
const SUIT_RANK: Record<BridgeTrump, number> = { clubs: 0, diamonds: 1, hearts: 2, spades: 3, nt: 4 };

const seatOf = (players: { id: string; seat: number }[], id: string): number =>
  players.find((p) => p.id === id)!.seat;

function contractScore(level: number, trump: BridgeTrump): number {
  if (trump === 'clubs' || trump === 'diamonds') return level * 40;
  if (trump === 'nt') return level * 30 + 10;
  return level * 30;
}

export const bridgeGame: CardGame = {
  type: 'bridge',
  config: GAME_CONFIGS.bridge,
  family: 'trick',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 13, (i + 1) * 13) }));
    const dealer = players.find((p) => p.seat === 0) ?? players[0];
    return {
      game: {
        ...game,
        status: 'playing',
        deck: [],
        tableCards: [],
        discardPile: [],
        currentSeat: 0,
        gameState: {
          phase: 'bidding',
          dealerId: dealer.id,
          bids: [],
          contract: null,
          declarerId: null,
          dummyId: null,
          dummyHand: [],
          currentTrick: [],
          leadSuit: null,
          tricksWon: Object.fromEntries(players.map((p) => [p.id, 0])),
          tricksPlayed: 0,
          teamScore: [0, 0],
          winner: null,
        } satisfies BridgeState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as BridgeState;
    const seats = orderedSeats(players);

    if (action.intent === 'bid') {
      if (gs.phase !== 'bidding') throw new EngineError('Bidding is over');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn to bid');
      const level = Number(action.level);
      if (!Number.isInteger(level) || level < 0 || level > 7) throw new EngineError('Bid level must be 0–7');
      let trump: BridgeTrump = 'nt';
      if (level > 0) {
        trump = String(action.trump) as BridgeTrump;
        if (!TRUMPS.includes(trump)) throw new EngineError('Invalid trump');
      }
      const bids = [...gs.bids, { playerId: player.id, level, trump }];
      const allBid = bids.length >= players.length;

      if (!allBid) {
        return {
          game: { ...game, currentSeat: nextSeat(seats, player.seat), gameState: { ...gs, bids } },
          players,
        };
      }

      const winning = bids.reduce((best, b) =>
        b.level * 10 + SUIT_RANK[b.trump] > best.level * 10 + SUIT_RANK[best.trump] ? b : best,
      );
      if (winning.level === 0) {
        // Everyone passed — redeal and rotate the dealer.
        const newDealerSeat = nextSeat(seats, seatOf(players, gs.dealerId));
        const newDealerId = players.find((p) => p.seat === newDealerSeat)!.id;
        const deck = shuffleDeck(createDeck());
        const redealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 13, (i + 1) * 13) }));
        return {
          game: {
            ...game,
            currentSeat: newDealerSeat,
            gameState: { ...gs, bids: [], dealerId: newDealerId },
          },
          players: redealt,
        };
      }

      const declarerId = bids.find((b) => b.trump === winning.trump)!.playerId;
      const declarerSeat = seatOf(players, declarerId);
      const dummySeat = (declarerSeat + 2) % 4;
      const dummy = players.find((p) => p.seat === dummySeat)!;
      return {
        game: {
          ...game,
          currentSeat: (declarerSeat + 1) % 4,
          gameState: {
            ...gs,
            bids,
            phase: 'playing',
            contract: { level: winning.level, trump: winning.trump },
            declarerId,
            dummyId: dummy.id,
            dummyHand: [...dummy.hand],
          },
        },
        players,
      };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'playing') throw new EngineError('Not playing');
      if (!gs.contract || !gs.declarerId || !gs.dummyId) throw new EngineError('No contract');
      const trumpSuit = gs.contract.trump === 'nt' ? undefined : gs.contract.trump;
      const seat = game.currentSeat;
      const dummySeat = seatOf(players, gs.dummyId);
      const isDummyTurn = seat === dummySeat;
      const sourcePlayer = isDummyTurn
        ? findPlayer(players, gs.dummyId)!
        : players.find((p) => p.seat === seat)!;
      const expectedPlayer = isDummyTurn ? gs.declarerId : sourcePlayer.id;
      if (action.playerId !== expectedPlayer) throw new EngineError('Not your turn');
      if (isDummyTurn && action.hand !== 'dummy') throw new EngineError('Play from dummy');

      const card = sourcePlayer.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      if (!legalPlays(sourcePlayer.hand, gs.leadSuit, trumpSuit).some((c) => c.id === card.id)) {
        throw new EngineError('Must follow suit');
      }

      const newPlayers = updatePlayerHand(players, sourcePlayer.id, removeCard(sourcePlayer.hand, card.id));
      const dummyHand = isDummyTurn ? gs.dummyHand.filter((c) => c.id !== card.id) : gs.dummyHand;
      const newTrick = [...gs.currentTrick, { playerId: sourcePlayer.id, card }];
      const leadSuit = gs.leadSuit ?? card.suit;

      if (newTrick.length < players.length) {
        return {
          game: {
            ...game,
            currentSeat: nextSeat(seats, seat),
            gameState: { ...gs, currentTrick: newTrick, leadSuit, dummyHand },
          },
          players: newPlayers,
        };
      }

      const winnerId = trickWinner(newTrick, leadSuit, trumpSuit);
      const tricksWon = { ...gs.tricksWon, [winnerId]: (gs.tricksWon[winnerId] ?? 0) + 1 };
      const tricksPlayed = gs.tricksPlayed + 1;
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;

      if (tricksPlayed >= 13) {
        const declarerSeat = seatOf(players, gs.declarerId);
        const team = declarerSeat % 2;
        const contractTricks = gs.contract.level + 6;
        const declarerTricks = (tricksWon[gs.declarerId] ?? 0) + (tricksWon[gs.dummyId] ?? 0);
        const teamScore = [...gs.teamScore] as [number, number];
        teamScore[team] +=
          declarerTricks >= contractTricks
            ? contractScore(gs.contract.level, gs.contract.trump)
            : -50 * (contractTricks - declarerTricks);
        const winner = teamScore[0] >= teamScore[1] ? '0' : '1';
        return {
          game: {
            ...game,
            status: 'finished',
            currentSeat: winnerSeat,
            gameState: {
              ...gs, currentTrick: [], leadSuit: null, tricksWon, tricksPlayed, dummyHand,
              teamScore, phase: 'finished', winner,
            },
          },
          players: newPlayers,
        };
      }

      return {
        game: {
          ...game,
          currentSeat: winnerSeat,
          gameState: { ...gs, currentTrick: [], leadSuit: null, tricksWon, tricksPlayed, dummyHand },
        },
        players: newPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as BridgeState).phase === 'finished';
  },
  score(state) {
    const gs = state.game.gameState as BridgeState;
    return { Team0: gs.teamScore[0], Team1: gs.teamScore[1] };
  },
};
