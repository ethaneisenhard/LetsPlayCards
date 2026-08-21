/** Marketing/SEO article: history of playing cards. Copy stays in everyday words. */

export const HISTORY_CANONICAL_PATH = '/history/';
export const HISTORY_ALIAS_PATHS = ['/history-of-playing-cards', '/history-of-playing-cards/'] as const;

export interface HistoryFaq {
  q: string;
  a: string;
}

export interface HistorySection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export interface HistoryPlayLink {
  /** Must match a GAME_CATALOG / glossary slug. */
  slug: string;
  name: string;
  tease: string;
}

export const HISTORY_PAGE = {
  title: 'The History of Playing Cards — How the 52-Card Pack Happened',
  metaDescription:
    'A clear history of playing cards: paper cards in China, the path through Egypt, how we got four suits and 52 cards, and how family games spread. Then play them here.',
  h1: 'The History of Playing Cards',
  lead:
    'A deck is the full pack of cards you play with — usually 52 small rectangles of paper or plastic. Four families of cards, called suits (hearts, diamonds, clubs, and spades), make up that pack. It did not appear all at once. It traveled, changed its pictures, and picked up kitchen-table games along the way. Here is the story most historians agree on, and the parts they still argue about.',
  dateModified: '2026-08-21',
  sections: [
    {
      id: 'china',
      heading: 'Paper cards in China',
      paragraphs: [
        'Most historians think playing cards started in China in the 800s, during the Tang dynasty. Printing on paper was already a Chinese craft, so a game you could hold in one hand was a natural next step.',
        'The mention people cite most is a “leaf game” at the Tang court in the year 868. Scholars do not all agree those “leaves” were cards like ours. Some read them as pages in a book used with dice. A later writer, Ouyang Xiu in the 1000s, said the leaf game went back to the mid-Tang years and was tied to printed sheets — and also that nobody still remembered the rules.',
        'What is firmer: by 1294, officials in China caught two gamblers with printed paper cards and the wood blocks used to make them. Some early Chinese cards were tied to money — coins, strings of coins, and larger sums — so a card could stand in for cash you did not want to toss onto the table. From China, card play moved west along trade routes. The exact path is fuzzy. Historians are more confident about the next place we can still see the cards.',
      ],
    },
    {
      id: 'mamluk',
      heading: 'From Cairo to Europe',
      paragraphs: [
        'By the 1200s and 1300s, cards were in use around the eastern Mediterranean. The best surviving pack comes from the Mamluk court in Egypt. It now lives in the Topkapı Palace in Istanbul. It is a 52-card pack with four families: cups, coins, swords, and polo sticks. Each family has ten number cards and three officer cards — a king and two deputies. The faces are patterns and writing, not portraits. That 52-card shape is the same size as the pack in a kitchen drawer today.',
        'Cards show up in Europe in the late 1300s. A Catalan word list from 1371 includes a word for playing card. Cities from Florence to Paris start banning card play in the 1370s — usually a sign a new pastime has arrived and someone is losing money. A German monk, John of Rheinfelden, described card packs in 1377.',
        'The usual account is that cards reached southern Europe through Mediterranean trade with Mamluk Egypt. That is the best-supported path. A few writers have suggested other routes; the evidence there is thinner. Europeans kept four families and the mix of number cards plus picture cards. Polo was not a familiar sport, so the polo-stick family became clubs or batons. Cups, coins, and swords stayed. Those four still appear on Spanish and Italian cards.',
      ],
    },
    {
      id: 'fifty-two',
      heading: 'How we got four suits and 52 cards',
      paragraphs: [
        'A suit is a family of cards that share one symbol — all the hearts, for example. Early Europe did not agree on the symbols. German makers used hearts, bells, acorns, and leaves. Spanish and Italian makers kept cups, coins, swords, and clubs.',
        'Around 1480, French makers simplified the pictures into the four most of us know: hearts, diamonds, clubs, and spades. The new marks were cheap to stencil in two colors, red and black, so French packs spread. English players borrowed the French pictures but kept older names: the clover became “clubs,” and the pike became “spades,” a word that also meant sword.',
        'Why 52? Four families, each with 13 ranks: ace (one), two through ten, and three picture cards — the ones with faces. That count already existed on the Mamluk pack. You will hear that 52 cards stand for the weeks of the year, four suits for the seasons, and 13 ranks for the lunar months. That is a later, neat story. Historians treat it as a coincidence people noticed after the pack already existed, not the reason it was designed.',
        'French packs printed names on the picture cards. On the Paris pattern, the kings were labeled David, Charlemagne, Caesar, and Alexander — famous rulers from stories, not portraits from life. The English pack we use dropped the printed names. The faces stayed.',
        'The lowest picture card was called a knave in English, an old word for a servant or young man. In the 1800s, printers put a letter in the corner so you could fan the cards in one hand. “K” for king and “Kn” for knave looked too alike, so they switched to “J” for Jack, a nickname players already used. Charles Dickens still has a character mock a boy for saying “jacks” instead of “knaves.” The nickname won.',
        'Queens were not on the Mamluk cards. European makers added them. The United States added the joker around 1860 for Euchre, as an extra high card. It later became the “wild” card in other games.',
      ],
    },
    {
      id: 'tarot',
      heading: 'Tarot and the everyday pack',
      paragraphs: [
        'Tarot started as a card game in northern Italy in the 1400s, in cities such as Milan and Ferrara. Makers added a fool and 21 extra picture cards that can beat the ordinary ones. A full tarot pack has 78 cards. People played it at the table the way you might play Hearts or Bridge.',
        'The everyday 52-card pack and tarot share a family tree. They are cousins, not the same deck. Reading fortunes with tarot is much later. In 1781 a French writer, Antoine Court de Gébelin, claimed the cards hid ancient Egyptian wisdom. Historians have not found that origin. The cards were a Renaissance game first. This site uses the 52-card pack.',
      ],
    },
    {
      id: 'games',
      heading: 'How parlor and family games grew',
      paragraphs: [
        'Once a cheap, standard pack existed, games multiplied. Some stayed in one town. Others crossed oceans and ended up on kitchen tables.',
        'Games where two people flip a card and the higher one wins are easy to teach. War is the version most children learn in English. An older English cousin, Beggar-My-Neighbor, uses picture cards as a kind of tax. Both are luck, not planning.',
        'Go Fish and Old Maid are family games from the 1800s: ask someone for a rank you already hold, or pair cards and try not to get stuck. Old Maid’s rules show up in an American book for girls in 1831. Go Fish grew from the same “please give me that card” family as games like Authors; the name became common in the United States by the early 1900s. Snap and Slapjack are the noisy cousins — shout or slap when two cards match.',
        'Rummy — making a group of the same number, or a run of the same family — most likely grew from a Mexican game called Conquian in the 1800s. Some writers also see an older Asian link. The name “rummy” shows up in the United States around 1900. Gin Rummy, the two-player version, is usually credited to Elwood T. Baker in 1909.',
        'Poker took shape in New Orleans in the early 1800s, after the Louisiana Purchase. It likely grew from the French game poque (and the older German pochen), with extra ideas from other bluffing games. An English visitor, Joseph Cowell, saw it played there in 1829 with a short pack. The full 52-card version and draw poker followed as the game rode the Mississippi. Texas Hold’em — two private cards plus five shared cards — is a later Texas form that became the world game in the late 1900s.',
        'Games you play alone (often called solitaire, or patience in Britain) show up in Europe by the late 1700s and fill whole books by the mid-1800s. Klondike — the seven-pile layout many people just call “Solitaire” — took its name from the Klondike gold rush of the 1890s. FreeCell and Spider are later cousins.',
        'A large family of games asks everyone to play one card, then the highest card of the led family (or a special winning family) takes the pile. Whist was the English parlor favorite in the 1700s. Hearts, Spades, Euchre, and Bridge all grew from that idea. Hearts asks you to avoid certain cards. Spades lets one family always win. Bridge added an auction to decide the goal.',
        'Crazy Eights is a 20th-century matching game: play a card that matches the number or the family, and eights let you change the family. It is the folk parent of Uno. President is a “climb the ranks” version popular with groups. Blackjack comes from the older French game vingt-et-un (“twenty-one”); American gambling halls gave it the blackjack name in the early 1900s. Cribbage is a special case: an English game from the 1600s, usually credited to the poet Sir John Suckling, that scores combinations while you peg points on a board.',
        'You can play the live versions of these games here — same 52-card pack, no download, no account.',
      ],
    },
  ] satisfies HistorySection[],
  faq: [
    {
      q: 'When were playing cards invented?',
      a: 'Most historians place the first playing cards in China in the 800s. The famous “leaf game” of 868 may or may not have been cards like ours. Printed paper cards are clearly in use in China by 1294. Cards reached Europe in the late 1300s.',
    },
    {
      q: 'How many cards are in a deck?',
      a: 'The everyday deck — the full pack you play with — has 52 cards: four suits (families) of 13 ranks each. Many store packs also include two jokers, which were added in the United States around 1860 and are extra. Some games use a shorter pack (Euchre uses 24 cards; Pinochle uses 48).',
    },
    {
      q: 'Why are there four suits?',
      a: 'A suit is a family of cards that share one symbol. Four families already appear on the surviving Mamluk pack from Egypt (cups, coins, swords, polo sticks). Europe kept the idea of four. French makers around 1480 redrew them as hearts, diamonds, clubs, and spades — cheap two-color marks that spread because they were easy to print.',
    },
    {
      q: 'What is the difference between playing cards and tarot?',
      a: 'The everyday pack has 52 cards. A tarot pack has 78: the usual four families plus a fool and 21 extra picture cards. Tarot began as a 1400s Italian table game. Fortune-telling with those extra cards is a late-1700s idea, not the original use.',
    },
    {
      q: 'Why do the face cards have names, and why is a jack called a jack?',
      a: 'French packs labeled kings as storybook rulers such as David and Charlemagne. English packs dropped the printed names but kept the faces. The lowest face card was a knave (a servant or young man). Printers in the 1800s needed a corner letter that did not look like K for king, so they used J for Jack — a nickname players already used.',
    },
  ] satisfies HistoryFaq[],
  playLinks: [
    { slug: 'war', name: 'War', tease: 'Flip a card. Higher one wins. The first game a lot of us learned.' },
    { slug: 'go_fish', name: 'Go Fish', tease: 'Ask for a rank you already hold. If they do not have it — go fish.' },
    { slug: 'rummy', name: 'Rummy', tease: 'Build groups of the same number, or runs in one family.' },
    { slug: 'texas_holdem', name: "Texas Hold'em", tease: 'Two private cards, five shared cards, and a pot in the middle.' },
    { slug: 'five_card_draw', name: 'Five-Card Draw', tease: 'The older poker: five cards, one swap, best hand wins.' },
    { slug: 'klondike', name: 'Klondike Solitaire', tease: 'Seven piles, four foundations, one player. The gold-rush layout.' },
    { slug: 'hearts', name: 'Hearts', tease: 'Play a card each turn. Avoid hearts — and the queen of spades.' },
    { slug: 'whist', name: 'Whist', tease: 'The 1700s parlor game that later grew into Bridge.' },
    { slug: 'crazy_eights', name: 'Crazy Eights', tease: 'Match the number or the family. Eights let you change the family.' },
    { slug: 'blackjack', name: 'Blackjack', tease: 'Get closer to 21 than the dealer, without going over.' },
    { slug: 'old_maid', name: 'Old Maid', tease: 'Pair every card. Do not get stuck with the leftover queen.' },
    { slug: 'cribbage', name: 'Cribbage', tease: 'A 1600s English game: count combinations and peg your way around a board.' },
  ] satisfies HistoryPlayLink[],
} as const;

