import { getTrackBytes } from "./db";

export type DeckSide = "A" | "B";
export type EQBand = "high" | "mid" | "low";

type DeckState = {
  source: AudioBufferSourceNode | null;
  eqHigh: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  channelGain: GainNode;
  crossfadeGain: GainNode;
  buffer: AudioBuffer | null;
  startedAt: number;
  offset: number;
  isPlaying: boolean;
  volume: number;
  eq: { high: number; mid: number; low: number }; // dB
};

class Engine {
  private ctx: AudioContext | null = null;
  private decks: Record<DeckSide, DeckState> | null = null;
  private crossfadePosition = 0.5;
  private listeners = new Set<() => void>();

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    this.ctx = new AudioContext();
    const makeDeck = (): DeckState => {
      const ctx = this.ctx!;

      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = "highshelf";
      eqHigh.frequency.value = 10000;
      eqHigh.gain.value = 0;

      const eqMid = ctx.createBiquadFilter();
      eqMid.type = "peaking";
      eqMid.frequency.value = 1000;
      eqMid.Q.value = 1;
      eqMid.gain.value = 0;

      const eqLow = ctx.createBiquadFilter();
      eqLow.type = "lowshelf";
      eqLow.frequency.value = 220;
      eqLow.gain.value = 0;

      const channelGain = ctx.createGain();
      const crossfadeGain = ctx.createGain();
      channelGain.gain.value = 1;
      crossfadeGain.gain.value = 1;

      // source -> high -> mid -> low -> channel -> crossfade -> destination
      eqHigh.connect(eqMid);
      eqMid.connect(eqLow);
      eqLow.connect(channelGain);
      channelGain.connect(crossfadeGain);
      crossfadeGain.connect(ctx.destination);

      return {
        source: null,
        eqHigh,
        eqMid,
        eqLow,
        channelGain,
        crossfadeGain,
        buffer: null,
        startedAt: 0,
        offset: 0,
        isPlaying: false,
        volume: 1,
        eq: { high: 0, mid: 0, low: 0 },
      };
    };
    this.decks = { A: makeDeck(), B: makeDeck() };
    this.applyCrossfade();
    return this.ctx;
  }

  async loadTrack(side: DeckSide, trackId: string): Promise<void> {
    const ctx = this.ensureContext();
    if (!this.decks) return;

    const bytes = await getTrackBytes(trackId);
    if (!bytes) throw new Error("Track bytes not found in IDB");

    const buffer = await ctx.decodeAudioData(bytes.slice(0));

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
    // connect to the first EQ node, not directly to channelGain
    source.connect(deck.eqHigh);
    source.onended = () => {
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

  setVolume(side: DeckSide, value: number): void {
    this.ensureContext();
    if (!this.decks) return;
    const deck = this.decks[side];
    const clamped = Math.max(0, Math.min(1, value));
    deck.volume = clamped;
    deck.channelGain.gain.setTargetAtTime(clamped, this.ctx!.currentTime, 0.01);
  }

  getVolume(side: DeckSide): number {
    return this.decks?.[side].volume ?? 1;
  }

  // EQ gain in dB. Range: -26 to +6.
  setEQ(side: DeckSide, band: EQBand, db: number): void {
    this.ensureContext();
    if (!this.decks) return;
    const deck = this.decks[side];
    const clamped = Math.max(-40, Math.min(6, db));
    deck.eq[band] = clamped;
    const filter =
      band === "high" ? deck.eqHigh : band === "mid" ? deck.eqMid : deck.eqLow;
    filter.gain.setTargetAtTime(clamped, this.ctx!.currentTime, 0.01);
  }

  getEQ(side: DeckSide, band: EQBand): number {
    return this.decks?.[side].eq[band] ?? 0;
  }

  setCrossfade(position: number): void {
    this.ensureContext();
    this.crossfadePosition = Math.max(0, Math.min(1, position));
    this.applyCrossfade();
  }

  getCrossfade(): number {
    return this.crossfadePosition;
  }

  private applyCrossfade(): void {
    if (!this.decks || !this.ctx) return;
    const x = this.crossfadePosition;
    const gainA = Math.cos((x * Math.PI) / 2);
    const gainB = Math.sin((x * Math.PI) / 2);
    const t = this.ctx.currentTime;
    this.decks.A.crossfadeGain.gain.setTargetAtTime(gainA, t, 0.01);
    this.decks.B.crossfadeGain.gain.setTargetAtTime(gainB, t, 0.01);
  }

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

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}

export const engine = new Engine();