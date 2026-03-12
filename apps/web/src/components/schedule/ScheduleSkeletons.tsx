import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { DAY_NAMES_SHORT, DAY_NAMES_FULL } from '@/lib/constants';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];
const SUBTITLE_WIDTHS = ['w-[40%]', 'w-[35%]', 'w-[50%]', 'w-[30%]', 'w-[45%]', 'w-[38%]'];

/** Number of skeleton cards per column (varies for realism) */
const WEEKLY_COUNTS = [3, 4, 2, 4, 3, 2, 3];
const TIMETABLE_COUNTS = [2, 3, 2, 3, 2, 1, 2];

/* ─────────────────────────── Daily View ─────────────────────────── */

export function DailyViewSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-lg',
            'bg-background/40 backdrop-blur-sm border border-border-glass'
          )}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Time */}
          <div className="shrink-0 w-12 flex justify-center">
            <Skeleton className="h-3.5 w-10 rounded" />
          </div>

          {/* Cover thumbnail */}
          <Skeleton className="w-10 h-14 rounded shrink-0" />

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className={cn('h-3.5 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
            <div className="flex items-center gap-2">
              <Skeleton
                className={cn('h-3 rounded', SUBTITLE_WIDTHS[i % SUBTITLE_WIDTHS.length])}
              />
              <Skeleton className="h-4 w-8 rounded-md" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-2.5 w-10 rounded" />
              <Skeleton className="h-2.5 w-12 rounded" />
              <Skeleton className="h-2.5 w-8 rounded" />
            </div>
          </div>

          {/* Score */}
          <Skeleton className="h-3.5 w-6 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Weekly View ─────────────────────────── */

export function WeeklyViewSkeleton() {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-px bg-border/50 h-full min-w-[1400px]">
        {DAY_NAMES_SHORT.map((dayName, colIdx) => (
          <div key={dayName} className="flex flex-col bg-background min-w-[200px] flex-1">
            {/* Day header */}
            <div className="sticky top-0 z-10 shrink-0 px-3 py-2.5 text-center border-b border-border/60 bg-card/20 backdrop-blur-sm">
              <Skeleton className="h-3 w-8 mx-auto rounded" />
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <Skeleton className="w-7 h-7 rounded-full" />
                <Skeleton className="h-2.5 w-5 rounded" />
              </div>
            </div>

            {/* Day entries */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
              {Array.from({ length: WEEKLY_COUNTS[colIdx] }).map((_, entryIdx) => {
                const globalIdx = colIdx * 4 + entryIdx;
                return (
                  <div
                    key={entryIdx}
                    className={cn(
                      'p-2 rounded-lg text-xs',
                      'bg-background/40 border border-border-glass'
                    )}
                    style={{ animationDelay: `${colIdx * 80 + entryIdx * 60}ms` }}
                  >
                    <div className="flex items-start gap-2">
                      <Skeleton className="w-9 h-12 rounded shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Skeleton
                          className={cn(
                            'h-3 rounded',
                            TITLE_WIDTHS[globalIdx % TITLE_WIDTHS.length]
                          )}
                        />
                        <div className="flex items-center gap-1">
                          <Skeleton className="w-3 h-3 rounded" />
                          <Skeleton className="h-2.5 w-8 rounded" />
                          <Skeleton className="h-2.5 w-10 rounded" />
                        </div>
                        <Skeleton className="h-2.5 w-6 rounded" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Timetable View ─────────────────────────── */

export function TimetableViewSkeleton() {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-px bg-border/50 h-full min-w-[1540px]">
        {DAY_NAMES_FULL.map((dayName, colIdx) => (
          <div key={dayName} className="flex flex-col bg-background min-w-[220px] flex-1">
            {/* Day header */}
            <div className="sticky top-0 z-10 shrink-0 px-3 py-2.5 text-center border-b border-border/60 bg-card/20 backdrop-blur-sm">
              <Skeleton className="h-3 w-16 mx-auto rounded" />
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <Skeleton className="w-7 h-7 rounded-full" />
                <Skeleton className="h-2.5 w-5 rounded" />
              </div>
            </div>

            {/* Timetable entries */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: TIMETABLE_COUNTS[colIdx] }).map((_, entryIdx) => {
                const globalIdx = colIdx * 3 + entryIdx;
                return (
                  <div
                    key={entryIdx}
                    className="rounded-lg overflow-hidden border border-border-glass"
                    style={{ animationDelay: `${colIdx * 100 + entryIdx * 70}ms` }}
                  >
                    {/* Info strip */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-background/40 backdrop-blur-sm">
                      <Skeleton className="h-2.5 w-12 rounded" />
                      <div className="flex items-center gap-1">
                        <Skeleton className="w-3 h-3 rounded" />
                        <Skeleton className="h-2.5 w-8 rounded" />
                      </div>
                    </div>

                    {/* Cover area */}
                    <div className="relative aspect-[3/4] bg-muted">
                      <Skeleton className="absolute inset-0 rounded-none" />
                      {/* Title overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8 space-y-1">
                        <Skeleton
                          className={cn(
                            'h-3 rounded bg-primary/15',
                            TITLE_WIDTHS[globalIdx % TITLE_WIDTHS.length]
                          )}
                        />
                        <Skeleton className="h-2.5 w-8 rounded bg-primary/15" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
