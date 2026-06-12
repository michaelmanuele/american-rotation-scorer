/**
 * American Rotation rules (MVP).
 *
 * - 1 frame = 1 rack of 15 balls
 * - Balls 1-10 = 1 pt each
 * - Balls 11-15 = 2 pts each
 * - Frame max = 20 pts
 * - Frame ends when all 15 balls are pocketed
 * - Match = race to N cumulative points
 */
export const BALLS: readonly number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const;

export const FRAME_MAX_POINTS = 20;

/** Point value of a single ball. */
export function ballValue(ball: number): number {
  if (ball < 1 || ball > 15) {
    throw new Error(`Invalid ball number: ${ball}`);
  }
  return ball <= 10 ? 1 : 2;
}

/** Standard solid (1-7) / 8-ball / stripe (9-15) classification for rendering. */
export type BallClass = 'solid' | 'eight' | 'stripe';
export function ballClass(ball: number): BallClass {
  if (ball === 8) return 'eight';
  return ball < 8 ? 'solid' : 'stripe';
}

/** Standard pool ball base colors (used inside the colored stripe/circle of the rendered ball). */
export const BALL_COLORS: Record<number, string> = {
  1: '#F2C200', // yellow
  2: '#1B4FA0', // blue
  3: '#C9252C', // red
  4: '#6A2A82', // purple
  5: '#E07A1F', // orange
  6: '#1F7A3D', // green
  7: '#7A1F1F', // maroon/brown
  8: '#0E0E0E', // black
  9: '#F2C200',
  10: '#1B4FA0',
  11: '#C9252C',
  12: '#6A2A82',
  13: '#E07A1F',
  14: '#1F7A3D',
  15: '#7A1F1F',
};

/** A pocketed ball logged within a frame. */
export interface PocketEvent {
  ball: number;          // 1..15
  playerSlot: 0 | 1;     // who pocketed it
  at: number;            // epoch ms
}

/** Returns true if the frame is complete (all 15 balls pocketed). */
export function isFrameComplete(events: PocketEvent[]): boolean {
  const pocketed = new Set(events.map((e) => e.ball));
  return pocketed.size === 15;
}

/** Sum of points for a player across a list of pocket events. */
export function playerFramePoints(events: PocketEvent[], slot: 0 | 1): number {
  return events
    .filter((e) => e.playerSlot === slot)
    .reduce((sum, e) => sum + ballValue(e.ball), 0);
}

/** Returns winning slot index if match total >= raceTo, else null. */
export function matchWinner(
  matchTotals: [number, number],
  raceTo: number
): 0 | 1 | null {
  if (matchTotals[0] >= raceTo) return 0;
  if (matchTotals[1] >= raceTo) return 1;
  return null;
}
