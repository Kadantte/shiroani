import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AiringAnime } from '@shiroani/shared';
import { Text } from '@/components/ui/text';
import { DayTabBar } from '@/components/schedule/DayTabBar';
import { AiringEntryCard } from '@/components/schedule/AiringEntryCard';
import { useSchedule } from '@/hooks/useSchedule';
import { useNotificationSubscriptions } from '@/hooks/useNotificationSubscriptions';
import { ScheduleSkeleton } from '@/components/schedule/ScheduleSkeleton';
import { formatDateRange } from '@/lib/schedule-utils';
import { colors } from '@/lib/theme';

export default function ScheduleScreen() {
  const {
    selectedDay,
    loading,
    error,
    selectDay,
    navigateWeek,
    goToToday,
    refresh,
    weekDays,
    currentEntries,
  } = useSchedule();

  const { isSubscribed, toggle } = useNotificationSubscriptions();

  const renderItem = useCallback(
    ({ item }: { item: AiringAnime }) => (
      <AiringEntryCard
        anime={item}
        subscribed={isSubscribed(item.media.id)}
        onToggleSubscription={toggle}
      />
    ),
    [isSubscribed, toggle]
  );

  const keyExtractor = useCallback((item: AiringAnime) => String(item.id), []);

  const dateRange = weekDays.length === 7 ? formatDateRange(weekDays[0], weekDays[6]) : '';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Title */}
      <View style={s.titleRow}>
        <Text style={s.title}>Harmonogram</Text>
        <Pressable
          onPress={goToToday}
          accessibilityRole="button"
          accessibilityLabel="Przejdź do dzisiaj"
          style={s.todayButton}
        >
          <Text style={s.todayText}>Dziś</Text>
        </Pressable>
      </View>

      {/* Week Navigation */}
      <View style={s.weekNav}>
        <Pressable
          onPress={() => navigateWeek(-1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Poprzedni tydzień"
          style={s.navButton}
        >
          <ChevronLeft size={20} color={colors.mutedForeground} />
        </Pressable>

        <Text style={s.weekRange}>{dateRange}</Text>

        <Pressable
          onPress={() => navigateWeek(1)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Następny tydzień"
          style={s.navButton}
        >
          <ChevronRight size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Day tabs */}
      <DayTabBar days={weekDays} selectedDay={selectedDay} onSelect={selectDay} />

      {/* Content */}
      {loading ? (
        <ScheduleSkeleton />
      ) : error ? (
        <View style={s.centered}>
          <Text style={s.errorText}>{error}</Text>
          <Pressable onPress={refresh} accessibilityRole="button" style={s.retryButton}>
            <Text style={s.retryText}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={currentEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Text style={s.emptyText}>Brak anime na ten dzień</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.foreground,
  },
  todayButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  todayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  navButton: {
    padding: 4,
  },
  weekRange: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.mutedForeground,
    minWidth: 100,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: colors.mutedForeground,
  },
});
