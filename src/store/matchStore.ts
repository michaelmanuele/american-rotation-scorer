import { create } from 'zustand';
import {
  ballValue,
  isFrameComplete,
  matchWinner,
  playerFramePoints,
} from '@/domain/rules';
import {
  type Frame,
  type Match,
  type Player,
} from '@/domain/types';
import {
  activeSlotFromMatch,
  type MatchEvent,
} from '@/domain/events';
import {
  appendEvent,
  createMatch,
  findInProgress,
  loadInProgressFull,
  loadMatchFull,
} from '@/db/matches';

interface NewMatchInput {
  players: [Player, Player];
  raceTo: number;
  initialBreakerSlot: 0 | 1;
}

interface MatchState {
  current: Match | null;
  activeSlot: 0 | 1;
  /** All events loaded for the current match (kept in memory for fast replay). */
  events: MatchEvent[];
  /** True once a hydration attempt at boot has completed. */
  hydrated: boolean;

  // Lifecycle
  hydrateFromDB: () => Promise<void>;
  startMatch: (input: NewMatchInput) => Promise<void>;
  resumeMatch: (matchId: string) => Promise<void>;

  // Scoring actions (each persists to DB)
  setActiveSlot: (slot: 0 | 1) => void;
  pocketBall: (ball: number) => Promise<void>;
  unpocketBall: (ball: number) => Promise<void>;
  undoLast: () => Promise<void>;
  nextFrame: () => Promise<void>;
  endMatch: () => Promise<Match | null>;
  abandonMatch: () => Promise<void>;

  // Selectors
  currentFrame: () => Frame | null;
  currentBreakerSlot: () => 0 | 1 | null;
  matchTotals: () => [number, number];
  frameTotals: () => [number, number];
  pocketedBy: () => Record<number, 0 | 1 | undefined>;
  isCurrentFrameComplete: () => boolean;
  winnerSlot: () => 0 | 1 | null;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  current: null,
  activeSlot: 0,
  events: [],
  hydrated: false,

