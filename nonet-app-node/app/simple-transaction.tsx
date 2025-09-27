import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Surface,
  Chip,
  Divider,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { useWallet } from '@/contexts/WalletContext';
import { 
  sendSimpleTransaction, 
  getBalance, 
  isValidAddress, 
  getCurrentGasPrice,
  TESTNET_INFO,
  SimpleTransactionResult 
} from '@/lib/flow/simpleTransaction';

export default function SimpleTransactionScreen() {
  const { walletData } = useWallet();
  const theme = useTheme();
  
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastTransaction, setLastTransaction] = useState<SimpleTransactionResult | null>(null);

  // Load balance and gas price
  const loadWalletInfo = async () => {
    if (!walletData?.address) return;
    
    try {
      setIsLoading(true);
      
      // Get balance
      const bal = await getBalance(walletData.address, 'flow');
      setBalance(bal);
      
      // Get gas price
      const gas = await getCurrentGasPrice('flow');
      setGasPrice(gas);
      
    } catch (error) {
      console.error('Failed to load wallet info:', error);
      Alert.alert('Error', 'Failed to load wallet information');
    } finally {
      setIsLoading(false);
    }
  };

  // Send transaction
  const handleSendTransaction = async () => {
    if (!walletData?.privateKey) {
      Alert.alert('Error', 'No wallet found. Please create a wallet first.');
      return;
    }

    if (!receiverAddress || !amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isValidAddress(receiverAddress)) {
      Alert.alert('Error', 'Invalid receiver address');
      return;
    }

    if (parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      setIsLoading(true);
      
      Alert.alert(
        'Confirm Transaction',
        `Send ${amount} FLOW to ${receiverAddress.slice(0, 6)}...${receiverAddress.slice(-4)}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send',
            onPress: async () => {
              const result = await sendSimpleTransaction({
                privateKey: walletData.privateKey,
                receiverAddress,
                amount,
                chainId: 'flow', // Default to Flow chain
              });
              
              setLastTransaction(result);
              
              if (result.success) {
                Alert.alert(
                  'Transaction Sent! 🎉',
                  `Transaction Hash: ${result.transactionHash}\n\nYou can view it on Flow EVM Explorer`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setReceiverAddress('');
                        setAmount('');
                        loadWalletInfo(); // Refresh balance
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Transaction Failed', result.error || 'Unknown error occurred');
              }
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (walletData?.address) {
      loadWalletInfo();
    }
  }, [walletData]);

  if (!walletData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContainer}>
          <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
            No wallet found. Please create a wallet first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
            💸 Simple Transaction
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Send FLOW on Flow EVM Testnet
          </Text>
        </View>

        {/* Wallet Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>Your Wallet</Text>
            
            <View style={styles.infoSection}>
              <Text variant="labelMedium" style={styles.label}>Address:</Text>
              <Surface style={styles.addressSurface} elevation={1}>
                <Text variant="bodyMedium" style={styles.address}>
                  {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
                </Text>
              </Surface>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.balanceSection}>
              <Text variant="labelMedium" style={styles.balanceLabel}>Balance</Text>
              <Text variant="headlineSmall" style={styles.balanceText}>
                {balance} FLOW
              </Text>
              <Chip mode="outlined" style={styles.networkChip}>
                {TESTNET_INFO.name}
              </Chip>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoText}>Gas Price: {gasPrice} Gwei</Text>
              <Button 
                mode="outlined"
                onPress={loadWalletInfo}
                disabled={isLoading}
                loading={isLoading}
                compact
              >
                Refresh
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Transaction Form */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>Send Transaction</Text>
            
            <View style={styles.formGroup}>
              <Text variant="labelMedium" style={styles.label}>Receiver Address</Text>
              <TextInput
                mode="outlined"
                value={receiverAddress}
                onChangeText={setReceiverAddress}
                placeholder="0x..."
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text variant="labelMedium" style={styles.label}>Amount (FLOW)</Text>
              <TextInput
                mode="outlined"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.01"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleSendTransaction}
              disabled={isLoading}
              loading={isLoading}
              style={styles.sendButton}
              contentStyle={styles.sendButtonContent}
            >
              Send Transaction
            </Button>
          </Card.Content>
        </Card>

        {/* Last Transaction Result */}
        {lastTransaction && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>Last Transaction</Text>
              
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  lastTransaction.success ? styles.statusSuccess : styles.statusError
                ]}
                textStyle={styles.statusText}
              >
                {lastTransaction.success ? '✅ Success' : '❌ Failed'}
              </Chip>

              {lastTransaction.success ? (
                <View style={styles.successDetails}>
                  <View style={styles.detailRow}>
                    <Text variant="labelMedium" style={styles.detailLabel}>Transaction Hash:</Text>
                    <Surface style={styles.detailSurface} elevation={1}>
                      <Text variant="bodySmall" style={styles.detailValue}>
                        {lastTransaction.transactionHash?.slice(0, 10)}...{lastTransaction.transactionHash?.slice(-8)}
                      </Text>
                    </Surface>
                  </View>
                  
                  {lastTransaction.blockNumber && (
                    <View style={styles.detailRow}>
                      <Text variant="labelMedium" style={styles.detailLabel}>Block Number:</Text>
                      <Chip mode="outlined">{lastTransaction.blockNumber}</Chip>
                    </View>
                  )}
                  
                  {lastTransaction.gasUsed && (
                    <View style={styles.detailRow}>
                      <Text variant="labelMedium" style={styles.detailLabel}>Gas Used:</Text>
                      <Chip mode="outlined">{lastTransaction.gasUsed}</Chip>
                    </View>
                  )}
                </View>
              ) : (
                <Surface style={styles.errorSurface} elevation={1}>
                  <Text variant="bodyMedium" style={styles.errorMessage}>{lastTransaction.error}</Text>
                </Surface>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Testnet Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.cardTitle}>ℹ️ Testnet Information</Text>
            <View style={styles.infoList}>
              <Text variant="bodyMedium" style={styles.infoText}>• Network: {TESTNET_INFO.name}</Text>
              <Text variant="bodyMedium" style={styles.infoText}>• Currency: {TESTNET_INFO.currency}</Text>
              <Text variant="bodyMedium" style={styles.infoText}>• Get test funds: {TESTNET_INFO.faucet}</Text>
            </View>
          </Card.Content>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 12,
  },
  infoSection: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  addressSurface: {
    padding: 12,
    borderRadius: 8,
  },
  address: {
    fontFamily: 'monospace',
  },
  divider: {
    marginVertical: 12,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    marginBottom: 4,
  },
  balanceText: {
    marginBottom: 8,
  },
  networkChip: {
    alignSelf: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    marginBottom: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    marginTop: 4,
  },
  sendButton: {
    marginTop: 16,
  },
  sendButtonContent: {
    paddingVertical: 8,
  },
  statusChip: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
  },
  statusError: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontWeight: '600',
  },
  successDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    flex: 1,
    textTransform: 'uppercase',
  },
  detailSurface: {
    padding: 8,
    borderRadius: 6,
    flex: 2,
    marginLeft: 8,
  },
  detailValue: {
    fontFamily: 'monospace',
  },
  errorSurface: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8d7da',
  },
  errorMessage: {
    color: '#721c24',
    textAlign: 'center',
  },
  infoList: {
    gap: 4,
  },
});
