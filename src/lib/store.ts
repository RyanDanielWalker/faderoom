import { create } from "zustand";

export type Track = {
  id: string;
  name: string; // filename without extension
  duration: number; // seconds
  size: number; // bytes
  addedAt: number; // timestamp
};

type FaderoomState = {
  tracks: Track[];
  isHydrated: boolean;

  setTracks: (tracks: Track[]) => void;
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  setHydrated: (v: boolean) => void;
};

export const useFaderoom = create<FaderoomState>((set) => ({
  tracks: [],
  isHydrated: false,

  setTracks: (tracks) => set({ tracks }),
  addTrack: (track) => set((state) => ({ tracks: [track, ...state.tracks] })),
  removeTrack: (id) =>
    set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),
  setHydrated: (v) => set({ isHydrated: v }),
}));
