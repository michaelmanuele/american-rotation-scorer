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
  /** Optional Challonge link, persisted on the match row. */
  challongeMatchId?: number;
  challongeTournamentSlug?: string;
}

interface MatchState {
  current: Match | null;
  activeSlot: 0 | 1;
  /** All events loaded for the current match (kept in memory for fast replay). */
  events: MatchEvent[];
  /** True once a hydration attempt at boot has completed. */
  hydrated: boolean;
  /**
   * Which frame the user is currently viewing/editing.
   * null → latest frame (default). Non-null → an earlier frame index.
   * Reset to null whenever the match reloads or a new frame is created.
   */
  viewedFrameIndex: number | null;

  // Lifecycle
  hydrateFromDB: () => Promise<void>;
  startMatch: (input: NewMatchInput) => Promise<void>;
  resumeMatch: (matchId: string) => Promise<void>;

  // Scoring actions (each persists to DB)
  setActiveSlot: (slot: 0 | 1) => void;
  pocketBall: (ball: number) => Promise<void>;
  unpocketBall: (ball: number) => Promise<void>;
  nextFrame: () => Promise<void>;
  endMatch: () => Promise<Match | null>;
  abandonMatch: () => Promise<void>;

  // Frame navigation
  goBackFrame: () => void;
  canGoBackFrame: () => boolean;
  isViewingHistoricalFrame: () => boolean;

  // Selectors (all respect viewedFrameIndex)
  currentFrame: () => Frame | null;
  currentBreakerSlot: () => 0 | 1 | null;
  matchTotals: () => [number, number];
  frameTotals: () => [number, number];
  pocketedBy: () => Record<number, 0 | 1 | undefined>;
  isCurrentFrameComplete: () => boolean;
  isLatestFrame: () => boolean;
  winnerSlot: () => 0 | 1 | null;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  current: null,
  activeSlot: 0,
  events: [],
  hydrated: false,
  viewedFrameIndex: null,

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
          viewedFrameIndex: null,
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },

  startMatch: async ({
    players,
    raceTo,
    initialBreakerSlot,
    challongeMatchId,
    challongeTournamentSlug,
  }) => {
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
      challongeMatchId,
      challongeTournamentSlug,
    });
    // Load the just-created match through the same replay path used everywhere
    // else, so initial state is constructed identically to a resume.
    const fresh = await loadMatchFull(id);
    if (fresh) {
      set({
        current: fresh,
        events: [],
        activeSlot: activeSlotFromMatch(fresh),
        viewedFrameIndex: null,
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
      viewedFrameIndex: null,
    });
  },

  setActiveSlot: (slot) => set({ activeSlot: slot }),

  pocketBall: async (ball) => {
    const { current, activeSlot } = get();
    if (!current) return;
    const frame = viewedFrame(get());
    if (!frame) return;
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
    const frame = viewedFrame(get());
    if (!frame) return;
    if (!frame.events.some((e) => e.ball === ball)) return;
    const { match } = await appendEvent(current.id, {
      kind: 'unpocket',
      frameIndex: frame.index,
      ballNumber: ball,
    });
    applyFresh(set, get, match);
  },

  /**
   * Next Frame button. Context-aware:
   *  - Viewing a historical frame → move the viewed index forward one.
   *  - Viewing the latest frame and it's complete → create a new frame.
   *  - Viewing the latest frame and it's incomplete → no-op (button is disabled in UI).
   */
  nextFrame: async () => {
    const { current, viewedFrameIndex } = get();
    if (!current) return;
    const latestIndex = current.frames.length - 1;
    const viewing = viewedFrameIndex ?? latestIndex;

    // Case A: historical frame — just navigate forward.
    if (viewing < latestIndex) {
      const nextIndex = viewing + 1;
      // If we've reached the latest, drop back to "following latest" mode.
      set({ viewedFrameIndex: nextIndex >= latestIndex ? null : nextIndex });
      return;
    }

    // Case B: on the latest frame — advance to a new frame if complete.
    const frame = current.frames[latestIndex];
    if (!isFrameComplete(frame.events)) return;
    const { match } = await appendEvent(current.id, {
      kind: 'frame_end',
      frameIndex: frame.index,
    });
    applyFresh(set, get, match);
  },

  /**
   * Back button. Pure navigation — moves the viewed frame index back one.
   * Never destroys data. Disabled on frame 1 (checked via canGoBackFrame).
   */
  goBackFrame: () => {
    const { current, viewedFrameIndex } = get();
    if (!current) return;
    const latestIndex = current.frames.length - 1;
    const viewing = viewedFrameIndex ?? latestIndex;
    if (viewing <= 0) return;
    set({ viewedFrameIndex: viewing - 1 });
  },

  canGoBackFrame: () => {
    const { current, viewedFrameIndex } = get();
    if (!current) return false;
    const latestIndex = current.frames.length - 1;
    const viewing = viewedFrameIndex ?? latestIndex;
    return viewing > 0;
  },

  isViewingHistoricalFrame: () => {
    const { current, viewedFrameIndex } = get();
    if (!current || viewedFrameIndex === null) return false;
    return viewedFrameIndex < current.frames.length - 1;
  },

  isLatestFrame: () => {
    const { current, viewedFrameIndex } = get();
    if (!current) return true;
    if (viewedFrameIndex === null) return true;
    return viewedFrameIndex >= current.frames.length - 1;
  },

  endMatch: async () => {
    const { current } = get();
    if (!current) return null;
    const { match } = await appendEvent(current.id, { kind: 'match_end' });
    // Clear in-memory match so navigation away from scoring doesn't show stale data.
    set({ current: null, events: [], activeSlot: 0, viewedFrameIndex: null });
    return match;
  },

  abandonMatch: async () => {
    const { current } = get();
    if (!current) {
      set({ current: null, events: [], activeSlot: 0, viewedFrameIndex: null });
      return;
    }
    await appendEvent(current.id, { kind: 'abandon' });
    set({ current: null, events: [], activeSlot: 0, viewedFrameIndex: null });
  },

  currentFrame: () => {
    return viewedFrame(get());
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
    set({
      current: fresh,
      activeSlot: activeSlotFromMatch(fresh),
      viewedFrameIndex: null,
    });
    return;
  }
  const prevFrames = prev.current.frames.length;
  const newFrames = fresh.frames.length;
  let activeSlot = prev.activeSlot;
  // If a new frame was created, snap the view back to the latest frame so the
  // user starts shooting the fresh frame and active slot follows its breaker.
  let viewedFrameIndex = prev.viewedFrameIndex;
  if (newFrames > prevFrames) {
    const newFrame = fresh.frames[fresh.frames.length - 1];
    activeSlot = newFrame.breakerSlot;
    viewedFrameIndex = null;
  }
  set({ current: fresh, activeSlot, viewedFrameIndex });
}

/**
 * Resolve which Frame the user is currently viewing/editing.
 * Falls back to the latest frame if viewedFrameIndex is null or out of range.
 */
function viewedFrame(state: MatchState): Frame | null {
  const { current, viewedFrameIndex } = state;
  if (!current || current.frames.length === 0) return null;
  const latestIndex = current.frames.length - 1;
  if (viewedFrameIndex === null) return current.frames[latestIndex];
  const clamped = Math.max(0, Math.min(viewedFrameIndex, latestIndex));
  return current.frames[clamped];
}

export { ballValue };

// Re-export Player type for backwards-compat consumers.
export type { Player };

// Used by Home banner to show an at-a-glance label without loading events.
export { findInProgress } from '@/db/matches';
