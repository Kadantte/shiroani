import { useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_NAMES_SHORT } from '@/lib/constants';
import { formatTime, getAnimeTitle, getCoverUrl, isToday } from './schedule-utils';
import { DayColumnHeader } from './DayColumnHeader';
import type { AiringAnime } from '@shiroani/shared';

export interface WeeklyViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Pass the raw schedule object so useMemo can detect changes */
  schedule: Record<string, AiringAnime[]>;
}

export function WeeklyView({ weekDays, getEntriesForDay, schedule }: WeeklyViewProps) {
  const weekData = useMemo(() => {
    const map = new Map<string, AiringAnime[]>();
    for (const day of weekDays) {
      const entries = [...getEntriesForDay(day)].sort((a, b) => a.airingAt - b.airingAt);
      map.set(day, entries);
    }
    return map;
  }, [weekDays, getEntriesForDay, schedule]);

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-px bg-border h-full min-w-[1680px]">
        {weekDays.map((day, idx) => {
          const dayEntries = weekData.get(day) ?? [];
          const isTodayDay = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                'flex flex-col bg-background min-w-[240px] flex-1',
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
                        'group p-2 rounded-lg text-xs',
                        'bg-card/60 border border-border/50',
                        'hover:bg-card/80 hover:border-border transition-colors duration-150'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {coverUrl && (
                          <img
                            src={coverUrl}
                            alt=""
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
                            <span className="text-2xs text-muted-foreground/50">
                              {(anime.media.averageScore / 10).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
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
