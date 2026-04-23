// The Web Audio graph and deck state. This is the audio engine.
// All audio-producing code goes through here.

import { getTrackBytes } from "./db";

export type DeckSide = "A" | "B";

type DeckState = {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  buffer: AudioBuffer | null;
  startedAt: number; // AudioContext time when playback started
  offset: number; // seconds into the track where we started
  isPlaying: boolean;
};

class Engine {
  private ctx: AudioContext | null = null;
  private decks: Record<DeckSide, DeckState> | null = null;
  private listeners = new Set<() => void>();

  // Lazy init — must be called from a user gesture
  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    this.ctx = new AudioContext();
    const makeDeck = (): DeckState => {
      const gain = this.ctx!.createGain();
      gain.gain.value = 1;
      gain.connect(this.ctx!.destination);
      return {
        source: null,
        gain,
        buffer: null,
        startedAt: 0,
        offset: 0,
        isPlaying: false,
      };
    };
    this.decks = { A: makeDeck(), B: makeDeck() };
    return this.ctx;
  }

  async loadTrack(side: DeckSide, trackId: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!this.decks) return;

    const bytes = await getTrackBytes(trackId);
    if (!bytes) throw new Error("Track bytes not found in IDB");

    // decodeAudioData consumes the ArrayBuffer, so clone it
    const buffer = await ctx.decodeAudioData(bytes.slice(0));

    // Stop whatever is currently on this deck
    this.stop(side);

    const deck = this.decks[side];
    deck.buffer = buffer;
    deck.offset = 0;
    deck.isPlaying = false;
    this.notify();
  }

  play(side: DeckSide): void {
    const ctx = this.ensureContext();
    if (!this.decks) return;
    const deck = this.decks[side];
    if (!deck.buffer || deck.isPlaying) return;

    if (ctx.state === "suspended") ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.connect(deck.gain);
    source.onended = () => {
      // Only react if this is still the current source (not a manual stop)
      if (deck.source === source) {
        deck.isPlaying = false;
        deck.offset = deck.buffer?.duration ?? 0;
        deck.source = null;
        this.notify();
      }
    };
    source.start(0, deck.offset);

    deck.source = source;
    deck.startedAt = ctx.currentTime;
    deck.isPlaying = true;
    this.notify();
  }

  pause(side: DeckSide): void {
    if (!this.decks || !this.ctx) return;
    const deck = this.decks[side];
    if (!deck.isPlaying || !deck.source) return;

    const elapsed = this.ctx.currentTime - deck.startedAt;
    deck.offset = deck.offset + elapsed;
    deck.source.onended = null;
    deck.source.stop();
    deck.source.disconnect();
    deck.source = null;
    deck.isPlaying = false;
    this.notify();
  }

  stop(side: DeckSide): void {
    if (!this.decks) return;
    const deck = this.decks[side];
    if (deck.source) {
      deck.source.onended = null;
      try {
        deck.source.stop();
      } catch {}
      deck.source.disconnect();
      deck.source = null;
    }
    deck.isPlaying = false;
    deck.offset = 0;
  }

  // Called from UI to read current playhead time
  getCurrentTime(side: DeckSide): number {
    if (!this.decks || !this.ctx) return 0;
    const deck = this.decks[side];
    if (!deck.isPlaying) return deck.offset;
    return deck.offset + (this.ctx.currentTime - deck.startedAt);
  }

  getDuration(side: DeckSide): number {
    return this.decks?.[side].buffer?.duration ?? 0;
  }

  isPlaying(side: DeckSide): boolean {
    return this.decks?.[side].isPlaying ?? false;
  }

  // Subscribe to state changes
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const engine = new Engine();