  /**
   * Boot-time hydration: if an in-progress match exists in the DB, load and
   * replay it so the user can resume. Otherwise leave current=null.
   */
  hydrateFromDB: async () => {
    if (get().hydrated) return;
    try {
      const match = await loadInProgressFull();
      if (match) {
        set({
          current: match,
          activeSlot: activeSlotFromMatch(match),
          events: [], // not strictly needed; we never read these without reloading
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  startMatch: async ({ players, raceTo, initialBreakerSlot }) => {
    // Safety: if a stale in-progress match exists in the DB (e.g. from a
    // prior crash that the user dismissed by ignoring the resume banner),
    // mark it abandoned before starting a new one so the schema invariant
    // "at most one in-progress match" holds.
    const stale = await findInProgress();
    if (stale) {
      await appendEvent(stale.id, { kind: 'abandon' });
    }
    const { id } = await createMatch({
      players,
      raceTo,
      initialBreakerSlot,
    });
    // Load the just-created match through the same replay path used everywhere
    // else, so initial state is constructed identically to a resume.
    const fresh = await loadMatchFull(id);
    if (fresh) {
      set({
        current: fresh,
        events: [],
        activeSlot: activeSlotFromMatch(fresh),
      });
    }
  },

  resumeMatch: async (matchId) => {
    const match = await loadMatchFull(matchId);
    if (!match) return;
    set({
      current: match,
      activeSlot: activeSlotFromMatch(match),
      events: [],
    });
  },

  setActiveSlot: (slot) => set({ activeSlot: slot }),

  pocketBall: async (ball) => {
    const { current, activeSlot } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    if (frame.events.some((e) => e.ball === ball)) return; // already pocketed
    const { match } = await appendEvent(current.id, {
      kind: 'pocket',
      frameIndex: frame.index,
      ballNumber: ball,
      shooterSlot: activeSlot,
    });
    applyFresh(set, get, match);
  },

  unpocketBall: async (ball) => {
    const { current } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    if (!frame.events.some((e) => e.ball === ball)) return;
    const { match } = await appendEvent(current.id, {
      kind: 'unpocket',
      frameIndex: frame.index,
      ballNumber: ball,
    });
    applyFresh(set, get, match);
  },

  undoLast: async () => {
    const { current } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    // Only undo within the current frame. Crossing back across a frame
    // boundary would require an undo_frame_end event; not in MVP.
    if (frame.events.length === 0) return;
    const last = frame.events[frame.events.length - 1];
    const { match } = await appendEvent(current.id, {
      kind: 'unpocket',
      frameIndex: frame.index,
      ballNumber: last.ball,
    });
    applyFresh(set, get, match);
  },

  nextFrame: async () => {
    const { current } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    if (!isFrameComplete(frame.events)) return;
    const { match } = await appendEvent(current.id, {
      kind: 'frame_end',
      frameIndex: frame.index,
    });
    applyFresh(set, get, match);
  },

  endMatch: async () => {
    const { current } = get();
    if (!current) return null;
    const { match } = await appendEvent(current.id, { kind: 'match_end' });
    // Clear in-memory match so navigation away from scoring doesn't show stale data.
    set({ current: null, events: [], activeSlot: 0 });
    return match;
  },

  abandonMatch: async () => {
    const { current } = get();
    if (!current) {
      set({ current: null, events: [], activeSlot: 0 });
      return;
    }
    await appendEvent(current.id, { kind: 'abandon' });
    set({ current: null, events: [], activeSlot: 0 });
  },

  currentFrame: () => {
    const { current } = get();
    if (!current) return null;
    return current.frames[current.frames.length - 1] ?? null;
  },

  currentBreakerSlot: () => {
    const frame = get().currentFrame();
    return frame?.breakerSlot ?? null;
  },

  matchTotals: () => {
    const { current } = get();
    if (!current) return [0, 0];
    let p1 = 0;
    let p2 = 0;
    for (const f of current.frames) {
      p1 += playerFramePoints(f.events, 0);
      p2 += playerFramePoints(f.events, 1);
    }
    return [p1, p2];
  },

  frameTotals: () => {
    const frame = get().currentFrame();
    if (!frame) return [0, 0];
    return [
      playerFramePoints(frame.events, 0),
      playerFramePoints(frame.events, 1),
    ];
  },

  pocketedBy: () => {
    const frame = get().currentFrame();
    const map: Record<number, 0 | 1 | undefined> = {};
    if (!frame) return map;
    for (const e of frame.events) map[e.ball] = e.playerSlot;
    return map;
  },

  isCurrentFrameComplete: () => {
    const frame = get().currentFrame();
    return !!frame && isFrameComplete(frame.events);
  },

  winnerSlot: () => {
    const { current } = get();
    if (!current) return null;
    return matchWinner(get().matchTotals(), current.raceTo);
  },
}));

/**
 * Apply a freshly-replayed Match (returned from appendEvent) into the store.
 *
 * activeSlot rules:
 *  - If the frame just advanced (more frames than before), set active to the
 *    new frame's breaker.
 *  - Otherwise preserve the user's current selection. Tapping a ball does
 *    not change who's shooting; the user does that explicitly via the card
 *    tap.
 */
function applyFresh(
  set: (partial: Partial<MatchState>) => void,
  get: () => MatchState,
  fresh: Match | null
) {
  if (!fresh) return;
  const prev = get();
  if (!prev.current) {
    set({ current: fresh, activeSlot: activeSlotFromMatch(fresh) });
    return;
  }
  const prevFrames = prev.current.frames.length;
  const newFrames = fresh.frames.length;
  let activeSlot = prev.activeSlot;
  if (newFrames > prevFrames) {
    const newFrame = fresh.frames[fresh.frames.length - 1];
    activeSlot = newFrame.breakerSlot;
  }
  set({ current: fresh, activeSlot });
}

export { ballValue };

// Re-export Player type for backwards-compat consumers.
export type { Player };

// Used by Home banner to show an at-a-glance label without loading events.
export { findInProgress } from '@/db/matches';
