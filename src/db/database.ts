import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const DB_NAME = 'arscorer.db';

/**
 * Lazily-initialized SQLite singleton. Safe to call from anywhere — only
 * opens the DB once and runs migrations on first open.
 */
export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    _db = db;
    return db;
  })();
  return _initPromise;
}

/** For tests / cold restarts only. */
export async function closeDB() {
  if (_db) {
    await _db.closeAsync();
    _db = null;
    _initPromise = null;
  }
}
