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
  volume: number;
};

type FaderoomState = {
  tracks: Track[];
  isHydrated: boolean;
  decks: Record<DeckSide, DeckSlot>;
  nextDeckTarget: DeckSide;
  crossfade: number; // 0..1

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  setHydrated: (v: boolean) => void;

  setDeckTrack: (side: DeckSide, trackId: string | null) => void;
  setDeckPlaying: (side: DeckSide, isPlaying: boolean) => void;
  setDeckVolume: (side: DeckSide, volume: number) => void;
  setCrossfade: (v: number) => void;
  cycleDeckTarget: () => void;
};

export const useFaderoom = create<FaderoomState>((set) => ({
  tracks: [],
  isHydrated: false,
  decks: {
    A: { trackId: null, isPlaying: false, volume: 1 },
    B: { trackId: null, isPlaying: false, volume: 1 },
  },
  nextDeckTarget: "A",
  crossfade: 0.5,

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((state) => ({ tracks: [track, ...state.tracks] })),
  removeTrack: (id) =>
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
  setHydrated: (v) => set({ isHydrated: v }),

  setDeckTrack: (side, trackId) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [side]: { ...state.decks[side], trackId, isPlaying: false },
      },
    })),
  setDeckPlaying: (side, isPlaying) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [side]: { ...state.decks[side], isPlaying },
      },
    })),
  setDeckVolume: (side, volume) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [side]: { ...state.decks[side], volume },
      },
    })),
  setCrossfade: (v) => set({ crossfade: v }),
  cycleDeckTarget: () =>
    set((state) => ({
      nextDeckTarget: state.nextDeckTarget === "A" ? "B" : "A",
    })),
}));