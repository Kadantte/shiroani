import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutGrid,
  Rows3,
} from 'lucide-react';
import { toLocalDate } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { DailyViewSkeleton, WeeklyViewSkeleton, TimetableViewSkeleton } from './ScheduleSkeletons';
import { addDays, formatDayHeading, formatWeekRange, isToday } from './schedule-utils';
import { DailyView } from './DailyView';
import { WeeklyView } from './WeeklyView';
import { TimetableView } from './TimetableView';
import { AnimeInfoDialog } from './AnimeInfoDialog';
import type { AiringAnime } from '@shiroani/shared';

const { selectDay, setViewMode, getEntriesForDay, getWeekDays, fetchDaily, fetchWeekly } =
  useScheduleStore.getState();

type ScheduleMode = 'daily' | 'weekly' | 'timetable';

interface ModeDef {
  id: ScheduleMode;
  label: string;
  tooltip: string;
  Icon: typeof Rows3;
}

const MODES: ModeDef[] = [
  { id: 'daily', label: 'Dzień', tooltip: 'Dzień — oś czasu', Icon: Rows3 },
  { id: 'weekly', label: 'Tydzień', tooltip: 'Tydzień — siatka', Icon: LayoutGrid },
  { id: 'timetable', label: 'Plakaty', tooltip: 'Plakaty — tablica', Icon: Images },
];

