import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { WalletProvider } from '@/contexts/WalletContext';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom light theme
const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E5E5EA',
    notification: '#007AFF',
  },
};

export default function RootLayout() {
  return (
    <WalletProvider>
      <ThemeProvider value={CustomLightTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen 
            name="transaction" 
            options={{ 
              title: 'Send Transaction',
              presentation: 'modal',
              headerShown: true,
              headerStyle: { backgroundColor: Colors.light.background },
              headerTintColor: Colors.light.text,
            }} 
          />
          <Stack.Screen 
            name="transaction-success" 
            options={{ 
              title: 'Transaction Success',
              headerShown: false,
            }} 
          />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </WalletProvider>
  );
}
