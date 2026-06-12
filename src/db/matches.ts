import { getDB } from './database';
import { getPlayer } from './players';
import {
  replayMatch,
  type MatchEvent,
  type MatchEventKind,
  type MatchInit,
} from '@/domain/events';
import { matchTotalsFromFrames } from '@/domain/events';
import type { Match, MatchStatus, Player } from '@/domain/types';

/* ----------------------------- Row types ----------------------------- */

interface MatchRow {
  id: string;
  player1_id: string;
  player2_id: string;
  race_to: number;
  initial_breaker_slot: number;
  status: MatchStatus;
  winner_slot: number | null;
  started_at: number;
  ended_at: number | null;
  p1_score: number;
  p2_score: number;
  frames_played: number;
}

interface EventRow {
  id: number;
  match_id: string;
  seq: number;
  ts: number;
  kind: MatchEventKind;
  frame_index: number | null;
  ball_number: number | null;
  shooter_slot: number | null;
}

/* ------------------------- Public API types ------------------------- */

export interface CreateMatchInput {
  players: [Player, Player];
  raceTo: number;
  initialBreakerSlot: 0 | 1;
}

export interface MatchSummary {
  id: string;
  player1: Player;
  player2: Player;
  raceTo: number;
  status: MatchStatus;
  winnerSlot: 0 | 1 | null;
  startedAt: number;
  endedAt: number | null;
  p1Score: number;
  p2Score: number;
  framesPlayed: number;
}

/* ----------------------------- Helpers ----------------------------- */

function genMatchId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function eventRowToEvent(r: EventRow): MatchEvent {
  return {
    seq: r.seq,
    ts: r.ts,
    kind: r.kind,
    frameIndex: r.frame_index ?? undefined,
    ballNumber: r.ball_number ?? undefined,
    shooterSlot: r.shooter_slot === null ? undefined : (r.shooter_slot as 0 | 1),
  };
}

/* ------------------------ Create / read ops ------------------------ */

export async function createMatch(
  input: CreateMatchInput
): Promise<{ id: string; startedAt: number }> {
  const db = await getDB();
  const id = genMatchId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO matches (
        id, player1_id, player2_id, race_to, initial_breaker_slot,
        status, started_at, p1_score, p2_score, frames_played
      ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, 0, 0, 1)`,
    [
      id,
      input.players[0].id,
      input.players[1].id,
      input.raceTo,
      input.initialBreakerSlot,
      now,
    ]
  );
  return { id, startedAt: now };
}

/**
 * Append a single event to the match log AND update the snapshot fields on
 * the matches row so History can render without replaying.
 *
 * Returns BOTH the written event and the freshly replayed Match so callers
 * (matchStore) can update in-memory state without a second round-trip.
 *
 * The next seq is computed inside a transaction to avoid races.
 */
export async function appendEvent(
  matchId: string,
  ev: Omit<MatchEvent, 'seq' | 'ts'> & { ts?: number }
): Promise<{ event: MatchEvent; match: Match | null }> {
  const db = await getDB();
  const ts = ev.ts ?? Date.now();

  let written!: MatchEvent;
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ max_seq: number | null }>(
      `SELECT MAX(seq) AS max_seq FROM match_events WHERE match_id = ?`,
      matchId
    );
    const nextSeq = (row?.max_seq ?? 0) + 1;
    await db.runAsync(
      `INSERT INTO match_events
        (match_id, seq, ts, kind, frame_index, ball_number, shooter_slot)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        nextSeq,
        ts,
        ev.kind,
        ev.frameIndex ?? null,
        ev.ballNumber ?? null,
        ev.shooterSlot ?? null,
      ]
    );
    written = {
      seq: nextSeq,
      ts,
      kind: ev.kind,
      frameIndex: ev.frameIndex,
      ballNumber: ev.ballNumber,
      shooterSlot: ev.shooterSlot,
    };
  });

  // Load the fresh match (single round-trip — replay is in-memory) and use
  // it both to update the snapshot row AND to return to the caller.
  const match = await loadMatchFull(matchId);
  if (match) {
    const totals = matchTotalsFromFrames(match.frames);
    await db.runAsync(
      `UPDATE matches
         SET p1_score = ?,
             p2_score = ?,
             frames_played = ?,
             status = ?,
             winner_slot = ?,
             ended_at = ?
       WHERE id = ?`,
      [
        totals[0],
        totals[1],
        match.frames.length,
        match.status,
        match.winnerSlot ?? null,
        match.endedAt ?? null,
        matchId,
      ]
    );
  }
  return { event: written, match };
}

async function loadEvents(matchId: string): Promise<MatchEvent[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<EventRow>(
    `SELECT * FROM match_events WHERE match_id = ? ORDER BY seq ASC`,
    matchId
  );
  return rows.map(eventRowToEvent);
}

async function loadMatchRow(matchId: string): Promise<MatchRow | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<MatchRow>(
    `SELECT * FROM matches WHERE id = ?`,
    matchId
  );
  return row ?? null;
}

/**
 * Load a match + its events and replay to a full derived Match. Returns null
 * if the match doesn't exist or its players have been deleted.
 */
export async function loadMatchFull(matchId: string): Promise<Match | null> {
  const row = await loadMatchRow(matchId);
  if (!row) return null;
  const [p1, p2] = await Promise.all([
    getPlayer(row.player1_id),
    getPlayer(row.player2_id),
  ]);
  if (!p1 || !p2) return null;
  const events = await loadEvents(matchId);
  const init: MatchInit = {
    id: row.id,
    players: [p1, p2],
    raceTo: row.race_to,
    initialBreakerSlot: row.initial_breaker_slot as 0 | 1,
    startedAt: row.started_at,
  };
  return replayMatch(init, events);
}

/**
 * Returns the in-progress match (there should be at most one), or null.
 */
export async function findInProgress(): Promise<MatchSummary | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<MatchRow>(
    `SELECT * FROM matches WHERE status = 'in_progress'
     ORDER BY started_at DESC LIMIT 1`
  );
  if (!row) return null;
  return rowToSummary(row);
}

/**
 * Lightweight list for the History screen — only completed matches by default.
 */
export async function listCompletedMatches(): Promise<MatchSummary[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<MatchRow>(
    `SELECT * FROM matches WHERE status = 'completed'
     ORDER BY ended_at DESC, started_at DESC`
  );
  const out: MatchSummary[] = [];
  for (const r of rows) {
    const s = await rowToSummary(r);
    if (s) out.push(s);
  }
  return out;
}

async function rowToSummary(row: MatchRow): Promise<MatchSummary | null> {
  const [p1, p2] = await Promise.all([
    getPlayer(row.player1_id),
    getPlayer(row.player2_id),
  ]);
  if (!p1 || !p2) return null;
  return {
    id: row.id,
    player1: p1,
    player2: p2,
    raceTo: row.race_to,
    status: row.status,
    winnerSlot: row.winner_slot === null ? null : (row.winner_slot as 0 | 1),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    p1Score: row.p1_score,
    p2Score: row.p2_score,
    framesPlayed: row.frames_played,
  };
}

export async function deleteMatch(matchId: string): Promise<void> {
  const db = await getDB();
  // ON DELETE CASCADE handles match_events
  await db.runAsync(`DELETE FROM matches WHERE id = ?`, matchId);
}

/**
 * Used for resume: load the in-progress match fully into memory.
 */
export async function loadInProgressFull(): Promise<Match | null> {
  const summary = await findInProgress();
  if (!summary) return null;
  return loadMatchFull(summary.id);
}
