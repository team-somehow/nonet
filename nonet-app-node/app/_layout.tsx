// Import polyfills FIRST
import '../polyfills';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { WalletProvider } from '@/contexts/WalletContext';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: 'index',
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
  // Handle unhandled promise rejections (Web only)
  useEffect(() => {
    // Only add web-specific error handling
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      const handleUnhandledRejection = (event: any) => {
        console.warn('Unhandled promise rejection:', event.reason);
        // Prevent the default behavior (which would crash the app)
        event.preventDefault();
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      
      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }

    // For React Native, we can set up a global error handler
    if (Platform.OS !== 'web') {
      const originalConsoleError = console.error;
      console.error = (...args: any[]) => {
        // Log errors but don't crash the app
        originalConsoleError.apply(console, args);
      };

      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  return (
    <WalletProvider>
      <ThemeProvider value={CustomLightTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          <Stack.Screen 
            name="wallet-demo" 
            options={{ 
              title: 'Crypto Wallet Demo',
              headerShown: true,
              headerStyle: { backgroundColor: Colors.light.background },
              headerTintColor: Colors.light.text,
            }} 
          />
          <Stack.Screen 
            name="simple-transaction" 
            options={{ 
              title: 'Simple Transaction',
              headerShown: true,
              headerStyle: { backgroundColor: Colors.light.background },
              headerTintColor: Colors.light.text,
            }} 
          />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </WalletProvider>
  );
}
