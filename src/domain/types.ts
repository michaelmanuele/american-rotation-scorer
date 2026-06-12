import type { PocketEvent } from './rules';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  createdAt: number;
}

export interface Frame {
  index: number;            // 0-based frame number within the match
  startedAt: number;
  endedAt?: number;
  events: PocketEvent[];    // ordered pocket events
}

export type MatchStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Match {
  id: string;
  players: [Player, Player];
  raceTo: number;
  breakerSlot: 0 | 1;
  startedAt: number;
  endedAt?: number;
  status: MatchStatus;
  frames: Frame[];
  winnerSlot?: 0 | 1;
}

export function playerInitials(p: Player): string {
  const a = p.firstName?.[0] ?? '';
  const b = p.lastName?.[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

export function playerFullName(p: Player): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim();
}
