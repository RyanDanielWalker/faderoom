"use client";

import { useEffect, useState } from "react";
import { useFaderoom, DeckSide } from "@/lib/store";
import { engine } from "@/lib/engine";
import { formatDuration } from "@/lib/audio";
import { Waveform } from "./Waveform";

export function Deck({ side }: { side: DeckSide }) {
  const deck = useFaderoom((s) => s.decks[side]);
  const otherDeck = useFaderoom((s) => s.decks[side === "A" ? "B" : "A"]);
  const track = useFaderoom((s) =>
    s.tracks.find((t) => t.id === deck.trackId),
  );
  const otherTrack = useFaderoom((s) =>
    s.tracks.find((t) => t.id === otherDeck.trackId),
  );
  const setDeckPlaying = useFaderoom((s) => s.setDeckPlaying);
  const setTrackBPM = useFaderoom((s) => s.setTrackBPM);
  const setDeckPlaybackRate = useFaderoom((s) => s.setDeckPlaybackRate);

  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!deck.isPlaying) {
      setCurrentTime(engine.getCurrentTime(side));
      return;
    }
    let raf: number;
    const tick = () => {
      setCurrentTime(engine.getCurrentTime(side));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [deck.isPlaying, side]);

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      const playing = engine.isPlaying(side);
      setDeckPlaying(side, playing);
      setCurrentTime(engine.getCurrentTime(side));
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

  function adjustBPM(multiplier: number) {
    if (!track || track.bpm === undefined) return;
    const newBpm = Math.round(track.bpm * multiplier * 10) / 10;
    setTrackBPM(track.id, newBpm);
    // Also persist; we'll use updateTrackBPM via dynamic import to avoid
    // pulling db into Deck. Simpler: just call directly.
    import("@/lib/db").then(({ updateTrackBPM }) => {
      updateTrackBPM(track.id, newBpm);
    });
  }

  function handleSync() {
    if (!track || track.bpm === undefined) return;
    if (!otherTrack || otherTrack.bpm === undefined) return;

    // Other deck's *effective* BPM (after its own playback rate)
    const otherEffectiveBPM = otherTrack.bpm * otherDeck.playbackRate;
    const newRate = otherEffectiveBPM / track.bpm;

    // Cap the rate to a sane DJ range to avoid chipmunk extremes
    const clamped = Math.max(0.5, Math.min(2, newRate));

    engine.setPlaybackRate(side, clamped);
    setDeckPlaybackRate(side, clamped);
  }

  function resetSync() {
    engine.setPlaybackRate(side, 1);
    setDeckPlaybackRate(side, 1);
  }

  const duration = track?.duration ?? 0;
  const hasTrack = !!track;
  const effectiveBPM =
    track?.bpm !== undefined ? track.bpm * deck.playbackRate : null;
  const isSynced = Math.abs(deck.playbackRate - 1) > 0.001;
  const canSync =
    hasTrack &&
    track?.bpm !== undefined &&
    !!otherTrack &&
    otherTrack.bpm !== undefined;

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

      {/* Waveform */}
      <Waveform
        side={side}
        isPlaying={deck.isPlaying}
        trackId={deck.trackId}
      />

      {/* Track info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-text-muted uppercase tracking-widest tabular-nums">
          {hasTrack ? formatDuration(currentTime) : "00:00"} /{" "}
          {hasTrack ? formatDuration(duration) : "00:00"}
        </div>
        <div className="flex items-center gap-2">
          {/* Half/double BPM */}
          {hasTrack && track?.bpm !== undefined && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustBPM(0.5)}
                className="text-[10px] px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors text-text-muted"
                title="Halve detected BPM"
              >
                ÷2
              </button>
              <button
                onClick={() => adjustBPM(2)}
                className="text-[10px] px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors text-text-muted"
                title="Double detected BPM"
              >
                ×2
              </button>
            </div>
          )}
          <div className="text-xs uppercase tracking-widest tabular-nums">
            {track?.bpm !== undefined ? (
              isSynced && effectiveBPM !== null ? (
                <span>
                  <span className="text-accent">
                    {effectiveBPM.toFixed(1)}
                  </span>
                  <span className="text-text-muted">
                    {" "}
                    / {track.bpm.toFixed(1)} BPM
                  </span>
                </span>
              ) : (
                <span className="text-accent">
                  {track.bpm.toFixed(1)} BPM
                </span>
              )
            ) : hasTrack ? (
              <span className="text-text-muted animate-pulse">
                analyzing…
              </span>
            ) : (
              <span className="text-text-muted">--- BPM</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
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

        {/* Sync controls */}
        <div className="flex items-center gap-2">
          <button
            disabled={!canSync}
            onClick={handleSync}
            className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-sm transition border disabled:opacity-30 disabled:cursor-not-allowed ${
              isSynced
                ? "bg-accent text-bg border-accent"
                : "border-border hover:border-accent hover:text-accent text-text-muted"
            }`}
            title={
              canSync
                ? `Match this deck's BPM to deck ${side === "A" ? "B" : "A"}`
                : "Need a track on both decks with detected BPM"
            }
          >
            sync
          </button>
          {isSynced && (
            <button
              onClick={resetSync}
              className="text-xs uppercase tracking-widest px-2 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent text-text-muted transition"
              title="Reset to native tempo"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </section>
  );
}