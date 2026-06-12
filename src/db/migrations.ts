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
