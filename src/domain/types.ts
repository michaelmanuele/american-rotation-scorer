import type { PocketEvent } from './rules';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: number;
  challongeParticipantId?: number;
}

export interface Frame {
  index: number;            // 0-based frame number within the match
  startedAt: number;
  endedAt?: number;
  events: PocketEvent[];    // ordered pocket events
  breakerSlot: 0 | 1;       // who broke this frame (alternating breaks)
}

export type MatchStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Match {
  id: string;
  players: [Player, Player];
  raceTo: number;
  /** Who broke the first frame (the agreed-upon initial breaker). */
  initialBreakerSlot: 0 | 1;
  startedAt: number;
  endedAt?: number;
  status: MatchStatus;
  frames: Frame[];
  winnerSlot?: 0 | 1;
  /** Challonge match id, if this match was started from a Challonge match. */
  challongeMatchId?: number;
  /** Challonge tournament slug, if this match came from Challonge. */
  challongeTournamentSlug?: string;
  /** When (epoch ms) the result was successfully posted to Challonge. */
  postedToChallongeAt?: number;
}

/** Alternating-break rotation: the breaker switches each frame. */
export function breakerForFrame(
  initialBreakerSlot: 0 | 1,
  frameIndex: number
): 0 | 1 {
  return ((initialBreakerSlot + frameIndex) % 2) as 0 | 1;
}

export function playerInitials(p: Player): string {
  const a = p.firstName?.[0] ?? '';
  const b = p.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

export function playerFullName(p: Player): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
}
