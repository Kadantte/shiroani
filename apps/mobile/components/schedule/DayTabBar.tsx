import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { DAY_NAMES_SHORT, isToday } from '@/lib/schedule-utils';
import { colors } from '@/lib/theme';

interface DayTabBarProps {
  days: string[];
  selectedDay: string;
  onSelect: (day: string) => void;
}

function DayTabBarInner({ days, selectedDay, onSelect }: DayTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((dateStr, index) => {
        const dayNumber = dateStr.split('-')[2];
        const isActive = dateStr === selectedDay;
        const isTodayDate = isToday(dateStr);

        return (
          <Pressable
            key={dateStr}
            onPress={() => onSelect(dateStr)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${DAY_NAMES_SHORT[index]} ${dayNumber}`}
            style={[styles.tab, isActive ? styles.tabActive : styles.tabInactive]}
          >
            <Text style={[styles.dayName, isActive ? styles.textActive : styles.textMuted]}>
              {DAY_NAMES_SHORT[index]}
            </Text>
            <Text style={[styles.dayNumber, isActive ? styles.textActive : styles.textForeground]}>
              {dayNumber}
            </Text>
            {isTodayDate && (
              <View style={[styles.todayDot, isActive ? styles.dotActive : styles.dotPrimary]} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const DayTabBar = memo(DayTabBarInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabInactive: {
    backgroundColor: colors.card,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  textActive: {
    color: '#fff',
  },
  textMuted: {
    color: colors.mutedForeground,
  },
  textForeground: {
    color: colors.foreground,
  },
  todayDot: {
    marginTop: 2,
    height: 4,
    width: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  dotPrimary: {
    backgroundColor: colors.primary,
  },
});
