import { getTrackBytes } from "./db";
import { extractPeaks, Peak } from "./waveform";
import { analyze } from "web-audio-beat-detector";

export type DeckSide = "A" | "B";
export type EQBand = "high" | "mid" | "low";

const WAVEFORM_BUCKETS = 2000; // fine enough for any reasonable display width

type DeckState = {
  source: AudioBufferSourceNode | null;
  eqHigh: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqLow: BiquadFilterNode;
  filter: BiquadFilterNode;
  channelGain: GainNode;
  crossfadeGain: GainNode;
  buffer: AudioBuffer | null;
  peaks: Peak[] | null;
  startedAt: number;
  offset: number;
  isPlaying: boolean;
  volume: number;
  eq: { high: number; mid: number; low: number };
  playbackRate: number;
  filterPosition: number; // -1 (full lowpass) to +1 (full highpass), 0 = bypass
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

      const filter = ctx.createBiquadFilter();
      filter.type = "allpass"; // bypass mode by default
      filter.frequency.value = 20000;
      filter.Q.value = 0.7;

      const channelGain = ctx.createGain();
      const crossfadeGain = ctx.createGain();
      channelGain.gain.value = 1;
      crossfadeGain.gain.value = 1;

      eqHigh.connect(eqMid);
      eqMid.connect(eqLow);
      eqLow.connect(filter);
      filter.connect(channelGain);
      channelGain.connect(crossfadeGain);
      crossfadeGain.connect(ctx.destination);

      return {
        source: null,
        eqHigh,
        eqMid,
        eqLow,
        filter,
        channelGain,
        crossfadeGain,
        buffer: null,
        peaks: null,
        startedAt: 0,
        offset: 0,
        isPlaying: false,
        volume: 1,
        eq: { high: 0, mid: 0, low: 0 },
        playbackRate: 1.0,
        filterPosition: 0,
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
    deck.peaks = extractPeaks(buffer, WAVEFORM_BUCKETS);
    deck.offset = 0;
    deck.isPlaying = false;
    this.notify();
  }

  async analyzeBPM(side: DeckSide): Promise<number | null> {
    if (!this.decks) return null;
    const deck = this.decks[side];
    if (!deck.buffer) return null;
    try {
      const bpm = await analyze(deck.buffer);
      return Math.round(bpm * 10) / 10; // 1 decimal place
    } catch (err) {
      console.error("BPM analysis failed:", err);
      return null;
    }
  }

  play(side: DeckSide): void {
    const ctx = this.ensureContext();
    if (!this.decks) return;
    const deck = this.decks[side];
    if (!deck.buffer || deck.isPlaying) return;

    if (ctx.state === "suspended") ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = deck.buffer;
    source.playbackRate.value = deck.playbackRate;
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

    const realElapsed = this.ctx.currentTime - deck.startedAt;
    deck.offset = deck.offset + realElapsed * deck.playbackRate;
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

  // Jump to a specific time in the track.
  // If playing, stops and restarts from the new position.
  seek(side: DeckSide, time: number): void {
    if (!this.decks) return;
    const deck = this.decks[side];
    if (!deck.buffer) return;

    const clamped = Math.max(0, Math.min(deck.buffer.duration, time));
    const wasPlaying = deck.isPlaying;

    if (wasPlaying) {
      // Stop current source without resetting offset
      if (deck.source) {
        deck.source.onended = null;
        try {
          deck.source.stop();
        } catch {}
        deck.source.disconnect();
        deck.source = null;
      }
      deck.isPlaying = false;
    }

    deck.offset = clamped;

    if (wasPlaying) {
      this.play(side);
    } else {
      this.notify();
    }
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
    const realElapsed = this.ctx.currentTime - deck.startedAt;
    return deck.offset + realElapsed * deck.playbackRate;
  }

  getDuration(side: DeckSide): number {
    return this.decks?.[side].buffer?.duration ?? 0;
  }

  getPeaks(side: DeckSide): Peak[] | null {
    return this.decks?.[side].peaks ?? null;
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

  setPlaybackRate(side: DeckSide, rate: number): void {
    if (!this.decks || !this.ctx) return;
    const deck = this.decks[side];
    // Recompute offset before changing rate, so getCurrentTime stays accurate
    if (deck.isPlaying) {
      const realElapsed = this.ctx.currentTime - deck.startedAt;
      deck.offset = deck.offset + realElapsed * deck.playbackRate;
      deck.startedAt = this.ctx.currentTime;
      if (deck.source) {
        deck.source.playbackRate.setTargetAtTime(
          rate,
          this.ctx.currentTime,
          0.05,
        );
      }
    }
    deck.playbackRate = rate;
    this.notify();
  }

  rampPlaybackRate(side: DeckSide, target: number, durationSec: number): void {
    if (!this.decks || !this.ctx) return;
    const deck = this.decks[side];

    // Settle the offset at current position, then ramp from current rate to target
    if (deck.isPlaying) {
      const realElapsed = this.ctx.currentTime - deck.startedAt;
      deck.offset = deck.offset + realElapsed * deck.playbackRate;
      deck.startedAt = this.ctx.currentTime;
    }

    const startRate = deck.playbackRate;
    const startTime = this.ctx.currentTime;

    // Schedule the audio ramp
    if (deck.isPlaying && deck.source) {
      deck.source.playbackRate.cancelScheduledValues(startTime);
      deck.source.playbackRate.setValueAtTime(startRate, startTime);
      deck.source.playbackRate.linearRampToValueAtTime(
        target,
        startTime + durationSec,
      );
    }

    // Animate the cached rate so UI stays in sync
    const startPerf = performance.now();
    const tick = () => {
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const t = Math.min(1, elapsedSec / durationSec);
      const current = startRate + (target - startRate) * t;

      // Re-baseline the offset before changing rate so getCurrentTime stays correct
      if (this.decks && this.ctx) {
        const d = this.decks[side];
        if (d.isPlaying) {
          const elapsedReal = this.ctx.currentTime - d.startedAt;
          d.offset = d.offset + elapsedReal * d.playbackRate;
          d.startedAt = this.ctx.currentTime;
        }
        d.playbackRate = current;
      }

      this.notify();

      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  getPlaybackRate(side: DeckSide): number {
    return this.decks?.[side].playbackRate ?? 1;
  }

  // Filter knob position: -1 (max lowpass) to +1 (max highpass), 0 = bypass.
  setFilter(side: DeckSide, position: number): void {
    this.ensureContext();
    if (!this.decks || !this.ctx) return;
    const deck = this.decks[side];
    const clamped = Math.max(-1, Math.min(1, position));
    deck.filterPosition = clamped;

    const t = this.ctx.currentTime;
    const dead = 0.05; // dead zone near center for stable bypass

    if (Math.abs(clamped) < dead) {
      // Bypass: allpass at high frequency does nothing audible
      deck.filter.type = "allpass";
      deck.filter.frequency.setTargetAtTime(20000, t, 0.01);
    } else if (clamped < 0) {
      // Lowpass: sweep from 20kHz (no effect) toward 200Hz (heavy muffle)
      // Map [-1, -dead] -> [200, 20000] logarithmically
      const norm = (Math.abs(clamped) - dead) / (1 - dead); // 0..1
      const freq = 20000 * Math.pow(200 / 20000, norm);
      deck.filter.type = "lowpass";
      deck.filter.frequency.setTargetAtTime(freq, t, 0.01);
    } else {
      // Highpass: sweep from 20Hz (no effect) toward 8kHz (very thin)
      const norm = (clamped - dead) / (1 - dead);
      const freq = 20 * Math.pow(8000 / 20, norm);
      deck.filter.type = "highpass";
      deck.filter.frequency.setTargetAtTime(freq, t, 0.01);
    }
  }

  getFilter(side: DeckSide): number {
    return this.decks?.[side].filterPosition ?? 0;
  }
}

export const engine = new Engine();
