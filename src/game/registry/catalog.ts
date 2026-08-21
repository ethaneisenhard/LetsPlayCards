import type { GameType, GameTypeConfig } from '../gameTypes';
import type { CatalogEntry } from './types';

export const GAME_CATALOG: CatalogEntry[] = [
  // ── Live (implemented) ─────────────────────────────────────────────────────
  {
    type: 'war',
    family: 'compare',
    deck: {},
    status: 'live',
    config: {
      id: 'war', name: 'War', tagline: 'Battle card by card', emoji: '⚔️',
      description: 'Both flip a card at the same time — the higher one wins both. A tie is WAR.',
      minPlayers: 2, maxPlayers: 2, dealCount: 'all', color: 'from-red-900/60 to-orange-900/60',
      handReveal: 'stock',
      rules: ['Split all 52 cards — 26 each, face-down', 'Both players flip their top card', 'Higher card wins both cards', 'On a tie: WAR — 3 face-down + 1 face-up', 'Collect all 52 cards to win'],
    },
  },
  {
    type: 'go_fish',
    family: 'collecting',
    deck: {},
    status: 'live',
    config: {
      id: 'go_fish', name: 'Go Fish', tagline: 'Ask for cards you already have', emoji: '🐟',
      description: 'Pick a number or face you already have (2, 7, Queen) and ask Anyone or a named player. They give every match, or you take one from the pile (Go Fish). Four of a kind is a set — one point. Most sets wins.',
      minPlayers: 2, maxPlayers: 6, dealCount: 7, color: 'from-blue-900/60 to-cyan-900/60',
      rules: [
        'Start with 7 cards (5 if 4 or more players)',
        'Pick a number or face you already have (2, 7, Queen), then Anyone or a named player',
        'Tap Ask — they give every matching card and you ask again',
        'If they have none: Go Fish — take one from the pile, your turn ends',
        'Four cards with the same number or face is a set of four (one point)',
        'Most sets wins when the pile is gone and no one is holding cards',
      ],
    },
  },
  {
    type: 'freeplay',
    family: 'shedding',
    deck: {},
    status: 'live',
    config: {
      id: 'freeplay', name: 'Free Play', tagline: 'Any game, your rules', emoji: '🃏',
      description: 'A shared card table with no rules enforced. Take a card, play one, or put one aside however you want.',
      minPlayers: 1, maxPlayers: 8, dealCount: 7, color: 'from-emerald-900/60 to-teal-900/60',
      rules: ['No engine rules — agree your own', 'Starts with 7 cards; take more whenever you want', 'Play a card, pick one up, or put one aside', 'Works for house-rule Rummy, Poker, and more'],
    },
  },
  {
    type: 'hearts',
    family: 'trick',
    deck: {},
    status: 'live',
    config: {
      id: 'hearts', name: 'Hearts', tagline: 'Avoid hearts and the queen', emoji: '♥️',
      description: 'Each round everyone plays one card. You do NOT want hearts or the queen of spades — those add points, and lowest score wins.',
      minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-red-900/60 to-rose-900/60',
      rules: ['Play a card — same shape (♥♦♣♠) if you have one', 'Each heart is 1 point, queen of spades is 13', 'Lowest score wins', 'Take every heart and the queen of spades to give those points to everyone else'],
    },
  },
  {
    type: 'crazy_eights',
    family: 'shedding',
    deck: {},
    status: 'live',
    config: {
      id: 'crazy_eights', name: 'Crazy Eights', tagline: 'Match shape or number', emoji: '8️⃣',
      description: 'Get rid of your cards by matching the leftover pile. Eights are wild — pick a new shape (hearts, diamonds, clubs, or spades).',
      minPlayers: 2, maxPlayers: 7, dealCount: 7, color: 'from-violet-900/60 to-purple-900/60',
      rules: ['Start with 7 cards', 'Play a card matching the leftover pile’s shape (♥♦♣♠) or number', '8s are wild — pick a new shape (♥♦♣♠)', 'Can’t play? Take cards until you can', 'First to play every card they are holding wins'],
    },
  },
  {
    type: 'rummy',
    family: 'meld',
    deck: {},
    status: 'live',
    config: {
      id: 'rummy', name: 'Rummy', tagline: 'Group cards, then go out', emoji: '🎴',
      description: 'Lay down 3–4 of the same number or face, or 3+ in a row of the same shape (♥♦♣♠). First to play all their cards wins.',
      minPlayers: 2, maxPlayers: 6, dealCount: 10, color: 'from-amber-900/60 to-yellow-900/60',
      rules: ['Start with 10 cards', 'Take one card each turn', 'Lay down 3–4 of a kind, or 3+ in a row of the same shape (♥♦♣♠)', 'Put one aside to end your turn', 'Play all your cards; leftover cards you could not group lose points'],
    },
  },
  {
    type: 'blackjack',
    family: 'betting',
    deck: {},
    status: 'live',
    config: {
      id: 'blackjack', name: 'Blackjack', tagline: 'Beat the dealer to 21', emoji: '🂡',
      description: 'Take a card or stay. Closest to 21 without going over beats the dealer.',
      minPlayers: 1, maxPlayers: 7, dealCount: 2, color: 'from-green-900/60 to-emerald-900/60',
      rules: ['Beat the dealer to 21 without going over', 'Ace = 1 or 11, face cards = 10', 'Take a card, or Stay to keep these', 'Dealer takes cards to 17', 'A first two-card 21 pays 3:2'],
    },
  },

  // ── Planned (trick) ────────────────────────────────────────────────────────
  {
    type: 'spades', family: 'trick', deck: {}, status: 'live',
    config: { id: 'spades', name: 'Spades', tagline: 'Bid, then win your rounds', emoji: '♠️', description: 'Teams say how many rounds they will win. Each round everyone plays one card; spades beat any other shape.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-slate-800/60 to-slate-900/60', rules: ['Say how many rounds you will win (one card each; highest wins)', 'Play a card — same shape (♥♦♣♠) if you can; spades beat any other', 'Make your bid to score; miss it and lose those points', 'First partnership to 500 wins'] },
  },
  {
    type: 'bridge', family: 'trick', deck: {}, status: 'live',
    config: { id: 'bridge', name: 'Bridge', tagline: 'Bid, then play both sides', emoji: '🌉', description: 'Teams bid a target. After the first card, partner’s cards go face-up (the dummy) and one player plays both.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-sky-900/60 to-blue-900/60', rules: ['Bid to name the winning shape and how many rounds you will take', 'Play a card — same shape (♥♦♣♠) if you have one', 'Dummy is partner’s cards, shown face-up after the first card', 'Make your target to score; miss and the other team scores'] },
  },
  {
    type: 'euchre', family: 'trick', deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'] }, status: 'live',
    config: { id: 'euchre', name: 'Euchre', tagline: 'Jack of the winner shape is king', emoji: '🃏', description: 'Fast 24-card team game. The jack of the named winning shape (right bower) is highest, then the other jack of that color.', minPlayers: 4, maxPlayers: 4, dealCount: 5, color: 'from-indigo-900/60 to-violet-900/60', rules: ['Start with 5 cards from a 24-card pack (9–A)', 'Name the winning shape; its jack (right bower) is highest', 'Play a card — same shape (♥♦♣♠) if you have one', 'First team to 10 points wins'] },
  },
  {
    type: 'whist', family: 'trick', deck: {}, status: 'live',
    config: { id: 'whist', name: 'Whist', tagline: 'Highest card takes the pile', emoji: '🎴', description: 'No bidding. Each round everyone plays one card; the last card given out names the shape that beats the others.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-stone-700/60 to-stone-900/60', rules: ['The last card given out names the winning shape (beats any other)', 'Play a card — same shape (♥♦♣♠) if you can; highest winner-shape wins', 'Team that wins the most piles scores', 'First to 5 points wins'] },
  },
  {
    type: 'oh_hell', family: 'trick', deck: {}, status: 'live',
    config: { id: 'oh_hell', name: 'Oh Hell', tagline: 'Bid the exact number of piles', emoji: '🔥', description: 'Say exactly how many piles you will win this round — no more, no less. Each round everyone plays one card.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-orange-900/60 to-red-900/60', rules: ['Bid the exact number of piles you will win (one card each)', 'Play a card — same shape (♥♦♣♠) if you have one', 'Score only if you take exactly that many', 'Rounds shrink and grow how many cards you start with'] },
  },

  // ── Planned (meld) ─────────────────────────────────────────────────────────
  {
    type: 'gin_rummy', family: 'meld', deck: {}, status: 'live',
    config: { id: 'gin_rummy', name: 'Gin Rummy', tagline: 'Stop here, gin, or go down', emoji: '🍸', description: 'Two-player grouping game. Tap Stop here when leftover cards you could not group total 10 or less.', minPlayers: 2, maxPlayers: 2, dealCount: 10, color: 'from-teal-900/60 to-emerald-900/60', rules: ['Start with 10 cards', 'Take one card, then put one aside', 'Tap Stop here when leftover cards you could not group total 10 or less', 'Gin = every card grouped; they steal it if their leftovers are lower'] },
  },
  {
    type: 'rummy_500', family: 'meld', deck: {}, status: 'live',
    config: { id: 'rummy_500', name: 'Rummy 500', tagline: 'Score to 500', emoji: '🎯', description: 'Group cards for points. You may take from the leftover pile, then put one aside.', minPlayers: 2, maxPlayers: 8, dealCount: 7, color: 'from-cyan-900/60 to-blue-900/60', rules: ['Start with 13 cards (2 players) or 7 (3 or more)', 'Take a card from the deck or the leftover pile', 'Lay down 3+ of a kind or a row of the same shape (♥♦♣♠), then put one aside', 'First to 500 points wins'] },
  },
  {
    type: 'canasta', family: 'meld', deck: { copies: 2 }, status: 'live',
    config: { id: 'canasta', name: 'Canasta', tagline: 'Seven of a kind to 5000', emoji: '🧺', description: 'Teams lay down matching numbers. A canasta is 7 cards with the same number or face.', minPlayers: 4, maxPlayers: 4, dealCount: 11, color: 'from-lime-900/60 to-green-900/60', rules: ['Start with 11 cards from two 52-card packs', 'Take one card, lay down 3+ of a kind, then put one aside', 'A canasta is 7 cards with the same number or face', 'First partnership to 5000 wins'] },
  },

  // ── Planned (betting) ──────────────────────────────────────────────────────
  {
    type: 'texas_holdem', family: 'betting', deck: {}, status: 'live',
    config: { id: 'texas_holdem', name: 'Texas Hold\'em', tagline: 'Two private cards, five shared', emoji: '♠️', description: 'The world’s most popular poker game — two cards of yours plus five in the middle.', minPlayers: 2, maxPlayers: 10, dealCount: 2, color: 'from-green-800/60 to-emerald-900/60', rules: ['Start with 2 private cards', 'Five shared cards (three, then a fourth, then a fifth)', 'On your turn: No bet, Match bet, Bet more, or Give up', 'Best 5 cards wins the pot'] },
  },
  {
    type: 'five_card_draw', family: 'betting', deck: {}, status: 'live',
    config: { id: 'five_card_draw', name: 'Five-Card Draw', tagline: 'The original poker', emoji: '🃏', description: 'Swap up to 5 cards, then compare. Best 5 cards wins the pot.', minPlayers: 2, maxPlayers: 6, dealCount: 5, color: 'from-emerald-900/60 to-green-900/60', rules: ['Start with 5 cards', 'Pick cards and tap Swap or keep to exchange them (or keep all)', 'Then tap Compare to see who is higher', 'Best 5 cards wins the pot'] },
  },
  {
    type: 'baccarat', family: 'betting', deck: {}, status: 'live',
    config: { id: 'baccarat', name: 'Baccarat', tagline: 'Player, banker, or tie', emoji: '🎲', description: 'Bet on Player or Banker; closest to 9 wins. The table takes extra cards for you.', minPlayers: 2, maxPlayers: 14, dealCount: 2, color: 'from-red-800/60 to-rose-900/60', rules: ['Bet Player 10, Banker 10, or Tie 10', 'Each side starts with 2 cards; closest to 9 wins', 'Face cards = 0, Ace = 1', 'A third card is automatic — you do not choose'] },
  },

  // ── Planned (collecting / shedding) ────────────────────────────────────────
  {
    type: 'old_maid', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'old_maid', name: 'Old Maid', tagline: 'Don’t get stuck with the queen', emoji: '👵', description: 'Make pairs and avoid being left with the unmatched queen.', minPlayers: 2, maxPlayers: 8, dealCount: 'all', color: 'from-pink-900/60 to-rose-900/60', rules: ['Take one queen out of the pack', 'Pair matching numbers or faces from the cards you are holding', 'Draw from another player to make pairs', 'Left holding the queen loses'] },
  },
  {
    type: 'slapjack', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'slapjack', name: 'Slapjack', tagline: 'Slap the jack!', emoji: '👋', description: 'Reflex game — slap the pile when a jack appears.', minPlayers: 2, maxPlayers: 8, dealCount: 'all', handReveal: 'stock', color: 'from-yellow-800/60 to-amber-900/60', rules: ['Split every card face-down', 'Take turns flipping one card', 'Slap the pile on a Jack', 'First to slap wins the pile; run out and you’re out'] },
  },
  {
    type: 'president', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'president', name: 'President', tagline: 'Climb to the top spot', emoji: '👑', description: 'Play all your cards first to become President; last place is Scum.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-blue-900/60 to-indigo-900/60', rules: ['Play one card or a set with the same number or face', 'Must beat the previous play', 'Pass if you can’t beat it', 'First out is President, last is Scum'] },
  },

  // ── Planned (solo) ─────────────────────────────────────────────────────────
  {
    type: 'klondike', family: 'solo', deck: {}, status: 'live',
    config: { id: 'klondike', name: 'Klondike Solitaire', tagline: 'The classic patience', emoji: '🃏', description: 'Build four piles from Ace to King, one shape each (hearts, diamonds, clubs, spades).', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-slate-700/60 to-slate-900/60', rules: ['7 columns: down in number, red on black then black on red', 'Goal piles: Ace → King by shape (♥♦♣♠)', 'Take 1 or 3 from the draw pile when you need a card', 'Win by filling all four Ace-to-King piles'] },
  },
  {
    type: 'freecell', family: 'solo', deck: {}, status: 'live',
    config: { id: 'freecell', name: 'FreeCell', tagline: 'Every layout is winnable', emoji: '🆓', description: 'Solitaire with four free spaces to park cards while you build Ace-to-King piles.', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-teal-800/60 to-cyan-900/60', rules: ['4 free spaces + 4 Ace-to-King piles', 'Columns build down, red on black then black on red', 'Move a run if you have enough empty spaces', 'Win by filling all four Ace-to-King piles'] },
  },
  {
    type: 'spider', family: 'solo', deck: { copies: 2 }, status: 'live',
    config: { id: 'spider', name: 'Spider Solitaire', tagline: 'Eight legs, ten columns', emoji: '🕷️', description: 'Two packs. Build King-to-Ace runs of one shape (hearts, diamonds, clubs, or spades) to clear the board.', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-neutral-800/60 to-stone-900/60', rules: ['Two packs, 10 columns', 'Build down within one shape (♥♦♣♠)', 'Lay a new row from the draw pile when you need cards', 'Finish a King-to-Ace run to remove it; clear all 8 to win'] },
  },

  // ── Planned (unique) ───────────────────────────────────────────────────────
  {
    type: 'cribbage', family: 'unique', deck: {}, status: 'live',
    config: { id: 'cribbage', name: 'Cribbage', tagline: 'First to 121 points', emoji: '🧮', description: 'Play cards toward 31, then count the cards you kept plus the extra pile (the crib). First to 121 wins.', minPlayers: 2, maxPlayers: 4, dealCount: 6, color: 'from-rose-900/60 to-red-900/60', rules: ['Start with 6 cards (5 with 3 players)', 'Put 2 aside into the extra pile (the crib)', 'Play cards toward 31; tap Go if you cannot', 'Tap Count for your cards and the extra pile; first to 121 wins'] },
  },
  {
    type: 'pinochle', family: 'unique', deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'], copies: 2 }, status: 'live',
    config: { id: 'pinochle', name: 'Pinochle', tagline: 'Group cards, then win piles', emoji: '🏆', description: '48-card team game. Lay down scoring groups, then each round everyone plays one card.', minPlayers: 4, maxPlayers: 4, dealCount: 12, color: 'from-fuchsia-900/60 to-purple-900/60', rules: ['Start with 12 cards from a 48-card pack (9–A, two of each)', 'Lay down king-queen pairs and the pinochle (♠Q + ♦J) for points', 'Play a card — same shape (♥♦♣♠) if you can; named shape beats any other', 'First to 150 points wins'] },
  },

  // ── Implemented this drain (was documented-only) ──────────────────────────
  {
    type: 'snap', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'snap', name: 'Snap', tagline: 'Snap the match!', emoji: '⚡', description: 'Flip cards and race to call Snap when two match.', minPlayers: 2, maxPlayers: 6, dealCount: 'all', handReveal: 'stock', color: 'from-red-900/60 to-orange-900/60', rules: ['Split every card face-down', 'Take turns flipping onto a center pile', 'Snap when two cards in a row have the same number or face', 'First to snap wins the pile; run out and you lose'] },
  },
  {
    type: 'concentration', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'concentration', name: 'Concentration', tagline: 'Match the pairs', emoji: '🧠', description: 'Memory game — flip two cards and keep them if they share a number or face.', minPlayers: 1, maxPlayers: 6, dealCount: 'all', color: 'from-sky-900/60 to-blue-900/60', rules: ['Lay all cards face-down in a grid', 'Flip two cards per turn', 'Same number or face keeps the pair and you go again', 'Most pairs when the board clears wins'] },
  },
  {
    type: 'sevens', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'sevens', name: 'Sevens', tagline: 'Build from the sevens', emoji: '7️⃣', description: 'Play a 7 to open a shape (♥♦♣♠), then build up to King or down to Ace.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-indigo-900/60 to-violet-900/60', rules: ['Lead with a 7 to open a shape (♥♦♣♠)', 'Build up (8→K) or down (6→A) in that shape', 'Pass if you cannot play', 'First to play every card they are holding wins'] },
  },
  {
    type: 'thirty_one', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'thirty_one', name: 'Thirty-One', tagline: 'Race to 31', emoji: '🔢', description: 'Swap cards to get three of one shape (♥♦♣♠) totaling 31. Tap Stop here when you like your cards.', minPlayers: 2, maxPlayers: 9, dealCount: 3, color: 'from-teal-900/60 to-cyan-900/60', rules: ['Start with 3 cards and 3 lives', 'Swap one card per turn for the best same-shape (♥♦♣♠) total', 'A=11, face=10, others face value', '31 wins instantly; else tap Stop here — lowest loses a life'] },
  },
  {
    type: 'cassino', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'cassino', name: 'Cassino', tagline: 'Take matching table cards', emoji: '🎣', description: 'Take table cards by matching a number or adding up to it. Make a pile to take later, or leave a card if you cannot.', minPlayers: 2, maxPlayers: 4, dealCount: 4, color: 'from-amber-900/60 to-yellow-900/60', rules: ['Start with 4 cards, 4 on the table', 'Take match if the numbers line up, or take a pile you built', 'Make a pile, or leave a card on the table if you cannot', 'Most cards, most spades, aces, and the 10 of diamonds win'] },
  },
  {
    type: 'kings_in_the_corner', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'kings_in_the_corner', name: 'Kings in the Corner', tagline: 'Lay it down', emoji: '👑', description: 'Race to play every card. Build down, red on black, and start new corners with kings.', minPlayers: 2, maxPlayers: 6, dealCount: 7, color: 'from-stone-800/60 to-stone-900/60', rules: ['Start with 7 cards', 'Take a card, then play onto a corner or the center', 'Build down, red on black; kings start corners', 'Put one aside to end your turn; first to play every card wins'] },
  },
  {
    type: 'speed', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'speed', name: 'Speed', tagline: 'No turns, just go', emoji: '🏎️', description: 'Two-player race — play a card one number higher or lower. No turns; fastest wins.', minPlayers: 2, maxPlayers: 2, dealCount: 5, color: 'from-rose-900/60 to-red-900/60', rules: ['20-card stack, start with 5 cards each', 'Play one number or face higher or lower than the pile', 'No turns — fastest plays first', 'Empty your stack and the cards you are holding to win'] },
  },
  {
    type: 'spite_and_malice', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'spite_and_malice', name: 'Spite and Malice', tagline: 'Race to clear your pile', emoji: '😈', description: 'Race to empty your 20-card payoff pile by building shared piles Ace to Queen.', minPlayers: 2, maxPlayers: 2, dealCount: 5, color: 'from-purple-900/60 to-fuchsia-900/60', rules: ['20-card payoff pile, start with 5 cards', 'Build center piles Ace → Queen', 'Use the cards you hold and side piles to keep moving', 'First to empty the payoff pile wins'] },
  },
  {
    type: 'beggar_my_neighbor', family: 'compare', deck: {}, status: 'live',
    config: { id: 'beggar_my_neighbor', name: 'Beggar-My-Neighbor', tagline: 'Pay up on face cards', emoji: '💸', description: 'Pure luck — face cards make the other player pay cards onto the pile.', minPlayers: 2, maxPlayers: 2, dealCount: 'all', handReveal: 'stock', color: 'from-emerald-900/60 to-green-900/60', rules: ['Split the pack evenly, face-down', 'Flip cards into the center', 'Face cards force the other player to pay: A=4, K=3, Q=2, J=1', 'A face card in the payment reverses the debt'] },
  },
  {
    type: 'i_doubt_it', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'i_doubt_it', name: 'I Doubt It', tagline: 'Bluff or be busted', emoji: '🤥', description: 'Play cards face-down and say a number or face. Lie if you dare — get caught and take the pile.', minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-cyan-900/60 to-blue-900/60', rules: ['Play cards face-down and say a number or face (2, 7, Queen)', 'You may lie about what you played', 'Call “I doubt it!” to challenge', 'Caught liar takes the pile; wrong caller takes it too'] },
  },
  {
    type: 'cheat', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'cheat', name: 'Cheat', tagline: 'Get away with it', emoji: '🎭', description: 'Play cards face-down in number order (A, 2, 3…). Lie if you dare.', minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-slate-700/60 to-slate-900/60', rules: ['Play face-down in number order (A, then 2, then 3…)', 'Lie about your cards if you dare', 'Challenge with “Cheat!”', 'Liar takes the pile; truthful challenger takes it'] },
  },
  {
    type: 'chase_the_ace', family: 'unique', deck: {}, status: 'live',
    config: { id: 'chase_the_ace', name: 'Chase the Ace', tagline: 'Ditch the low card', emoji: '🎲', description: 'Swap or take a new card. Avoid being stuck with the lowest card.', minPlayers: 3, maxPlayers: 8, dealCount: 1, color: 'from-orange-900/60 to-amber-900/60', rules: ['3 tokens each, 1 card', 'Swap with your neighbor or Draw a new card from the leftover pile', 'Lowest card loses a token', 'Last player standing wins'] },
  },
  {
    type: 'screw_your_neighbor', family: 'unique', deck: {}, status: 'live',
    config: { id: 'screw_your_neighbor', name: 'Screw Your Neighbor', tagline: 'Kings are safe', emoji: '🔄', description: 'Swap cards to avoid the low — kings keep you safe.', minPlayers: 3, maxPlayers: 8, dealCount: 1, color: 'from-yellow-800/60 to-amber-900/60', rules: ['3 tokens each, 1 card', 'Swap unless you hold a king, or Draw from the leftover pile', 'Kings are revealed and safe', 'Lowest card loses a token; last player standing wins'] },
  },
  {
    type: 'egyptian_ratscrew', family: 'compare', deck: {}, status: 'live',
    config: { id: 'egyptian_ratscrew', name: 'Egyptian Ratscrew', tagline: 'Slap the doubles', emoji: '🐀', description: 'Fast slapping — face cards, two in a row, and sandwiches (same number with one card between).', minPlayers: 2, maxPlayers: 6, dealCount: 'all', handReveal: 'stock', color: 'from-fuchsia-900/60 to-pink-900/60', rules: ['Split every card face-down', 'Flip cards into the center', 'Slap two in a row, or a sandwich (same number with one between)', 'Face cards force payment: A=4, K=3, Q=2, J=1'] },
  },
  {
    type: 'pitch', family: 'trick', deck: {}, status: 'live',
    config: { id: 'pitch', name: 'Pitch', tagline: 'Bid the game points', emoji: '🎯', description: 'Bid for High, Low, Jack, and Game. Each round everyone plays one card; the named shape beats any other.', minPlayers: 2, maxPlayers: 7, dealCount: 6, color: 'from-lime-900/60 to-green-900/60', rules: ['Start with 6 cards', 'Bid on High, Low, Jack, and Game', 'Highest bidder names the winning shape (beats any other)', 'Play a card — same shape (♥♦♣♠) if you can; take those points'] },
  },
  {
    type: 'solitaire_race',
    family: 'unique',
    deck: {},
    status: 'live',
    config: {
      id: 'solitaire_race', name: 'Solitaire Race', tagline: 'Same deck, fastest finish wins', emoji: '🏁',
      description: 'Both players get the same shuffled pack and race to build four Ace-to-King piles first.',
      minPlayers: 1, maxPlayers: 2, dealCount: 'all', color: 'from-cyan-900/60 to-blue-900/60',
      rules: ['Both players get the same shuffled pack', 'Play your own Klondike columns independently', 'Take a card from the draw pile when you need one', 'Build all four Ace-to-King piles; first to finish wins'],
    },
  },
];

export const GAME_CONFIGS: Record<GameType, GameTypeConfig> = Object.fromEntries(
  GAME_CATALOG.map((e) => [e.type, e.config]),
) as Record<GameType, GameTypeConfig>;

export function isGameType(value: string): value is GameType {
  return value in GAME_CONFIGS;
}

export const LIVE_GAMES = GAME_CATALOG.filter((e) => e.status === 'live');

export function catalogEntry(type: GameType): CatalogEntry | undefined {
  return GAME_CATALOG.find((e) => e.type === type);
}
