export type LastAskView = {
  fromName: string;
  toName: string;
  rank: string;
  result: 'success' | 'go_fish';
};

export function lastAskLine(ask: LastAskView | null | undefined): string | null {
  if (!ask) return null;
  const got = ask.result === 'success' ? 'got them' : 'Go Fish!';
  return `${ask.fromName} asked ${ask.toName} for ${ask.rank}s — ${got}`;
}

export function bookCounts(books: Record<string, unknown[] | undefined> | undefined): Record<string, number> {
  if (!books) return {};
  return Object.fromEntries(
    Object.entries(books).map(([id, list]) => [id, Array.isArray(list) ? list.length : 0]),
  );
}

export function bookScoreLine(
  counts: Record<string, number>,
  players: { id: string; name: string }[],
): string | null {
  if (players.length === 0 || Object.keys(counts).length === 0) return null;
  return players.map((p) => `${p.name} ${counts[p.id] ?? 0}`).join(' · ');
}
