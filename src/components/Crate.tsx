"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { useFaderoom, DeckSide } from "@/lib/store";
import { putTrack, deleteTrack as dbDeleteTrack } from "@/lib/db";
import { getAudioDuration, formatDuration, formatSize } from "@/lib/audio";
import { useHydrate } from "@/lib/useHydrate";
import { engine } from "@/lib/engine";

export function Crate() {
  useHydrate();

  const tracks = useFaderoom((s) => s.tracks);
  const addTrack = useFaderoom((s) => s.addTrack);
  const removeTrack = useFaderoom((s) => s.removeTrack);
  const decks = useFaderoom((s) => s.decks);
  const nextDeckTarget = useFaderoom((s) => s.nextDeckTarget);
  const setDeckTrack = useFaderoom((s) => s.setDeckTrack);
  const cycleDeckTarget = useFaderoom((s) => s.cycleDeckTarget);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSize = tracks.reduce((sum, t) => sum + t.size, 0);

  async function handleFiles(files: FileList | File[]) {
    const audioFiles = Array.from(files).filter((f) =>
      f.type.startsWith("audio/"),
    );
    for (const file of audioFiles) {
      try {
        const duration = await getAudioDuration(file);
        const bytes = await file.arrayBuffer();
        const track = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          duration,
          size: file.size,
          addedAt: Date.now(),
        };
        await putTrack({ ...track, bytes });
        addTrack(track);
      } catch (err) {
        console.error(`Failed to add ${file.name}:`, err);
      }
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  }

  async function onRemove(id: string) {
    await dbDeleteTrack(id);
    removeTrack(id);
  }

  async function loadTo(side: DeckSide, trackId: string, explicit: boolean) {
    try {
      await engine.loadTrack(side, trackId);
      setDeckTrack(side, trackId);
      // Only cycle the auto-target if it was an implicit (double-click) load
      if (!explicit) cycleDeckTarget();
    } catch (err) {
      console.error("Failed to load track:", err);
    }
  }

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`w-72 border-r border-border bg-surface flex flex-col shrink-0 transition-colors ${
        isDragging ? "bg-accent/5 border-accent" : ""
      }`}
    >
      <div className="h-10 border-b border-border flex items-center px-4 text-xs uppercase tracking-widest text-text-muted">
        Crate · {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
      </div>

      {tracks.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center text-center px-6 hover:bg-surface-2 transition-colors"
        >
          <div className="text-text-muted text-xs leading-relaxed">
            <div className="mb-2 text-accent">◊</div>
            drop MP3s here
            <br />
            or click to browse
          </div>
        </button>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {tracks.map((track) => {
            const onDecks: DeckSide[] = [];
            if (decks.A.trackId === track.id) onDecks.push("A");
            if (decks.B.trackId === track.id) onDecks.push("B");

            return (
              <div
                key={track.id}
                onDoubleClick={() => loadTo(nextDeckTarget, track.id, false)}
                className="group px-4 py-3 border-b border-border hover:bg-surface-2 transition-colors"
                title="Double-click to auto-load"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm truncate flex items-center gap-2"
                      title={track.name}
                    >
                      {onDecks.length > 0 && (
                        <span className="text-accent text-xs font-bold shrink-0">
                          {onDecks.map((d) => `[${d}]`).join("")}
                        </span>
                      )}
                      <span className="truncate">{track.name}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex gap-3">
                      <span>{formatDuration(track.duration)}</span>
                      <span>{formatSize(track.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTo("A", track.id, true);
                      }}
                      className="text-xs px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors"
                      title="Load to Deck A"
                    >
                      → A
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTo("B", track.id, true);
                      }}
                      className="text-xs px-1.5 py-0.5 border border-border hover:border-accent hover:text-accent rounded-sm transition-colors"
                      title="Load to Deck B"
                    >
                      → B
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(track.id);
                      }}
                      className="text-text-muted hover:text-accent text-xs px-1 transition-colors"
                      title="Remove from crate"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 text-xs text-text-muted uppercase tracking-widest hover:bg-surface-2 hover:text-text transition-colors"
          >
            + add more
          </button>
        </div>
      )}

      <div className="h-10 border-t border-border flex items-center px-4 text-xs text-text-muted">
        {formatSize(totalSize)} stored
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={onInputChange}
        className="hidden"
      />
    </aside>
  );
}