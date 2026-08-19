export type GameRulesCard = {
  name: string;
  emoji: string;
  tagline: string;
  players: string;
  win: string;
  steps: readonly string[];
};

export type RulesConfig = {
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  rules: readonly string[];
  minPlayers: number;
  maxPlayers: number;
};

export type RulesGlossary = {
  sections?: readonly { heading: string; body: string }[];
};

export function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.+?[.!?]/);
  return (match?.[0] ?? trimmed).trim();
}

function playerRange(min: number, max: number): string {
  return min === max ? `${min}P` : `${min}–${max}P`;
}

function winFrom(config: RulesConfig, glossary?: RulesGlossary | null): string {
  const section = glossary?.sections?.find((s) => /win/i.test(s.heading));
  return firstSentence(section?.body ?? config.rules[config.rules.length - 1] ?? '');
}

/** Short cheat-sheet. Catalog steps + one-line win. */
export function rulesCardFor(config: RulesConfig, glossary?: RulesGlossary | null): GameRulesCard {
  return {
    name: config.name,
    emoji: config.emoji,
    tagline: config.tagline,
    players: playerRange(config.minPlayers, config.maxPlayers),
    win: winFrom(config, glossary),
    steps: config.rules,
  };
}
