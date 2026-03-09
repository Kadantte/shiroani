import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useScheduleStore, toLocalDate } from '@/stores/useScheduleStore';
import type { AiringAnime } from '@shiroani/shared';

const DAY_NAMES_SHORT = ['Pon', 'Wt', 'Sr', 'Czw', 'Pt', 'Sob', 'Ndz'];

function formatTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

function isToday(dateStr: string): boolean {
  return dateStr === toLocalDate(new Date());
}

/** A single airing entry row */
function AiringEntry({ anime }: { anime: AiringAnime }) {
  const title =
    anime.media.title.romaji || anime.media.title.english || anime.media.title.native || '?';
  const coverUrl = anime.media.coverImage.medium || anime.media.coverImage.large;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg',
        'bg-card/60 backdrop-blur-sm border border-border-glass',
        'hover:bg-card/80 transition-colors duration-150'
      )}
    >
      {/* Time */}
      <div className="shrink-0 w-12 text-center">
        <span className="text-xs font-mono font-medium text-primary">
          {formatTime(anime.airingAt)}
        </span>
      </div>

      {/* Cover thumbnail */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="w-10 h-14 rounded object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-14 rounded bg-muted shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium truncate">{title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            Odc. {anime.episode}
            {anime.media.episodes ? `/${anime.media.episodes}` : ''}
          </span>
          {anime.media.format && (
            <Badge variant="secondary" className="text-2xs py-0 h-4">
              {anime.media.format}
            </Badge>
          )}
        </div>
        {anime.media.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {anime.media.genres.slice(0, 3).map(genre => (
              <span key={genre} className="text-2xs text-muted-foreground/70">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score */}
      {anime.media.averageScore != null && (
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          {(anime.media.averageScore / 10).toFixed(1)}
        </span>
      )}
    </div>
  );
}

export function ScheduleView() {
  const {
    selectedDay,
    viewMode,
    isLoading,
    selectDay,
    setViewMode,
    getEntriesForDay,
    getWeekDays,
    schedule,
  } = useScheduleStore();

  const navigatePrevious = useCallback(() => {
    if (viewMode === 'daily') {
      selectDay(addDays(selectedDay, -1));
    } else {
      selectDay(addDays(selectedDay, -7));
    }
  }, [viewMode, selectedDay, selectDay]);

  const navigateNext = useCallback(() => {
    if (viewMode === 'daily') {
      selectDay(addDays(selectedDay, 1));
    } else {
      selectDay(addDays(selectedDay, 7));
    }
  }, [viewMode, selectedDay, selectDay]);

  const navigateToday = useCallback(() => {
    selectDay(new Date().toISOString().split('T')[0]);
  }, [selectDay]);

  const todayEntries = useMemo(() => {
    const entries = getEntriesForDay(selectedDay);
    return [...entries].sort((a, b) => a.airingAt - b.airingAt);
  }, [selectedDay, getEntriesForDay, schedule]);

  const weekDays = useMemo(() => getWeekDays(), [getWeekDays, selectedDay]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border bg-card/30">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-foreground">Harmonogram</h1>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className="text-xs h-7"
            >
              Dzisiaj
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('weekly')}
              className="text-xs h-7"
            >
              Tydzien
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={navigatePrevious}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {viewMode === 'daily'
                ? formatDate(selectedDay)
                : `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`}
            </span>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={navigateNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {!isToday(selectedDay) && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={navigateToday}>
              Dzis
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Ladowanie harmonogramu...</span>
            </div>
          </div>
        ) : viewMode === 'daily' ? (
          /* Daily view */
          <div className="p-4 space-y-2">
            {todayEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 opacity-30" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/70">Brak anime na ten dzien</p>
                  <p className="text-xs text-muted-foreground/50">
                    Sprobuj innego dnia lub widoku tygodniowego
                  </p>
                </div>
              </div>
            ) : (
              todayEntries.map(anime => (
                <AiringEntry key={`${anime.id}-${anime.episode}`} anime={anime} />
              ))
            )}
          </div>
        ) : (
          /* Weekly view */
          <div className="grid grid-cols-7 gap-px bg-border h-full">
            {weekDays.map((day, idx) => {
              const dayEntries = getEntriesForDay(day).sort(
                (a: AiringAnime, b: AiringAnime) => a.airingAt - b.airingAt
              );
              const isTodayDay = isToday(day);

              return (
                <div
                  key={day}
                  className={cn(
                    'flex flex-col bg-background overflow-hidden',
                    isTodayDay && 'bg-primary/5'
                  )}
                >
                  {/* Day header */}
                  <div
                    className={cn(
                      'shrink-0 px-2 py-2 text-center border-b border-border',
                      isTodayDay ? 'bg-primary/10' : 'bg-card/40'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-medium uppercase tracking-wide',
                        isTodayDay ? 'text-primary' : 'text-muted-foreground/70'
                      )}
                    >
                      {DAY_NAMES_SHORT[idx]}
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold',
                          isTodayDay
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {parseInt(day.split('-')[2], 10)}
                      </span>
                      {dayEntries.length > 0 && (
                        <span className="text-[9px] text-muted-foreground/50 font-medium">
                          ({dayEntries.length})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day entries */}
                  <div className="flex-1 overflow-y-auto p-1 space-y-1">
                    {dayEntries.map((anime: AiringAnime) => {
                      const title =
                        anime.media.title.romaji ||
                        anime.media.title.english ||
                        anime.media.title.native ||
                        '?';
                      const coverUrl =
                        anime.media.coverImage.medium || anime.media.coverImage.large;

                      return (
                        <div
                          key={`${anime.id}-${anime.episode}`}
                          className={cn(
                            'group p-1.5 rounded text-2xs',
                            'bg-card/60 border border-border/50',
                            'hover:bg-card/80 hover:border-border transition-colors duration-150'
                          )}
                        >
                          <div className="flex items-start gap-1.5">
                            {coverUrl && (
                              <img
                                src={coverUrl}
                                alt=""
                                className="w-7 h-9 rounded-sm object-cover shrink-0"
                                loading="lazy"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate leading-tight">{title}</p>
                              <div className="flex items-center gap-1 mt-0.5 text-muted-foreground/70">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTime(anime.airingAt)}</span>
                                <span>&middot;</span>
                                <span>Odc. {anime.episode}</span>
                              </div>
                              {anime.media.averageScore != null && (
                                <span className="text-[9px] text-muted-foreground/50">
                                  {(anime.media.averageScore / 10).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {dayEntries.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-4 text-muted-foreground/30">
                        <Calendar className="w-4 h-4 mb-1" />
                        <p className="text-2xs">Brak</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
