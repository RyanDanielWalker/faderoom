"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  defaultValue?: number;
  height?: number;
  label?: string;
};

export function VerticalFader({
  value,
  onChange,
  defaultValue = 1,
  height = 140,
  label,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const thumbHeight = 16;
  // Map value (0..1) to thumb top position (height-thumbHeight..0)
  const thumbY = (1 - value) * (height - thumbHeight);

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
      const deltaY = startY.current - e.clientY;
      const sensitivity = e.shiftKey ? 400 : 150;
      const next = startValue.current + deltaY / sensitivity;
      const clamped = Math.max(0, Math.min(1, next));
      onChange(clamped);
    },
    [dragging, onChange],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragging(false);
  }, []);

  const onDoubleClick = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  useEffect(() => {
    if (dragging) {
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.userSelect = "";
      };
    }
  }, [dragging]);

  return (
    <div
      className="relative bg-surface-2 border border-border rounded-sm select-none"
      style={{ width: 28, height }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      title={`${label ?? "fader"} · drag to adjust · double-click to reset · hold shift for fine control`}
    >
      {/* Center track line */}
      <div
        className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2"
        style={{ width: 2, background: "var(--color-border-bright)" }}
      />
      {/* Thumb */}
      <div
        className={`absolute left-0 right-0 rounded-sm cursor-grab active:cursor-grabbing transition-colors ${
          dragging
            ? "bg-accent border border-accent"
            : "bg-text border border-border-bright"
        }`}
        style={{
          top: thumbY,
          height: thumbHeight,
          boxShadow: dragging
            ? "0 0 8px var(--color-accent), 0 0 16px rgba(212, 255, 0, 0.3)"
            : "none",
        }}
      />
    </div>
  );
}