export function ScheduleView() {
  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const handleAnimeClick = useCallback((anime: AiringAnime) => {
    setSelectedAnime(anime);
    setInfoDialogOpen(true);
  }, []);

  const selectedDay = useScheduleStore(s => s.selectedDay);
  const viewMode = useScheduleStore(s => s.viewMode) as ScheduleMode;
  const isLoading = useScheduleStore(s => s.isLoading);
  const error = useScheduleStore(s => s.error);
  const schedule = useScheduleStore(s => s.schedule);

  const navigatePrevious = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? -1 : -7));
  }, [viewMode, selectedDay]);

  const navigateNext = useCallback(() => {
    selectDay(addDays(selectedDay, viewMode === 'daily' ? 1 : 7));
  }, [viewMode, selectedDay]);

  const navigateToday = useCallback(() => {
    const today = new Date();
    selectDay(toLocalDate(today));
  }, []);

  const todayEntries = useMemo(() => {
    const entries = getEntriesForDay(selectedDay);
    return [...entries].sort((a, b) => a.airingAt - b.airingAt);
  }, [selectedDay, schedule]);

  const weekDays = useMemo(() => getWeekDays(), [selectedDay]);

  // Summary counts for the subtitle line
  const summary = useMemo(() => {
    if (viewMode === 'daily') {
      const count = todayEntries.length;
      if (count === 0) return 'Brak emisji';
      return `${count} ${count === 1 ? 'odcinek' : count < 5 ? 'odcinki' : 'odcinków'}`;
    }
    let total = 0;
    for (const d of weekDays) total += (schedule[d] ?? []).length;
    return `${total} ${total === 1 ? 'odcinek' : total < 5 && total > 1 ? 'odcinki' : 'odcinków'}`;
  }, [viewMode, todayEntries, weekDays, schedule]);

  const handleRetry = useCallback(() => {
    if (viewMode === 'daily') {
      fetchDaily(selectedDay);
    } else {
      const weekStart = weekDays[0] ?? selectedDay;
      fetchWeekly(weekStart);
    }
  }, [viewMode, selectedDay, weekDays]);

  // Load notification subscriptions once
  const notifLoaded = useNotificationStore(state => state.loaded);
  const loadSubscriptions = useNotificationStore(state => state.loadSubscriptions);
  useEffect(() => {
    if (!notifLoaded) loadSubscriptions();
  }, [notifLoaded, loadSubscriptions]);

  // Membership sets — used by WeeklyView to tint cards for library /
  // subscribed-only shows. Keyed by AniList id (matches `anime.media.id`).
  const subscribedAnilistIds = useNotificationStore(s => s.subscribedIds);
  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(
    () =>
      new Set(
        libraryEntries.map(e => e.anilistId).filter((x): x is number => typeof x === 'number')
      ),
    [libraryEntries]
  );

  const headingTitle =
    viewMode === 'daily'
      ? formatDayHeading(selectedDay)
      : formatWeekRange(weekDays[0] ?? selectedDay, weekDays[6] ?? selectedDay);

  const navAriaLabel = viewMode === 'daily' ? 'Dzień' : 'Tydzień';

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* ── Editorial view header (matches .vh) ─────────────────────── */}
      <div className="relative flex items-center justify-between border-b border-border-glass px-7 pt-[18px] pb-4 shrink-0 gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="size-9 rounded-[10px] grid place-items-center flex-shrink-0 bg-primary/15 border border-primary/30 text-primary">
            <Calendar className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-[-0.02em] leading-none text-foreground truncate">
              Harmonogram
            </h1>
            <span className="block mt-[3px] font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium truncate">
              {summary}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Date nav */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={navigatePrevious}
            aria-label={`Poprzedni ${navAriaLabel === 'Dzień' ? 'dzień' : 'tydzień'}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={navigateNext}
            aria-label={`Następny ${navAriaLabel === 'Dzień' ? 'dzień' : 'tydzień'}`}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday(selectedDay) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={navigateToday}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Dziś
            </Button>
          )}

          <div className="w-px h-4 bg-border-glass mx-1" />

          {/* View mode switcher */}
          <div
            role="tablist"
            aria-label="Tryb widoku harmonogramu"
            className="flex items-center gap-1"
          >
            {MODES.map(m => {
              const Icon = m.Icon;
              const active = viewMode === m.id;
              return (
                <TooltipButton
                  key={m.id}
                  role="tab"
                  aria-selected={active}
                  variant={active ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode(m.id)}
                  className={cn(
                    'w-8 h-8 transition-colors duration-150',
                    active && 'bg-primary/15 text-primary hover:bg-primary/15'
                  )}
                  tooltip={m.tooltip}
                >
                  <Icon className="w-4 h-4" />
                </TooltipButton>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sub-header row — currently-visible date range + legend ───── */}
      <div className="shrink-0 flex items-center justify-between gap-4 px-7 py-3 border-b border-border-glass">
        <div
          aria-live="polite"
          className="font-serif text-[14px] font-semibold leading-none text-foreground/90 tabular-nums"
        >
          {headingTitle}
        </div>
        <div className="flex items-center gap-4 font-mono text-[10.5px] text-muted-foreground/80">
          <LegendSwatch className="bg-primary" label="Na żywo" />
          <LegendSwatch className="bg-[oklch(0.5_0.15_280)]" label="Nadchodzące" />
          <LegendSwatch className="bg-muted-foreground/30" label="Obejrzane" />
        </div>
      </div>

      {/* ── Body: kanji watermark in a clipped layer, content on top ─── */}
      <div role="region" aria-label="Harmonogram anime" className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 時 (toki: time).
            Lives outside any scroll container so the glyph's negative offsets
            don't produce scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="時" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 flex flex-col">
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
            <DailyView entries={todayEntries} day={selectedDay} onAnimeClick={handleAnimeClick} />
          ) : viewMode === 'weekly' ? (
            <WeeklyView
              weekDays={weekDays}
              getEntriesForDay={getEntriesForDay}
              schedule={schedule}
              onAnimeClick={handleAnimeClick}
              libraryAnilistIds={libraryAnilistIds}
              subscribedAnilistIds={subscribedAnilistIds}
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
      </div>

      <AnimeInfoDialog
        anime={selectedAnime}
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i aria-hidden="true" className={cn('block w-2 h-2 rounded-full', className)} />
      {label}
    </span>
  );
}
