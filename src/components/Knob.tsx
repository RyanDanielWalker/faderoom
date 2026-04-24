"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KnobProps = {
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
  label?: string;
  size?: number; // px
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

export function Knob({
  value,
  min,
  max,
  defaultValue = 0,
  label,
  size = 44,
  onChange,
  format,
}: KnobProps) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  // Map value to rotation angle: -135deg (min) to +135deg (max)
  // 0 (center, for bipolar values) ends up at 0deg if symmetric range
  const range = max - min;
  const normalized = (value - min) / range; // 0..1
  const angle = -135 + normalized * 270;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragging(true);
      startY.current = e.clientY;
      startValue.current = value;
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const deltaY = startY.current - e.clientY; // up = positive
      const sensitivity = e.shiftKey ? 400 : 150; // shift = fine control
      const next = startValue.current + (deltaY / sensitivity) * range;
      const clamped = Math.max(min, Math.min(max, next));
      onChange(clamped);
    },
    [dragging, min, max, range, onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(false);
  }, []);

  const onDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  // Prevent text selection while dragging
  useEffect(() => {
    if (dragging) {
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.userSelect = "";
      };
    }
  }, [dragging]);

  const display = format ? format(value) : value.toFixed(0);

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <div className="text-[9px] uppercase tracking-widest text-text-muted">
          {label}
        </div>
      )}
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        style={{ width: size, height: size }}
        className={`relative rounded-full border transition-colors cursor-grab active:cursor-grabbing select-none ${
          dragging
            ? "border-accent bg-surface-2"
            : "border-border-bright bg-surface-2 hover:border-accent/60"
        }`}
        title={`${label ?? "knob"} · drag to adjust, double-click to reset, hold shift for fine control`}
      >
        {/* Indicator line */}
        <div
          className="absolute left-1/2 top-1/2 origin-bottom"
          style={{
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            width: 2,
            height: size / 2 - 4,
            background: "var(--color-accent)",
            borderRadius: 1,
          }}
        />
        {/* Center dot */}
        <div
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-text-muted"
          style={{ transform: "translate(-50%, -50%)" }}
        />
      </div>
      <div className="text-[9px] tabular-nums text-text-muted min-h-[12px]">
        {display}
      </div>
    </div>
  );
}