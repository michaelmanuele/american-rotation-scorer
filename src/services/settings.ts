/**
 * App settings for Challonge integration.
 *
 *   - API key:        expo-secure-store (iOS Keychain / Android Keystore)
 *   - Tournament slug: meta table in SQLite (`challonge.slug`)
 *   - My participant id: meta table in SQLite (`challonge.my_participant_id`)
 */
import * as SecureStore from 'expo-secure-store';
import { getDB } from '@/db/database';

const KEY_API_KEY = 'challonge_api_key';
const META_SLUG = 'challonge.slug';
const META_MY_PARTICIPANT_ID = 'challonge.my_participant_id';

export async function getApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_API_KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_API_KEY, apiKey.trim());
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_API_KEY).catch(() => {});
}

async function readMeta(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)`,
    [key, value]
  );
}

async function deleteMeta(key: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM meta WHERE key = ?`, key);
}

export async function getTournamentSlug(): Promise<string | null> {
  return readMeta(META_SLUG);
}

export async function setTournamentSlug(slug: string): Promise<void> {
  await writeMeta(META_SLUG, slug);
}

export async function getMyParticipantId(): Promise<number | null> {
  const v = await readMeta(META_MY_PARTICIPANT_ID);
  return v ? Number.parseInt(v, 10) : null;
}

export async function setMyParticipantId(id: number): Promise<void> {
  await writeMeta(META_MY_PARTICIPANT_ID, String(id));
}

export async function clearChallongeSettings(): Promise<void> {
  await clearApiKey();
  await deleteMeta(META_SLUG);
  await deleteMeta(META_MY_PARTICIPANT_ID);
}

export interface ChallongeSettings {
  apiKey: string | null;
  slug: string | null;
  myParticipantId: number | null;
}

export async function loadChallongeSettings(): Promise<ChallongeSettings> {
  const [apiKey, slug, myParticipantId] = await Promise.all([
    getApiKey(),
    getTournamentSlug(),
    getMyParticipantId(),
  ]);
  return { apiKey, slug, myParticipantId };
}
