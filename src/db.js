// ── Tört Qatar — PostgreSQL persistence layer ──────────────────────────────
// Uses the `pg` package (node-postgres). Connection string read from DATABASE_URL.
// If DATABASE_URL is not set the module exports a no-op stub so the server
// can still start in local dev without a database.

import pg from 'pg';
const { Pool } = pg;

// ── Connection pool ─────────────────────────────────────────────────────────
let pool = null;

export function isDbEnabled() {
  return !!process.env.DATABASE_URL;
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('render.com')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

// ── Migrations ──────────────────────────────────────────────────────────────
// Idempotent: safe to run on every server startup.
const MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS players (
    id          TEXT PRIMARY KEY,         -- uuidv4
    name        TEXT NOT NULL,
    city        TEXT NOT NULL DEFAULT '',
    provider    TEXT NOT NULL DEFAULT 'guest', -- 'guest' | 'google'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS player_scores (
    player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    games_played INT  NOT NULL DEFAULT 0,
    wins         INT  NOT NULL DEFAULT 0,
    points       INT  NOT NULL DEFAULT 0,
    win_streak   INT  NOT NULL DEFAULT 0,
    win_rate     INT  NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id)
  );

  CREATE TABLE IF NOT EXISTS game_history (
    id          BIGSERIAL PRIMARY KEY,
    player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    game_type   TEXT NOT NULL,             -- 'pvp' | 'ai/easy' | 'ai/medium' | 'ai/hard' | 'ai/gemini'
    won         BOOLEAN NOT NULL,
    draw        BOOLEAN NOT NULL DEFAULT FALSE,
    points_earned INT NOT NULL DEFAULT 0,
    played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_game_history_player ON game_history(player_id);
  CREATE INDEX IF NOT EXISTS idx_player_scores_points ON player_scores(points DESC);
`;

export async function runMigrations() {
  if (!isDbEnabled()) {
    console.log('[DB] DATABASE_URL not set — skipping migrations (using JSON file fallback)');
    return;
  }
  try {
    await getPool().query(MIGRATIONS);
    console.log('[DB] Migrations OK');
  } catch (err) {
    console.error('[DB] Migration failed:', err.message);
    throw err;
  }
}

// ── Player upsert ───────────────────────────────────────────────────────────
// Find or create a player row. Returns the player row.
export async function upsertPlayer({ id, name, city, provider = 'guest' }) {
  const { rows } = await getPool().query(
    `INSERT INTO players (id, name, city, provider)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           city = EXCLUDED.city
     RETURNING *`,
    [id, name, city || '', provider]
  );
  return rows[0];
}

// ── Streak bonus (mirrors server.js logic) ──────────────────────────────────
function streakBonus(streak) {
  if (streak >= 5) return 20;
  if (streak === 4) return 15;
  if (streak === 3) return 10;
  if (streak === 2) return 5;
  return 0;
}

// ── Win points table ─────────────────────────────────────────────────────────
const WIN_POINTS = {
  pvp: 20, 'ai/easy': 10, 'ai/medium': 15, 'ai/hard': 25, 'ai/gemini': 35,
};

// ── Record game result ──────────────────────────────────────────────────────
// Upserts player + score row atomically.
// Returns { scoreRow, pointsEarned } where pointsEarned includes streak bonus.
export async function recordGame({ id, name, city, provider = 'guest', won, draw = false, gameType }) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Ensure player exists
    await client.query(
      `INSERT INTO players (id, name, city, provider)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city`,
      [id, name, city || '', provider]
    );

    // Read current streak so we can compute bonus before the UPDATE
    const { rows: existing } = await client.query(
      `SELECT win_streak FROM player_scores WHERE player_id = $1`,
      [id]
    );
    const currentStreak = existing[0]?.win_streak ?? 0;
    const newStreak     = won ? currentStreak + 1 : 0;

    // Compute points
    let pointsEarned = 2; // participation
    if (draw) {
      pointsEarned = 5;
    } else if (won) {
      const base = WIN_POINTS[gameType] ?? WIN_POINTS['ai/medium'];
      pointsEarned = base + streakBonus(newStreak);
    }

    const winIncr = won ? 1 : 0;
    const { rows } = await client.query(
      `INSERT INTO player_scores (player_id, games_played, wins, points, win_streak, win_rate)
       VALUES ($1, 1, $2, $3, $4, $5)
       ON CONFLICT (player_id) DO UPDATE SET
         games_played = player_scores.games_played + 1,
         wins         = player_scores.wins + $2,
         points       = player_scores.points + $3,
         win_streak   = $4,
         win_rate     = ROUND(
                          (player_scores.wins + $2)::numeric /
                          (player_scores.games_played + 1) * 100
                        )::int,
         updated_at   = NOW()
       RETURNING *`,
      [id, winIncr, pointsEarned, newStreak, won ? 100 : 0]
    );

    // Log game in history
    await client.query(
      `INSERT INTO game_history (player_id, game_type, won, draw, points_earned)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, gameType, won, draw, pointsEarned]
    );

    await client.query('COMMIT');
    return { scoreRow: rows[0], pointsEarned };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Find player by name+city (case-insensitive) ─────────────────────────────
