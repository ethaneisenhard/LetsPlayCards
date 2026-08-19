import { createDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import { legalPlays, trickWinner, type TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface SpadesState {
  phase: 'bidding' | 'playing' | 'finished';
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  spadesBroken: boolean;
  teamScore: [number, number]; // seat%2
  teamBags: [number, number];
  handsPlayed: number;
  winner: string | null;
}

const TARGET = 500;

export const spadesGame: CardGame = {
  type: 'spades',
  config: GAME_CONFIGS.spades,
  family: 'trick',
  deck: {},
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(createDeck());
    const n = players.length;
    const deal = Math.floor(deck.length / n);
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * deal, (i + 1) * deal) }));
    return {
      game: {
        ...game, status: 'playing', deck: [], tableCards: [], discardPile: [], currentSeat: 0,
        gameState: {
          phase: 'bidding', bids: {}, tricksWon: Object.fromEntries(players.map((p) => [p.id, 0])),
          currentTrick: [], leadSuit: null, spadesBroken: false, teamScore: [0, 0], teamBags: [0, 0],
          handsPlayed: 0, winner: null,
        } satisfies SpadesState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as SpadesState;
    const seats = orderedSeats(players);

    if (action.intent === 'bid') {
      if (gs.phase !== 'bidding') throw new EngineError('Bidding is over');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn to bid');
      const amount = Number(action.amount);
      if (!Number.isInteger(amount) || amount < 0 || amount > 13) throw new EngineError('Bid must be 0–13');
      const bids = { ...gs.bids, [player.id]: amount };
      const allBid = players.every((p) => bids[p.id] !== undefined);
      return {
        game: {
          ...game,
          currentSeat: allBid ? 0 : nextSeat(seats, player.seat),
          gameState: { ...gs, bids, phase: allBid ? 'playing' : 'bidding' },
        },
        players,
      };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'playing') throw new EngineError('Cannot play now');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      if (!legalPlays(player.hand, gs.leadSuit).some((c) => c.id === card.id)) throw new EngineError('Must follow suit');
      const leading = gs.currentTrick.length === 0;
      if (leading && card.suit === 'spades' && !gs.spadesBroken && player.hand.some((c) => c.suit !== 'spades')) {
        throw new EngineError('Spades not broken');
      }

      const nextPlayers = updatePlayerHand(players, player.id, removeCard(player.hand, card.id));
      const newTrick = [...gs.currentTrick, { playerId: player.id, card }];
      const leadSuit = gs.leadSuit ?? card.suit;
      const spadesBroken = gs.spadesBroken || card.suit === 'spades';

      if (newTrick.length < players.length) {
        return {
          game: {
            ...game, currentSeat: nextSeat(seats, player.seat),
            gameState: { ...gs, currentTrick: newTrick, leadSuit, spadesBroken },
          },
          players: nextPlayers,
        };
      }

      const winnerId = trickWinner(newTrick, leadSuit, 'spades');
      const tricksWon = { ...gs.tricksWon, [winnerId]: (gs.tricksWon[winnerId] ?? 0) + 1 };
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;
      const handsPlayed = gs.handsPlayed + 1;

      if (handsPlayed >= 13) {
        // score both teams
        let teamScore = [...gs.teamScore] as [number, number];
        let teamBags = [...gs.teamBags] as [number, number];
        for (const team of [0, 1]) {
          const members = players.filter((p) => p.seat % 2 === team);
          const bid = members.reduce((s, p) => s + (gs.bids[p.id] ?? 0), 0);
          const tricks = members.reduce((s, p) => s + (tricksWon[p.id] ?? 0), 0);
          if (tricks >= bid) {
            const bags = tricks - bid;
            teamScore[team] += bid * 10 + bags;
            teamBags[team] += bags;
            if (teamBags[team] >= 10) { teamScore[team] -= 100; teamBags[team] -= 10; }
          } else {
            teamScore[team] -= bid * 10;
          }
        }
        const winnerTeam = teamScore[0] >= TARGET && teamScore[0] > teamScore[1] ? 0 : teamScore[1] >= TARGET && teamScore[1] > teamScore[0] ? 1 : -1;
        const finished = winnerTeam >= 0;
        return {
          game: {
            ...game,
            status: finished ? 'finished' : 'playing',
            currentSeat: finished ? winnerSeat : nextSeat(seats, winnerSeat),
            gameState: {
              ...gs, currentTrick: [], leadSuit: null, tricksWon, spadesBroken, handsPlayed: finished ? handsPlayed : 0,
              teamScore, teamBags, phase: finished ? 'finished' : 'bidding', bids: finished ? gs.bids : {},
              winner: finished ? String(winnerTeam) : null,
            },
          },
          players: nextPlayers,
        };
      }

      return {
        game: {
          ...game, currentSeat: winnerSeat,
          gameState: { ...gs, currentTrick: [], leadSuit: null, tricksWon, spadesBroken, handsPlayed },
        },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as SpadesState).phase === 'finished';
  },
  score(state) {
    const gs = state.game.gameState as SpadesState;
    return { Team1: gs.teamScore[0], Team2: gs.teamScore[1] };
  },
};
