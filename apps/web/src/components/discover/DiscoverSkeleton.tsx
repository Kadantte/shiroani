import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

export function DiscoverSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden bg-card/80 border border-border-glass"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="relative aspect-[3/4]">
            <Skeleton className="absolute inset-0 rounded-none" />

            {/* Format badge */}
            <div className="absolute top-2 left-2">
              <Skeleton className="h-4 w-8 rounded-md" />
            </div>

            {/* Score badge */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-4 w-8 rounded-md" />
            </div>

            {/* Title area at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 space-y-1.5">
              <Skeleton className={cn('h-3.5 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className="h-2.5 w-[45%] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
