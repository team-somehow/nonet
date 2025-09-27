import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Divider,
  Chip,
  Surface,
  useTheme,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';

export default function WalletDemo(): React.JSX.Element {
  const { 
    walletData, 
    createWallet, 
    validatePrivateKey, 
    deriveAddressFromPrivateKey, 
    signMessage 
  } = useWallet();
  
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          🔐 Real Crypto Wallet Demo
        </Text>
        
        {!walletData ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>No Wallet Found</Text>
              <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                Create a real ECDSA wallet with proper cryptographic key generation
              </Text>
              <Button
                mode="contained"
                onPress={handleCreateWallet}
                disabled={isCreating}
                loading={isCreating}
                style={styles.createButton}
              >
                {isCreating ? 'Generating Keys...' : 'Create Real Wallet'}
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <View>
            {/* Wallet Info */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.cardTitle}>✅ Wallet Created</Text>
                <Divider style={styles.divider} />
                
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.label}>Address:</Text>
                  <Surface style={styles.valueSurface} elevation={1}>
                    <Text variant="bodySmall" style={styles.value}>{walletData.address}</Text>
                  </Surface>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.label}>Private Key:</Text>
                  <Surface style={styles.valueSurface} elevation={1}>
                    <Text variant="bodySmall" style={styles.value}>
                      {walletData.privateKey.slice(0, 20)}...{walletData.privateKey.slice(-10)}
                    </Text>
                  </Surface>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.label}>Public Key:</Text>
                  <Surface style={styles.valueSurface} elevation={1}>
                    <Text variant="bodySmall" style={styles.value}>
                      {walletData.publicKey.slice(0, 20)}...{walletData.publicKey.slice(-10)}
                    </Text>
                  </Surface>
                </View>
                
                <View style={styles.infoRow}>
                  <Text variant="labelMedium" style={styles.label}>Created:</Text>
                  <Chip mode="outlined" style={styles.dateChip}>
                    {walletData.createdAt.toLocaleString()}
                  </Chip>
                </View>
              </Card.Content>
            </Card>

            {/* Crypto Operations */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.cardTitle}>🧪 Test Crypto Operations</Text>
                <Divider style={styles.divider} />
                
                <View style={styles.buttonGroup}>
                  <Button mode="outlined" onPress={handleValidateKey} style={styles.operationButton}>
                    Validate Private Key
                  </Button>
                  
                  <Button mode="outlined" onPress={handleDeriveAddress} style={styles.operationButton}>
                    Derive Address
                  </Button>
                  
                  <Button mode="outlined" onPress={handleSignMessage} style={styles.operationButton}>
                    Sign Test Message
                  </Button>
                </View>
                
                {signedMessage && (
                  <Surface style={styles.signatureSurface} elevation={2}>
                    <Text variant="labelMedium" style={styles.label}>Message Signature:</Text>
                    <Text variant="bodySmall" style={styles.signatureText}>
                      {signedMessage.slice(0, 30)}...{signedMessage.slice(-20)}
                    </Text>
                  </Surface>
                )}
              </Card.Content>
            </Card>

            {/* Technical Details */}
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.cardTitle}>🔬 Technical Details</Text>
                <Divider style={styles.divider} />
                
                <View style={styles.techDetails}>
                  <Chip mode="flat" style={styles.techChip}>secp256k1 ECDSA curve</Chip>
                  <Chip mode="flat" style={styles.techChip}>32 bytes private key</Chip>
                  <Chip mode="flat" style={styles.techChip}>65 bytes public key</Chip>
                  <Chip mode="flat" style={styles.techChip}>Keccak256 address</Chip>
                  <Chip mode="flat" style={styles.techChip}>Multi-chain compatible</Chip>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}

        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.backButton}
          contentStyle={styles.backButtonContent}
        >
          ← Back to App
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
  },
  createButton: {
    marginTop: 8,
  },
  infoRow: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  valueSurface: {
    padding: 12,
    borderRadius: 8,
  },
  value: {
    fontFamily: 'monospace',
  },
  dateChip: {
    alignSelf: 'flex-start',
  },
  buttonGroup: {
    gap: 8,
  },
  operationButton: {
    marginBottom: 8,
  },
  signatureSurface: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  signatureText: {
    fontFamily: 'monospace',
    marginTop: 8,
  },
  techDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techChip: {
    marginBottom: 4,
  },
  backButton: {
    marginTop: 16,
  },
  backButtonContent: {
    paddingVertical: 4,
  },
});
