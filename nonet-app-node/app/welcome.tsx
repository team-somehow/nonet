import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { 
  Text, 
  Button, 
  Card, 
  Surface,
  ActivityIndicator,
  useTheme 
} from 'react-native-paper';
import { router } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';

export default function WelcomePage(): React.JSX.Element {
  const { isLoggedIn, createWallet } = useWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Check if user already has a wallet and redirect to tabs
    if (isLoggedIn) {
      router.replace('/(tabs)/');
    }
  }, [isLoggedIn]);

  const handleCreateWallet = async () => {
    try {
      setIsCreatingWallet(true);
      await createWallet();
      
      // Navigate directly to tabs
      router.replace('/(tabs)/');
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to create wallet. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingWallet(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Surface style={styles.logoSurface} elevation={2}>
            <Text style={styles.logoIcon}>🌐</Text>
          </Surface>
          <Text variant="headlineLarge" style={[styles.appName, { color: theme.colors.onBackground }]}>
            NoNet
          </Text>
          <Text variant="bodyMedium" style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            Offline Mesh Transactions
          </Text>
        </View>

        {/* Welcome Content */}
        <View style={styles.welcomeContent}>
          <Text variant="headlineMedium" style={[styles.welcomeTitle, { color: theme.colors.onBackground }]}>
            Welcome to NoNet
          </Text>
          <Text variant="bodyLarge" style={[styles.welcomeDescription, { color: theme.colors.onSurfaceVariant }]}>
            Send crypto transactions offline using mesh network technology.
          </Text>
          
          <View style={styles.featuresContainer}>
            <Card style={styles.featureCard} mode="contained">
              <Card.Content style={styles.feature}>
                <Text style={styles.featureIcon}>📡</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Offline Transactions
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.featureCard} mode="contained">
              <Card.Content style={styles.feature}>
                <Text style={styles.featureIcon}>🔐</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Secure & Encrypted
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.featureCard} mode="contained">
              <Card.Content style={styles.feature}>
                <Text style={styles.featureIcon}>🚀</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Multi-Chain Support
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Create Wallet Button */}
        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            onPress={handleCreateWallet}
            disabled={isCreatingWallet}
            loading={isCreatingWallet}
            style={styles.createWalletButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {isCreatingWallet ? 'Creating Wallet...' : 'Create Secure Wallet'}
          </Button>

          <Text variant="bodySmall" style={[styles.disclaimer, { color: theme.colors.onSurfaceVariant }]}>
            Your private keys are stored securely on your device.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            Powered by mesh network technology
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  logoSurface: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 50,
  },
  appName: {
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeDescription: {
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    gap: 12,
  },
  featureCard: {
    marginBottom: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionContainer: {
    marginBottom: 10,
  },
  createWalletButton: {
    marginBottom: 15,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  footerText: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
