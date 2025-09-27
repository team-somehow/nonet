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
import { 
  requestAllPermissions, 
  showPermissionExplanation, 
  showPermissionDeniedDialog 
} from '@/utils/permissions';

export default function WelcomePage(): React.JSX.Element {
  const { isLoggedIn, createWallet } = useWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    // Check if user already has a wallet and redirect to tabs
    if (isLoggedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn]);

  const handleCreateWallet = async () => {
    try {
      setIsCreatingWallet(true);
      
      console.log('🔐 Starting wallet creation process...');
      
      // Step 1: Show permission explanation
      const userAcceptedExplanation = await showPermissionExplanation();
      if (!userAcceptedExplanation) {
        console.log('❌ User declined permission explanation');
        setIsCreatingWallet(false);
        return;
      }
      
      // Step 2: Request all permissions
      console.log('📋 Requesting all permissions...');
      const permissionResults = await requestAllPermissions();
      
      // Step 3: Handle permission results
      if (!permissionResults.allGranted) {
        const deniedPermissions: string[] = [];
        if (!permissionResults.camera) deniedPermissions.push('Camera');
        if (!permissionResults.bluetooth) deniedPermissions.push('Bluetooth');
        
        console.log('❌ Some permissions denied:', deniedPermissions);
        
        const userWantsToTryAgain = await showPermissionDeniedDialog(deniedPermissions);
        if (userWantsToTryAgain) {
          // Retry permission request
          setIsCreatingWallet(false);
          setTimeout(() => handleCreateWallet(), 100);
          return;
        } else {
          // User chose to skip permissions - still create wallet but warn about limited functionality
          Alert.alert(
            'Limited Functionality',
            'NoNet will work with limited functionality without all permissions. You can grant permissions later in your device settings.',
            [{ text: 'Continue Anyway', onPress: () => proceedWithWalletCreation() }]
          );
          return;
        }
      }
      
      // Step 4: All permissions granted, create wallet
      console.log('✅ All permissions granted, creating wallet...');
      await proceedWithWalletCreation();
      
    } catch (error) {
      console.error('❌ Error in wallet creation process:', error);
      Alert.alert(
        'Error',
        'Failed to create wallet. Please try again.',
        [{ text: 'OK' }]
      );
      setIsCreatingWallet(false);
    }
  };

  const proceedWithWalletCreation = async () => {
    try {
      console.log('🔐 Creating cryptographic wallet...');
      await createWallet();
      
      console.log('✅ Wallet created successfully, navigating to app...');
      // Navigate directly to tabs
      router.replace('/(tabs)');
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
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
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🌐</Text>
          </View>
          <Text style={styles.appName}>NoNet</Text>
        </View>

        {/* Create Wallet Button */}
        <View style={styles.buttonSection}>
          <NeoBrutalButton
            title={isCreatingWallet ? "Creating Wallet..." : "Create Wallet"}
            onPress={handleCreateWallet}
            variant="primary"
            size="large"
            disabled={isCreatingWallet}
            style={styles.createButton}
          />
          
          {isCreatingWallet && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={NeoBrutalismColors.primary} />
            </View>
          )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: NeoBrutalismColors.surfaceAlt,
    borderWidth: 4,
    borderColor: NeoBrutalismColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: NeoBrutalismColors.primary,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 48,
    fontWeight: '900',
    color: NeoBrutalismColors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Button Section
  buttonSection: {
    alignItems: 'center',
    width: '100%',
  },
  createButton: {
    minWidth: 280,
    marginBottom: 16,
  },
  loadingIndicator: {
    marginTop: 16,
  },
});
