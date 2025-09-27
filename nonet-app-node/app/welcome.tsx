import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/contexts/WalletContext';

export default function WelcomePage(): React.JSX.Element {
  const { isLoggedIn, createWallet } = useWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

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
      
      // Show success message
      Alert.alert(
        'Wallet Created! 🎉',
        'Your secure wallet has been created and is ready to use.',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)/'),
          },
        ]
      );
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoIcon}>🌐</Text>
          </View>
          <Text style={styles.appName}>NoNet</Text>
          <Text style={styles.tagline}>Offline Mesh Transactions</Text>
        </View>

        {/* Welcome Content */}
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>Welcome to NoNet</Text>
          <Text style={styles.welcomeDescription}>
            Send cryptocurrency transactions without internet connectivity using our revolutionary mesh network technology.
          </Text>
          
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📡</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Offline Transactions</Text>
                <Text style={styles.featureDescription}>
                  Send crypto without internet using Bluetooth mesh network
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🔐</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Secure & Encrypted</Text>
                <Text style={styles.featureDescription}>
                  End-to-end encryption ensures your transactions are secure
                </Text>
              </View>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🚀</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Multi-Chain Support</Text>
                <Text style={styles.featureDescription}>
                  Support for Hedera, Flow, Ethereum, and more blockchains
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Create Wallet Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.createWalletButton, isCreatingWallet && styles.createWalletButtonDisabled]}
            onPress={handleCreateWallet}
            disabled={isCreatingWallet}
          >
            {isCreatingWallet ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.createWalletButtonText}>Creating Wallet...</Text>
              </View>
            ) : (
              <Text style={styles.createWalletButtonText}>Create Secure Wallet</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            By creating a wallet, you agree to our terms of service. Your private keys are stored securely on your device.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by decentralized mesh network technology
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 50,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.light.icon,
    fontStyle: 'italic',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeDescription: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    gap: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
  },
  actionContainer: {
    marginBottom: 20,
  },
  createWalletButton: {
    backgroundColor: Colors.light.tint,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createWalletButtonDisabled: {
    backgroundColor: Colors.light.icon,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createWalletButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.icon,
    fontStyle: 'italic',
  },
});
