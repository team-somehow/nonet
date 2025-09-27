import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
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
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="show"
        options={{
          title: 'Show',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="visibility" color={color} />,
        }}
      />
      <Tabs.Screen
        name="test"
        options={{
          title: 'test',
          tabBarIcon: ({ color }) => <MaterialIcons size={24} name="send" color={color} />,
        }}
      />
    </Tabs>
  );
}
