"use client";

import { useEffect, useState } from "react";
import { useFaderoom, DeckSide } from "@/lib/store";
import { engine } from "@/lib/engine";
import { formatDuration } from "@/lib/audio";

export function Deck({ side }: { side: DeckSide }) {
  const deck = useFaderoom((s) => s.decks[side]);
  const track = useFaderoom((s) => s.tracks.find((t) => t.id === deck.trackId));
  const setDeckPlaying = useFaderoom((s) => s.setDeckPlaying);

  const [currentTime, setCurrentTime] = useState(0);

  // Update time display while playing
  useEffect(() => {
    if (!deck.isPlaying) return;
    let raf: number;
    const tick = () => {
      setCurrentTime(engine.getCurrentTime(side));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deck.isPlaying, side]);

  // Sync engine onended with store state
  useEffect(() => {
    const unsub = engine.subscribe(() => {
      const playing = engine.isPlaying(side);
      setDeckPlaying(side, playing);
      if (!playing) setCurrentTime(engine.getCurrentTime(side));
    });
    return unsub;
  }, [side, setDeckPlaying]);

  function togglePlay() {
    if (!track) return;
    if (deck.isPlaying) {
      engine.pause(side);
      setDeckPlaying(side, false);
    } else {
      engine.play(side);
      setDeckPlaying(side, true);
    }
  }

  const duration = track?.duration ?? 0;
  const hasTrack = !!track;

  return (
    <section className="flex-1 bg-bg flex flex-col min-w-0">
      {/* Deck header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4">
        <span className="font-display font-extrabold text-accent tracking-widest">
          {side}
        </span>
        <span
          className="text-xs text-text-muted uppercase tracking-widest truncate ml-4"
          title={track?.name}
        >
          {track?.name ?? "— no track —"}
        </span>
      </div>

      {/* Waveform placeholder (with subtle playing indicator for now) */}
      <div
        className={`h-32 border-b border-border bg-surface/40 transition-colors ${
          deck.isPlaying ? "bg-accent/5" : ""
        }`}
      />

      {/* Track info */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-xs text-text-muted uppercase tracking-widest">
          {hasTrack ? formatDuration(currentTime) : "00:00"} /{" "}
          {hasTrack ? formatDuration(duration) : "00:00"}
        </div>
        <div className="text-xs text-text-muted uppercase tracking-widest">
          --- BPM
        </div>
      </div>

      {/* Play button */}
      <div className="flex-1 flex items-center justify-center p-8">
        <button
          disabled={!hasTrack}
          onClick={togglePlay}
          className={`w-20 h-20 rounded-full text-xs uppercase tracking-widest transition disabled:opacity-30 disabled:cursor-not-allowed ${
            deck.isPlaying
              ? "bg-accent text-bg border border-accent hover:bg-accent/90"
              : "border border-border hover:border-border-bright text-text-muted hover:text-text"
          }`}
        >
          {deck.isPlaying ? "pause" : "play"}
        </button>
      </div>
    </section>
  );
}