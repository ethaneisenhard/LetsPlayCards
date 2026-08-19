export function orderedSeats(players: { seat: number }[]): number[] {
  return [...new Set(players.map((p) => p.seat))].sort((a, b) => a - b);
}

/** Next seat in rotation (step 1 = clockwise, -1 = reverse, 2 = skip one). */
export function nextSeat(seats: number[], current: number, step = 1): number {
  if (seats.length === 0) return 0;
  const i = seats.indexOf(current);
  const from = i === -1 ? 0 : i;
  const n = (from + step) % seats.length;
  return seats[(n + seats.length) % seats.length];
}

export function playerAtSeat(players: { id: string; seat: number }[], seat: number): string | undefined {
  return players.find((p) => p.seat === seat)?.id;
}
