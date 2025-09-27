import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/contexts/WalletContext';

export default function IndexPage(): React.JSX.Element {
  const { isLoggedIn } = useWallet();

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
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.light.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
});
