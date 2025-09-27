import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/contexts/WalletContext';

export default function WalletDemo(): React.JSX.Element {
  const { 
    walletData, 
    createWallet, 
    validatePrivateKey, 
    deriveAddressFromPrivateKey, 
    signMessage 
  } = useWallet();
  
  const [isCreating, setIsCreating] = useState(false);
  const [signedMessage, setSignedMessage] = useState<string>('');

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      await createWallet();
    } catch (error) {
      console.error('Failed to create wallet:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSignMessage = () => {
    if (walletData?.privateKey) {
      try {
        const message = "Hello from NoNet! This is a test signature.";
        const signature = signMessage(message, walletData.privateKey);
        setSignedMessage(signature);
      } catch (error) {
        console.error('Failed to sign message:', error);
      }
    }
  };

  const handleValidateKey = () => {
    if (walletData?.privateKey) {
      const isValid = validatePrivateKey(walletData.privateKey);
      console.log('Private key is valid:', isValid);
    }
  };

  const handleDeriveAddress = () => {
    if (walletData?.privateKey) {
      try {
        const derivedAddress = deriveAddressFromPrivateKey(walletData.privateKey);
        console.log('Derived address:', derivedAddress);
        console.log('Matches stored address:', derivedAddress === walletData.address);
      } catch (error) {
        console.error('Failed to derive address:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔐 Real Crypto Wallet Demo</Text>
        
        {!walletData ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>No Wallet Found</Text>
            <Text style={styles.description}>
              Create a real ECDSA wallet with proper cryptographic key generation
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isCreating && styles.disabledButton]}
              onPress={handleCreateWallet}
              disabled={isCreating}
            >
              <Text style={styles.buttonText}>
                {isCreating ? 'Generating Keys...' : 'Create Real Wallet'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Wallet Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Wallet Created</Text>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{walletData.address}</Text>
              
              <Text style={styles.label}>Private Key:</Text>
              <Text style={styles.value}>{walletData.privateKey.slice(0, 20)}...{walletData.privateKey.slice(-10)}</Text>
              
              <Text style={styles.label}>Public Key:</Text>
              <Text style={styles.value}>{walletData.publicKey.slice(0, 20)}...{walletData.publicKey.slice(-10)}</Text>
              
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>{walletData.createdAt.toLocaleString()}</Text>
            </View>

            {/* Crypto Operations */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧪 Test Crypto Operations</Text>
              
              <TouchableOpacity style={styles.button} onPress={handleValidateKey}>
                <Text style={styles.buttonText}>Validate Private Key</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.button} onPress={handleDeriveAddress}>
                <Text style={styles.buttonText}>Derive Address from Private Key</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.button} onPress={handleSignMessage}>
                <Text style={styles.buttonText}>Sign Test Message</Text>
              </TouchableOpacity>
              
              {signedMessage && (
                <View style={styles.signatureContainer}>
                  <Text style={styles.label}>Message Signature:</Text>
                  <Text style={styles.signatureText}>{signedMessage.slice(0, 30)}...{signedMessage.slice(-20)}</Text>
                </View>
              )}
            </View>

            {/* Technical Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔬 Technical Details</Text>
              <Text style={styles.techDetail}>• Uses secp256k1 ECDSA curve</Text>
              <Text style={styles.techDetail}>• Private key: 32 bytes (256 bits)</Text>
              <Text style={styles.techDetail}>• Public key: 65 bytes uncompressed</Text>
              <Text style={styles.techDetail}>• Address: Keccak256 hash of public key</Text>
              <Text style={styles.techDetail}>• Compatible with Ethereum, BSC, Polygon</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back to App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.icon,
    marginTop: 10,
    marginBottom: 5,
  },
  value: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.light.text,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 5,
  },
  button: {
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: Colors.light.icon,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
  },
  signatureContainer: {
    marginTop: 10,
  },
  signatureText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.light.text,
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 5,
  },
  techDetail: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 5,
    lineHeight: 16,
  },
});
