import { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, List, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';
import { addDays, formatDate, isToday } from './schedule-utils';
import { DailyView } from './DailyView';
import { WeeklyView } from './WeeklyView';
import { TimetableView } from './TimetableView';

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
    selectDay(addDays(selectedDay, viewMode === 'daily' ? -1 : -7));
  }, [viewMode, selectedDay, selectDay]);

  const navigateNext = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? 1 : 7));
  }, [viewMode, selectedDay, selectDay]);

  const navigateToday = useCallback(() => {
    const today = new Date();
    selectDay(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
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
            <TooltipButton
              variant={viewMode === 'daily' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('daily')}
              className="w-8 h-7"
              tooltip="Dzienny"
            >
              <CalendarDays className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant={viewMode === 'weekly' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('weekly')}
              className="w-8 h-7"
              tooltip="Tydzien — lista"
            >
              <List className="w-4 h-4" />
            </TooltipButton>
            <TooltipButton
              variant={viewMode === 'timetable' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('timetable')}
              className="w-8 h-7"
              tooltip="Tydzien — siatka"
            >
              <LayoutGrid className="w-4 h-4" />
            </TooltipButton>
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
      {isLoading ? (
        viewMode === 'daily' ? (
          <DailyViewSkeleton />
        ) : viewMode === 'weekly' ? (
          <WeeklyViewSkeleton />
        ) : (
          <TimetableViewSkeleton />
        )
      ) : viewMode === 'daily' ? (
        <DailyView entries={todayEntries} />
      ) : viewMode === 'weekly' ? (
        <WeeklyView weekDays={weekDays} getEntriesForDay={getEntriesForDay} schedule={schedule} />
      ) : (
        <TimetableView
          weekDays={weekDays}
          getEntriesForDay={getEntriesForDay}
          schedule={schedule}
        />
      )}
    </div>
  );
}
