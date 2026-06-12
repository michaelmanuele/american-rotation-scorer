import { create } from 'zustand';
import {
  ballValue,
  isFrameComplete,
  matchWinner,
  playerFramePoints,
  type PocketEvent,
} from '@/domain/rules';
import type { Frame, Match, Player } from '@/domain/types';

interface NewMatchInput {
  players: [Player, Player];
  raceTo: number;
  breakerSlot: 0 | 1;
}

interface MatchState {
  current: Match | null;
  activeSlot: 0 | 1;

  // Setup
  startMatch: (input: NewMatchInput) => void;

  // Scoring actions
  setActiveSlot: (slot: 0 | 1) => void;
  pocketBall: (ball: number) => void;
  unpocketBall: (ball: number) => void;
  undoLast: () => void;
  nextFrame: () => void;
  endMatch: () => Match | null;
  abandonMatch: () => void;

  // Selectors
  currentFrame: () => Frame | null;
  matchTotals: () => [number, number];
  frameTotals: () => [number, number];
  pocketedBy: () => Record<number, 0 | 1 | undefined>;
  isCurrentFrameComplete: () => boolean;
  winnerSlot: () => 0 | 1 | null;
}

const newFrame = (index: number): Frame => ({
  index,
  startedAt: Date.now(),
  events: [],
});

export const useMatchStore = create<MatchState>((set, get) => ({
  current: null,
  activeSlot: 0,

  startMatch: ({ players, raceTo, breakerSlot }) => {
    const now = Date.now();
    set({
      current: {
        id: `m_${now}`,
        players,
        raceTo,
        breakerSlot,
        startedAt: now,
        status: 'in_progress',
        frames: [newFrame(0)],
      },
      activeSlot: breakerSlot,
    });
  },

  setActiveSlot: (slot) => set({ activeSlot: slot }),

  pocketBall: (ball) => {
    const { current, activeSlot } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    if (frame.events.some((e) => e.ball === ball)) return; // already pocketed
    const event: PocketEvent = { ball, playerSlot: activeSlot, at: Date.now() };
    const updatedFrame: Frame = { ...frame, events: [...frame.events, event] };
    set({
      current: {
        ...current,
        frames: [...current.frames.slice(0, -1), updatedFrame],
      },
    });
  },

  unpocketBall: (ball) => {
    const { current } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    const updatedFrame: Frame = {
      ...frame,
      events: frame.events.filter((e) => e.ball !== ball),
    };
    set({
      current: {
        ...current,
        frames: [...current.frames.slice(0, -1), updatedFrame],
      },
    });
  },

  undoLast: () => {
    const { current } = get();
    if (!current) return;
    const frame = current.frames[current.frames.length - 1];
    if (frame.events.length === 0) {
      // Optionally collapse to previous frame
      if (current.frames.length > 1) {
        set({
          current: { ...current, frames: current.frames.slice(0, -1) },
        });
      }
      return;
    }
    const updatedFrame: Frame = {
      ...frame,
      events: frame.events.slice(0, -1),
    };
    set({
      current: {
        ...current,
        frames: [...current.frames.slice(0, -1), updatedFrame],
      },
    });
  },

  nextFrame: () => {
    const { current } = get();
    if (!current) return;
    const frames = [...current.frames];
    const last = frames[frames.length - 1];
    if (!isFrameComplete(last.events)) return;
    last.endedAt = Date.now();
    frames[frames.length - 1] = last;
    frames.push(newFrame(frames.length));
    set({ current: { ...current, frames } });
  },

  endMatch: () => {
    const { current } = get();
    if (!current) return null;
    const totals = get().matchTotals();
    const winner = matchWinner(totals, current.raceTo);
    const finished: Match = {
      ...current,
      endedAt: Date.now(),
      status: 'completed',
      winnerSlot: winner ?? undefined,
    };
    set({ current: null });
    return finished;
  },

  abandonMatch: () => set({ current: null }),

  currentFrame: () => {
    const { current } = get();
    if (!current) return null;
    return current.frames[current.frames.length - 1] ?? null;
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

// Re-export for convenience
export { ballValue };
