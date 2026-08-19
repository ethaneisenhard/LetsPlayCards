import { buildDeck, shuffleDeck } from '../deck';
import type { Card, Suit } from '../types';
import { rankValue } from '../gameTypes';
import { EngineError, findPlayer, removeCard, updatePlayerHand, type EngineState } from '../state';
import type { TrickPlay } from '../primitives/trick';
import { nextSeat, orderedSeats } from '../primitives/turn';
import type { CardGame } from '../registry/types';
import { GAME_CONFIGS } from '../registry/catalog';

interface EuchreState {
  phase: 'trump' | 'playing' | 'finished';
  trump: Suit | null;
  currentTrick: TrickPlay[];
  leadSuit: Suit | null;
  tricksWon: Record<string, number>;
  teamScore: [number, number];
  handsPlayed: number;
  winner: string | null;
}

const TARGET = 10;
const SUIT_ORDER: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
const SAME_COLOR: Record<Suit, Suit> = { clubs: 'spades', spades: 'clubs', hearts: 'diamonds', diamonds: 'hearts' };

function cardPower(card: Card, trump: Suit): number {
  if (card.suit === trump && card.rank === 'J') return 2500; // right bower
  if (card.suit === SAME_COLOR[trump] && card.rank === 'J') return 2400; // left bower
  if (card.suit === trump) return 2000 + rankValue(card.rank);
  return rankValue(card.rank);
}

function euchreWinner(plays: TrickPlay[], leadSuit: Suit, trump: Suit): string {
  let best: { playerId: string; power: number } | null = null;
  for (const p of plays) {
    const suit = p.card.suit === SAME_COLOR[trump] && p.card.rank === 'J' ? trump : p.card.suit;
    const power = p.card.suit === trump || (p.card.rank === 'J' && p.card.suit === SAME_COLOR[trump])
      ? cardPower(p.card, trump)
      : suit === leadSuit ? 1000 + rankValue(p.card.rank) : rankValue(p.card.rank);
    if (!best || power > best.power) best = { playerId: p.playerId, power };
  }
  return best!.playerId;
}

export const euchreGame: CardGame = {
  type: 'euchre',
  config: GAME_CONFIGS.euchre,
  family: 'trick',
  deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'] },
  setup(state) {
    const { game, players } = state;
    const deck = shuffleDeck(buildDeck({ ranks: ['9', '10', 'J', 'Q', 'K', 'A'] }));
    const upcard = deck[deck.length - 1];
    const dealt = players.map((p, i) => ({ ...p, hand: deck.slice(i * 5, (i + 1) * 5) }));
    return {
      game: {
        ...game, status: 'playing', deck: deck.slice(players.length * 5), tableCards: [], discardPile: [], currentSeat: 0,
        gameState: {
          phase: 'trump', trump: null, currentTrick: [], leadSuit: null,
          tricksWon: Object.fromEntries(players.map((p) => [p.id, 0])),
          teamScore: [0, 0], handsPlayed: 0, winner: null,
        } satisfies EuchreState,
      },
      players: dealt,
    };
  },
  reduce(state, action) {
    const { game, players } = state;
    const gs = game.gameState as EuchreState;
    const seats = orderedSeats(players);

    if (action.intent === 'set-trump') {
      if (gs.phase !== 'trump') throw new EngineError('Trump already set');
      const trump = String(action.suit) as Suit;
      if (!SUIT_ORDER.includes(trump)) throw new EngineError('Invalid suit');
      return {
        game: { ...game, currentSeat: 0, gameState: { ...gs, trump, phase: 'playing' } },
        players,
      };
    }

    if (action.intent === 'play') {
      if (gs.phase !== 'playing') throw new EngineError('Not playing');
      const player = findPlayer(players, action.playerId!);
      if (!player || player.seat !== game.currentSeat) throw new EngineError('Not your turn');
      const card = player.hand.find((c) => c.id === String(action.cardId));
      if (!card) throw new EngineError('Card not in hand');
      // follow suit if able (left bower counts as trump)
      if (gs.leadSuit) {
        const isTrumpCard = (c: Card) => c.suit === gs.trump || (c.rank === 'J' && c.suit === SAME_COLOR[gs.trump!]);
        const led = gs.currentTrick[0].card;
        const ledSuit = led.rank === 'J' && led.suit === SAME_COLOR[gs.trump!] ? gs.trump! : led.suit;
        const followers = player.hand.filter((c) => (c.suit === ledSuit && !isTrumpCard(c)) || (ledSuit === gs.trump && isTrumpCard(c)));
        if (ledSuit === gs.trump) {
          if (player.hand.some(isTrumpCard) && !isTrumpCard(card)) throw new EngineError('Must follow trump');
        } else if (followers.length > 0 && !followers.some((c) => c.id === card.id)) {
          throw new EngineError('Must follow suit');
        }
      }

      const nextPlayers = updatePlayerHand(players, player.id, removeCard(player.hand, card.id));
      const newTrick = [...gs.currentTrick, { playerId: player.id, card }];
      const leadSuit = gs.leadSuit ?? card.suit;

      if (newTrick.length < players.length) {
        return {
          game: { ...game, currentSeat: nextSeat(seats, player.seat), gameState: { ...gs, currentTrick: newTrick, leadSuit } },
          players: nextPlayers,
        };
      }

      const first = newTrick[0].card;
      const effectiveLead = first.rank === 'J' && first.suit === SAME_COLOR[gs.trump!] ? gs.trump! : first.suit;
      const winnerId = euchreWinner(newTrick, effectiveLead, gs.trump!);
      const tricksWon = { ...gs.tricksWon, [winnerId]: (gs.tricksWon[winnerId] ?? 0) + 1 };
      const winnerSeat = players.find((p) => p.id === winnerId)!.seat;
      const handsPlayed = gs.handsPlayed + 1;

      if (handsPlayed >= 5) {
        const teamScore = [...gs.teamScore] as [number, number];
        const makerTeam = gs.currentTrick.length ? winnerSeat % 2 : 0;
        for (const team of [0, 1]) {
          const members = players.filter((p) => p.seat % 2 === team);
          const tricks = members.reduce((s, p) => s + (tricksWon[p.id] ?? 0), 0);
          if (team === makerTeam) {
            if (tricks === 5) teamScore[team] += 2; else if (tricks >= 3) teamScore[team] += 1; else teamScore[team] -= 2;
          } else if (tricks >= 3) teamScore[team] += 2;
        }
        const winner = teamScore[0] >= TARGET && teamScore[0] > teamScore[1] ? '0' : teamScore[1] >= TARGET && teamScore[1] > teamScore[0] ? '1' : null;
        return {
          game: {
            ...game,
            status: winner ? 'finished' : 'playing',
            currentSeat: winner ? winnerSeat : nextSeat(seats, winnerSeat),
            gameState: {
              ...gs, currentTrick: [], leadSuit: null, tricksWon, teamScore, handsPlayed: winner ? handsPlayed : 0,
              phase: winner ? 'finished' : 'trump', trump: winner ? gs.trump : null, winner,
            },
          },
          players: nextPlayers,
        };
      }

      return {
        game: { ...game, currentSeat: winnerSeat, gameState: { ...gs, currentTrick: [], leadSuit: null, tricksWon, handsPlayed } },
        players: nextPlayers,
      };
    }

    throw new EngineError(`Unknown intent: ${action.intent}`);
  },
  isTerminal(state) {
    return (state.game.gameState as EuchreState).phase === 'finished';
  },
  score(state) {
    const gs = state.game.gameState as EuchreState;
    return { Team1: gs.teamScore[0], Team2: gs.teamScore[1] };
  },
};
