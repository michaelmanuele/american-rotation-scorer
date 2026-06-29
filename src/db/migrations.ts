import type * as SQLite from 'expo-sqlite';

/**
 * Each migration runs exactly once, in order, idempotently per database.
 * Add new migrations to the end; never reorder or modify existing ones.
 */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL DEFAULT '',
        phone TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_players_first ON players(first_name);
      CREATE INDEX IF NOT EXISTS idx_players_last ON players(last_name);
    `,
  },
  {
    version: 2,
    sql: `
      -- Matches: one row per match. Snapshot fields kept in sync for fast list rendering.
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        player1_id TEXT NOT NULL,
        player2_id TEXT NOT NULL,
        race_to INTEGER NOT NULL,
        initial_breaker_slot INTEGER NOT NULL,
        status TEXT NOT NULL,                 -- 'in_progress' | 'completed' | 'abandoned'
        winner_slot INTEGER,                  -- 0 | 1 | null
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        p1_score INTEGER NOT NULL DEFAULT 0,
        p2_score INTEGER NOT NULL DEFAULT 0,
        frames_played INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player1_id) REFERENCES players(id),
        FOREIGN KEY (player2_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_matches_status_started
        ON matches(status, started_at DESC);

      -- Append-only event log. Replay = source of truth.
      CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        ts INTEGER NOT NULL,
        kind TEXT NOT NULL,                   -- 'pocket' | 'unpocket' | 'frame_end' | 'match_end' | 'abandon'
        frame_index INTEGER,
        ball_number INTEGER,
        shooter_slot INTEGER,
        UNIQUE(match_id, seq),
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_match_events_match
        ON match_events(match_id, seq);
    `,
  },
  {
    version: 3,
    sql: `
      -- Challonge integration: link local players + matches to Challonge entities.
      ALTER TABLE players ADD COLUMN challonge_participant_id INTEGER;
      ALTER TABLE matches ADD COLUMN challonge_match_id INTEGER;
      ALTER TABLE matches ADD COLUMN challonge_tournament_slug TEXT;
      ALTER TABLE matches ADD COLUMN posted_to_challonge_at INTEGER;
      CREATE INDEX IF NOT EXISTS idx_players_challonge
        ON players(challonge_participant_id);
      CREATE INDEX IF NOT EXISTS idx_matches_challonge
        ON matches(challonge_match_id);
    `,
  },
];

const CURRENT_VERSION_KEY = 'schema_version';

export async function runMigrations(db: SQLite.SQLiteDatabase) {
  // Ensure meta exists before reading
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`
  );
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    CURRENT_VERSION_KEY
  );
  const current = row ? Number.parseInt(row.value, 10) : 0;

  for (const m of MIGRATIONS) {
    if (m.version > current) {
      await db.execAsync(m.sql);
      await db.runAsync(
        `INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)`,
        [CURRENT_VERSION_KEY, String(m.version)]
      );
    }
  }
}
