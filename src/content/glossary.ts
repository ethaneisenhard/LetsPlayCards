import type { GameType } from '../game/gameTypes';

export interface GlossarySection {
  heading: string;
  body: string;
}

export interface GlossaryEntry {
  slug: string;
  type?: GameType; // present when this game is in GAME_CATALOG (joins metadata)
  name: string;
  title: string;
  metaDescription: string;
  intro: string;
  sections: GlossarySection[];
  faq: { q: string; a: string }[];
  related: string[]; // slugs
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeMinutes: string;
  playerCount: string;
  status: 'live' | 'planned' | 'documented-only';
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Live games ────────────────────────────────────────────────────────────
  war: {
    slug: 'war', type: 'war', name: 'War',
    title: 'War Card Game Rules — How to Play War',
    metaDescription: "Learn how to play War, the simplest two-player card game. Full rules, war tie-breakers, and tips to finish faster.",
    intro: 'War is the simplest card game there is — no decisions, no strategy, just luck. Two players split the deck and flip cards until someone owns all 52.',
    sections: [
      { heading: 'Setup', body: 'Shuffle a full 52-card deck and deal it out so each player has 26 cards, face-down in a stack. Players do not look at their cards.' },
      { heading: 'How to Play', body: 'Both players flip their top card simultaneously. The higher card wins and collects both, placing them at the bottom of their stack. Aces are high.' },
      { heading: 'War (ties)', body: 'When the two cards match in rank, players go to war: each places three cards face-down and one face-up. The higher face-up card wins all ten cards. If it ties again, war repeats.' },
      { heading: 'Winning', body: 'The player who collects all 52 cards wins. Games can run long, so many players cap the number of wars or play until someone runs low.' },
      { heading: 'Strategy', body: 'There is no real strategy — the outcome is pure chance. To speed up play, some variants have players surrender two cards each in a war instead of three.' },
    ],
    faq: [
      { q: 'How long does a game of War take?', a: 'A full game can take 10–30 minutes depending on how many wars occur. It is entirely luck-driven.' },
      { q: 'Can War be played with more than two players?', a: 'Yes — deal the deck evenly to three or four players. Everyone flips at once; the highest card wins the pile, and all tied players go to war.' },
      { q: 'What happens when a player runs out of cards mid-war?', a: 'That player plays their remaining cards face-up; if they still lose, they are out and the winner takes the pile.' },
    ],
    related: ['slapjack', 'egyptian_ratscrew', 'beggar_my_neighbor'],
    difficulty: 1, timeMinutes: '10–30 min', playerCount: '2', status: 'live',
  },

