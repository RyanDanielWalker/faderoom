"use client";

import { useEffect } from "react";
import { getAllTracks } from "./db";
import { useFaderoom } from "./store";

export function useHydrate() {
  const setTracks = useFaderoom((s) => s.setTracks);
  const setHydrated = useFaderoom((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;
    getAllTracks()
      .then((stored) => {
        if (cancelled) return;
        // Strip bytes for the in-memory store; they stay in IDB
        const tracks = stored.map(({ bytes, ...rest }) => rest);
        setTracks(tracks);
        setHydrated(true);
      })
      .catch((err) => {
        console.error("Hydration failed:", err);
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setTracks, setHydrated]);
}