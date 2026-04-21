import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DayColumnHeader } from './DayColumnHeader';
import { getSlotStatus, isToday, type SlotStatus } from './schedule-utils';
import type { AiringAnime } from '@shiroani/shared';

export interface ScheduleDayColumnProps {
  /** YYYY-MM-DD — drives the "is today" tint + header. */
  day: string;
  /** Short day label shown in the header (e.g. "PON"). */
  label: string;
  /** Airing entries for this day, already sorted by the caller. */
  entries: AiringAnime[];
  /** Current epoch seconds — used to derive each entry's slot status. */
  now: number;
  /** Renders a single card. Receives the entry + its live/soon/done status. */
  renderCard: (anime: AiringAnime, status: SlotStatus) => ReactNode;
  /** Copy shown inside the empty-state when the day has no entries. */
  emptyLabel: string;
  /** Tailwind class for vertical spacing between cards (e.g. "space-y-1.5"). */
  listClassName?: string;
  /** Extra classes for the empty-state wrapper — controls vertical padding. */
  emptyStateClassName?: string;
  /** Icon-size class for the empty-state `Calendar` glyph. */
  emptyIconClassName?: string;
}

/**
 * One day column in the 7-column week grids (WeeklyView + TimetableView).
 *
 * Owns the column shell (today tint, sticky header, scroll list, empty state)
 * and delegates per-card rendering via `renderCard` — callers decide whether
 * that's a `WeekEventCard`, a `PosterCard`, or anything else.
 */
export function ScheduleDayColumn({
  day,
  label,
  entries,
  now,
  renderCard,
  emptyLabel,
  listClassName = 'space-y-1.5',
  emptyStateClassName = 'py-6',
  emptyIconClassName = 'w-5 h-5',
}: ScheduleDayColumnProps) {
  const isTodayCol = isToday(day);

  return (
    <div className={cn('flex flex-col min-h-0', isTodayCol && 'bg-primary/[0.04]')}>
      <DayColumnHeader day={day} label={label} entryCount={entries.length} />

      <div className={cn('flex-1 overflow-y-auto p-2 pb-20', listClassName)}>
        {entries.map(anime => {
          const status = getSlotStatus(anime.airingAt, now);
          return renderCard(anime, status);
        })}
        {entries.length === 0 && (
          <div
            className={cn(
              'flex flex-col items-center justify-center text-muted-foreground/30',
              emptyStateClassName
            )}
          >
            <Calendar className={cn('mb-1', emptyIconClassName)} />
            <p className="text-[10.5px] font-mono tracking-[0.1em] uppercase">{emptyLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
