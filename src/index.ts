import type { Env } from './env';
import { generateGameCode } from './game/deck';
import { GameRoom } from './durable/game-room';
import { staticSeoRoute } from './seo/static-routes-pure';

export { GameRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'letsplaycards' });
    }

    if (url.pathname === '/api/games' && request.method === 'POST') {
      return createGame(request, env);
    }

    if (url.pathname === '/api/games' && request.method === 'GET') {
      return listGames(env);
    }

    // Game routes: JSON/POST/WebSocket go to the per-game Durable Object;
    // plain browser navigation serves the SPA shell.
    const gameMatch = url.pathname.match(/^\/game\/([A-Za-z0-9]+)\/?$/);
    if (gameMatch) {
      const code = gameMatch[1].toUpperCase();
      const isWs = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
      const wantsJson = (request.headers.get('Accept') ?? '').includes('application/json');
      if (request.method === 'POST' || isWs || wantsJson) {
        const id = env.GAME_ROOM.idFromName(code);
        return env.GAME_ROOM.get(id).fetch(request);
      }
      // Browser navigation → SPA shell (root serves index.html without redirect).
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }

    // Client-only matches (dev playground + vs-bots): SPA shell, no DO.
    if (
      url.pathname === '/playground' ||
      url.pathname.startsWith('/playground/') ||
      url.pathname === '/solo' ||
      url.pathname.startsWith('/solo/')
    ) {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }

    // Pre-rendered SEO pages (glossary + history): real HTML, not the SPA shell.
    const seo = staticSeoRoute(url.pathname);
    if (seo?.kind === 'redirect') {
      return Response.redirect(new URL(seo.to, request.url), seo.status);
    }
    if (seo?.kind === 'asset') {
      return env.ASSETS.fetch(new Request(new URL(seo.path, request.url), request));
    }

    // Static assets (client.js, styles.css) and the SPA shell at "/".
    return env.ASSETS.fetch(request);
  },
};

async function createGame(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const gameType = String(body.gameType ?? 'freeplay');
  const code = generateGameCode();

  await env.DB
    .prepare('INSERT INTO games (id, code, game_type, status) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), code, gameType, 'lobby')
    .run();

  // Initialize the room's authoritative state.
  const id = env.GAME_ROOM.idFromName(code);
  await env.GAME_ROOM
    .get(id)
    .fetch(
      new Request('https://do/init', {
        method: 'POST',
        body: JSON.stringify({ intent: 'init', code, gameType }),
      }),
    );

  return Response.json({ code });
}

async function listGames(env: Env): Promise<Response> {
  const { results } = await env.DB
    .prepare('SELECT code, game_type, status, created_at FROM games ORDER BY created_at DESC LIMIT 50')
    .all();
  return Response.json({ games: results ?? [] });
}
