import { memo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { DAY_NAMES_SHORT, isToday } from '@/lib/schedule-utils';

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
      contentContainerClassName="flex-row gap-1.5 px-4 py-2"
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
            className={`min-w-[48px] items-center rounded-lg px-3 py-2 ${
              isActive ? 'bg-primary' : 'bg-card'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isActive ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {DAY_NAMES_SHORT[index]}
            </Text>
            <Text
              className={`text-sm font-bold ${
                isActive ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              {dayNumber}
            </Text>
            {isTodayDate && (
              <View
                className={`mt-0.5 h-1 w-1 rounded-full ${
                  isActive ? 'bg-primary-foreground' : 'bg-primary'
                }`}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const DayTabBar = memo(DayTabBarInner);
