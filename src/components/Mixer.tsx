"use client";

import { useFaderoom, DeckSide, EQBand } from "@/lib/store";
import { engine } from "@/lib/engine";
import { Knob } from "./Knob";

const BANDS: EQBand[] = ["high", "mid", "low"];
const BAND_LABELS: Record<EQBand, string> = {
  high: "HI",
  mid: "MID",
  low: "LO",
};

function formatDb(db: number): string {
  if (db === 0) return "0";
  const sign = db > 0 ? "+" : "";
  return `${sign}${db.toFixed(0)}`;
}

export function Mixer() {
  const volumeA = useFaderoom((s) => s.decks.A.volume);
  const volumeB = useFaderoom((s) => s.decks.B.volume);
  const eqA = useFaderoom((s) => s.decks.A.eq);
  const eqB = useFaderoom((s) => s.decks.B.eq);
  const crossfade = useFaderoom((s) => s.crossfade);
  const setDeckVolume = useFaderoom((s) => s.setDeckVolume);
  const setDeckEQ = useFaderoom((s) => s.setDeckEQ);
  const setCrossfade = useFaderoom((s) => s.setCrossfade);

  function handleVolume(side: DeckSide, value: number) {
    engine.setVolume(side, value);
    setDeckVolume(side, value);
  }

  function handleEQ(side: DeckSide, band: EQBand, value: number) {
    engine.setEQ(side, band, value);
    setDeckEQ(side, band, value);
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

      <div className="flex-1 p-5 flex flex-col gap-4 min-h-0">
        {/* EQ knobs — 3 rows (HI, MID, LO), 2 columns (A, B) */}
        {BANDS.map((band) => (
          <div key={band} className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((side) => {
              const eq = side === "A" ? eqA : eqB;
              return (
                <div
                  key={side}
                  className="flex items-center justify-center gap-2 py-1"
                >
                  <Knob
                    value={eq[band]}
                    min={-40}
                    max={6}
                    defaultValue={0}
                    label={BAND_LABELS[band]}
                    size={40}
                    format={formatDb}
                    onChange={(v) => handleEQ(side, band, v)}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Channel faders */}
        <div className="grid grid-cols-2 gap-3 h-40 mt-2">
          {(["A", "B"] as const).map((side) => {
            const volume = side === "A" ? volumeA : volumeB;
            return (
              <div
                key={side}
                className="bg-surface-2 border border-border rounded-sm flex flex-col items-center justify-between py-2"
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