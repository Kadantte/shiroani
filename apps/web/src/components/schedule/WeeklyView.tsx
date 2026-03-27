import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_NAMES_SHORT } from '@/lib/constants';
import { formatTime, getAnimeTitle, getCoverUrl, isToday } from './schedule-utils';
import { formatScore } from '@/lib/anime-utils';
import { DayColumnHeader } from './DayColumnHeader';
import { SubscribeBellButton } from './SubscribeBellButton';
import { useWeekData } from '@/hooks/useWeekData';
import type { AiringAnime } from '@shiroani/shared';

export interface WeeklyViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Pass the raw schedule object so useMemo can detect changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
}

export function WeeklyView({
  weekDays,
  getEntriesForDay,
  schedule,
  onAnimeClick,
}: WeeklyViewProps) {
  const weekData = useWeekData(weekDays, getEntriesForDay, schedule);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-px bg-border/50 h-full min-w-[1400px]">
        {weekDays.map((day, idx) => {
          const dayEntries = weekData.get(day) ?? [];
          const isTodayDay = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                'flex flex-col bg-background min-w-[200px] flex-1',
                isTodayDay && 'bg-primary/5'
              )}
            >
              <DayColumnHeader
                day={day}
                label={DAY_NAMES_SHORT[idx]}
                entryCount={dayEntries.length}
              />

              {/* Day entries -- vertical scroll per column */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {dayEntries.map((anime: AiringAnime) => {
                  const title = getAnimeTitle(anime.media);
                  const coverUrl = getCoverUrl(anime.media);

                  return (
                    <div
                      key={`${anime.id}-${anime.episode}`}
                      className={cn(
                        'group relative p-2 rounded-lg text-xs',
                        'bg-background/40 border border-border-glass',
                        'hover:bg-background/60 hover:border-border-glass/80 transition-all duration-200',
                        onAnimeClick && 'cursor-pointer'
                      )}
                      onClick={() => onAnimeClick?.(anime)}
                      role={onAnimeClick ? 'button' : undefined}
                      tabIndex={onAnimeClick ? 0 : undefined}
                      onKeyDown={
                        onAnimeClick
                          ? e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onAnimeClick(anime);
                              }
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-start gap-2">
                        {coverUrl && (
                          <img
                            src={coverUrl}
                            alt={title}
                            className="w-9 h-12 rounded object-cover shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate leading-tight text-xs">{title}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-muted-foreground/70 text-2xs">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(anime.airingAt)}</span>
                            <span>&middot;</span>
                            <span>Odc. {anime.episode}</span>
                          </div>
                          {anime.media.averageScore != null && (
                            <span className="text-2xs font-semibold text-primary/80 tabular-nums">
                              {formatScore(anime.media.averageScore)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bell icon overlay - top right */}
                      <SubscribeBellButton
                        anime={anime}
                        className="absolute top-1 right-1 w-7 h-7 min-w-[44px] min-h-[44px]"
                        iconClassName="w-3 h-3"
                      />
                    </div>
                  );
                })}
                {dayEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/30">
                    <Calendar className="w-5 h-5 mb-1" />
                    <p className="text-xs">Brak</p>
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
