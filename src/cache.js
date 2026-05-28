// ── Tört Qatar — Redis cache layer ─────────────────────────────────────────
// Uses ioredis. Connection string read from REDIS_URL.
// If REDIS_URL is not set all functions are no-ops (returns null/false).
// The server always falls back to PostgreSQL when Redis is unavailable.

import Redis from 'ioredis';

const LB_KEY    = 'lb:global';          // Sorted Set: member=player_id, score=points
const PLAYER_TTL = 60 * 60 * 24 * 7;   // Player hash TTL: 7 days (refreshed on write)

// ── Client ──────────────────────────────────────────────────────────────────
let client = null;

export function isCacheEnabled() {
  return !!process.env.REDIS_URL;
}

function getClient() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on('error', (err) => {
      // Log once per error type, don't crash the server
      console.warn('[Redis] error:', err.message);
    });
    client.on('connect', () => console.log('[Redis] connected'));
  }
  return client;
}

// ── Safe wrapper ─────────────────────────────────────────────────────────────
// All cache calls are wrapped so a Redis outage never breaks the game.
async function safe(fn) {
  if (!isCacheEnabled()) return null;
  try {
    return await fn(getClient());
  } catch (err) {
    console.warn('[Redis] safe call failed:', err.message);
    return null;
  }
}

// ── Player hash key ──────────────────────────────────────────────────────────
const playerKey = (id) => `player:${id}`;

// ── Write a player's stats to Redis after a game ───────────────────────────
// row = { id, name, city, gamesPlayed, wins, points, winStreak, winRate }
export async function lbSync(row) {
  await safe(async (r) => {
    const pipeline = r.pipeline();
    // Sorted Set: score = points (used for fast rank lookups)
    pipeline.zadd(LB_KEY, row.points, row.id);
    // Hash: human-readable data for display
    pipeline.hset(playerKey(row.id), {
      name:        row.name,
      city:        row.city ?? '',
      gamesPlayed: String(row.gamesPlayed ?? 0),
      wins:        String(row.wins ?? 0),
      points:      String(row.points ?? 0),
      winStreak:   String(row.winStreak ?? 0),
      winRate:     String(row.winRate ?? 0),
    });
    pipeline.expire(playerKey(row.id), PLAYER_TTL);
    await pipeline.exec();
  });
}

// ── Seed Redis from PostgreSQL rows on startup ──────────────────────────────
// rows = array of leaderboard rows from DB
export async function lbSeedFromDB(rows) {
  if (!rows.length) return;
  await safe(async (r) => {
    const pipeline = r.pipeline();
    for (const row of rows) {
      pipeline.zadd(LB_KEY, row.points, row.id);
      pipeline.hset(playerKey(row.id), {
        name:        row.name,
        city:        row.city ?? '',
        gamesPlayed: String(row.gamesPlayed ?? 0),
        wins:        String(row.wins ?? 0),
        points:      String(row.points ?? 0),
        winStreak:   String(row.winStreak ?? 0),
        winRate:     String(row.winRate ?? 0),
      });
      pipeline.expire(playerKey(row.id), PLAYER_TTL);
    }
    await pipeline.exec();
    console.log(`[Redis] seeded ${rows.length} players into ${LB_KEY}`);
  });
}

// ── Read top-N leaderboard from Redis ──────────────────────────────────────
// Returns array of leaderboard entries, or null if Redis unavailable.
// city filter is applied after fetch (Redis doesn't filter by city).
export async function lbTop({ limit = 50, city } = {}) {
  return await safe(async (r) => {
    // ZREVRANGE returns ids ordered by score desc
    const ids = await r.zrevrange(LB_KEY, 0, limit * 3 - 1); // over-fetch for city filter
    if (!ids.length) return null;

    const pipeline = r.pipeline();
    for (const id of ids) pipeline.hgetall(playerKey(id));
    const results = await pipeline.exec();

    const entries = [];
    for (let i = 0; i < ids.length; i++) {
      const [err, data] = results[i];
      if (err || !data || !data.name) continue; // stale key, skip

      const entry = {
        id:          ids[i],
        name:        data.name,
        city:        data.city ?? '',
        gamesPlayed: parseInt(data.gamesPlayed) || 0,
        wins:        parseInt(data.wins) || 0,
        points:      parseInt(data.points) || 0,
        winStreak:   parseInt(data.winStreak) || 0,
        winRate:     parseInt(data.winRate) || 0,
      };

      if (city && entry.city !== city) continue;
      entries.push(entry);
      if (entries.length >= limit) break;
    }

    return entries.map((e, i) => ({ ...e, rank: i + 1 }));
  });
}

// ── Unique cities from Redis ─────────────────────────────────────────────────
// Returns null if Redis unavailable (fallback to DB).
export async function getCitiesFromCache() {
  return await safe(async (r) => {
    const ids = await r.zrevrange(LB_KEY, 0, -1);
    if (!ids.length) return null;

    const pipeline = r.pipeline();
    for (const id of ids) pipeline.hget(playerKey(id), 'city');
    const results = await pipeline.exec();

    const cities = new Set();
    for (const [err, city] of results) {
      if (!err && city) cities.add(city);
    }
    return [...cities].sort();
  });
}
