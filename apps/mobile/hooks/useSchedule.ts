import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiringAnime } from '@shiroani/shared';
import { toLocalDate, getWeekStart } from '@shiroani/shared';
import { fetchWeeklySchedule } from '@/lib/anilist';

interface ScheduleState {
  schedule: Record<string, AiringAnime[]>;
  weekStart: Date;
  selectedDay: string;
  loading: boolean;
  error: string | null;
}

export function useSchedule() {
  const today = toLocalDate(new Date());
  const [state, setState] = useState<ScheduleState>({
    schedule: {},
    weekStart: getWeekStart(),
    selectedDay: today,
    loading: true,
    error: null,
  });

  const fetchSchedule = useCallback(async (weekStart: Date) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchWeeklySchedule(weekStart);
      setState(prev => ({ ...prev, schedule: data, loading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState(prev => ({ ...prev, error: message, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchSchedule(state.weekStart);
  }, [state.weekStart, fetchSchedule]);

  const selectDay = useCallback((day: string) => {
    setState(prev => ({ ...prev, selectedDay: day }));
  }, []);

  const navigateWeek = useCallback((direction: -1 | 1) => {
    setState(prev => {
      const newStart = new Date(prev.weekStart);
      newStart.setDate(newStart.getDate() + direction * 7);
      // When navigating, select Monday of the new week
      const newSelectedDay = toLocalDate(newStart);
      return { ...prev, weekStart: newStart, selectedDay: newSelectedDay };
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    const nowDay = toLocalDate(now);
    const nowWeekStart = getWeekStart(now);
    setState(prev => ({ ...prev, weekStart: nowWeekStart, selectedDay: nowDay }));
  }, []);

  const refresh = useCallback(() => {
    fetchSchedule(state.weekStart);
  }, [state.weekStart, fetchSchedule]);

  const weekDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(state.weekStart);
      d.setDate(d.getDate() + i);
      days.push(toLocalDate(d));
    }
    return days;
  }, [state.weekStart]);

  const currentEntries = useMemo(
    () => state.schedule[state.selectedDay] ?? [],
    [state.schedule, state.selectedDay]
  );

  return {
    ...state,
    selectDay,
    navigateWeek,
    goToToday,
    refresh,
    weekDays,
    currentEntries,
  };
}
