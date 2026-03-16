import { Tabs } from 'expo-router';
import { Calendar, Settings } from 'lucide-react-native';
import { Image } from 'react-native';

const mascotIcon = require('@/assets/images/mascot-wave.png');

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'hsl(345 60% 55%)',
        tabBarInactiveTintColor: 'hsl(350 10% 40%)',
        tabBarStyle: {
          backgroundColor: 'hsl(350 8% 11%)',
          borderTopColor: 'hsl(350 7% 18%)',
        },
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
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="browser"
        options={{
          title: 'Przeglądarka',
          tabBarIcon: ({ size }) => (
            <Image source={mascotIcon} style={{ width: size, height: size }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ustawienia',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
