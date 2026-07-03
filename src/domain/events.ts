/**
 * Match event log — event-sourced source of truth.
 *
 * The match state is rebuilt by replaying these events in order. The in-memory
 * Match in matchStore is a derived view; the DB log is authoritative.
 *
 * Event semantics:
 *  - pocket:      a ball was pocketed by shooter_slot in frame frame_index
 *  - unpocket:    reverses a pocket (undo of a single ball). We record this as
 *                 an event (rather than deleting the original) so the log is
 *                 honest and replays are deterministic.
 *  - frame_end:   the current frame is marked complete and a new frame begins
 *                 on the next pocket event. frame_index points at the frame
 *                 that just ended.
 *  - unfinish_frame: reverses the most recent frame_end. The just-opened
 *                 (empty) next frame is dropped and the previous frame is
 *                 reopened. Only valid when the current frame has no pocket
 *                 events yet (we don’t want to erase balls the user has
 *                 already recorded on the new frame).
 *  - match_end:   match completed (race target reached + user confirmed).
 *  - abandon:     match abandoned without saving final result.
 */

import {
  ballValue,
  isFrameComplete,
  matchWinner,
  playerFramePoints,
  type PocketEvent,
} from './rules';
import {
  breakerForFrame,
  type Frame,
  type Match,
  type Player,
} from './types';

export type MatchEventKind =
  | 'pocket'
  | 'unpocket'
  | 'frame_end'
  | 'unfinish_frame'
  | 'match_end'
  | 'abandon';

export interface MatchEvent {
  seq: number;
  ts: number;
  kind: MatchEventKind;
  frameIndex?: number;
  ballNumber?: number;
  shooterSlot?: 0 | 1;
}

export interface MatchInit {
  id: string;
  players: [Player, Player];
  raceTo: number;
  initialBreakerSlot: 0 | 1;
  startedAt: number;
}

/**
 * Replay all events into a derived Match. The Match always reflects the full
 * authoritative state including which frame is currently active.
 */
export function replayMatch(init: MatchInit, events: MatchEvent[]): Match {
  const frames: Frame[] = [
    {
      index: 0,
      startedAt: init.startedAt,
      events: [],
      breakerSlot: init.initialBreakerSlot,
    },
  ];
  let status: Match['status'] = 'in_progress';
  let endedAt: number | undefined;
  let winnerSlot: 0 | 1 | undefined;

  for (const ev of events) {
    const last = frames[frames.length - 1];
    switch (ev.kind) {
      case 'pocket': {
        if (ev.ballNumber == null || ev.shooterSlot == null) break;
        // Idempotency: skip if already pocketed in this frame.
        if (last.events.some((e) => e.ball === ev.ballNumber)) break;
        const pe: PocketEvent = {
          ball: ev.ballNumber,
          playerSlot: ev.shooterSlot,
          at: ev.ts,
        };
        last.events = [...last.events, pe];
        break;
      }
      case 'unpocket': {
        if (ev.ballNumber == null) break;
        last.events = last.events.filter((e) => e.ball !== ev.ballNumber);
        break;
      }
      case 'frame_end': {
        last.endedAt = ev.ts;
        // Open the next frame; breaker alternates by frame index.
        const nextIndex = frames.length;
        frames.push({
          index: nextIndex,
          startedAt: ev.ts,
          events: [],
          breakerSlot: breakerForFrame(init.initialBreakerSlot, nextIndex),
        });
        break;
      }
      case 'unfinish_frame': {
        // Reopen the previous frame only if the current (last) frame is empty
        // — replay must not silently drop pocketed balls.
        if (frames.length < 2 || last.events.length > 0) break;
        frames.pop();
        const prev = frames[frames.length - 1];
        prev.endedAt = undefined;
        break;
      }
      case 'match_end': {
        status = 'completed';
        endedAt = ev.ts;
        const totals = matchTotalsFromFrames(frames);
        winnerSlot = matchWinner(totals, init.raceTo) ?? undefined;
        break;
      }
      case 'abandon': {
        status = 'abandoned';
        endedAt = ev.ts;
        break;
      }
    }
  }

  return {
    id: init.id,
    players: init.players,
    raceTo: init.raceTo,
    initialBreakerSlot: init.initialBreakerSlot,
    startedAt: init.startedAt,
    endedAt,
    status,
    frames,
    winnerSlot,
  };
}

export function matchTotalsFromFrames(frames: Frame[]): [number, number] {
  let p1 = 0;
  let p2 = 0;
  for (const f of frames) {
    p1 += playerFramePoints(f.events, 0);
    p2 += playerFramePoints(f.events, 1);
  }
  return [p1, p2];
}

/**
 * Returns the active shooter slot after replay.
 *  - During a frame: the slot who most recently pocketed (so the user can
 *    keep tapping balls without re-selecting). Falls back to the current
 *    frame's breaker if no pockets yet.
 *  - After a frame_end (but before any new pocket): the next frame's breaker.
 */
export function activeSlotFromMatch(m: Match): 0 | 1 {
  const last = m.frames[m.frames.length - 1];
  if (last && last.events.length > 0) {
    return last.events[last.events.length - 1].playerSlot;
  }
  return last?.breakerSlot ?? m.initialBreakerSlot;
}

// Re-exports for convenience
export { ballValue, isFrameComplete, matchWinner, playerFramePoints };
