import { create } from "zustand";

export type Track = {
  id: string;
  name: string;
  duration: number;
  size: number;
  addedAt: number;
};

export type DeckSide = "A" | "B";

type DeckSlot = {
  trackId: string | null;
  isPlaying: boolean;
};

type FaderoomState = {
  tracks: Track[];
  isHydrated: boolean;
  decks: Record<DeckSide, DeckSlot>;
  nextDeckTarget: DeckSide; // which deck the next load goes to

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  setHydrated: (v: boolean) => void;

  setDeckTrack: (side: DeckSide, trackId: string | null) => void;
  setDeckPlaying: (side: DeckSide, isPlaying: boolean) => void;
  cycleDeckTarget: () => void;
};

export const useFaderoom = create<FaderoomState>((set) => ({
  tracks: [],
  isHydrated: false,
  decks: {
    A: { trackId: null, isPlaying: false },
    B: { trackId: null, isPlaying: false },
  },
  nextDeckTarget: "A",

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((state) => ({ tracks: [track, ...state.tracks] })),
  removeTrack: (id) =>
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
  setHydrated: (v) => set({ isHydrated: v }),

  setDeckTrack: (side, trackId) =>
    set((state) => ({
      decks: { ...state.decks, [side]: { trackId, isPlaying: false } },
    })),
  setDeckPlaying: (side, isPlaying) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [side]: { ...state.decks[side], isPlaying },
      },
    })),
  cycleDeckTarget: () =>
    set((state) => ({
      nextDeckTarget: state.nextDeckTarget === "A" ? "B" : "A",
    })),
}));