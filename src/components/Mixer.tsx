"use client";

import { useFaderoom } from "@/lib/store";
import { engine } from "@/lib/engine";

export function Mixer() {
  const volumeA = useFaderoom((s) => s.decks.A.volume);
  const volumeB = useFaderoom((s) => s.decks.B.volume);
  const crossfade = useFaderoom((s) => s.crossfade);
  const setDeckVolume = useFaderoom((s) => s.setDeckVolume);
  const setCrossfade = useFaderoom((s) => s.setCrossfade);

  function handleVolume(side: "A" | "B", value: number) {
    engine.setVolume(side, value);
    setDeckVolume(side, value);
  }

  function handleCrossfade(value: number) {
    engine.setCrossfade(value);
    setCrossfade(value);
  }

  return (
    <section className="w-56 bg-surface flex flex-col shrink-0">
      <div className="h-10 border-b border-border flex items-center justify-center text-xs uppercase tracking-widest text-text-muted">
        mixer
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 min-h-0">
        {/* EQ placeholders (step 5) */}
        <div className="grid grid-cols-2 gap-3">
          {["HIGH", "MID", "LOW"].map((band) => (
            <div key={band} className="contents">
              <div className="h-7 bg-surface-2 border border-border rounded-sm" />
              <div className="h-7 bg-surface-2 border border-border rounded-sm" />
            </div>
          ))}
        </div>

        {/* Channel faders */}
        <div className="grid grid-cols-2 gap-3 h-48">
          {(["A", "B"] as const).map((side) => {
            const volume = side === "A" ? volumeA : volumeB;
            return (
              <div
                key={side}
                className="bg-surface-2 border border-border rounded-sm flex flex-col items-center justify-between py-3"
              >
                <div className="text-[10px] uppercase tracking-widest text-text-muted">
                  {Math.round(volume * 100)}
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) =>
                    handleVolume(side, parseFloat(e.target.value))
                  }
                  onDoubleClick={() => handleVolume(side, 1)}
                  className="fader-v flex-1"
                  aria-label={`Deck ${side} volume`}
                  title="Double-click to reset"
                />
                <div className="text-xs font-bold text-accent">{side}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crossfader */}
      <div className="p-5 border-t border-border">
        <div className="flex items-center justify-between mb-3 text-[10px] uppercase tracking-widest text-text-muted">
          <span>A</span>
          <span>crossfader</span>
          <span>B</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={crossfade}
          onChange={(e) => handleCrossfade(parseFloat(e.target.value))}
          onDoubleClick={() => handleCrossfade(0.5)}
          className="fader-h"
          aria-label="Crossfader"
          title="Double-click to center"
        />
      </div>
    </section>
  );
}
