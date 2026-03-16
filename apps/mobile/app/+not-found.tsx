import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nie znaleziono' }} />
      <View className="flex-1 items-center justify-center bg-background p-5">
        <Text variant="h3">Nie znaleziono strony</Text>
        <Link href="/" className="mt-4">
          <Text className="text-primary underline">Wróć do ekranu głównego</Text>
        </Link>
      </View>
    </>
  );
}
