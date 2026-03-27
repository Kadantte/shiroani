import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  CalendarDays,
} from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';
import { addDays, formatDate, isToday } from './schedule-utils';
import { DailyView } from './DailyView';
import { WeeklyView } from './WeeklyView';
import { TimetableView } from './TimetableView';
import { AnimeInfoDialog } from './AnimeInfoDialog';
import type { AiringAnime } from '@shiroani/shared';

const { selectDay, setViewMode, getEntriesForDay, getWeekDays, fetchDaily, fetchWeekly } =
  useScheduleStore.getState();

export function ScheduleView() {
  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const handleAnimeClick = useCallback((anime: AiringAnime) => {
    setSelectedAnime(anime);
    setInfoDialogOpen(true);
  }, []);

  const selectedDay = useScheduleStore(s => s.selectedDay);
  const viewMode = useScheduleStore(s => s.viewMode);
  const isLoading = useScheduleStore(s => s.isLoading);
  const error = useScheduleStore(s => s.error);
  const schedule = useScheduleStore(s => s.schedule);

  const navigatePrevious = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? -1 : -7));
  }, [viewMode, selectedDay, selectDay]);

  const navigateNext = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? 1 : 7));
  }, [viewMode, selectedDay, selectDay]);

  const navigateToday = useCallback(() => {
    const today = new Date();
    selectDay(toLocalDate(today));
  }, [selectDay]);

  const todayEntries = useMemo(() => {
    const entries = getEntriesForDay(selectedDay);
    return [...entries].sort((a, b) => a.airingAt - b.airingAt);
  }, [selectedDay, getEntriesForDay, schedule]);

  const weekDays = useMemo(() => getWeekDays(), [getWeekDays, selectedDay]);

  const handleRetry = useCallback(() => {
    if (viewMode === 'daily') {
      fetchDaily(selectedDay);
    } else {
      const weekStart = weekDays[0] ?? selectedDay;
      fetchWeekly(weekStart);
    }
  }, [viewMode, selectedDay, weekDays, fetchDaily, fetchWeekly]);

  // Load notification subscriptions once
  const notifLoaded = useNotificationStore(state => state.loaded);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border/60 bg-card/20 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold text-foreground">Harmonogram</h1>
          </div>
          <div className="flex items-center gap-1">
            <TooltipButton
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('daily')}
              aria-pressed={viewMode === 'daily'}
              className={cn(
                'w-8 h-8 transition-all duration-200',
                viewMode === 'daily' && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              tooltip="Dzienny"
            >
              <CalendarDays className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('weekly')}
              aria-pressed={viewMode === 'weekly'}
              className={cn(
                'w-8 h-8 transition-all duration-200',
                viewMode === 'weekly' && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              tooltip="Tydzień — lista"
            >
              <List className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('timetable')}
              aria-pressed={viewMode === 'timetable'}
              className={cn(
                'w-8 h-8 transition-all duration-200',
                viewMode === 'timetable' && 'bg-primary/10 text-primary hover:bg-primary/15'
              )}
              tooltip="Tydzień — siatka"
            >
              <LayoutGrid className="w-4 h-4" />
            </TooltipButton>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 min-w-[44px] min-h-[44px]"
              onClick={navigatePrevious}
              aria-label={viewMode === 'daily' ? 'Poprzedni dzień' : 'Poprzedni tydzień'}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span
              className="text-sm font-medium min-w-[180px] text-center tabular-nums"
              aria-live="polite"
            >
              {viewMode === 'daily'
                ? formatDate(selectedDay)
                : `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 min-w-[44px] min-h-[44px]"
              onClick={navigateNext}
              aria-label={viewMode === 'daily' ? 'Następny dzień' : 'Następny tydzień'}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {!isToday(selectedDay) && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 border-primary/20 text-primary hover:bg-primary/10"
              onClick={navigateToday}
            >
              Dziś
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        role="region"
        aria-label="Harmonogram anime"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {isLoading ? (
          viewMode === 'daily' ? (
            <DailyViewSkeleton />
          ) : viewMode === 'weekly' ? (
            <WeeklyViewSkeleton />
          ) : (
            <TimetableViewSkeleton />
          )
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <AlertCircle className="w-10 h-10 text-destructive/60" />
            <p className="text-sm text-center max-w-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Spróbuj ponownie
            </Button>
          </div>
        ) : viewMode === 'daily' ? (
          <DailyView entries={todayEntries} onAnimeClick={handleAnimeClick} />
        ) : viewMode === 'weekly' ? (
          <WeeklyView
            weekDays={weekDays}
            getEntriesForDay={getEntriesForDay}
            schedule={schedule}
            onAnimeClick={handleAnimeClick}
          />
        ) : (
          <TimetableView
            weekDays={weekDays}
            getEntriesForDay={getEntriesForDay}
            schedule={schedule}
            onAnimeClick={handleAnimeClick}
          />
        )}
      </div>

      <AnimeInfoDialog
        anime={selectedAnime}
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </div>
  );
}
