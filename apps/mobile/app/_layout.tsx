import '@/global.css';

import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { migrateDbIfNeeded } from '@/lib/db';

export { ErrorBoundary } from 'expo-router';

function LoadingFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="hsl(345 60% 55%)" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SQLiteProvider databaseName="shiroani.db" onInit={migrateDbIfNeeded} useSuspense>
        <ThemeProvider value={NAV_THEME}>
          <StatusBar style="light" />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
