import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

export function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden bg-card/80 border border-border-glass"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Cover placeholder */}
          <div className="relative aspect-[3/4]">
            <Skeleton className="absolute inset-0 rounded-none" />

            {/* Status dot */}
            <div className="absolute top-2 left-2">
              <Skeleton className="w-2.5 h-2.5 rounded-full" />
            </div>

            {/* Episode badge */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-4 w-14 rounded-md" />
            </div>

            {/* Title area at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 space-y-1.5">
              <Skeleton className={cn('h-3.5 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className="h-2.5 w-[40%] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
