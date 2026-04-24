import { create } from "zustand";

export type Track = {
  id: string;
  name: string;
  duration: number;
  size: number;
  addedAt: number;
};

export type DeckSide = "A" | "B";
export type EQBand = "high" | "mid" | "low";

type DeckSlot = {
  trackId: string | null;
  isPlaying: boolean;
  volume: number;
  eq: { high: number; mid: number; low: number };
};

type FaderoomState = {
  tracks: Track[];
  isHydrated: boolean;
  decks: Record<DeckSide, DeckSlot>;
  nextDeckTarget: DeckSide;
  crossfade: number;

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  setHydrated: (v: boolean) => void;

  setDeckTrack: (side: DeckSide, trackId: string | null) => void;
  setDeckPlaying: (side: DeckSide, isPlaying: boolean) => void;
  setDeckVolume: (side: DeckSide, volume: number) => void;
  setDeckEQ: (side: DeckSide, band: EQBand, value: number) => void;
  setCrossfade: (v: number) => void;
  cycleDeckTarget: () => void;
};

const defaultEQ = () => ({ high: 0, mid: 0, low: 0 });

export const useFaderoom = create<FaderoomState>((set) => ({
  tracks: [],
  isHydrated: false,
  decks: {
    A: { trackId: null, isPlaying: false, volume: 1, eq: defaultEQ() },
    B: { trackId: null, isPlaying: false, volume: 1, eq: defaultEQ() },
  },
  nextDeckTarget: "A",
  crossfade: 0.5,

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) =>
    set((state) => ({ tracks: [track, ...state.tracks] })),
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
  setDeckEQ: (side, band, value) =>
    set((state) => ({
      decks: {
        ...state.decks,
        [side]: {
          ...state.decks[side],
          eq: { ...state.decks[side].eq, [band]: value },
        },
      },
    })),
  setCrossfade: (v) => set({ crossfade: v }),
  cycleDeckTarget: () =>
    set((state) => ({
      nextDeckTarget: state.nextDeckTarget === "A" ? "B" : "A",
    })),
}));