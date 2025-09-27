import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, Platform, StatusBar } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { NeoBrutalismColors } from '@/constants/neoBrutalism';

export default function TabLayout() {
  // Calculate safe area padding for Android
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: NeoBrutalismColors.primary,
        tabBarInactiveTintColor: NeoBrutalismColors.textSecondary,
        tabBarStyle: { 
          backgroundColor: NeoBrutalismColors.background,
          borderTopWidth: 4,
          borderTopColor: NeoBrutalismColors.border,
          paddingTop: Platform.OS === 'android' ? statusBarHeight + 8 : 8,
          height: Platform.OS === 'android' ? 70 + statusBarHeight : 70,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarPosition: 'top',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'SCAN',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="qr-code-scanner" color={color} />,
        }}
      />
      <Tabs.Screen
        name="show"
        options={{
          title: 'WALLET',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="account-balance-wallet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mesh"
        options={{
          title: 'MESH',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="device-hub" color={color} />,
        }}
      />
    </Tabs>
  );
}
