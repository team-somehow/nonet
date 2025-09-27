import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: { backgroundColor: Colors.light.background },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarPosition: 'top',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="show"
        options={{
          title: 'Show',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="eye.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'test',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
