import { Crate } from "@/components/Crate";
import { Deck } from "@/components/Deck";
import { Mixer } from "@/components/Mixer";

export default function Home() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <header className="h-12 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
          <span
            className="font-display font-extrabold tracking-widest text-sm"
            style={{ letterSpacing: "0.2em" }}
          >
            FADEROOM
          </span>
        </div>
        <div className="text-xs text-text-muted uppercase tracking-widest">
          v0.1 · desktop only
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex min-h-0">
        <Crate />
        <main className="flex-1 flex gap-px bg-border min-w-0">
          <Deck side="A" />
          <Mixer />
          <Deck side="B" />
        </main>
      </div>
    </div>
  );
}
