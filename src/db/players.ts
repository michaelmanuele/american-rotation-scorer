import { getDB } from './database';
import type { Player } from '@/domain/types';

interface PlayerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: number;
  updated_at: number;
  challonge_participant_id: number | null;
}

function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone ?? undefined,
    createdAt: r.created_at,
    challongeParticipantId: r.challonge_participant_id ?? undefined,
  };
}

export async function findPlayerByChallongeId(
  challongeParticipantId: number
): Promise<Player | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<PlayerRow>(
    `SELECT * FROM players WHERE challonge_participant_id = ?`,
    challongeParticipantId
  );
  return row ? rowToPlayer(row) : null;
}

export async function linkPlayerToChallonge(
  playerId: string,
  challongeParticipantId: number
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE players SET challonge_participant_id = ?, updated_at = ? WHERE id = ?`,
    [challongeParticipantId, Date.now(), playerId]
  );
}

export async function listPlayers(): Promise<Player[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<PlayerRow>(
    `SELECT * FROM players ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE`
  );
  return rows.map(rowToPlayer);
}

export async function getPlayer(id: string): Promise<Player | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<PlayerRow>(
    `SELECT * FROM players WHERE id = ?`,
    id
  );
  return row ? rowToPlayer(row) : null;
}

export interface PlayerInput {
  firstName: string;
  lastName?: string;
  phone?: string;
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const db = await getDB();
  const now = Date.now();
  const id = `p_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    `INSERT INTO players(id, first_name, last_name, phone, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.firstName.trim(),
      (input.lastName ?? '').trim(),
      input.phone?.trim() || null,
      now,
      now,
    ]
  );
  return {
    id,
    firstName: input.firstName.trim(),
    lastName: (input.lastName ?? '').trim(),
    phone: input.phone?.trim() || undefined,
    createdAt: now,
  };
}

export async function updatePlayer(
  id: string,
  patch: PlayerInput
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  await db.runAsync(
    `UPDATE players
       SET first_name = ?, last_name = ?, phone = ?, updated_at = ?
     WHERE id = ?`,
    [
      patch.firstName.trim(),
      (patch.lastName ?? '').trim(),
      patch.phone?.trim() || null,
      now,
      id,
    ]
  );
}

export async function deletePlayer(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM players WHERE id = ?`, id);
}

/**
 * Substring search across first/last name (case-insensitive).
 * Returns all players if query is empty.
 */
export async function searchPlayers(query: string): Promise<Player[]> {
  const q = query.trim();
  if (!q) return listPlayers();
  const db = await getDB();
  const like = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db.getAllAsync<PlayerRow>(
    `SELECT * FROM players
       WHERE first_name LIKE ? ESCAPE '\\'
          OR last_name LIKE ? ESCAPE '\\'
          OR (first_name || ' ' || last_name) LIKE ? ESCAPE '\\'
       ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE`,
    [like, like, like]
  );
  return rows.map(rowToPlayer);
}
