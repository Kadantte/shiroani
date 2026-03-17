import { Tabs } from 'expo-router';
import { Calendar, Settings } from 'lucide-react-native';
import { Image } from 'react-native';
import { useSettingsContext } from '@/context/SettingsContext';

const mascotIcon = require('@/assets/images/mascot-wave.png');

export default function TabsLayout() {
  const { settings } = useSettingsContext();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'hsl(345 60% 55%)',
        tabBarInactiveTintColor: 'hsl(350 10% 40%)',
        tabBarShowLabel: settings.showLabels,
        tabBarStyle: {
          backgroundColor: 'hsl(350 8% 11%)',
          borderTopColor: 'hsl(350 7% 18%)',
        },
        tabBarItemStyle: settings.showLabels ? {} : { paddingVertical: 12 },
        headerStyle: {
          backgroundColor: 'hsl(300 10% 5%)',
        },
        headerTintColor: 'hsl(350 20% 92%)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Harmonogram',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="browser"
        options={{
          title: 'Przeglądarka',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <Image source={mascotIcon} style={{ width: size, height: size }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ustawienia',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
