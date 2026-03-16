import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { AiringAnime } from '@shiroani/shared';
import { Text } from '@/components/ui/text';
import { DayTabBar } from '@/components/schedule/DayTabBar';
import { AiringEntryCard } from '@/components/schedule/AiringEntryCard';
import { useSchedule } from '@/hooks/useSchedule';
import { useNotificationSubscriptions } from '@/hooks/useNotificationSubscriptions';
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigateWeek(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Poprzedni tydzień"
          style={styles.navButton}
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text variant="h4">Harmonogram</Text>
          <Pressable
            onPress={goToToday}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do dzisiaj"
            style={styles.todayButton}
          >
            <Text style={styles.todayText}>Dziś</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigateWeek(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Następny tydzień"
          style={styles.navButton}
        >
          <ChevronRight size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Day tabs */}
      <DayTabBar days={weekDays} selectedDay={selectedDay} onSelect={selectDay} />

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refresh} accessibilityRole="button" style={styles.retryButton}>
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={currentEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Brak anime na ten dzień</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  navButton: {
    padding: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  todayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
