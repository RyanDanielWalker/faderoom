"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  rate: number; // 1.0 = native
  onChange: (rate: number) => void;
  onReset: () => void; // for double-click smooth ramp back
  range?: number; // ±range as fraction (default 0.1 = ±10%)
  height?: number; // px
  label?: string;
};

export function TempoSlider({
  rate,
  onChange,
  onReset,
  range = 0.1,
  height = 140,
  label = "TEMPO",
}: Props) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startRate = useRef(1);

  // Map rate (1-range..1+range) to vertical position (0..1, where 0.5 is center)
  const min = 1 - range;
  const max = 1 + range;
  const normalized = (rate - min) / (max - min); // 0..1
  const clampedNormalized = Math.max(0, Math.min(1, normalized));
  // Invert because higher rate should be visually higher
  const thumbY = (1 - clampedNormalized) * (height - 16);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragging(true);
      startY.current = e.clientY;
      startRate.current = rate;
    },
    [rate],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const deltaY = startY.current - e.clientY;
      const sensitivity = e.shiftKey ? 800 : 300;
      const next = startRate.current + (deltaY / sensitivity) * range * 2;
      const clamped = Math.max(min, Math.min(max, next));
      onChange(clamped);
    },
    [dragging, range, min, max, onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.userSelect = "";
      };
    }
  }, [dragging]);

  const deviation = (rate - 1) * 100;
  const isAtZero = Math.abs(rate - 1) < 0.001;
  const sign = deviation > 0 ? "+" : "";
  const display = isAtZero ? "0.0%" : `${sign}${deviation.toFixed(1)}%`;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[9px] uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div
        className="relative bg-surface-2 border border-border rounded-sm"
        style={{ width: 28, height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onReset}
        title="Drag to adjust tempo · double-click to ramp back to 0% · hold shift for fine control"
      >
        {/* Center line */}
        <div
          className="absolute left-0 right-0 border-t border-border-bright"
          style={{ top: height / 2 - 1 }}
        />
        {/* Thumb */}
        <div
          className={`absolute left-0 right-0 h-4 rounded-sm cursor-grab active:cursor-grabbing transition-colors ${
            dragging || !isAtZero
              ? "bg-accent border border-accent"
              : "bg-text border border-border-bright"
          }`}
          style={{
            top: thumbY,
            boxShadow:
              dragging || !isAtZero
                ? "0 0 8px var(--color-accent), 0 0 16px rgba(212, 255, 0, 0.3)"
                : "none",
          }}
        />
      </div>
      <div className="text-[10px] tabular-nums text-text-muted min-h-[14px]">
        {display}
      </div>
    </div>
  );
}
