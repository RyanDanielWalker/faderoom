"use client";

import { useEffect, useRef, useState } from "react";
import { engine } from "@/lib/engine";
import { DeckSide } from "@/lib/store";
import type { Peak } from "@/lib/waveform";

type Props = {
  side: DeckSide;
  isPlaying: boolean;
  trackId: string | null;
};

export function Waveform({ side, isPlaying, trackId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Peak[] | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [scrubbing, setScrubbing] = useState(false);
  const playheadRef = useRef(0); // last known progress 0..1

  // Pull peaks when a track loads on this deck
  useEffect(() => {
    setPeaks(engine.getPeaks(side));
  }, [side, trackId]);

  // Also subscribe to engine notifications (in case of late load)
  useEffect(() => {
    return engine.subscribe(() => {
      setPeaks(engine.getPeaks(side));
    });
  }, [side]);

  // Track container size (resize-aware canvas)
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    let raf: number;

    const styles = getComputedStyle(document.documentElement);
    const accent =
      styles.getPropertyValue("--color-accent").trim() || "#d4ff00";
    const muted =
      styles.getPropertyValue("--color-border-bright").trim() || "#333";
    const playheadColor = "#ffffff";

    const draw = () => {
      const duration = engine.getDuration(side);
      const time = engine.getCurrentTime(side);
      const progress = duration > 0 ? Math.min(1, time / duration) : 0;
      playheadRef.current = progress;

      ctx.clearRect(0, 0, size.w, size.h);

      if (!peaks || peaks.length === 0) {
        // Empty state — thin center line
        ctx.fillStyle = muted;
        ctx.fillRect(0, size.h / 2 - 0.5, size.w, 1);
      } else {
        const mid = size.h / 2;
        const amp = size.h / 2 - 4;
        const barWidth = size.w / peaks.length;
        const playedX = progress * size.w;

        for (let i = 0; i < peaks.length; i++) {
          const x = i * barWidth;
          const p = peaks[i];
          const top = mid + p.min * amp;
          const bottom = mid + p.max * amp;
          ctx.fillStyle = x < playedX ? accent : muted;
          ctx.fillRect(
            Math.floor(x),
            Math.floor(top),
            Math.max(1, Math.ceil(barWidth)),
            Math.max(1, Math.ceil(bottom - top)),
          );
        }

        // Playhead line with glow
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        ctx.fillStyle = playheadColor;
        ctx.fillRect(Math.floor(playedX) - 0.5, 0, 1, size.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => cancelAnimationFrame(raf);
  }, [peaks, size, side, isPlaying]);

  function positionFromEvent(clientX: number): number {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return x / rect.width; // 0..1
  }

  function seekTo(normalized: number) {
    const duration = engine.getDuration(side);
    if (!duration) return;
    engine.seek(side, normalized * duration);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!peaks) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setScrubbing(true);
    seekTo(positionFromEvent(e.clientX));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!scrubbing) return;
    seekTo(positionFromEvent(e.clientX));
  }

  function onPointerUp(e: React.PointerEvent) {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setScrubbing(false);
  }

  return (
    <div
      ref={containerRef}
      className={`h-32 border-b border-border bg-surface/40 relative ${
        peaks ? "cursor-pointer" : ""
      } ${scrubbing ? "bg-accent/5" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
