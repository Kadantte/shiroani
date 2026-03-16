import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function BrowserScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text variant="h3">Przeglądarka</Text>
      <Text className="mt-2 text-muted-foreground">Wkrótce dostępna</Text>
    </View>
  );
}
