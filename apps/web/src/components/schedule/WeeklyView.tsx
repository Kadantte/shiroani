import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_NAMES_SHORT } from '@/lib/constants';
import { Tv } from 'lucide-react';
import {
  formatTime,
  getAnimeTitle,
  getCoverUrl,
  getSlotStatus,
  isToday,
  type SlotStatus,
} from './schedule-utils';
import { DayColumnHeader } from './DayColumnHeader';
import { SubscribeBellButton } from './SubscribeBellButton';
import { useWeekData } from '@/hooks/useWeekData';
import type { AiringAnime } from '@shiroani/shared';

export interface WeeklyViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Raw schedule object passed through so useMemo detects changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
}

/**
 * Compact 7-column week grid — one column per weekday, event cards stacked
 * vertically within each. Status is encoded as a coloured left border
 * (accent = live, green = soon/sub, violet = upcoming, muted = done).
 */
export function WeeklyView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
}: WeeklyViewProps) {
  const weekData = useWeekData(weekDays, getEntriesForDay, schedule);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="grid h-full min-w-[1100px] grid-cols-7 divide-x divide-border-glass">
        {weekDays.map((day, idx) => {
          const dayEntries = weekData.get(day) ?? [];
          const isTodayCol = isToday(day);

          return (
            <div
              key={day}
              className={cn('flex flex-col min-h-0', isTodayCol && 'bg-primary/[0.04]')}
            >
              <DayColumnHeader
                day={day}
                label={DAY_NAMES_SHORT[idx]}
                entryCount={dayEntries.length}
              />

              {/* Event cards — vertical scroll per column */}
              <div className="flex-1 overflow-y-auto p-2 pb-20 space-y-1.5">
                {dayEntries.map(anime => {
                  const status = getSlotStatus(anime.airingAt, now);
                  return (
                    <WeekEventCard
                      key={`${anime.id}-${anime.episode}`}
                      anime={anime}
                      status={status}
                      onClick={onAnimeClick}
                    />
                  );
                })}
                {dayEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/30">
                    <Calendar className="w-5 h-5 mb-1" />
                    <p className="text-[10.5px] font-mono tracking-[0.1em] uppercase">
                      brak emisji
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────── Event card ────────────── */

interface WeekEventCardProps {
  anime: AiringAnime;
  status: SlotStatus;
  onClick?: (anime: AiringAnime) => void;
}

function WeekEventCard({ anime, status, onClick }: WeekEventCardProps) {
  const title = getAnimeTitle(anime.media);
  const coverUrl = getCoverUrl(anime.media);
  const isLive = status === 'live';
  const isDone = status === 'done';

  const borderColor = isLive
    ? 'border-l-primary'
    : isDone
      ? 'border-l-muted-foreground/30'
      : 'border-l-[oklch(0.5_0.15_280)]';

  return (
    <div
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={title}
      onClick={onClick ? () => onClick(anime) : undefined}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(anime);
              }
            }
          : undefined
      }
      className={cn(
        'group relative rounded-lg border border-l-[3px] pl-2 pr-2.5 py-2 bg-card/40',
        borderColor,
        'transition-colors duration-200',
        isLive && 'bg-primary/10 border-primary/30',
        isDone && 'opacity-55',
        onClick && 'cursor-pointer hover:bg-card/60',
        isLive && onClick && 'hover:bg-primary/15'
      )}
    >
      <div className="flex gap-2">
        {/* Cover thumb — 2:3 aspect, helps users scan titles visually */}
        <div
          aria-hidden="true"
          className="w-9 h-[54px] rounded-[4px] overflow-hidden flex-shrink-0 bg-muted/30 border border-border-glass relative"
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
              className={cn('w-full h-full object-cover', isDone && 'grayscale-[30%]')}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground/40">
              <Tv className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'font-mono text-[10px] font-bold tracking-[0.06em]',
              isLive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {formatTime(anime.airingAt)}
            {isLive && <span className="ml-1.5 uppercase tracking-[0.12em]">· teraz</span>}
          </div>
          <p className="mt-1 text-[11.5px] font-semibold leading-[1.25] text-foreground line-clamp-2 pr-6">
            {title}
          </p>
          <p className="mt-[3px] font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/70">
            EP {anime.episode}
            {anime.media.format && <span className="ml-1.5">· {anime.media.format}</span>}
          </p>
        </div>
      </div>

      {/* Bell overlay, top-right */}
      <SubscribeBellButton
        anime={anime}
        className="absolute top-1 right-1 w-6 h-6"
        iconClassName="w-3 h-3"
      />
    </div>
  );
}
