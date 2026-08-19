import type { PublicState } from '../../game/engine';

export interface Action {
  intent: string;
  playerId?: string;
  [key: string]: unknown;
}

export async function createGame(gameType: string): Promise<string> {
  const res = await fetch('/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameType }),
  });
  const data = (await res.json()) as { error?: string; code?: string };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to create game');
  return data.code as string;
}

export async function getState(code: string, playerId?: string): Promise<PublicState> {
  const q = playerId ? `?playerId=${encodeURIComponent(playerId)}` : '';
  const res = await fetch(`/game/${code}${q}`, { headers: { Accept: 'application/json' } });
  const data = (await res.json()) as { error?: string; state?: PublicState };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Game not found');
  return data.state as PublicState;
}

export async function join(
  code: string,
  name: string,
): Promise<{ playerId: string; state: PublicState }> {
  const res = await fetch(`/game/${code}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent: 'join', name }),
  });
  const data = (await res.json()) as { error?: string; playerId?: string; state?: PublicState };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Could not join');
  return { playerId: data.playerId as string, state: data.state as PublicState };
}

export async function sendAction(code: string, action: Action): Promise<PublicState> {
  const res = await fetch(`/game/${code}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  const data = (await res.json()) as { error?: string; state?: PublicState };
  if (!res.ok || data.error) throw new Error(data.error ?? 'Action failed');
  return data.state as PublicState;
}

export function connect(
  code: string,
  playerId: string | undefined,
  onState: (s: PublicState) => void,
  onOpen: () => void,
  onClose: () => void,
): () => void {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/game/${code}`);
  ws.onopen = () => {
    if (playerId) ws.send(JSON.stringify({ type: 'hello', playerId }));
    onOpen();
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as { type?: string; state?: PublicState };
      if (msg.type === 'state' && msg.state) onState(msg.state);
    } catch {
      /* ignore malformed frame */
    }
  };
  ws.onclose = onClose;
  return () => ws.close();
}
