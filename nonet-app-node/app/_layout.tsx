// Import polyfills FIRST
import '../polyfills';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

import { WalletProvider } from '@/contexts/WalletContext';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Custom light theme for navigation
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

const neoBrutalismPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Primary colors - Electric Green
    primary: Colors.neoBrutalism.primary,
    onPrimary: Colors.neoBrutalism.textInverse,
    primaryContainer: Colors.neoBrutalism.primaryDark,
    onPrimaryContainer: Colors.neoBrutalism.textPrimary,
    
    // Secondary colors - Electric Pink
    secondary: Colors.neoBrutalism.secondary,
    onSecondary: Colors.neoBrutalism.textInverse,
    secondaryContainer: Colors.neoBrutalism.secondaryDark,
    onSecondaryContainer: Colors.neoBrutalism.textPrimary,
    
    // Tertiary colors - Cyan Accent
    tertiary: Colors.neoBrutalism.accent,
    onTertiary: Colors.neoBrutalism.textInverse,
    tertiaryContainer: Colors.neoBrutalism.accent,
    onTertiaryContainer: Colors.neoBrutalism.textInverse,
    
    // Surface colors - Dark theme
    surface: Colors.neoBrutalism.surface,
    onSurface: Colors.neoBrutalism.text,
    surfaceVariant: Colors.neoBrutalism.surfaceAlt,
    onSurfaceVariant: Colors.neoBrutalism.textSecondary,
    surfaceTint: Colors.neoBrutalism.primary,
    
    // Background colors
    background: Colors.neoBrutalism.background,
    onBackground: Colors.neoBrutalism.text,
    
    // Error colors
    error: Colors.neoBrutalism.error,
    onError: Colors.neoBrutalism.textInverse,
    errorContainer: Colors.neoBrutalism.error,
    onErrorContainer: Colors.neoBrutalism.textInverse,
    
    // Outline colors
    outline: Colors.neoBrutalism.border,
    outlineVariant: Colors.neoBrutalism.borderSubtle,
    
    // Inverse colors
    inverseSurface: Colors.neoBrutalism.textPrimary,
    onInverseSurface: Colors.neoBrutalism.textInverse,
    inversePrimary: Colors.neoBrutalism.primaryDark,
    
    // Shadow and scrim
    shadow: Colors.neoBrutalism.shadow,
    scrim: Colors.neoBrutalism.background,
    
    // Elevation colors for Neo-Brutalism effect
    elevation: {
      level0: 'transparent',
      level1: Colors.neoBrutalism.surface,
      level2: Colors.neoBrutalism.surfaceAlt,
      level3: Colors.neoBrutalism.surfaceAlt,
      level4: Colors.neoBrutalism.surfaceAlt,
      level5: Colors.neoBrutalism.surfaceAlt,
    },
  },
  // Custom font configuration for bold Neo-Brutalism look
  fonts: {
    ...MD3LightTheme.fonts,
    displayLarge: {
      ...MD3LightTheme.fonts.displayLarge,
      fontWeight: '900', // Extra bold
    },
    displayMedium: {
      ...MD3LightTheme.fonts.displayMedium,
      fontWeight: '800',
    },
    displaySmall: {
      ...MD3LightTheme.fonts.displaySmall,
      fontWeight: '800',
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontWeight: '800',
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontWeight: '700',
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontWeight: '700',
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontWeight: '600',
    },
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontWeight: '600',
      textTransform: 'uppercase', // Neo-Brutalism style
    },
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
        // originalConsoleError.apply(console, args);
      };

      return () => {
        console.error = originalConsoleError;
      };
    }
  }, []);

  return (
    <PaperProvider theme={neoBrutalismPaperTheme}>
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
    </PaperProvider>
  );
}
