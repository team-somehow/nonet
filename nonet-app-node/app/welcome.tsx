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
import { 
  NeoBrutalButton, 
  NeoBrutalCard, 
  NeoBrutalHeader, 
  NeoBrutalBadge,
  NeoBrutalDivider 
} from '@/components/NeoBrutalismComponents';
import { NeoBrutalismColors } from '@/constants/neoBrutalism';

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
        {/* Hackathon Badge */}
        <View style={styles.hackathonBadge}>
          <NeoBrutalBadge 
            text="ETH DELHI 2024" 
            variant="success" 
            style={styles.badge}
          />
        </View>

        {/* Hero Section with Neo-Brutalism */}
        <View style={styles.heroSection}>
          <NeoBrutalHeader 
            title="NONET"
            subtitle="Offline Mesh Network for Crypto"
            variant="hero"
            style={styles.heroHeader}
          />
          
          {/* Cyber-style decoration */}
          <View style={styles.cyberDecoration}>
            <Text style={styles.cyberText}>{'>'} DECENTRALIZED</Text>
            <Text style={styles.cyberText}>{'>'} OFFLINE-FIRST</Text>
            <Text style={styles.cyberText}>{'>'} WEB3 READY</Text>
          </View>
        </View>

        <NeoBrutalDivider variant="primary" thickness="thick" />

        {/* Features with Neo-Brutal Cards */}
        <View style={styles.featuresSection}>
          <NeoBrutalHeader 
            title="FEATURES"
            variant="section"
            style={styles.sectionHeader}
          />
          
          <View style={styles.featuresGrid}>
            <NeoBrutalCard variant="primary" style={styles.featureCard}>
              <View style={styles.featureContent}>
                <Text style={styles.featureIcon}>📡</Text>
                <Text style={styles.featureTitle}>MESH NETWORK</Text>
                <Text style={styles.featureDesc}>Send transactions without internet</Text>
              </View>
            </NeoBrutalCard>

            <NeoBrutalCard variant="accent" style={styles.featureCard}>
              <View style={styles.featureContent}>
                <Text style={styles.featureIcon}>🔐</Text>
                <Text style={styles.featureTitle}>ZERO TRUST</Text>
                <Text style={styles.featureDesc}>End-to-end encrypted transactions</Text>
              </View>
            </NeoBrutalCard>

            <NeoBrutalCard variant="primary" style={styles.featureCard}>
              <View style={styles.featureContent}>
                <Text style={styles.featureIcon}>⚡</Text>
                <Text style={styles.featureTitle}>LIGHTNING FAST</Text>
                <Text style={styles.featureDesc}>Instant P2P crypto transfers</Text>
              </View>
            </NeoBrutalCard>
          </View>
        </View>

        <NeoBrutalDivider variant="secondary" thickness="medium" />

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <NeoBrutalButton
            title={isCreatingWallet ? "GENERATING WALLET..." : "START BUILDING"}
            onPress={handleCreateWallet}
            variant="primary"
            size="large"
            disabled={isCreatingWallet}
            style={styles.ctaButton}
          />
          
          {isCreatingWallet && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={NeoBrutalismColors.primary} />
              <Text style={styles.loadingText}>CREATING SECURE WALLET...</Text>
            </View>
          )}

          <Text style={styles.disclaimer}>
            {'>'} YOUR KEYS, YOUR CRYPTO
          </Text>
          <Text style={styles.disclaimer}>
            {'>'} NON-CUSTODIAL & SECURE
          </Text>
        </View>

        {/* Footer with Hackathon Branding */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            BUILT FOR ETH DELHI HACKATHON 2024
          </Text>
          <View style={styles.techStack}>
            <NeoBrutalBadge text="REACT NATIVE" variant="info" />
            <NeoBrutalBadge text="ETHEREUM" variant="warning" />
            <NeoBrutalBadge text="MESH NET" variant="error" />
          </View>
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
    padding: 16,
  },
  
  // Hackathon Badge
  hackathonBadge: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  badge: {
    transform: [{ rotate: '3deg' }],
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cyberDecoration: {
    alignItems: 'flex-start',
  },
  cyberText: {
    fontSize: 14,
    fontWeight: '600',
    color: NeoBrutalismColors.primary,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 4,
  },
  
  // Features Section
  featuresSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    marginBottom: 8,
  },
  featureContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NeoBrutalismColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 1,
  },
  featureDesc: {
    fontSize: 12,
    color: NeoBrutalismColors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // CTA Section
  ctaSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ctaButton: {
    marginBottom: 16,
    minWidth: 250,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: NeoBrutalismColors.primary,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: '500',
    color: NeoBrutalismColors.textSecondary,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: NeoBrutalismColors.border,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
    color: NeoBrutalismColors.textTertiary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  techStack: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
