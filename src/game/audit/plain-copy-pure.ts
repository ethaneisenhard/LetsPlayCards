/** Player-facing copy must read like a friend who has never played cards. */

export type JargonRule = {
  word: string;
  re: RegExp;
  /** Everyday words that count as a same-sentence definition. */
  define: RegExp;
};

/**
 * Club talk. Allowed only when the same sentence defines it in plain English.
 * “book” is first: Go Fish scores four of a kind, not a “book”.
 */
export const PLAYER_JARGON: JargonRule[] = [
  {
    word: 'book',
    re: /\bbooks?\b/i,
    define: /four of a kind|set of four|four cards (with|of) the same/i,
  },
  {
    word: 'trick',
    re: /\btricks?\b/i,
    define: /one card each|everyone plays one|highest .{0,40}wins|wins (those|the) (cards|pile)|that pile/i,
  },
  {
    word: 'meld',
    re: /\bmelds?\b|\bmelded\b|\bunmelded\b/i,
    define: /lay down|set of|group of|same number|in a row|cards you could not group/i,
  },
  {
    word: 'stock',
    re: /\bstock\b/i,
    define: /draw pile|leftover (cards|pile)|cards left to take|face-down pile/i,
  },
  {
    word: 'discard',
    re: /\bdiscards?\b|\bdiscarded\b/i,
    define: /put (one |a card )?aside|throw away|leftover pile|face-up pile/i,
  },
  {
    word: 'widow',
    re: /\bwidow\b/i,
    define: /shared cards|middle cards|face-up cards/i,
  },
  {
    word: 'crib',
    re: /\bcrib\b/i,
    define: /extra pile|bonus pile|dealer'?s extra/i,
  },
  {
    word: 'peg',
    re: /\bpegs?\b|\bpegging\b|\bpegboard\b/i,
    define: /score|points on the board|move along/i,
  },
  {
    word: 'knock',
    re: /\bknocks?\b|\bknocking\b/i,
    define: /stop|i'?m done|end (the|your) (turn|round)/i,
  },
  {
    word: 'follow suit',
    re: /\bfollow(ing)? suit\b/i,
    define: /same (shape|color)|hearts|diamonds|clubs|spades|♥|♦|♣|♠/i,
  },
  {
    word: 'shoot the moon',
    re: /\bshoot(ing)? the moon\b/i,
    define: /every heart|all (the )?hearts|queen of spades/i,
  },
  {
    word: 'rank',
    re: /\branks?\b/i,
    define: /number or face|2, 7|queen|same number|A, 2|face cards/i,
  },
  {
    word: 'suit',
    re: /\bsuits?\b/i,
    define: /hearts?|diamonds?|clubs?|spades?|♥|♦|♣|♠|shape|red or black/i,
  },
  {
    word: 'hand',
    re: /\bhands?\b/i,
    define: /cards you|cards they|cards each|holding|your cards|their cards|start with/i,
  },
  {
    word: 'deal',
    re: /\bdealt?\b/i,
    define: /\b(each|start with|gets?|give|given|split)\b/i,
  },
  {
    word: 'felt',
    re: /\bfelt\b/i,
    define: /\b(table|board)\b/i,
  },
  {
    word: 'seat',
    re: /\bseats?\b/i,
    define: /\b(player|person|anyone)\b/i,
  },
  {
    word: 'deadwood',
    re: /\bdeadwood\b/i,
    define: /leftover|unmatched|left over|cards you could not/i,
  },
  {
    word: 'bower',
    re: /\bbowers?\b/i,
    define: /\bjacks?\b/i,
  },
  {
    word: 'dummy',
    re: /\bdummy\b/i,
    define: /face-up|shown|partner'?s cards/i,
  },
  {
    word: 'trump',
    re: /\btrumps?\b/i,
    define: /beats (any|every)|wins over|named (winning )?shape|always win/i,
  },
];

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export type JargonHit = { word: string; sentence: string };

/** Undefined club talk in player-facing copy. “book” is reported first. */
export function undefinedJargon(text: string): JargonHit[] {
  const hits: JargonHit[] = [];
  for (const sentence of splitSentences(text)) {
    for (const rule of PLAYER_JARGON) {
      if (rule.re.test(sentence) && !rule.define.test(sentence)) {
        hits.push({ word: rule.word, sentence });
      }
    }
  }
  return hits;
}
