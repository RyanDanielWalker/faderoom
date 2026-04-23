export function Deck({ side }: { side: "A" | "B" }) {
  return (
    <section className="flex-1 bg-bg flex flex-col min-w-0">
      {/* Deck header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4">
        <span className="font-display font-extrabold text-accent tracking-widest">
          {side}
        </span>
        <span className="text-xs text-text-muted uppercase tracking-widest">
          — no track —
        </span>
      </div>

      {/* Waveform placeholder */}
      <div className="h-32 border-b border-border bg-surface/40" />

      {/* Track info */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-xs text-text-muted uppercase tracking-widest">
          00:00 / 00:00
        </div>
        <div className="text-xs text-text-muted uppercase tracking-widest">
          --- BPM
        </div>
      </div>

      {/* Deck controls area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <button
          disabled
          className="w-20 h-20 border border-border rounded-full text-text-muted text-xs uppercase tracking-widest hover:border-border-bright disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          play
        </button>
      </div>
    </section>
  );
}