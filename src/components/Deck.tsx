"use client";

import { useEffect, useState } from "react";
import { useFaderoom, DeckSide } from "@/lib/store";
import { engine } from "@/lib/engine";
import { formatDuration } from "@/lib/audio";
import { Waveform } from "./Waveform";
import { TempoSlider } from "./TempoSlider";

export function Deck({ side }: { side: DeckSide }) {
  const deck = useFaderoom((s) => s.decks[side]);
  const otherDeck = useFaderoom((s) => s.decks[side === "A" ? "B" : "A"]);
  const track = useFaderoom((s) => s.tracks.find((t) => t.id === deck.trackId));
  const otherTrack = useFaderoom((s) =>
    s.tracks.find((t) => t.id === otherDeck.trackId),
  );
  const setDeckPlaying = useFaderoom((s) => s.setDeckPlaying);
  const setDeckPlaybackRate = useFaderoom((s) => s.setDeckPlaybackRate);
  const setDeckBpmMultiplier = useFaderoom((s) => s.setDeckBpmMultiplier);

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
      // Keep store rate in sync with engine (important during smooth ramps)
      const engineRate = engine.getPlaybackRate(side);
      setDeckPlaybackRate(side, engineRate);
    });
    return unsub;
  }, [side, setDeckPlaying, setDeckPlaybackRate]);

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

  function adjustMultiplier(factor: number) {
    const newMult = deck.bpmMultiplier * factor;
    const clamped = Math.max(0.25, Math.min(4, newMult));
    setDeckBpmMultiplier(side, clamped);
  }

  function revertMultiplier() {
    setDeckBpmMultiplier(side, 1);
  }

  function handleSync() {
    if (!track || track.bpm === undefined) return;
    if (!otherTrack || otherTrack.bpm === undefined) return;

    const otherEffectiveBPM =
      otherTrack.bpm * otherDeck.bpmMultiplier * otherDeck.playbackRate;
    const thisInterpretedBPM = track.bpm * deck.bpmMultiplier;
    const newRate = otherEffectiveBPM / thisInterpretedBPM;

    const clamped = Math.max(0.5, Math.min(2, newRate));
    engine.setPlaybackRate(side, clamped);
    setDeckPlaybackRate(side, clamped);
  }

  function handleManualRate(rate: number) {
    engine.setPlaybackRate(side, rate);
    setDeckPlaybackRate(side, rate);
  }

  function handleTempoReset() {
    // Smooth ramp back to native over 3 seconds
    engine.rampPlaybackRate(side, 1, 3);
    // Note: store updates happen via the engine's notify() during ramp,
    // but we also need to subscribe to those updates. Let's also keep the
    // store updated at the end so it's accurate even if user navigates away.
    setDeckPlaybackRate(side, 1);
  }

  const duration = track?.duration ?? 0;
  const hasTrack = !!track;
  const interpretedBPM =
    track?.bpm !== undefined ? track.bpm * deck.bpmMultiplier : null;
  const effectiveBPM =
    interpretedBPM !== null ? interpretedBPM * deck.playbackRate : null;
  const isSynced = Math.abs(deck.playbackRate - 1) > 0.001;
  const isMultiplied = Math.abs(deck.bpmMultiplier - 1) > 0.001;
  const canSync =
    hasTrack &&
    track?.bpm !== undefined &&
    !!otherTrack &&
    otherTrack.bpm !== undefined;

  return (
    <section className="flex-1 bg-bg flex flex-col min-w-0">
      {/* Deck header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4">
        <span
          className="font-display font-extrabold text-accent tracking-widest shrink-0 transition-all"
          style={{
            textShadow: deck.isPlaying
              ? "0 0 8px var(--color-accent), 0 0 16px var(--color-accent)"
              : "none",
            opacity: deck.isPlaying ? 1 : 0.6,
          }}
        >
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
      <Waveform side={side} isPlaying={deck.isPlaying} trackId={deck.trackId} />

      {/* Track info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-text-muted uppercase tracking-widest tabular-nums">
          {hasTrack ? formatDuration(currentTime) : "00:00"} /{" "}
          {hasTrack ? formatDuration(duration) : "00:00"}
        </div>
        <div className="flex items-center gap-2">
          {hasTrack && track?.bpm !== undefined && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustMultiplier(0.5)}
                className="text-[10px] px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors text-text-muted"
                title="Halve interpretation for this deck"
              >
                ÷2
              </button>
              <button
                onClick={() => adjustMultiplier(2)}
                className="text-[10px] px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors text-text-muted"
                title="Double interpretation for this deck"
              >
                ×2
              </button>
              {isMultiplied && (
                <button
                  onClick={revertMultiplier}
                  className="text-[10px] px-1.5 py-0.5 border border-accent text-accent hover:bg-accent hover:text-bg rounded-sm transition-colors"
                  title={`Revert to detected BPM (${track.bpm.toFixed(1)})`}
                >
                  ↺
                </button>
              )}
            </div>
          )}
          <div className="text-xs uppercase tracking-widest tabular-nums">
            {track?.bpm !== undefined ? (
              isSynced || isMultiplied ? (
                <span>
                  <span className="text-accent">
                    {effectiveBPM!.toFixed(1)}
                  </span>
                  <span className="text-text-muted">
                    {" "}
                    / {track.bpm.toFixed(1)} BPM
                  </span>
                </span>
              ) : (
                <span className="text-accent">{track.bpm.toFixed(1)} BPM</span>
              )
            ) : hasTrack ? (
              <span className="text-text-muted animate-pulse">analyzing…</span>
            ) : (
              <span className="text-text-muted">--- BPM</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center justify-center gap-8 p-6">
        {/* Tempo slider */}
        <TempoSlider
          rate={deck.playbackRate}
          onChange={handleManualRate}
          onReset={handleTempoReset}
          label="TEMPO"
        />

        {/* Play + sync stack */}
        <div className="flex flex-col items-center gap-4">
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

          <button
            disabled={!canSync}
            onClick={handleSync}
            style={{
              boxShadow: isSynced
                ? "0 0 12px var(--color-accent), 0 0 24px rgba(212, 255, 0, 0.4)"
                : "none",
            }}
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
        </div>
      </div>
    </section>
  );
}
