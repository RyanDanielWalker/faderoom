export function Mixer() {
  return (
    <section className="w-56 bg-surface flex flex-col shrink-0">
      <div className="h-10 border-b border-border flex items-center justify-center text-xs uppercase tracking-widest text-text-muted">
        mixer
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5 min-h-0">
        {/* EQ */}
        <div className="grid grid-cols-2 gap-3">
          {["HIGH", "MID", "LOW"].map((band) => (
            <div key={band} className="contents">
              <div className="h-7 bg-surface-2 border border-border rounded-sm" />
              <div className="h-7 bg-surface-2 border border-border rounded-sm" />
            </div>
          ))}
        </div>

        {/* Channel faders — fixed height, not flex-1 */}
        <div className="grid grid-cols-2 gap-3 h-48">
          <div className="bg-surface-2 border border-border rounded-sm" />
          <div className="bg-surface-2 border border-border rounded-sm" />
        </div>
      </div>

      <div className="p-5 border-t border-border">
        <div className="text-xs text-text-muted uppercase tracking-widest mb-2 text-center">
          crossfader
        </div>
        <div className="h-7 bg-surface-2 border border-border rounded-sm" />
      </div>
    </section>
  );
}