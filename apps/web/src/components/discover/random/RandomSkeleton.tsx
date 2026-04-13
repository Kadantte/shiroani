export function RandomSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 p-5 md:p-6 rounded-3xl border border-border-glass bg-card/40">
      <div className="aspect-[3/4] w-full max-w-[220px] mx-auto md:max-w-none rounded-2xl bg-muted/40 animate-pulse" />
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
        <div className="h-7 w-3/4 rounded bg-muted/40 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-4 w-12 rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted/40 animate-pulse" />
          <div className="h-4 w-10 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="space-y-1.5 pt-2">
          <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
