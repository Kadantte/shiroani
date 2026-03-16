import { Tabs } from 'expo-router';
import { Calendar, Globe, Settings } from 'lucide-react-native';

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
          tabBarIcon: ({ color, size }) => <Globe color={color} size={size} />,
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
