import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-1 pt-2">
        <Pressable
          onPress={() => navigateWeek(-1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Poprzedni tydzień"
        >
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <Text variant="h4">Harmonogram</Text>
          <Pressable
            onPress={goToToday}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do dzisiaj"
            className="rounded-md bg-primary px-2.5 py-1"
          >
            <Text className="text-xs font-semibold text-primary-foreground">Dziś</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigateWeek(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Następny tydzień"
        >
          <ChevronRight size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Day tabs */}
      <DayTabBar days={weekDays} selectedDay={selectedDay} onSelect={selectDay} />

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-muted-foreground">{error}</Text>
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            className="rounded-lg bg-primary px-4 py-2"
          >
            <Text className="font-semibold text-primary-foreground">Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={currentEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerClassName="pt-2 pb-4"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-muted-foreground">Brak anime na ten dzień</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
