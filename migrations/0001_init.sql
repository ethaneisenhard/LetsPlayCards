-- LetsPlayCards — Cloudflare D1 schema
-- Authoritative live game state lives in the GameRoom Durable Object.
-- D1 keeps the durable lobby index: code → game id + metadata for listing.

CREATE TABLE IF NOT EXISTS games (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'lobby'
             CHECK (status IN ('lobby', 'playing', 'finished')),
  game_type  TEXT NOT NULL DEFAULT 'freeplay',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_games_code ON games(code);
