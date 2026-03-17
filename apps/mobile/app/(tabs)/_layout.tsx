import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Harmonogram' }} />
      <Tabs.Screen name="browser" options={{ title: 'Przeglądarka' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ustawienia' }} />
    </Tabs>
  );
}
