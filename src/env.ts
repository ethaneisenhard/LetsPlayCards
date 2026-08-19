export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  DB: D1Database;
  GAME_ROOM: DurableObjectNamespace;
  SESSION_SECRET?: string;
}
