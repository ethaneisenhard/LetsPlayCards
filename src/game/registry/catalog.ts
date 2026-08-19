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
      description: 'Flip cards simultaneously — highest wins the pile. Ties trigger WAR.',
      minPlayers: 2, maxPlayers: 2, dealCount: 'all', color: 'from-red-900/60 to-orange-900/60',
      handReveal: 'stock',
      rules: ['Cards are dealt evenly — 26 each', 'Both players flip their top card', 'Higher card wins both cards', 'On a tie: WAR — 3 face-down + 1 face-up', 'Collect all 52 cards to win'],
    },
  },
  {
    type: 'go_fish',
    family: 'collecting',
    deck: {},
    status: 'live',
    config: {
      id: 'go_fish', name: 'Go Fish', tagline: 'Ask, collect, dominate', emoji: '🐟',
      description: 'Ask opponents for ranks you need. If they have it, you get it. If not — Go Fish!',
      minPlayers: 2, maxPlayers: 6, dealCount: 7, color: 'from-blue-900/60 to-cyan-900/60',
      rules: ['Each player gets 7 cards (5 with 4+ players)', 'Ask any player for a rank you hold', 'They give you all of that rank if they have it', 'Otherwise — "Go Fish!" draw one', 'Collect all 4 of a rank to score a book', 'Most books when the deck runs out wins'],
    },
  },
  {
    type: 'freeplay',
    family: 'shedding',
    deck: {},
    status: 'live',
    config: {
      id: 'freeplay', name: 'Free Play', tagline: 'Any game, your rules', emoji: '🃏',
      description: 'A virtual card table with no rules enforced. Draw, play, discard however you want.',
      minPlayers: 1, maxPlayers: 8, dealCount: 7, color: 'from-emerald-900/60 to-teal-900/60',
      rules: ['No rules enforced — use your own', 'Deal any number of cards', 'Play, pick up, or discard freely', 'Works for Rummy, Poker, Crazy Eights, and more'],
    },
  },
  {
    type: 'hearts',
    family: 'trick',
    deck: {},
    status: 'live',
    config: {
      id: 'hearts', name: 'Hearts', tagline: 'Avoid hearts and the queen', emoji: '♥️',
      description: 'Trick-taking with a twist: you do NOT want hearts or the queen of spades.',
      minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-red-900/60 to-rose-900/60',
      rules: ['Follow suit if you can', 'Hearts = 1 point each, ♠Q = 13 points', 'Lowest score wins', 'Shoot the moon: collect all points to zero out'],
    },
  },
  {
    type: 'crazy_eights',
    family: 'shedding',
    deck: {},
    status: 'live',
    config: {
      id: 'crazy_eights', name: 'Crazy Eights', tagline: 'Match suit or rank', emoji: '8️⃣',
      description: 'Shed your hand by matching the top card. Eights are wild — change the suit.',
      minPlayers: 2, maxPlayers: 7, dealCount: 7, color: 'from-violet-900/60 to-purple-900/60',
      rules: ['Play a card matching suit or rank', '8s are wild — pick a new suit', 'Can\'t play? Draw until you can', 'First to empty their hand wins'],
    },
  },
  {
    type: 'rummy',
    family: 'meld',
    deck: {},
    status: 'live',
    config: {
      id: 'rummy', name: 'Rummy', tagline: 'Draw, meld, go out', emoji: '🎴',
      description: 'Form sets (same rank) and runs (consecutive suit) to empty your hand.',
      minPlayers: 2, maxPlayers: 6, dealCount: 10, color: 'from-amber-900/60 to-yellow-900/60',
      rules: ['Draw one card each turn', 'Meld sets (3-4 of a rank) or runs (3+ same suit)', 'Discard one to end your turn', 'Going out ends the round; lowest deadwood wins'],
    },
  },
  {
    type: 'blackjack',
    family: 'betting',
    deck: {},
    status: 'live',
    config: {
      id: 'blackjack', name: 'Blackjack', tagline: 'Beat the dealer to 21', emoji: '🂡',
      description: 'Hit or stand against the dealer. Closest to 21 without busting wins.',
      minPlayers: 1, maxPlayers: 7, dealCount: 2, color: 'from-green-900/60 to-emerald-900/60',
      rules: ['Beat the dealer to 21 without going over', 'Ace = 1 or 11, face cards = 10', 'Hit to draw, Stand to hold', 'Dealer hits to 17', 'Natural 21 pays 3:2'],
    },
  },

  // ── Planned (trick) ────────────────────────────────────────────────────────
  {
    type: 'spades', family: 'trick', deck: {}, status: 'live',
    config: { id: 'spades', name: 'Spades', tagline: 'Bid and make your tricks', emoji: '♠️', description: 'Partnership trick-taking with bidding; spades are always trump.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-slate-800/60 to-slate-900/60', rules: ['Spades are always trump', 'Bid the number of tricks you\'ll take', 'Make your bid to score; miss it and go set', 'First partnership to 500 wins'] },
  },
  {
    type: 'bridge', family: 'trick', deck: {}, status: 'live',
    config: { id: 'bridge', name: 'Bridge', tagline: 'The king of trick games', emoji: '🌉', description: 'Full contract bridge — bidding, dummy play, and scoring.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-sky-900/60 to-blue-900/60', rules: ['Auction bidding determines trump and contract', 'Dummy hand is exposed after the opening lead', 'Take your contract to score; fail and go down', 'Rubber or duplicate scoring'] },
  },
  {
    type: 'euchre', family: 'trick', deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'] }, status: 'live',
    config: { id: 'euchre', name: 'Euchre', tagline: 'Trump, bower, and partners', emoji: '🃏', description: 'Fast 24-card partnership trick game with the famous right and left bower.', minPlayers: 4, maxPlayers: 4, dealCount: 5, color: 'from-indigo-900/60 to-violet-900/60', rules: ['24-card deck (9–A)', 'Jack of trump is the right bower (highest)', 'First team to 10 points wins'] },
  },
  {
    type: 'whist', family: 'trick', deck: {}, status: 'live',
    config: { id: 'whist', name: 'Whist', tagline: 'The classic trick game', emoji: '🎴', description: 'Plain-trick game with no bidding — the ancestor of Bridge.', minPlayers: 4, maxPlayers: 4, dealCount: 'all', color: 'from-stone-700/60 to-stone-900/60', rules: ['Trump is the last card dealt', 'Follow suit; highest trump or card wins', 'Team with most tricks scores', 'First to 5 points wins'] },
  },
  {
    type: 'oh_hell', family: 'trick', deck: {}, status: 'live',
    config: { id: 'oh_hell', name: 'Oh Hell', tagline: 'Bid your exact tricks', emoji: '🔥', description: 'Predict exactly how many tricks you\'ll take — no more, no less.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-orange-900/60 to-red-900/60', rules: ['Bid the exact number of tricks you\'ll win', 'Make your bid exactly to score', 'Over or under = no points', 'Rounds shrink and grow the hand size'] },
  },

  // ── Planned (meld) ─────────────────────────────────────────────────────────
  {
    type: 'gin_rummy', family: 'meld', deck: {}, status: 'live',
    config: { id: 'gin_rummy', name: 'Gin Rummy', tagline: 'Knock, gin, or go down', emoji: '🍸', description: 'Two-player Rummy where you knock at 10 deadwood or fewer.', minPlayers: 2, maxPlayers: 2, dealCount: 10, color: 'from-teal-900/60 to-emerald-900/60', rules: ['10 cards each', 'Knock when deadwood ≤ 10', 'Gin = all cards melded', 'Undercut if your deadwood is lower'] },
  },
  {
    type: 'rummy_500', family: 'meld', deck: {}, status: 'live',
    config: { id: 'rummy_500', name: 'Rummy 500', tagline: 'Score to 500', emoji: '🎯', description: 'Rummy with point scoring and the discard pile in play.', minPlayers: 2, maxPlayers: 8, dealCount: 7, color: 'from-cyan-900/60 to-blue-900/60', rules: ['Cards are worth points', 'Draw from deck or discard pile', 'First to 500 points wins', 'Going out ends the hand'] },
  },
  {
    type: 'canasta', family: 'meld', deck: { copies: 2 }, status: 'live',
    config: { id: 'canasta', name: 'Canasta', tagline: 'Meld your way to 5000', emoji: '🧺', description: 'Partnership melding with wild cards and the eponymous 7-card canasta.', minPlayers: 4, maxPlayers: 4, dealCount: 11, color: 'from-lime-900/60 to-green-900/60', rules: ['Two 52-card decks', 'Meld 3+ of a rank', 'A canasta = 7 of a rank', 'First to 5000 points wins'] },
  },

  // ── Planned (betting) ──────────────────────────────────────────────────────
  {
    type: 'texas_holdem', family: 'betting', deck: {}, status: 'live',
    config: { id: 'texas_holdem', name: 'Texas Hold\'em', tagline: 'Two cards, five community', emoji: '♠️', description: 'The world\'s most popular poker game.', minPlayers: 2, maxPlayers: 10, dealCount: 2, color: 'from-green-800/60 to-emerald-900/60', rules: ['Two hole cards each', 'Five community cards (flop, turn, river)', 'Betting rounds: pre-flop, flop, turn, river', 'Best 5-card hand wins the pot'] },
  },
  {
    type: 'five_card_draw', family: 'betting', deck: {}, status: 'live',
    config: { id: 'five_card_draw', name: 'Five-Card Draw', tagline: 'The original poker', emoji: '🃏', description: 'Draw up to 5 new cards and bet your hand.', minPlayers: 2, maxPlayers: 6, dealCount: 5, color: 'from-emerald-900/60 to-green-900/60', rules: ['Five cards each', 'One draw round (swap up to 5)', 'Betting before and after the draw', 'Best hand wins'] },
  },
  {
    type: 'baccarat', family: 'betting', deck: {}, status: 'live',
    config: { id: 'baccarat', name: 'Baccarat', tagline: 'Player, banker, or tie', emoji: '🎲', description: 'Bet on player or banker; closest to 9 wins.', minPlayers: 2, maxPlayers: 14, dealCount: 2, color: 'from-red-800/60 to-rose-900/60', rules: ['Bet player, banker, or tie', 'Closest to 9 wins', 'Face cards = 0, Ace = 1', 'Third-card rules are automatic'] },
  },

  // ── Planned (collecting / shedding) ────────────────────────────────────────
  {
    type: 'old_maid', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'old_maid', name: 'Old Maid', tagline: 'Don\'t hold the queen', emoji: '👵', description: 'Pair up cards and avoid being stuck with the Old Maid.', minPlayers: 2, maxPlayers: 8, dealCount: 'all', color: 'from-pink-900/60 to-rose-900/60', rules: ['Remove one queen from the deck', 'Pair matching ranks from your hand', 'Draw from opponents to make pairs', 'Left holding the queen loses'] },
  },
  {
    type: 'slapjack', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'slapjack', name: 'Slapjack', tagline: 'Slap the jack!', emoji: '👋', description: 'Reflex game — slap the pile when a jack appears.', minPlayers: 2, maxPlayers: 8, dealCount: 'all', handReveal: 'stock', color: 'from-yellow-800/60 to-amber-900/60', rules: ['Deal all cards face-down', 'Take turns flipping one card', 'Slap the pile on a Jack', 'First to slap wins the pile; run out and you\'re out'] },
  },
  {
    type: 'president', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'president', name: 'President', tagline: 'Climb to the top seat', emoji: '👑', description: 'Shed first to become President; losers get demoted.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-blue-900/60 to-indigo-900/60', rules: ['Play singles or sets of equal rank', 'Must beat the previous play', 'Pass if you can\'t beat it', 'First out is President, last is Scum'] },
  },

  // ── Planned (solo) ─────────────────────────────────────────────────────────
  {
    type: 'klondike', family: 'solo', deck: {}, status: 'live',
    config: { id: 'klondike', name: 'Klondike Solitaire', tagline: 'The classic patience', emoji: '🃏', description: 'Build four foundation piles from Ace to King.', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-slate-700/60 to-slate-900/60', rules: ['Tableau: 7 columns, alternating colors, descending', 'Foundations: Ace → King by suit', 'Draw from the stock 1 or 3 at a time', 'Win by building all four foundations'] },
  },
  {
    type: 'freecell', family: 'solo', deck: {}, status: 'live',
    config: { id: 'freecell', name: 'FreeCell', tagline: 'Every deal is winnable', emoji: '🆓', description: 'Solitaire with four free cells to hold cards.', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-teal-800/60 to-cyan-900/60', rules: ['4 free cells + 4 foundations', 'Tableau builds down, alternating colors', 'Move sequences through free cells', 'Win by building all foundations'] },
  },
  {
    type: 'spider', family: 'solo', deck: { copies: 2 }, status: 'live',
    config: { id: 'spider', name: 'Spider Solitaire', tagline: 'Eight legs, ten columns', emoji: '🕷️', description: 'The two-deck patience — build suit sequences to clear the board.', minPlayers: 1, maxPlayers: 1, dealCount: 'all', color: 'from-neutral-800/60 to-stone-900/60', rules: ['Two decks, 10 tableau columns', 'Build down within a suit', 'Complete a K→A run to remove it', 'Clear all 8 suits to win'] },
  },

  // ── Planned (unique) ───────────────────────────────────────────────────────
  {
    type: 'cribbage', family: 'unique', deck: {}, status: 'live',
    config: { id: 'cribbage', name: 'Cribbage', tagline: 'Peg your way to 121', emoji: '🧮', description: 'The pegboard classic — count your hand, crib, and pegging.', minPlayers: 2, maxPlayers: 4, dealCount: 6, color: 'from-rose-900/60 to-red-900/60', rules: ['6 cards each (5 with 3 players)', 'Discard 2 to the crib', 'Peg to 31 in the play', 'Count hand + crib; first to 121 wins'] },
  },
  {
    type: 'pinochle', family: 'unique', deck: { ranks: ['9', '10', 'J', 'Q', 'K', 'A'], copies: 2 }, status: 'live',
    config: { id: 'pinochle', name: 'Pinochle', tagline: 'Meld and trick to win', emoji: '🏆', description: '48-card game combining melding and trick-taking with a unique scoring table.', minPlayers: 4, maxPlayers: 4, dealCount: 12, color: 'from-fuchsia-900/60 to-purple-900/60', rules: ['48-card deck (9–A, two of each)', 'Melds score points (marriages, pinochle)', 'Trick-taking with trump', 'First to 150 points wins'] },
  },

  // ── Implemented this drain (was documented-only) ──────────────────────────
  {
    type: 'snap', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'snap', name: 'Snap', tagline: 'Snap the match!', emoji: '⚡', description: 'Flip cards and race to call Snap when two match.', minPlayers: 2, maxPlayers: 6, dealCount: 'all', handReveal: 'stock', color: 'from-red-900/60 to-orange-900/60', rules: ['Deal all cards face-down', 'Take turns flipping onto a center pile', 'Snap when two consecutive cards match rank', 'First to snap wins the pile; run out and you lose'] },
  },
  {
    type: 'concentration', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'concentration', name: 'Concentration', tagline: 'Match the pairs', emoji: '🧠', description: 'Memory game — flip two cards and match pairs by rank.', minPlayers: 1, maxPlayers: 6, dealCount: 'all', color: 'from-sky-900/60 to-blue-900/60', rules: ['Lay all cards face-down in a grid', 'Flip two cards per turn', 'A rank match keeps the pair and goes again', 'Most pairs when the board clears wins'] },
  },
  {
    type: 'sevens', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'sevens', name: 'Sevens', tagline: 'Build from the sevens', emoji: '7️⃣', description: 'Sequence game — build each suit outward from the 7s.', minPlayers: 3, maxPlayers: 7, dealCount: 'all', color: 'from-indigo-900/60 to-violet-900/60', rules: ['Lead with a 7 to open a suit', 'Build up (8→K) or down (6→A) in suit', 'Pass if you cannot play', 'First to empty their hand wins'] },
  },
  {
    type: 'thirty_one', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'thirty_one', name: 'Thirty-One', tagline: 'Race to 31', emoji: '🔢', description: 'Swap and knock — build a same-suit hand totaling 31.', minPlayers: 2, maxPlayers: 9, dealCount: 3, color: 'from-teal-900/60 to-cyan-900/60', rules: ['3 cards each, 3 lives', 'Swap one card per turn for the best same-suit total', 'A=11, face=10, others face value', '31 wins instantly; otherwise knock and lowest loses a life'] },
  },
  {
    type: 'cassino', family: 'collecting', deck: {}, status: 'live',
    config: { id: 'cassino', name: 'Cassino', tagline: 'Capture and build', emoji: '🎣', description: 'Fishing game — capture table cards by matching or summing.', minPlayers: 2, maxPlayers: 4, dealCount: 4, color: 'from-amber-900/60 to-yellow-900/60', rules: ['4 cards each, 4 on the table', 'Capture by matching or summing values', 'Build piles to capture later', 'Score cards, spades, aces, and the big cassino'] },
  },
  {
    type: 'kings_in_the_corner', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'kings_in_the_corner', name: 'Kings in the Corner', tagline: 'Lay it down', emoji: '👑', description: 'Solitaire-style race — build descending, alternating piles.', minPlayers: 2, maxPlayers: 6, dealCount: 7, color: 'from-stone-800/60 to-stone-900/60', rules: ['7 cards each', 'Build descending, alternating colors', 'Kings start new corner piles', 'First to empty their hand wins'] },
  },
  {
    type: 'speed', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'speed', name: 'Speed', tagline: 'No turns, just go', emoji: '🏎️', description: 'Two-player reaction race — play cards one up or down.', minPlayers: 2, maxPlayers: 2, dealCount: 5, color: 'from-rose-900/60 to-red-900/60', rules: ['20-card stack, 5-card hand each', 'Play one rank higher or lower than the pile', 'No turns — fastest plays first', 'Empty your stack and hand to win'] },
  },
  {
    type: 'spite_and_malice', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'spite_and_malice', name: 'Spite and Malice', tagline: 'Race to clear your pile', emoji: '😈', description: 'Competitive solitaire — empty your payoff pile first.', minPlayers: 2, maxPlayers: 2, dealCount: 5, color: 'from-purple-900/60 to-fuchsia-900/60', rules: ['20-card payoff pile, 5-card hand', 'Build center piles A→Q', 'Use your hand and side piles to keep moving', 'First to empty the payoff pile wins'] },
  },
  {
    type: 'beggar_my_neighbor', family: 'compare', deck: {}, status: 'live',
    config: { id: 'beggar_my_neighbor', name: 'Beggar-My-Neighbor', tagline: 'Pay up on face cards', emoji: '💸', description: 'Pure-luck war of face cards — make your opponent pay the pile.', minPlayers: 2, maxPlayers: 2, dealCount: 'all', handReveal: 'stock', color: 'from-emerald-900/60 to-green-900/60', rules: ['Deal the deck evenly', 'Flip cards into the center', 'Face cards force the opponent to pay: A=4, K=3, Q=2, J=1', 'A face card in the payment reverses the debt'] },
  },
  {
    type: 'i_doubt_it', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'i_doubt_it', name: 'I Doubt It', tagline: 'Bluff or be busted', emoji: '🤥', description: 'Bluffing shed — declare your cards, lie at your peril.', minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-cyan-900/60 to-blue-900/60', rules: ['Play cards face-down declaring a rank', 'You may lie about what you played', 'Call "I doubt it!" to challenge', 'Caught liar takes the pile; wrong caller takes it too'] },
  },
  {
    type: 'cheat', family: 'shedding', deck: {}, status: 'live',
    config: { id: 'cheat', name: 'Cheat', tagline: 'Get away with it', emoji: '🎭', description: 'The classic bluff — shed cards by rank, truth optional.', minPlayers: 3, maxPlayers: 6, dealCount: 'all', color: 'from-slate-700/60 to-slate-900/60', rules: ['Play face-down in rank order', 'Lie about your cards if you dare', 'Challenge with "Cheat!"', 'Liar takes the pile; truthful challenger takes it'] },
  },
  {
    type: 'chase_the_ace', family: 'unique', deck: {}, status: 'live',
    config: { id: 'chase_the_ace', name: 'Chase the Ace', tagline: 'Ditch the low card', emoji: '🎲', description: 'Pass-and-swap elimination — avoid holding the lowest card.', minPlayers: 3, maxPlayers: 8, dealCount: 1, color: 'from-orange-900/60 to-amber-900/60', rules: ['3 tokens each, one card', 'Swap with your neighbor to ditch lows', 'Lowest card loses a token', 'Last player standing wins'] },
  },
  {
    type: 'screw_your_neighbor', family: 'unique', deck: {}, status: 'live',
    config: { id: 'screw_your_neighbor', name: 'Screw Your Neighbor', tagline: 'Kings are safe', emoji: '🔄', description: 'Swap cards to avoid the low — kings keep you safe.', minPlayers: 3, maxPlayers: 8, dealCount: 1, color: 'from-yellow-800/60 to-amber-900/60', rules: ['3 tokens each, one card', 'Swap unless you hold a king', 'Kings are revealed and safe', 'Lowest card loses a token; last player standing wins'] },
  },
  {
    type: 'egyptian_ratscrew', family: 'compare', deck: {}, status: 'live',
    config: { id: 'egyptian_ratscrew', name: 'Egyptian Ratscrew', tagline: 'Slap the doubles', emoji: '🐀', description: 'Fast slapping — face cards, doubles, and sandwiches.', minPlayers: 2, maxPlayers: 6, dealCount: 'all', handReveal: 'stock', color: 'from-fuchsia-900/60 to-pink-900/60', rules: ['Deal all cards face-down', 'Flip cards into the center', 'Slap doubles and sandwiches', 'Face cards force payment: A=4, K=3, Q=2, J=1'] },
  },
  {
    type: 'pitch', family: 'trick', deck: {}, status: 'live',
    config: { id: 'pitch', name: 'Pitch', tagline: 'Bid the game points', emoji: '🎯', description: 'Bidding trick game — capture High, Low, Jack, and Game.', minPlayers: 2, maxPlayers: 7, dealCount: 6, color: 'from-lime-900/60 to-green-900/60', rules: ['6 cards each', 'Bid on the four game points', 'Highest bidder names trump', 'Capture High, Low, Jack, and Game to score'] },
  },
  {
    type: 'solitaire_race',
    family: 'unique',
    deck: {},
    status: 'live',
    config: {
      id: 'solitaire_race', name: 'Solitaire Race', tagline: 'Same deck, fastest finish wins', emoji: '🏁',
      description: 'Both players get the identical Klondike deal and race to build all four foundations first.',
      minPlayers: 1, maxPlayers: 2, dealCount: 'all', color: 'from-cyan-900/60 to-blue-900/60',
      rules: ['Both players get the same shuffled deck', 'Play your own Klondike tableau independently', 'Build all four foundations A→K to win', 'First to finish wins the race', 'Play solo to just beat the deck'],
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
