import { useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DAY_NAMES_FULL } from '@/lib/constants';
import { formatTime, getAnimeTitle, isToday } from './schedule-utils';
import { DayColumnHeader } from './DayColumnHeader';
import type { AiringAnime } from '@shiroani/shared';

export interface TimetableViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Pass the raw schedule object so useMemo can detect changes */
  schedule: Record<string, AiringAnime[]>;
}

export function TimetableView({ weekDays, getEntriesForDay, schedule }: TimetableViewProps) {
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
      <div className="flex gap-px bg-border h-full min-w-[1820px]">
        {weekDays.map((day, idx) => {
          const dayEntries = weekData.get(day) ?? [];
          const isTodayDay = isToday(day);

          return (
            <div
              key={day}
              className={cn(
                'flex flex-col bg-background min-w-[260px] flex-1',
                isTodayDay && 'bg-primary/5'
              )}
            >
              <DayColumnHeader
                day={day}
                label={DAY_NAMES_FULL[idx]}
                entryCount={dayEntries.length}
              />

              {/* Timetable entries */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {dayEntries.map((anime: AiringAnime) => {
                  const title = getAnimeTitle(anime.media);
                  // Timetable prefers large cover for the card layout
                  const coverUrl = anime.media.coverImage.large || anime.media.coverImage.medium;

                  return (
                    <div
                      key={`${anime.id}-${anime.episode}`}
                      className={cn(
                        'rounded-lg overflow-hidden',
                        'border border-border/50',
                        'hover:border-border hover:shadow-md transition-all duration-200',
                        'group'
                      )}
                    >
                      {/* Info strip -- episode & time */}
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-card/80 text-2xs">
                        <span className="font-medium text-foreground/80">
                          Odc. {anime.episode}
                          {anime.media.episodes ? `/${anime.media.episodes}` : ''}
                        </span>
                        <div className="flex items-center gap-1 text-muted-foreground/70">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(anime.airingAt)}</span>
                        </div>
                      </div>

                      {/* Cover image with title overlay */}
                      <div className="relative aspect-[3/4] bg-muted">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-muted-foreground/20" />
                          </div>
                        )}

                        {/* Title overlay at bottom */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent p-2.5 pt-8">
                          <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground drop-shadow-sm">
                            {title}
                          </p>
                          {anime.media.averageScore != null && (
                            <span className="text-2xs text-foreground/60 mt-0.5 inline-block">
                              {(anime.media.averageScore / 10).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {dayEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30">
                    <Calendar className="w-6 h-6 mb-1.5" />
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
