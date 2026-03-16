import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function ScheduleScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h3">Harmonogram</Text>
      <Text className="mt-2 text-muted-foreground">Wkrótce dostępny</Text>
    </View>
  );
}