  go_fish: {
    slug: 'go_fish', type: 'go_fish', name: 'Go Fish',
    title: 'Go Fish Card Game Rules — How to Play Go Fish',
    metaDescription: "Learn how to play Go Fish, the classic family card game. Full rules for asking, drawing, and scoring books of four.",
    intro: 'Go Fish is a friendly matching game where players ask each other for cards to build sets of four. It is one of the first card games most people learn.',
    sections: [
      { heading: 'Setup', body: 'Deal 5 cards to each player (7 cards with 2–3 players). The rest of the deck sits face-down in the middle as the draw pile.' },
      { heading: 'How to Play', body: 'On your turn, ask any other player for a specific rank you already hold (e.g. "Do you have any kings?"). If they do, they must hand over every card of that rank and you go again.' },
      { heading: 'Going Fish', body: 'If the player you asked does not have the rank, they say "Go Fish!" and you draw one card from the pile. If you draw the rank you asked for, show it and go again; otherwise your turn ends.' },
      { heading: 'Scoring', body: 'Whenever you collect all four cards of a rank, lay them face-up as a "book." The player with the most books when the draw pile runs out wins.' },
    ],
    faq: [
      { q: 'How many cards do you deal in Go Fish?', a: '5 cards per player for 4+ players, or 7 cards each for 2–3 players.' },
      { q: 'Can you ask for a rank you have none of?', a: 'No — most rule sets require you to hold at least one card of the rank you ask for.' },
      { q: 'What ends a game of Go Fish?', a: 'The game ends when the draw pile is empty and a player runs out of cards, or when all 13 books are made. Most books wins.' },
    ],
    related: ['old_maid', 'concentration', 'rummy'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '2–6', status: 'live',
  },

  freeplay: {
    slug: 'freeplay', type: 'freeplay', name: 'Free Play',
    title: 'Free Play Card Table — Play Any Game, Your Rules',
    metaDescription: 'Free Play is a virtual card table with no enforced rules — deal, draw, and discard however you want to play any card game.',
    intro: 'Free Play is a blank card table. There are no enforced rules, so you can use it to play Rummy, Poker, Crazy Eights, or anything else by agreeing on the rules with your friends.',
    sections: [
      { heading: 'Setup', body: 'Create a Free Play game and share the code. Deal any number of cards to any number of players.' },
      { heading: 'How to Play', body: 'There is no rule engine — players draw, play, and discard cards freely. It is a shared virtual table, not a refereed game.' },
      { heading: 'When to use it', body: 'Use Free Play for games we have not yet built, house rules, or teaching. It gives you the table and cards without enforcing a game.' },
    ],
    faq: [
      { q: 'Does Free Play enforce rules?', a: 'No — it is a rule-free table. You and the other players enforce whatever game you are playing.' },
      { q: 'How many players can join Free Play?', a: 'Up to 8 players can share a single Free Play table.' },
    ],
    related: ['rummy', 'crazy_eights', 'president'],
    difficulty: 1, timeMinutes: 'any', playerCount: '1–8', status: 'live',
  },

  hearts: {
    slug: 'hearts', type: 'hearts', name: 'Hearts',
    title: 'Hearts Card Game Rules — How to Play Hearts',
    metaDescription: "Learn how to play Hearts: full rules for the classic trick-taking card game, including scoring, shooting the moon, and strategy.",
    intro: 'Hearts is a trick-taking game where the goal is to avoid winning hearts and the queen of spades. The player with the lowest score at the end wins.',
    sections: [
      { heading: 'Setup', body: 'Deal the full deck evenly — 13 cards each for 4 players. The player holding the 2 of clubs leads the first trick.' },
      { heading: 'How to Play', body: 'The leader plays any card. Each player must follow suit if they can; otherwise they may play any card. The highest card of the led suit wins the trick, unless a heart was played on a non-heart lead.' },
      { heading: 'Scoring', body: 'Each heart is worth 1 point and the queen of spades is worth 13. The winner of each trick collects its cards. When someone reaches 100 points, the lowest score wins the game.' },
      { heading: 'Shooting the Moon', body: 'If one player captures all 13 hearts and the queen of spades, they "shoot the moon" — scoring 0 while every opponent scores 26.' },
      { heading: 'Strategy', body: 'Early game, dump high cards and the queen of spades. If you must take hearts, consider going all-in for the moon rather than taking a few.' },
    ],
    faq: [
      { q: 'What happens if you shoot the moon in Hearts?', a: 'You score 0 and every other player scores 26 points. It is a high-risk, high-reward play.' },
      { q: 'Can you lead a heart in Hearts?', a: 'Hearts cannot be led until a heart has already been played ("broken"), unless a player holds only hearts.' },
      { q: 'How many points is the queen of spades worth?', a: '13 points — as much as every heart combined.' },
    ],
    related: ['spades', 'euchre', 'whist', 'oh_hell'],
    difficulty: 3, timeMinutes: '30–60 min', playerCount: '3–6', status: 'live',
  },

  crazy_eights: {
    slug: 'crazy_eights', type: 'crazy_eights', name: 'Crazy Eights',
    title: 'Crazy Eights Card Game Rules — How to Play Crazy Eights',
    metaDescription: "Learn how to play Crazy Eights, the shedding game that inspired Uno. Full rules for matching, wild eights, and winning.",
    intro: 'Crazy Eights is a fast shedding game where players match the top card by suit or rank. Eights are wild. The first player to empty their hand wins.',
    sections: [
      { heading: 'Setup', body: 'Deal 5–7 cards each (7 for two players, 5 for more). Turn the next card face-up to start the discard pile; the rest is the draw pile.' },
      { heading: 'How to Play', body: 'Match the top card by suit or rank, or play an 8 (wild) and choose the new suit. If you cannot play, draw until you can or the pile empties.' },
      { heading: 'Scoring', body: 'The first player to run out of cards wins the round and scores points from opponents\' remaining cards — 50 per 8, 10 per face card, face value otherwise.' },
      { heading: 'Strategy', body: 'Save your eights for when you are stuck. Hold multiple suits so you are never forced to draw.' },
    ],
    faq: [
      { q: 'What does an 8 do in Crazy Eights?', a: 'An 8 is wild — you can play it on anything and declare the suit the next player must follow.' },
      { q: 'Is Crazy Eights the same as Uno?', a: 'Uno is a commercial version of Crazy Eights with special action cards. The core matching mechanic is identical.' },
      { q: 'How do you win Crazy Eights?', a: 'Be the first to play all your cards. In multi-round games, first to 500 points wins.' },
    ],
    related: ['president', 'freeplay', 'speed'],
    difficulty: 1, timeMinutes: '15–30 min', playerCount: '2–7', status: 'live',
  },

  rummy: {
    slug: 'rummy', type: 'rummy', name: 'Rummy',
    title: 'Rummy Card Game Rules — How to Play Rummy',
    metaDescription: "Learn how to play Rummy: full rules for drawing, melding sets and runs, and going out. Includes scoring and strategy.",
    intro: 'Rummy is a matching game where players form sets (three or four of a kind) and runs (three or more consecutive cards of one suit). The first to meld all their cards wins.',
    sections: [
      { heading: 'Setup', body: 'Deal 10 cards each for two players (7 for 3–4, 6 for 5–6). Turn one card up to start the discard pile; the rest is the stock.' },
      { heading: 'How to Play', body: 'Draw one card (stock or discard), then either meld sets and runs or lay off onto existing melds, then discard one card to end your turn.' },
      { heading: 'Going Out', body: 'When you can meld or lay off your last card, you go out and win the hand. Opponents score deadwood — the value of unmelded cards (face cards 10, aces 1, others face value).' },
      { heading: 'Strategy', body: 'Watch the discard pile to infer opponents\' hands. Hold middle cards (6–8) which fit into more runs than aces or kings.' },
    ],
    faq: [
      { q: 'What is a meld in Rummy?', a: 'A set (3–4 cards of the same rank) or a run (3+ consecutive cards of the same suit).' },
      { q: 'How many cards do you deal in Rummy?', a: '10 for two players, 7 for 3–4, and 6 for 5–6 players.' },
      { q: 'What is deadwood in Rummy?', a: 'The unmelded cards left in your hand when someone goes out — they are scored against you.' },
    ],
    related: ['gin_rummy', 'rummy_500', 'canasta'],
    difficulty: 2, timeMinutes: '20–45 min', playerCount: '2–6', status: 'live',
  },

  blackjack: {
    slug: 'blackjack', type: 'blackjack', name: 'Blackjack',
    title: 'Blackjack Rules — How to Play Blackjack (21)',
    metaDescription: "Learn how to play Blackjack: full rules for hitting, standing, splitting, and the dealer's play. Includes basic strategy.",
    intro: 'Blackjack, also called 21, pits each player against the dealer. The goal is a hand total closer to 21 than the dealer without going over.',
    sections: [
      { heading: 'Setup', body: 'Each player and the dealer get two cards — players\' cards face-up, the dealer shows one up and one down ("hole card").' },
      { heading: 'How to Play', body: 'Aces count 1 or 11, face cards 10. Players hit (take a card) or stand (hold). Busting over 21 loses immediately.' },
      { heading: 'The Dealer', body: 'After all players act, the dealer reveals the hole card and must hit to at least 17, standing on 17 or higher.' },
      { heading: 'Scoring', body: 'Beat the dealer without busting to win your bet. A two-card 21 ("natural blackjack") pays 3:2. Push (tie) returns your bet.' },
      { heading: 'Strategy', body: 'Basic strategy: stand on hard 17+, hit on 11 or less, and always split aces and eights. The house edge drops below 1% with perfect play.' },
    ],
    faq: [
      { q: 'What does a blackjack pay?', a: 'A natural blackjack (ace + ten-value card) pays 3:2 in most casinos.' },
      { q: 'When should you hit vs stand?', a: 'Stand on 17 or higher, hit on 11 or lower. Between 12–16, hit if the dealer shows a 7 or higher, stand on 2–6.' },
      { q: 'What is a soft hand?', a: 'A hand with an ace counted as 11, like ace-6 (soft 17). Soft hands cannot bust on a single hit.' },
    ],
    related: ['baccarat', 'texas_holdem', 'five_card_draw'],
    difficulty: 2, timeMinutes: '20–30 min', playerCount: '1–7', status: 'live',
  },

  // ── Trick-taking (planned) ────────────────────────────────────────────────
  spades: {
    slug: 'spades', type: 'spades', name: 'Spades',
    title: 'Spades Card Game Rules — How to Play Spades',
    metaDescription: "Learn how to play Spades, the partnership trick-taking game. Full rules for bidding, trump, bags, and scoring to 500.",
    intro: 'Spades is a partnership trick-taking game where spades are always trump. Partners bid how many tricks they will take, then try to make it exactly.',
    sections: [
      { heading: 'Setup', body: 'Four players partner up across the table. Deal all 52 cards — 13 each.' },
      { heading: 'Bidding', body: 'Each player bids the number of tricks their team will take. Partners\' bids add together to form the team contract.' },
      { heading: 'How to Play', body: 'Players must follow suit if able; otherwise they may play any card, including a spade. Spades cannot be led until they are broken (played). The highest spade wins the trick.' },
      { heading: 'Scoring', body: 'Making the bid scores 10 points per trick bid plus 1 per overtrick ("bag"). Missing the bid ("set") loses 10 per trick bid. Ten bags is a 100-point penalty. First to 500 wins.' },
    ],
    faq: [
      { q: 'When can you lead spades?', a: 'Only after a spade has been played on another suit (breaking spades), unless you hold nothing but spades.' },
      { q: 'What does "getting set" mean in Spades?', a: 'Failing to make your team\'s bid — you lose 10 points per trick bid instead of gaining.' },
      { q: 'How many points to win Spades?', a: 'The first partnership to reach 500 points wins.' },
    ],
    related: ['hearts', 'bridge', 'euchre', 'whist'],
    difficulty: 3, timeMinutes: '1–2 hrs', playerCount: '4', status: 'live',
  },

  bridge: {
    slug: 'bridge', type: 'bridge', name: 'Bridge',
    title: 'Bridge Card Game Rules — How to Play Contract Bridge',
    metaDescription: "Learn how to play Contract Bridge: bidding, the dummy hand, trick play, and rubber scoring. The complete guide.",
    intro: 'Contract Bridge is the deepest of the trick-taking games, played by two partnerships through an auction that sets the trump suit and target number of tricks.',
    sections: [
      { heading: 'Setup', body: 'Four players in two partnerships, 13 cards each. The auction determines the contract: a number 1–7 and a trump suit or no-trump.' },
      { heading: 'Bidding', body: 'Players bid in turn, each bid outranking the last (clubs, diamonds, hearts, spades, no-trump). The final bid is the contract the declaring side must fulfill.' },
      { heading: 'Dummy Play', body: 'The player to the left of the declarer leads. The declarer\'s partner lays their hand face-up as the "dummy" and the declarer plays both hands.' },
      { heading: 'Scoring', body: 'Making the contract scores below the line; overtricks and defensive tricks score above it. Rubber scoring: first to two games wins the rubber, with bonuses for slams.' },
    ],
    faq: [
      { q: 'What is the dummy in Bridge?', a: 'The declarer\'s partner, whose hand is laid face-up and played by the declarer after the opening lead.' },
      { q: 'What is a slam in Bridge?', a: 'A contract of 6 (small slam, 12 tricks) or 7 (grand slam, all 13 tricks), with large bonus points.' },
      { q: 'How is Bridge different from Whist?', a: 'Bridge adds an auction (bidding) that sets the contract and trump; Whist has no bidding.' },
    ],
    related: ['spades', 'whist', 'euchre', 'hearts'],
    difficulty: 5, timeMinutes: '2–3 hrs', playerCount: '4', status: 'live',
  },

  euchre: {
    slug: 'euchre', type: 'euchre', name: 'Euchre',
    title: 'Euchre Card Game Rules — How to Play Euchre',
    metaDescription: "Learn how to play Euchre, the fast 24-card partnership trick game. Rules for the right and left bower, trump, and going alone.",
    intro: 'Euchre is a quick partnership trick game played with a 24-card deck. Its famous twist is the bowers — the two jacks that outrank everything.',
    sections: [
      { heading: 'Setup', body: 'Use only the 9, 10, J, Q, K, and A of each suit (24 cards). Deal 5 cards each to four players; one card is turned up to offer trump.' },
      { heading: 'Trump and Bowers', body: 'The jack of trump is the "right bower" (highest card), and the other jack of the same color is the "left bower" (second highest). Then A, K, Q, 10, 9.' },
      { heading: 'How to Play', body: 'The team that names trump must take at least 3 of the 5 tricks. Follow suit if able; trump beats everything except a higher trump.' },
      { heading: 'Scoring', body: 'Making 3–4 tricks scores 1 point; all 5 tricks is a "march" for 2 points; failing is "euchred" and the opponents score 2. First to 10 wins. Going alone and winning all 5 scores 4.' },
    ],
    faq: [
      { q: 'What is the right bower in Euchre?', a: 'The jack of the trump suit — the single highest card in the game.' },
      { q: 'What is the left bower?', a: 'The other jack of the same color as trump, which counts as trump for that hand and is the second-highest card.' },
      { q: 'How many cards are used in Euchre?', a: '24 — the 9 through Ace of each suit.' },
    ],
    related: ['spades', 'hearts', 'whist', 'pinochle'],
    difficulty: 3, timeMinutes: '30–60 min', playerCount: '4', status: 'live',
  },

  whist: {
    slug: 'whist', type: 'whist', name: 'Whist',
    title: 'Whist Card Game Rules — How to Play Whist',
    metaDescription: "Learn how to play Whist, the classic plain-trick game and ancestor of Bridge. Full rules and scoring.",
    intro: 'Whist is the classic trick-taking game with no bidding. Two partnerships race to win tricks, with the last card dealt setting trump.',
    sections: [
      { heading: 'Setup', body: 'Deal all 52 cards to four players in partnerships. The last card, shown to all, sets the trump suit for the hand.' },
      { heading: 'How to Play', body: 'The player left of the dealer leads. Follow suit if able; the highest card of the led suit or highest trump wins the trick. The trick winner leads next.' },
      { heading: 'Scoring', body: 'A partnership scores 1 point for every trick above six (the "book"). First to 5 points (or 7 in some rules) wins the game.' },
    ],
    faq: [
      { q: 'How is trump decided in Whist?', a: 'The last card dealt is turned face-up and its suit becomes trump for that hand.' },
      { q: 'Is Whist the same as Bridge?', a: 'Bridge evolved from Whist, adding an auction and dummy play. Whist is simpler with no bidding.' },
    ],
    related: ['bridge', 'spades', 'hearts', 'euchre'],
    difficulty: 2, timeMinutes: '45–90 min', playerCount: '4', status: 'live',
  },

  oh_hell: {
    slug: 'oh_hell', type: 'oh_hell', name: 'Oh Hell',
    title: 'Oh Hell Card Game Rules — How to Play Oh Hell',
    metaDescription: "Learn how to play Oh Hell, the exact-bid trick game. Full rules for bidding, trick play, and scoring.",
    intro: 'Oh Hell (also called Up and Down the River) is a trick game where you must win exactly the number of tricks you bid — no more, no less.',
    sections: [
      { heading: 'Setup', body: 'Hands shrink and grow each round. Deal each player a number of cards starting from 1 and climbing to the max, then back down. One card is turned up to set trump each round.' },
      { heading: 'Bidding', body: 'Each player bids the exact number of tricks they will take. The dealer\'s bid is constrained so the total does not equal the number of cards dealt.' },
      { heading: 'How to Play', body: 'Follow suit if able; highest trump or led-suit card wins. Standard trick play.' },
      { heading: 'Scoring', body: 'Make your bid exactly: 10 points plus 1 per trick. Miss by any amount: 0 points. Highest total after all rounds wins.' },
    ],
    faq: [
      { q: 'Why is the dealer\'s bid restricted in Oh Hell?', a: 'So the total of all bids can never exactly match the number of tricks, guaranteeing at least one player misses their bid.' },
      { q: 'How many rounds are in Oh Hell?', a: 'Varies by player count — typically hands go 1 up to the maximum (52 ÷ players) and back down to 1.' },
    ],
    related: ['spades', 'hearts', 'whist'],
    difficulty: 3, timeMinutes: '30–60 min', playerCount: '3–7', status: 'live',
  },

  // ── Meld (planned) ────────────────────────────────────────────────────────
  gin_rummy: {
    slug: 'gin_rummy', type: 'gin_rummy', name: 'Gin Rummy',
    title: 'Gin Rummy Rules — How to Play Gin Rummy',
    metaDescription: "Learn how to play Gin Rummy, the two-player melding game. Full rules for knocking, going gin, and undercutting.",
    intro: 'Gin Rummy is a two-player Rummy variant where you knock when your deadwood is low. The goal is to meld all your cards or go out with minimal deadwood.',
    sections: [
      { heading: 'Setup', body: 'Deal 10 cards each. Turn one card up to start the discard pile; the rest is the stock.' },
      { heading: 'How to Play', body: 'Draw from stock or discard, then discard one card. Form sets and runs. You may knock when your deadwood (unmelded cards) totals 10 or fewer.' },
      { heading: 'Gin', body: 'If you meld all 10 cards with no deadwood, you "go gin" for a 25-point bonus. The opponent cannot undercut a gin.' },
      { heading: 'Scoring', body: 'After a knock, both reveal. If the knocker\'s deadwood is lower, they score the difference; if the opponent\'s is lower or equal, the opponent "undercuts" for 25 plus the difference. First to 100 wins.' },
    ],
    faq: [
      { q: 'What does knocking mean in Gin Rummy?', a: 'Ending the hand by revealing your cards when your unmelded deadwood is 10 points or fewer.' },
      { q: 'What is an undercut?', a: 'When the non-knocker has equal or lower deadwood, they steal the hand and score a 25-point bonus.' },
      { q: 'How is Gin different from Rummy?', a: 'Gin is two-player, you cannot lay off onto opponent melds, and you can win by knocking with low deadwood rather than going fully out.' },
    ],
    related: ['rummy', 'rummy_500', 'canasta'],
    difficulty: 2, timeMinutes: '15–30 min', playerCount: '2', status: 'live',
  },

  rummy_500: {
    slug: 'rummy_500', type: 'rummy_500', name: 'Rummy 500',
    title: 'Rummy 500 Rules — How to Play Rummy 500',
    metaDescription: "Learn how to play Rummy 500, the point-scoring Rummy variant. Full rules for drawing from the discard pile and scoring to 500.",
    intro: 'Rummy 500 (500 Rum) is a Rummy variant scored to 500 points, where you can draw from the discard pile and lay off onto any meld on the table.',
    sections: [
      { heading: 'Setup', body: 'Deal 7 cards each (13 with two players). Turn one card up for the discard pile; the rest is the stock.' },
      { heading: 'How to Play', body: 'Draw the top stock card or any discard (taking all cards above it). Meld sets and runs, lay off onto opponents\' melds, then discard. Aces can be high or low.' },
      { heading: 'Scoring', body: 'Aces 15, face cards 10, 2–10 face value. Melded cards score positive, deadwood negative. Going out scores a bonus. First to 500 wins.' },
    ],
    faq: [
      { q: 'Can you draw from the discard pile in Rummy 500?', a: 'Yes — and you must take every card on top of the one you draw, which can give you many cards at once.' },
      { q: 'How many points to win Rummy 500?', a: 'The first player to 500 points wins the game.' },
    ],
    related: ['rummy', 'gin_rummy', 'canasta'],
    difficulty: 2, timeMinutes: '30–60 min', playerCount: '2–8', status: 'live',
  },

  canasta: {
    slug: 'canasta', type: 'canasta', name: 'Canasta',
    title: 'Canasta Card Game Rules — How to Play Canasta',
    metaDescription: "Learn how to play Canasta, the partnership melding game with two decks. Rules for canastas, the discard pile, and scoring to 5000.",
    intro: 'Canasta is a partnership melding game played with two decks and the jokers. Teams race to complete "canastas" — seven cards of the same rank.',
    sections: [
      { heading: 'Setup', body: 'Two 52-card decks plus jokers, four players in two partnerships, 11 cards each. Wild cards are the jokers and the twos.' },
      { heading: 'How to Play', body: 'Draw two cards, meld sets of three or more of a rank (7+ with wilds is a "canasta"), and discard. You may pick up the discard pile if you can immediately meld its top card.' },
      { heading: 'Freezing', body: 'A discard pile with a wild or a 3 on top is "frozen" — it can only be taken with a natural pair in hand, which protects it.' },
      { heading: 'Scoring', body: 'Natural canasta 500, mixed 300, red 3s 100 each. First team to 5000 wins. Going out requires at least one canasta.' },
    ],
    faq: [
      { q: 'How many decks are used in Canasta?', a: 'Two standard 52-card decks plus four jokers.' },
      { q: 'What is a canasta?', a: 'A meld of seven cards of the same rank. A natural canasta (no wilds) is worth 500 points.' },
      { q: 'What does freezing the pile mean?', a: 'Discarding a wild card or a red 3 freezes the pile so opponents can only take it with a natural pair of the top rank.' },
    ],
    related: ['rummy', 'rummy_500', 'gin_rummy'],
    difficulty: 4, timeMinutes: '1–2 hrs', playerCount: '2–6', status: 'live',
  },

  // ── Betting (planned) ─────────────────────────────────────────────────────
  texas_holdem: {
    slug: 'texas_holdem', type: 'texas_holdem', name: "Texas Hold'em",
    title: "Texas Hold'em Rules — How to Play Texas Hold'em Poker",
    metaDescription: "Learn how to play Texas Hold'em: hand rankings, the flop, turn and river, betting rounds, and how to win the pot.",
    intro: "Texas Hold'em is the world's most popular poker game. Each player gets two private cards and shares five community cards to make the best five-card hand.",
    sections: [
      { heading: 'Setup', body: 'Each player receives two hole cards face-down. A dealer button rotates to set the betting order.' },
      { heading: 'Betting Rounds', body: 'Four rounds: pre-flop, after the flop (three community cards), after the turn (fourth card), and after the river (fifth card). Players check, bet, call, raise, or fold.' },
      { heading: 'Showdown', body: 'The best five-card hand from the seven available wins the pot. Two pairs, straights, flushes, and full houses are the common winners.' },
      { heading: 'Blinds', body: 'Two forced bets (small and big blind) start the action so there is always something to play for.' },
    ],
    faq: [
      { q: 'What beats a flush in Texas Hold\'em?', a: 'A full house, four of a kind, straight flush, and royal flush all beat a flush.' },
      { q: 'How many cards do you use in Hold\'em?', a: 'You combine your two hole cards with the five community cards, using any five of the seven.' },
      { q: 'What are the blinds?', a: 'Forced bets posted by the two players left of the dealer button to seed the pot.' },
    ],
    related: ['five_card_draw', 'blackjack', 'baccarat'],
    difficulty: 4, timeMinutes: '30–90 min', playerCount: '2–10', status: 'live',
  },

  five_card_draw: {
    slug: 'five_card_draw', type: 'five_card_draw', name: 'Five-Card Draw',
    title: 'Five-Card Draw Rules — How to Play Five-Card Draw Poker',
    metaDescription: "Learn how to play Five-Card Draw, the original poker game. Full rules for drawing, betting, and hand rankings.",
    intro: 'Five-Card Draw is the classic poker game everyone learns first: five cards, one draw, and the best hand wins.',
    sections: [
      { heading: 'Setup', body: 'Each player is dealt five cards face-down. Antes or blinds seed the pot.' },
      { heading: 'How to Play', body: 'A betting round, then each remaining player discards and draws up to five new cards. A final betting round follows.' },
      { heading: 'Showdown', body: 'The best five-card poker hand wins. Since players can draw to straights and flushes, drawing games reward hand-reading.' },
      { heading: 'Strategy', body: 'Keep pairs and draw to improve them; draw one to four-card flushes and straights. Position matters — acting last lets you size up opponents.' },
    ],
    faq: [
      { q: 'How many cards can you draw in Five-Card Draw?', a: 'Up to five — you may discard your entire hand and draw a new one.' },
      { q: 'Is Five-Card Draw the same as video poker?', a: 'Video poker is based on Five-Card Draw, but you play against a pay table rather than other players.' },
    ],
    related: ['texas_holdem', 'blackjack', 'baccarat'],
    difficulty: 2, timeMinutes: '20–40 min', playerCount: '2–6', status: 'live',
  },

  baccarat: {
    slug: 'baccarat', type: 'baccarat', name: 'Baccarat',
    title: 'Baccarat Rules — How to Play Baccarat',
    metaDescription: "Learn how to play Baccarat: betting on player or banker, the third-card rules, and payouts. Full guide.",
    intro: 'Baccarat is a simple betting game where you wager on the player hand, the banker hand, or a tie. The hand closest to 9 wins.',
    sections: [
      { heading: 'Setup', body: 'Two hands are dealt — "player" and "banker" — each of two cards. You bet on which will be closer to 9, or on a tie.' },
      { heading: 'Card Values', body: 'Aces are 1, 2–9 face value, and 10s plus face cards are 0. Only the last digit of the total counts (a 7 and 6 make 3, not 13).' },
      { heading: 'Third-Card Rules', body: 'The player draws a third card on totals of 0–5 and stands on 6–7. The banker\'s draw depends on its total and the player\'s third card, per a fixed table.' },
      { heading: 'Payouts', body: 'Banker wins pay 1:1 minus a 5% commission, player wins pay 1:1, and ties pay 8:1 or 9:1.' },
    ],
    faq: [
      { q: 'What is the best bet in Baccarat?', a: 'Statistically the banker bet, which has the lowest house edge at just over 1% after commission.' },
      { q: 'Do you make decisions in Baccarat?', a: 'Only the initial bet — all drawing is automatic by fixed rules, making it purely a game of chance.' },
    ],
    related: ['blackjack', 'texas_holdem', 'five_card_draw'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '2–14', status: 'live',
  },

  // ── Collecting / shedding (planned) ───────────────────────────────────────
  old_maid: {
    slug: 'old_maid', type: 'old_maid', name: 'Old Maid',
    title: 'Old Maid Card Game Rules — How to Play Old Maid',
    metaDescription: "Learn how to play Old Maid, the classic pairing game. Full rules and how to avoid being left holding the queen.",
    intro: 'Old Maid is a light pairing game where players draw cards from each other to make pairs. The loser is the player stuck holding the unmatched queen.',
    sections: [
      { heading: 'Setup', body: 'Remove one queen from the deck, leaving 51 cards. Deal all cards out face-down.' },
      { heading: 'How to Play', body: 'Each player discards any pairs they already hold. Then, in turn, players draw one card from the next player\'s fanned hand and discard any new pair. The play continues until all pairs are made.' },
      { heading: 'Winning', body: 'The player left holding the single unmatched queen — the "Old Maid" — loses. Everyone else wins.' },
    ],
    faq: [
      { q: 'Why remove a queen in Old Maid?', a: 'So one queen has no pair. Whoever is left holding it at the end loses.' },
      { q: 'How many players can play Old Maid?', a: 'Two to eight players, though it works best with three or more.' },
    ],
    related: ['go_fish', 'concentration', 'slapjack'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '2–8', status: 'live',
  },

  slapjack: {
    slug: 'slapjack', type: 'slapjack', name: 'Slapjack',
    title: 'Slapjack Card Game Rules — How to Play Slapjack',
    metaDescription: "Learn how to play Slapjack, the fast reflex card game. Rules for slapping jacks and winning the pile.",
    intro: 'Slapjack is a reflex game where players flip cards into a center pile and race to slap it when a jack appears. The fastest slap wins the pile.',
    sections: [
      { heading: 'Setup', body: 'Deal the entire deck face-down so each player has an equal stack.' },
      { heading: 'How to Play', body: 'Players take turns flipping their top card face-up onto the center pile. When a jack appears, everyone races to slap it.' },
      { heading: 'Winning', body: 'The first player to slap the jack collects the whole pile. If you slap a non-jack, you pay a penalty card to the pile. A player who runs out of cards is out — unless they slap their way back in. Last player with cards wins.' },
    ],
    faq: [
      { q: 'What happens if you slap a card that is not a jack?', a: 'You must give your top card to the player who played it, as a penalty.' },
      { q: 'Can you win Slapjack back after losing all cards?', a: 'In most rules, yes — you can slap back in by winning a later jack pile.' },
    ],
    related: ['war', 'egyptian_ratscrew', 'speed'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '2–8', status: 'live',
  },

  president: {
    slug: 'president', type: 'president', name: 'President',
    title: 'President Card Game Rules — How to Play President',
    metaDescription: "Learn how to play President (also called Asshole or Scum). Full rules for shedding cards and climbing the ranks.",
    intro: 'President is a shedding game where players empty their hands to climb the social ladder — first out becomes President, last out the Scum.',
    sections: [
      { heading: 'Setup', body: 'Deal all cards evenly. The player with the 3 of clubs (or lowest card) leads the first round.' },
      { heading: 'How to Play', body: 'Play a single card or a set of equal rank. The next player must beat it with a higher card or higher set of the same size, or pass. Twos are high; when everyone passes, the pile clears and the last player leads.' },
      { heading: 'Ranks', body: 'In the next round, the President gives their two worst cards to the Scum and receives the Scum\'s two best. The President leads.' },
      { heading: 'Winning', body: 'The first to empty their hand is President, the last is Scum. There is no single winner across rounds — it is a game of status and bragging rights.' },
    ],
    faq: [
      { q: 'What are other names for President?', a: 'Asshole, Scum, Capitalism, and Kings & Assholes are all the same game with minor rule differences.' },
      { q: 'Do 2s beat everything in President?', a: 'Yes, 2s are the highest single cards, and 3s are the lowest.' },
    ],
    related: ['crazy_eights', 'speed', 'cheat'],
    difficulty: 2, timeMinutes: '15–30 min', playerCount: '3–7', status: 'live',
  },

  // ── Solo (planned) ────────────────────────────────────────────────────────
  klondike: {
    slug: 'klondike', type: 'klondike', name: 'Klondike Solitaire',
    title: 'Klondike Solitaire Rules — How to Play Klondike',
    metaDescription: "Learn how to play Klondike Solitaire, the classic one-player patience game. Rules for the tableau, foundations, and stock.",
    intro: 'Klondike is the solitaire everyone knows. Build four foundation piles from Ace to King while organizing the tableau by alternating color.',
    sections: [
      { heading: 'Setup', body: 'Deal seven tableau columns: one card in the first, two in the second, up to seven — only the top card of each column face-up. The rest is the stock.' },
      { heading: 'How to Play', body: 'Move face-up cards between columns in descending rank and alternating color. Empty columns may be filled with a king. Move aces to the four foundations and build up by suit.' },
      { heading: 'The Stock', body: 'Draw one or three cards at a time from the stock to a waste pile, which you can play from.' },
      { heading: 'Winning', body: 'You win by moving all 52 cards to the four foundations, ace through king in each suit.' },
    ],
    faq: [
      { q: 'What is the difference between draw-one and draw-three Klondike?', a: 'Draw-one reveals one stock card at a time (easier); draw-three reveals three and only the top is playable (harder).' },
      { q: 'Can you put a king on an empty column?', a: 'Yes — empty tableau columns can only be filled by a king (or a sequence starting with a king).' },
    ],
    related: ['freecell', 'spider', 'concentration'],
    difficulty: 2, timeMinutes: '10–20 min', playerCount: '1', status: 'live',
  },

  freecell: {
    slug: 'freecell', type: 'freecell', name: 'FreeCell',
    title: 'FreeCell Rules — How to Play FreeCell Solitaire',
    metaDescription: "Learn how to play FreeCell, the solitaire where every deal is winnable. Rules for free cells, foundations, and tableau moves.",
    intro: 'FreeCell is a solitaire played with four open "free cells" for staging cards. Nearly every deal is winnable with perfect play.',
    sections: [
      { heading: 'Setup', body: 'Deal all 52 cards face-up into eight tableau columns. Four free cells and four foundations start empty.' },
      { heading: 'How to Play', body: 'Build tableau columns down by rank, alternating color. Use the four free cells to temporarily hold cards. Move single cards, or whole sequences if you have enough empty free cells and columns.' },
      { heading: 'Winning', body: 'Move all cards to the four foundations, ace to king by suit.' },
      { heading: 'Strategy', body: 'Keep free cells open whenever possible — empty cells are your most valuable resource for moving sequences.' },
    ],
    faq: [
      { q: 'Is every FreeCell deal winnable?', a: 'Almost — all but one of the original 32,000 Microsoft deals are solvable, and modern solvers confirm nearly all are winnable.' },
      { q: 'How are FreeCell and Klondike different?', a: 'FreeCell deals everything face-up and adds four free cells, making it far more skill-based than Klondike.' },
    ],
    related: ['klondike', 'spider'],
    difficulty: 3, timeMinutes: '10–30 min', playerCount: '1', status: 'live',
  },

  spider: {
    slug: 'spider', type: 'spider', name: 'Spider Solitaire',
    title: 'Spider Solitaire Rules — How to Play Spider Solitaire',
    metaDescription: "Learn how to play Spider Solitaire, the two-deck patience game. Rules for building suit sequences and clearing columns.",
    intro: 'Spider Solitaire uses two decks and ten columns. Build complete king-to-ace sequences in a single suit to clear them from the board.',
    sections: [
      { heading: 'Setup', body: 'Two 52-card decks. Ten tableau columns — the first four with six cards each, the rest with five. Only the top card of each is face-up.' },
      { heading: 'How to Play', body: 'Build down by rank within a suit. Deal a new row of ten cards when stuck. Complete a king-to-ace sequence of one suit and it is removed.' },
      { heading: 'Difficulty Levels', body: 'One suit (easiest), two suits, or four suits (hardest). Four-suit is the classic challenge.' },
      { heading: 'Winning', body: 'Remove all eight suits to win. The goal is to clear every column.' },
    ],
    faq: [
      { q: 'How many decks are in Spider Solitaire?', a: 'Two standard 52-card decks, for 104 cards total.' },
      { q: 'What is the easiest Spider Solitaire?', a: 'One-suit Spider — all cards are the same suit, so any descending sequence works.' },
    ],
    related: ['klondike', 'freecell'],
    difficulty: 4, timeMinutes: '15–45 min', playerCount: '1', status: 'live',
  },

  // ── Unique (planned) ──────────────────────────────────────────────────────
  cribbage: {
    slug: 'cribbage', type: 'cribbage', name: 'Cribbage',
    title: 'Cribbage Rules — How to Play Cribbage',
    metaDescription: "Learn how to play Cribbage: the deal, the crib, pegging to 31, and counting your hand. Full rules and scoring.",
    intro: 'Cribbage is a unique pegging game where players score points for card combinations, racing around a board to 121 points.',
    sections: [
      { heading: 'Setup', body: 'Deal 6 cards each (5 with three players). Each player discards two into the "crib," which belongs to the dealer.' },
      { heading: 'Pegging', body: 'Players alternately play cards, keeping a running total that cannot exceed 31. Score points for reaching 15, 31, pairs, and runs during this phase.' },
      { heading: 'Counting', body: 'After pegging, each player counts their hand (plus the starter card) for 15s, pairs, runs, flushes, and nobs (a jack matching the starter suit). The dealer counts the crib.' },
      { heading: 'Winning', body: 'First to 121 points (twice around the board) wins. Skunks — winning by 30+ — earn double in tournament play.' },
    ],
    faq: [
      { q: 'How many points to win Cribbage?', a: '121 points — two full laps around a standard 60-point cribbage board.' },
      { q: 'What is the crib in Cribbage?', a: 'Four cards discarded by the players that the dealer counts as an extra hand at the end of the round.' },
      { q: 'What is nobs?', a: 'One point for holding the jack of the same suit as the starter card.' },
    ],
    related: ['pinochle', 'rummy', 'whist'],
    difficulty: 4, timeMinutes: '15–30 min', playerCount: '2–4', status: 'live',
  },

  pinochle: {
    slug: 'pinochle', type: 'pinochle', name: 'Pinochle',
    title: 'Pinochle Card Game Rules — How to Play Pinochle',
    metaDescription: "Learn how to play Pinochle, the 48-card melding and trick-taking game. Full rules for melds, trump, and scoring.",
    intro: 'Pinochle combines melding and trick-taking with a 48-card deck. Partners score by forming melds like marriages and the famous pinochle, then win tricks.',
    sections: [
      { heading: 'Setup', body: 'A 48-card deck — two copies of the 9 through Ace in each suit. Deal 12 cards to each of four players.' },
      { heading: 'Melding', body: 'After trump is set, players lay down melds for points: marriages (K-Q of trump), aces around, kings around, and the pinochle (queen of spades + jack of diamonds).' },
      { heading: 'Trick Play', body: 'Follow suit, trump as needed, and win tricks. Each ace, ten, and king captured in tricks scores points.' },
      { heading: 'Scoring', body: 'Melds plus trick points are tallied. First partnership to 150 points wins the game.' },
    ],
    faq: [
      { q: 'What is a pinochle in Pinochle?', a: 'The queen of spades plus the jack of diamonds — worth 40 points.' },
      { q: 'How many cards are in a Pinochle deck?', a: '48 — two copies each of the 9, 10, J, Q, K, and A in all four suits.' },
    ],
    related: ['euchre', 'spades', 'cribbage'],
    difficulty: 4, timeMinutes: '45–90 min', playerCount: '2–4', status: 'live',
  },

  // ── Documented-only extras ────────────────────────────────────────────────
  snap: {
    slug: 'snap', type: 'snap', name: 'Snap',
    title: 'Snap Card Game Rules — How to Play Snap',
    metaDescription: "Learn how to play Snap, the fast matching card game for kids. Rules for snapping and winning the pile.",
    intro: 'Snap is a lightning-fast matching game. Players flip cards and race to shout "Snap!" when two of the same rank appear.',
    sections: [
      { heading: 'Setup', body: 'Deal the whole deck face-down into equal piles for each player.' },
      { heading: 'How to Play', body: 'Players take turns flipping their top card onto a center pile. When two consecutive cards match in rank, the first player to call "Snap!" wins the pile.' },
      { heading: 'Winning', body: 'The player who collects all the cards wins. Calling snap incorrectly costs you a card from your pile.' },
    ],
    faq: [
      { q: 'What matches in Snap?', a: 'Two cards of the same rank played one after another — suits do not matter.' },
      { q: 'Is Snap good for kids?', a: 'Yes — it teaches matching and quick reactions, and needs no reading or counting.' },
    ],
    related: ['slapjack', 'egyptian_ratscrew', 'war'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '2–6', status: 'live',
  },

  concentration: {
    slug: 'concentration', type: 'concentration', name: 'Concentration',
    title: 'Concentration Card Game Rules — How to Play Memory',
    metaDescription: "Learn how to play Concentration (Memory), the classic matching card game. Rules for flipping pairs and winning.",
    intro: 'Concentration, also called Memory, tests recall. Flip two cards at a time and match pairs by rank; remember where cards hide to win.',
    sections: [
      { heading: 'Setup', body: 'Shuffle and lay all cards face-down in a grid.' },
      { heading: 'How to Play', body: 'On your turn flip two cards. If they match in rank, keep them and go again. If not, flip them back and your turn ends.' },
      { heading: 'Winning', body: 'The player with the most matched pairs once all cards are collected wins.' },
    ],
    faq: [
      { q: 'Do suits matter in Concentration?', a: 'No — you match by rank only, though some variants match by color.' },
      { q: 'How many cards should kids start with?', a: 'Start with 20 cards (10 pairs) and add more as memory improves.' },
    ],
    related: ['go_fish', 'old_maid', 'klondike'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '1–6', status: 'live',
  },

  sevens: {
    slug: 'sevens', type: 'sevens', name: 'Sevens',
    title: 'Sevens Card Game Rules — How to Play Sevens',
    metaDescription: "Learn how to play Sevens (Fan Tan), the sequencing card game. Rules for building sequences from the sevens.",
    intro: 'Sevens, also called Fan Tan, is a sequencing game where players build four suits outward from the 7s. Empty your hand first to win.',
    sections: [
      { heading: 'Setup', body: 'Deal the full deck evenly. The player holding the 7 of diamonds starts by playing it to the center.' },
      { heading: 'How to Play', body: 'In turn, play a 7 of any suit, or build on a played suit by laying the next card up or down in sequence (6 below a 7, 8 above). If you cannot play, pass.' },
      { heading: 'Winning', body: 'The first player to play all their cards wins. Strategy comes from holding cards back to force opponents to pass.' },
    ],
    faq: [
      { q: 'Why is it called Sevens?', a: 'Each suit\'s sequence starts from the 7, which is the only card you can play to open a new suit.' },
      { q: 'What happens if everyone passes in Sevens?', a: 'The player who played last plays again, since no one else can move.' },
    ],
    related: ['president', 'crazy_eights', 'kings_in_the_corner'],
    difficulty: 2, timeMinutes: '20–40 min', playerCount: '3–7', status: 'live',
  },

  thirty_one: {
    slug: 'thirty_one', type: 'thirty_one', name: 'Thirty-One',
    title: 'Thirty-One Card Game Rules — How to Play 31',
    metaDescription: "Learn how to play Thirty-One (31), the quick knock-out card game. Rules for drawing, discarding, and knocking.",
    intro: 'Thirty-One is a quick draw-and-discard game where players build a same-suit hand totaling 31 — or as close as possible.',
    sections: [
      { heading: 'Setup', body: 'Deal 3 cards each and 3 to the center as a discard pool, plus a draw pile. Each player starts with 3 lives.' },
      { heading: 'How to Play', body: 'On your turn, swap one card from your hand with one from the discard pool or draw pile. Aces are 11, face cards 10, others face value — all in the same suit count.' },
      { heading: 'Knocking', body: 'When you think you have the highest hand, knock; everyone gets one more turn, then hands are revealed. The lowest hand loses a life.' },
      { heading: 'Winning', body: 'A hand of exactly 31 wins immediately. Otherwise the last player with lives remaining wins the game.' },
    ],
    faq: [
      { q: 'How much is an ace worth in Thirty-One?', a: '11 points, and face cards are worth 10.' },
      { q: 'What does knocking do in 31?', a: 'It ends the round after one final turn each; the lowest-scoring hand loses a life.' },
    ],
    related: ['blackjack', 'chase_the_ace', 'screw_your_neighbor'],
    difficulty: 2, timeMinutes: '20–40 min', playerCount: '2–9', status: 'live',
  },

  cassino: {
    slug: 'cassino', type: 'cassino', name: 'Cassino',
    title: 'Cassino Card Game Rules — How to Play Cassino',
    metaDescription: "Learn how to play Cassino, the fishing card game of captures and builds. Full rules and scoring.",
    intro: 'Cassino is a "fishing" game where players capture cards from the table by matching or summing values, earning points for specific captures.',
    sections: [
      { heading: 'Setup', body: 'Deal 4 cards each and 4 to the table face-up. The rest is the stock.' },
      { heading: 'How to Play', body: 'On your turn play one card to capture table cards matching its value, or summing to it. Alternatively, "build" a pile by combining cards into a value you can capture later.' },
      { heading: 'Scoring', body: 'Points for most cards (3), most spades (1), the 10 of diamonds "big cassino" (2), the 2 of spades "little cassino" (1), and aces (1 each). First to 21 wins.' },
    ],
    faq: [
      { q: 'What is a build in Cassino?', a: 'Combining table cards into a single pile whose total value you intend to capture on a later turn.' },
      { q: 'What is the big cassino?', a: 'The 10 of diamonds, worth 2 points when captured.' },
    ],
    related: ['rummy', 'go_fish', 'sevens'],
    difficulty: 3, timeMinutes: '30–45 min', playerCount: '2–4', status: 'live',
  },

  kings_in_the_corner: {
    slug: 'kings_in_the_corner', type: 'kings_in_the_corner', name: 'Kings in the Corner',
    title: 'Kings in the Corner Rules — How to Play Kings in the Corner',
    metaDescription: "Learn how to play Kings in the Corner, the solitaire-like multiplayer game. Rules for laying down descending, alternating-color piles.",
    intro: 'Kings in the Corner is a solitaire-style game for multiple players, where you build descending, alternating-color piles radiating from a central draw.',
    sections: [
      { heading: 'Setup', body: 'Each player gets 7 cards; the rest is a draw pile with the top card flipped to start a discard.' },
      { heading: 'How to Play', body: 'Play cards onto the four corner piles in descending order, alternating red and black. Kings start new corner piles. You may also play onto opponents\' piles. Draw if you cannot play.' },
      { heading: 'Winning', body: 'The first player to empty their hand wins.' },
    ],
    faq: [
      { q: 'Why are kings special in Kings in the Corner?', a: 'A king is the only card that can start a new corner pile, since nothing ranks above it.' },
      { q: 'Can you play on other players\' piles?', a: 'Yes — the game is a race, and playing on any legal pile (including opponents\') is allowed.' },
    ],
    related: ['sevens', 'klondike', 'crazy_eights'],
    difficulty: 2, timeMinutes: '20–30 min', playerCount: '2–6', status: 'live',
  },

  speed: {
    slug: 'speed', type: 'speed', name: 'Speed',
    title: 'Speed Card Game Rules — How to Play Speed',
    metaDescription: "Learn how to play Speed, the two-player fast-reaction card game. Rules for racing to empty your hand.",
    intro: 'Speed is a head-to-head reaction game with no turns — both players play cards onto shared piles as fast as they can.',
    sections: [
      { heading: 'Setup', body: 'Each player has a stack of 20 cards and a hand of 5. Two center cards start the play piles.' },
      { heading: 'How to Play', body: 'Play a card one higher or one lower than the top center card onto either pile, refilling your hand from your stack. There are no turns — whoever is fastest plays.' },
      { heading: 'Winning', body: 'The first player to empty both their hand and stack wins.' },
    ],
    faq: [
      { q: 'Can you play Speed with more than two players?', a: 'It is designed for two. "Spit" is the three-player variant.' },
      { q: 'What cards can you play in Speed?', a: 'Any card one rank higher or one rank lower than the current top card.' },
    ],
    related: ['slapjack', 'egyptian_ratscrew', 'president'],
    difficulty: 1, timeMinutes: '5–15 min', playerCount: '2', status: 'live',
  },

  spite_and_malice: {
    slug: 'spite_and_malice', type: 'spite_and_malice', name: 'Spite and Malice',
    title: 'Spite and Malice Card Game Rules — How to Play',
    metaDescription: "Learn how to play Spite and Malice (Cat and Mouse), the competitive solitaire game. Full rules.",
    intro: 'Spite and Malice, also called Cat and Mouse, is competitive solitaire where two players race to empty their payoff pile by building shared center piles.',
    sections: [
      { heading: 'Setup', body: 'Each player gets a 20-card payoff pile (top card up), a hand of 5, and four side piles.' },
      { heading: 'How to Play', body: 'Play cards onto shared center piles, building up from ace to queen, while trying to empty your payoff pile. Use your hand and side piles to keep the center moving, and block your opponent when you can.' },
      { heading: 'Winning', body: 'The first player to play out their entire payoff pile wins.' },
    ],
    faq: [
      { q: 'Why is it called Spite and Malice?', a: 'The core tactic is deliberately blocking your opponent\'s progress — the "spite" is the fun.' },
      { q: 'Is Spite and Malice like Skip-Bo?', a: 'Yes — Skip-Bo is a commercial version of Spite and Malice.' },
    ],
    related: ['kings_in_the_corner', 'klondike', 'speed'],
    difficulty: 2, timeMinutes: '30–60 min', playerCount: '2', status: 'live',
  },

  beggar_my_neighbor: {
    slug: 'beggar_my_neighbor', type: 'beggar_my_neighbor', name: 'Beggar-My-Neighbor',
    title: 'Beggar-My-Neighbor Card Game Rules — How to Play',
    metaDescription: "Learn how to play Beggar-My-Neighbor, the pure-luck two-player card game. Full rules.",
    intro: 'Beggar-My-Neighbor is a two-player game of pure chance, where playing face cards forces your opponent to pay up from their pile.',
    sections: [
      { heading: 'Setup', body: 'Deal the deck evenly, face-down. Players do not look at their cards.' },
      { heading: 'How to Play', body: 'Players alternate flipping cards onto a center pile. When a face card appears, the opponent must flip a number of cards — 4 for an ace, 3 for a king, 2 for a queen, 1 for a jack. If they reveal a face card, the debt reverses. Otherwise the face-card player wins the pile.' },
      { heading: 'Winning', body: 'The player who collects all the cards wins. There is no strategy — only luck.' },
    ],
    faq: [
      { q: 'How many cards does a jack force in Beggar-My-Neighbor?', a: 'One — a jack forces one card, queen two, king three, and ace four.' },
      { q: 'Is there any strategy in Beggar-My-Neighbor?', a: 'No — the outcome is entirely random.' },
    ],
    related: ['war', 'slapjack', 'egyptian_ratscrew'],
    difficulty: 1, timeMinutes: '10–30 min', playerCount: '2', status: 'live',
  },

  i_doubt_it: {
    slug: 'i_doubt_it', type: 'i_doubt_it', name: 'I Doubt It',
    title: 'I Doubt It Card Game Rules — How to Play I Doubt It',
    metaDescription: "Learn how to play I Doubt It (Cheat / Bluff), the bluffing card game. Full rules for lying and calling bluffs.",
    intro: 'I Doubt It — also called Cheat or Bullshit — is a bluffing game where players discard cards face-down while declaring a rank, lying when it suits them.',
    sections: [
      { heading: 'Setup', body: 'Deal all cards evenly. The player left of the dealer starts by playing any number of aces face-down, declaring "one ace, two aces," and so on.' },
      { heading: 'How to Play', body: 'Ranks go up in sequence (aces, twos, threes...). You may play cards of the declared rank or lie and play anything. Any player may call "I doubt it!" — the cards are flipped, and the liar takes the whole pile.' },
      { heading: 'Winning', body: 'The first player to get rid of all their cards wins.' },
    ],
    faq: [
      { q: 'What are other names for I Doubt It?', a: 'Cheat, Bullshit, and Bluff are the same game.' },
      { q: 'What happens if you call "I doubt it" and they were telling the truth?', a: 'You take the entire discard pile as a penalty.' },
    ],
    related: ['cheat', 'president', 'chase_the_ace'],
    difficulty: 2, timeMinutes: '20–40 min', playerCount: '3–6', status: 'live',
  },

  cheat: {
    slug: 'cheat', type: 'cheat', name: 'Cheat',
    title: 'Cheat Card Game Rules — How to Play Cheat',
    metaDescription: "Learn how to play Cheat (I Doubt It / Bullshit), the bluffing card game. Full rules for lying and calling bluffs.",
    intro: 'Cheat is the classic bluffing game — play cards face-down and declare a rank, lying when you can get away with it. Get caught and you take the pile.',
    sections: [
      { heading: 'Setup', body: 'Deal all cards evenly. Players play cards face-down in rank order, declaring what they are.' },
      { heading: 'How to Play', body: 'You may play any cards regardless of what you declare. Another player can challenge by saying "Cheat!" If you lied, you take the pile; if you told the truth, the challenger takes it.' },
      { heading: 'Winning', body: 'The first player to empty their hand wins.' },
    ],
    faq: [
      { q: 'Is Cheat the same as I Doubt It?', a: 'Yes — Cheat, I Doubt It, and Bullshit are all the same bluffing game.' },
      { q: 'How many cards can you play at once in Cheat?', a: 'As many as you declare — typically one to four of the same rank.' },
    ],
    related: ['i_doubt_it', 'president', 'chase_the_ace'],
    difficulty: 2, timeMinutes: '20–30 min', playerCount: '3–6', status: 'live',
  },

  chase_the_ace: {
    slug: 'chase_the_ace', type: 'chase_the_ace', name: 'Chase the Ace',
    title: 'Chase the Ace Card Game Rules — How to Play Chase the Ace',
    metaDescription: "Learn how to play Chase the Ace, the quick pass-and-swap elimination game. Full rules.",
    intro: 'Chase the Ace is a fast elimination game where players swap cards with their neighbors to avoid being stuck holding the lowest card.',
    sections: [
      { heading: 'Setup', body: 'Each player gets 3 tokens and one card face-down.' },
      { heading: 'How to Play', body: 'Players may swap their card with the neighbor on their left, trying to dump low cards. The player left of the dealer decides last and may draw from the deck instead of swapping.' },
      { heading: 'Losing', body: 'The player with the lowest card loses a token. When you are out of tokens, you are eliminated. The last player standing wins.' },
    ],
    faq: [
      { q: 'What card should you avoid in Chase the Ace?', a: 'The ace — it is the lowest card, and holding it at reveal means you lose a token.' },
      { q: 'Can you draw instead of swapping in Chase the Ace?', a: 'Only the player immediately left of the dealer may draw from the deck as their final option.' },
    ],
    related: ['screw_your_neighbor', 'thirty_one', 'i_doubt_it'],
    difficulty: 1, timeMinutes: '10–20 min', playerCount: '3–8', status: 'live',
  },

  screw_your_neighbor: {
    slug: 'screw_your_neighbor', type: 'screw_your_neighbor', name: 'Screw Your Neighbor',
    title: 'Screw Your Neighbor Card Game Rules — How to Play',
    metaDescription: "Learn how to play Screw Your Neighbor, the quick pass-and-swap card game. Full rules and scoring.",
    intro: 'Screw Your Neighbor is a fast game of swapping cards to avoid holding the lowest value. Each round eliminates the player with the low card.',
    sections: [
      { heading: 'Setup', body: 'Each player has 3 tokens and one card face-down.' },
      { heading: 'How to Play', body: 'If your card is not a king, you may swap it with the neighbor on your left. Kings are safe and revealed. The player left of the dealer may instead draw from the deck.' },
      { heading: 'Losing', body: 'The lowest card loses a token. Out of tokens means out of the game. Last player standing wins.' },
    ],
    faq: [
      { q: 'Why are kings special in Screw Your Neighbor?', a: 'A king is the highest card, so players holding a king reveal it and are safe from swapping.' },
      { q: 'How many tokens does each player start with?', a: 'Three — you are eliminated after losing three rounds.' },
    ],
    related: ['chase_the_ace', 'thirty_one', 'president'],
    difficulty: 1, timeMinutes: '15–30 min', playerCount: '3–8', status: 'live',
  },

  egyptian_ratscrew: {
    slug: 'egyptian_ratscrew', type: 'egyptian_ratscrew', name: 'Egyptian Ratscrew',
    title: 'Egyptian Ratscrew Card Game Rules — How to Play',
    metaDescription: "Learn how to play Egyptian Ratscrew, the fast slapping card game. Rules for face cards, sandwiches, and slapping.",
    intro: 'Egyptian Ratscrew (ERS) is a lightning-fast slapping game combining Slapjack with face-card challenges. The fastest slaps win piles.',
    sections: [
      { heading: 'Setup', body: 'Deal the whole deck face-down, evenly among players.' },
      { heading: 'How to Play', body: 'Players flip cards into the center in turn. Slap on doubles (two of a kind) or "sandwiches" (a pair with one card between). When a face card is played, the next player must pay cards — 4 for an ace, 3 for a king, 2 for a queen, 1 for a jack — or the pile goes to the face-card player.' },
      { heading: 'Winning', body: 'The player who collects all 52 cards wins. Slap incorrectly and pay a card to the pile.' },
    ],
    faq: [
      { q: 'What is a sandwich in Egyptian Ratscrew?', a: 'Two cards of the same rank with exactly one card between them — a valid slap target.' },
      { q: 'How is ERS different from Slapjack?', a: 'ERS adds face-card pay rules, doubles, and sandwiches on top of the basic slap-on-jack mechanic.' },
    ],
    related: ['slapjack', 'war', 'beggar_my_neighbor'],
    difficulty: 2, timeMinutes: '10–20 min', playerCount: '2–6', status: 'live',
  },

  pitch: {
    slug: 'pitch', type: 'pitch', name: 'Pitch',
    title: 'Pitch Card Game Rules — How to Play Pitch',
    metaDescription: "Learn how to play Pitch (Setback), the bidding and trick-taking game. Full rules for bidding and scoring.",
    intro: 'Pitch, also called Setback, is a trick-taking game where players bid for the right to set trump and try to capture the game points.',
    sections: [
      { heading: 'Setup', body: 'Deal 6 cards each. Players bid on how many of the four "game points" they will capture.' },
      { heading: 'Game Points', body: 'The four points are: High (highest trump played), Low (lowest trump played), Jack (of trump), and Game (the sum of card values captured in tricks).' },
      { heading: 'How to Play', body: 'The highest bidder names trump and leads. Follow suit if able, trump to win. The bidder must make their bid or be set back by that amount.' },
      { heading: 'Winning', body: 'Points are scored each hand. First to 7, 11, or 21 points (by agreement) wins the game.' },
    ],
    faq: [
      { q: 'What are the four points in Pitch?', a: 'High, Low, Jack, and Game — the highest trump, lowest trump, jack of trump, and the most card-value in tricks.' },
      { q: 'Why is Pitch also called Setback?', a: 'Failing your bid "sets you back" by the bid amount — hence the alternate name.' },
    ],
    related: ['spades', 'euchre', 'oh_hell'],
    difficulty: 3, timeMinutes: '30–60 min', playerCount: '2–7', status: 'live',
  },
};

export function glossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY[slug];
}

export const GLOSSARY_LIST = Object.values(GLOSSARY);