// Used to dedupe leaderboard: same player coming back from a new browser/session
// without a stored id should attach to their existing row instead of creating
// a duplicate. Returns the most recently active player_id, or null.
export async function findPlayerByNameCity(name, city) {
  if (!name) return null;
  const { rows } = await getPool().query(
    `SELECT p.id
     FROM players p
     LEFT JOIN player_scores s ON s.player_id = p.id
     WHERE LOWER(p.name) = LOWER($1)
       AND LOWER(p.city) = LOWER($2)
     ORDER BY s.updated_at DESC NULLS LAST, p.created_at DESC
     LIMIT 1`,
    [name, city || '']
  );
  return rows[0]?.id ?? null;
}

// ── Leaderboard query ───────────────────────────────────────────────────────
// Returns top `limit` UNIQUE players (aggregated by case-insensitive name+city
// in case legacy duplicate rows exist), optionally filtered by city.
export async function getLeaderboardFromDB({ city, limit = 50 } = {}) {
  const params = [limit];
  const cityClause = city
    ? (params.push(city), `AND LOWER(p.city) = LOWER($${params.length})`)
    : '';

  const { rows } = await getPool().query(
    `SELECT
       (array_agg(p.id  ORDER BY s.updated_at DESC NULLS LAST))[1] AS id,
       (array_agg(p.name ORDER BY s.updated_at DESC NULLS LAST))[1] AS name,
       (array_agg(p.city ORDER BY s.updated_at DESC NULLS LAST))[1] AS city,
       SUM(s.games_played)::int AS "gamesPlayed",
       SUM(s.wins)::int         AS "wins",
       SUM(s.points)::int       AS "points",
       MAX(s.win_streak)::int   AS "winStreak",
       CASE
         WHEN SUM(s.games_played) > 0
           THEN ROUND(SUM(s.wins)::numeric / SUM(s.games_played) * 100)::int
         ELSE 0
       END                       AS "winRate"
     FROM player_scores s
     JOIN players p ON p.id = s.player_id
     WHERE TRUE ${cityClause}
     GROUP BY LOWER(p.name), LOWER(p.city)
     ORDER BY SUM(s.points) DESC, SUM(s.wins) DESC
     LIMIT $1`,
    params
  );

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── Unique cities ────────────────────────────────────────────────────────────
export async function getCitiesFromDB() {
  const { rows } = await getPool().query(
    `SELECT DISTINCT p.city
     FROM player_scores s
     JOIN players p ON p.id = s.player_id
     WHERE p.city <> ''
     ORDER BY p.city`
  );
  return rows.map(r => r.city);
}
