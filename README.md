# Faderoom

A browser-based DJ mixer built with the Web Audio API.

Load MP3s into two decks, beat-match, crossfade, EQ, and mix — entirely client-side, no uploads, no servers.

🚧 **Work in progress.** Live demo coming soon.

## Why

Most "browser DJ" apps that connect to Spotify are theater — they fade volumes between tracks because the Spotify SDK won't let them touch the audio stream. Faderoom uses raw Web Audio on user-provided MP3s, so the mixing is real: real beat matching, real EQ, real filter sweeps.

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Audio:** Web Audio API (no external audio libraries)
- **Storage:** IndexedDB for persistent crate of uploaded tracks
- **Fonts:** JetBrains Mono, Unbounded

## Features

Current:
- Drag-and-drop MP3 upload into a persistent "crate"
- Two decks with independent playback
- Load tracks from the crate into either deck

Planned:
- Waveform rendering
- Three-band EQ per deck
- Crossfader and channel volume faders
- BPM detection
- SYNC (auto beat-match between decks)
- Low/high-pass filter sweep per deck
- Keyboard shortcuts

## Running locally

```bash
git clone https://github.com/yourusername/faderoom.git
cd faderoom
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need your own MP3s to test. Tracks with clear 4-on-the-floor beats (house, drum & bass, electro) work best — good sources include [NCS](https://ncs.io/) and the [Free Music Archive](https://freemusicarchive.org/).

## Roadmap

This is built step-by-step in public. Check the commit history for the development log — each commit is a meaningful milestone.

## License

MIT (coming soon)