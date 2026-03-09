import { cn } from '@/lib/utils';
import { isToday, getDayNumber } from './schedule-utils';

export interface DayColumnHeaderProps {
  day: string;
  label: string;
  entryCount: number;
}

/** Shared day column header used by WeeklyView and TimetableView */
export function DayColumnHeader({ day, label, entryCount }: DayColumnHeaderProps) {
  const isTodayDay = isToday(day);

  return (
    <div
      className={cn(
        'sticky top-0 z-10 shrink-0 px-3 py-2.5 text-center border-b border-border/60 backdrop-blur-sm',
        isTodayDay ? 'bg-primary/10' : 'bg-card/20'
      )}
    >
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          isTodayDay ? 'text-primary' : 'text-muted-foreground/70'
        )}
      >
        {label}
      </span>
      <div className="flex items-center justify-center gap-1.5 mt-0.5">
        <span
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold tabular-nums',
            isTodayDay ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          {getDayNumber(day)}
        </span>
        {entryCount > 0 && (
          <span className="text-2xs text-muted-foreground/50 font-medium">({entryCount})</span>
        )}
      </div>
    </div>
  );
}
