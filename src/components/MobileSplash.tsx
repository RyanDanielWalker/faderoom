export function MobileSplash() {
  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center text-center p-8 gap-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
        <span
          className="font-display font-extrabold tracking-widest text-lg"
          style={{ letterSpacing: "0.2em" }}
        >
          FADEROOM
        </span>
      </div>

      <div className="text-text-muted text-sm leading-relaxed max-w-xs">
        Faderoom is a DJ mixer that needs a wider screen.
        <br />
        <br />
        Come back on a laptop or desktop to mix.
      </div>

      <div className="text-[10px] uppercase tracking-widest text-text-muted/60 mt-8">
        ◊ desktop only ◊
      </div>
    </div>
  );
}