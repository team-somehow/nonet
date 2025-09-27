import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';

export default function IndexPage(): React.JSX.Element {
  const { isLoggedIn } = useWallet();
  const theme = useTheme();

  useEffect(() => {
    // Small delay to ensure wallet context is loaded
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        // User has a wallet, go directly to tabs
        router.replace('/(tabs)/');
      } else {
        // User doesn't have a wallet, show welcome page
        router.replace('/welcome');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  // Show loading spinner while determining where to navigate
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" />
      <Text variant="bodyMedium" style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
        Loading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
});