/**
 * Short “where this game comes from” notes for glossary pages the article
 * actually discusses. Keys are glossary slugs.
 */
export const GAME_ORIGINS: Record<string, string> = {
  war: 'War is the simple “higher card wins” game most English-speaking children learn. Games like it are easy to invent once you have a ranked pack; this site’s version is the familiar two-player flip.',
  beggar_my_neighbor:
    'Beggar-My-Neighbor is an older English cousin of War. Picture cards make the other player “pay” extra cards. There is no planning — only the order of the pack.',
  go_fish:
    'Go Fish grew from 1800s “please give me that card” family games (Authors is a close American cousin). The Go Fish name became common in the United States by the early 1900s.',
  old_maid:
    'Old Maid’s rules appear in an American book for girls in 1831. Pair every card you can; the leftover queen is the one you do not want. Related pairing games exist under other names in Germany and France.',
  snap: 'Snap is the shout-when-they-match cousin of slap games. It uses the same 52-card pack and the same idea as Slapjack: speed, not strategy.',
  slapjack:
    'Slapjack is a reflex game on the everyday pack: flip cards, slap the pile when a jack appears. It sits in the same noisy family as Snap.',
  rummy:
    'Rummy most likely grew from the Mexican game Conquian in the 1800s. Some writers also see an older Asian link. The name shows up in the United States around 1900.',
  gin_rummy:
    'Gin Rummy is the two-player rummy that is usually credited to Elwood T. Baker in 1909. Same idea — groups and runs — with a knock when your leftover cards are low.',
  rummy_500:
    'Rummy 500 is a later point-scoring cousin of rummy. You can take cards from the discard pile, and the race is to 500 points.',
  texas_holdem:
    'Texas Hold’em is a later Texas form of poker: two private cards plus five shared cards. Poker itself took shape in New Orleans in the early 1800s and rode the Mississippi north.',
  five_card_draw:
    'Five-Card Draw is the older poker most people learn first: five cards, one chance to swap, then the best hand. Poker took shape in New Orleans in the early 1800s.',
  blackjack:
    'Blackjack comes from the French game vingt-et-un (“twenty-one”). American gambling halls popularized the blackjack name in the early 1900s.',
  klondike:
    'Klondike is the seven-pile solitaire many people just call “Solitaire.” One-player card games (patience) fill European books by the mid-1800s; this layout took its name from the Klondike gold rush of the 1890s.',
  freecell:
    'FreeCell is a later one-player cousin of Klondike, with four open parking spots. Nearly every deal can be won if you plan ahead.',
  spider:
    'Spider Solitaire is a two-pack, ten-column cousin of the older patience games. Clear complete runs to empty the table.',
  hearts:
    'Hearts belongs to the family of games where everyone plays one card and the highest card of that family takes the pile — except here you try not to take hearts. It grew from older “avoid these cards” games in Europe.',
  whist:
    'Whist was the English parlor favorite in the 1700s: partners, one winning family per hand, no auction. Bridge grew out of it later.',
  bridge:
    'Bridge grew from Whist in the late 1800s. Partners still try to win piles of cards, but first they hold an auction to set the goal.',
  spades:
    'Spades is a later American cousin of Whist. One family — spades — always beats the others, and you bid how many piles your pair will win.',
  euchre:
    'Euchre uses a short 24-card pack. It spread in the United States in the 1800s and is the game that gave us the joker (an extra high card, around 1860).',
  crazy_eights:
    'Crazy Eights is a 20th-century matching game on the everyday pack: match the number or the family; eights let you change the family. Uno is the commercial cousin.',
  president:
    'President is a “get rid of your cards and climb the ranks” game popular with groups. First one out gets the high seat next round.',
  cribbage:
    'Cribbage is an English game from the 1600s, usually credited to the poet Sir John Suckling. You score combinations and peg your way around a board to 121.',
};
