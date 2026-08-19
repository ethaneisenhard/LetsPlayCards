import type { Env } from '../env';
import {
  addPlayer,
  applyAction,
  createLobbyState,
  publicView,
  type EngineState,
  type GameAction,
} from '../game/engine';
import { GAME_REGISTRY } from '../game/registry/registry';
import { GAME_CONFIGS, catalogEntry } from '../game/registry/catalog';
import { DEFAULT_FREEPLAY_RULES } from '../game/types';
import type { GameSettings } from '../game/types';
import type { GameType } from '../game/gameTypes';

/**
 * One Durable Object per game. Holds the authoritative EngineState (in-memory +
 * durable storage) and fans state changes out to every connected WebSocket,
 * personalized per socket so each player only sees their own hand.
 * Game-agnostic: all rules live in the registry, dispatched via applyAction.
 */
export class GameRoom {
  private state: EngineState | null = null;
  private sockets = new Set<WebSocket>();
  private playerIds = new Map<WebSocket, string | undefined>();

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}

  private async load(): Promise<EngineState> {
    if (!this.state) {
      const stored = await this.ctx.storage.get<EngineState>('state');
      if (!stored) throw new Error('Room not initialized');
      this.state = stored;
    }
    return this.state;
  }

  private async save(state: EngineState): Promise<void> {
    this.state = state;
    await this.ctx.storage.put('state', state);
    try {
      await this.env.DB.prepare('UPDATE games SET status = ? WHERE code = ?')
        .bind(state.game.status, state.game.code)
        .run();
    } catch {
      /* non-fatal — D1 index sync is best-effort */
    }
  }

  private viewFor(state: EngineState, viewerId?: string): unknown {
    const game = GAME_REGISTRY[state.game.gameType];
    return game?.view ? game.view(state, viewerId) : publicView(state, viewerId);
  }

  private send(ws: WebSocket, msg: unknown): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* ignore */
    }
  }

  private broadcast(state: EngineState): void {
    for (const ws of this.sockets) {
      this.send(ws, { type: 'state', state: this.viewFor(state, this.playerIds.get(ws)) });
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return this.handleUpgrade();
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    try {
      if (body.intent === 'init') {
        const code = String(body.code ?? '').toUpperCase();
        const gameType = (body.gameType ?? 'freeplay') as GameType;
        const config = catalogEntry(gameType)?.config ?? GAME_CONFIGS.freeplay;
        const settings: GameSettings = {
          dealCount: config.dealCount === 'all' ? 0 : config.dealCount,
          maxPlayers: config.maxPlayers,
        };
        if (gameType === 'freeplay') {
          settings.freeplay = { ...DEFAULT_FREEPLAY_RULES };
        }
        await this.save(createLobbyState(crypto.randomUUID(), code, gameType, settings));
        return Response.json({ ok: true, code });
      }

      const url = new URL(request.url);
      const viewerId =
        (typeof body.playerId === 'string' ? body.playerId : undefined) ??
        url.searchParams.get('playerId') ??
        undefined;

      if (!body.intent) {
        const state = await this.load();
        return Response.json({ state: this.viewFor(state, viewerId) });
      }

      const state = await this.load();

      if (body.intent === 'join') {
        const name = String(body.name ?? '').trim().slice(0, 20);
        if (!name) return Response.json({ error: 'Please enter your name.' }, { status: 400 });
        const playerId = crypto.randomUUID();
        const next = addPlayer(state, playerId, name);
        await this.save(next);
        this.broadcast(next);
        return Response.json({ ok: true, playerId, state: this.viewFor(next, playerId) });
      }

      const next = applyAction(state, body as unknown as GameAction);
      await this.save(next);
      this.broadcast(next);
      return Response.json({ ok: true, state: this.viewFor(next, viewerId) });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 400 },
      );
    }
  }

  private handleUpgrade(): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    this.ctx.acceptWebSocket(server);
    this.sockets.add(server);
    this.playerIds.set(server, undefined);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      this.send(ws, { type: 'error', error: 'Invalid JSON' });
      return;
    }

    if (data.type === 'hello') {
      if (typeof data.playerId === 'string') this.playerIds.set(ws, data.playerId);
      try {
        const state = await this.load();
        this.send(ws, { type: 'state', state: this.viewFor(state, this.playerIds.get(ws)) });
      } catch (err) {
        this.send(ws, { type: 'error', error: err instanceof Error ? err.message : String(err) });
      }
      return;
    }

    try {
      const state = await this.load();
      if (typeof data.playerId === 'string') this.playerIds.set(ws, data.playerId);
      const next = applyAction(state, data as unknown as GameAction);
      await this.save(next);
      this.broadcast(next);
    } catch (err) {
      this.send(ws, { type: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sockets.delete(ws);
    this.playerIds.delete(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.sockets.delete(ws);
    this.playerIds.delete(ws);
  }
}
