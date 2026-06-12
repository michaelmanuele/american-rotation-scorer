import { create } from 'zustand';
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  searchPlayers,
  updatePlayer,
  type PlayerInput,
} from '@/db/players';
import type { Player } from '@/domain/types';

interface RosterState {
  players: Player[];
  loaded: boolean;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  search: (q: string) => Promise<Player[]>;
  add: (input: PlayerInput) => Promise<Player>;
  update: (id: string, patch: PlayerInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useRosterStore = create<RosterState>((set, get) => ({
  players: [],
  loaded: false,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const players = await listPlayers();
      set({ players, loaded: true, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load players', loading: false });
    }
  },

  search: async (q) => {
    return searchPlayers(q);
  },

  add: async (input) => {
    const created = await createPlayer(input);
    await get().refresh();
    return created;
  },

  update: async (id, patch) => {
    await updatePlayer(id, patch);
    await get().refresh();
  },

  remove: async (id) => {
    await deletePlayer(id);
    await get().refresh();
  },
}));
