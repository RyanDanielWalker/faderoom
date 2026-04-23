export function Crate() {
  return (
    <aside className="w-72 border-r border-border bg-surface flex flex-col shrink-0">
      <div className="h-10 border-b border-border flex items-center px-4 text-xs uppercase tracking-widest text-text-muted">
        Crate · 0 tracks
      </div>
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <div className="text-text-muted text-xs leading-relaxed">
          <div className="mb-2 text-accent">◊</div>
          drop MP3s here
          <br />
          or click to browse
        </div>
      </div>
      <div className="h-10 border-t border-border flex items-center px-4 text-xs text-text-muted">
        0 MB stored
      </div>
    </aside>
  );
}