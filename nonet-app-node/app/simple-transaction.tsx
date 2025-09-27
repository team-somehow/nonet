import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useWallet } from '@/contexts/WalletContext';
import { Colors } from '@/constants/theme';
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>No wallet found. Please create a wallet first.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💸 Simple Transaction</Text>
          <Text style={styles.subtitle}>Send FLOW on Flow EVM Testnet</Text>
        </View>

        {/* Wallet Info */}
        <View style={styles.walletCard}>
          <Text style={styles.cardTitle}>Your Wallet</Text>
          
          <View style={styles.addressContainer}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.address}>
              {walletData.address.slice(0, 6)}...{walletData.address.slice(-4)}
            </Text>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceText}>
              {balance} FLOW
            </Text>
            <Text style={styles.networkText}>
              {TESTNET_INFO.name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>Gas Price: {gasPrice} Gwei</Text>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={loadWalletInfo}
              disabled={isLoading}
            >
              <Text style={styles.refreshButtonText}>
                {isLoading ? '⏳' : '🔄'} Refresh
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Form */}
        <View style={styles.transactionCard}>
          <Text style={styles.cardTitle}>Send Transaction</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Receiver Address</Text>
            <TextInput
              style={styles.input}
              value={receiverAddress}
              onChangeText={setReceiverAddress}
              placeholder="0x..."
              placeholderTextColor="#999"
              multiline={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Amount (FLOW)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.01"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity 
            style={[styles.sendButton, isLoading && styles.sendButtonDisabled]} 
            onPress={handleSendTransaction}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.sendButtonText}>Send Transaction</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Last Transaction Result */}
        {lastTransaction && (
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>Last Transaction</Text>
            
            <View style={[
              styles.statusContainer,
              lastTransaction.success ? styles.statusSuccess : styles.statusError
            ]}>
              <Text style={styles.statusText}>
                {lastTransaction.success ? '✅ Success' : '❌ Failed'}
              </Text>
            </View>

            {lastTransaction.success ? (
              <View style={styles.successDetails}>
                <Text style={styles.detailLabel}>Transaction Hash:</Text>
                <Text style={styles.detailValue}>
                  {lastTransaction.transactionHash?.slice(0, 10)}...{lastTransaction.transactionHash?.slice(-8)}
                </Text>
                
                {lastTransaction.blockNumber && (
                  <>
                    <Text style={styles.detailLabel}>Block Number:</Text>
                    <Text style={styles.detailValue}>{lastTransaction.blockNumber}</Text>
                  </>
                )}
                
                {lastTransaction.gasUsed && (
                  <>
                    <Text style={styles.detailLabel}>Gas Used:</Text>
                    <Text style={styles.detailValue}>{lastTransaction.gasUsed}</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.errorDetails}>
                <Text style={styles.errorMessage}>{lastTransaction.error}</Text>
              </View>
            )}
          </View>
        )}

        {/* Testnet Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>ℹ️ Testnet Information</Text>
          <Text style={styles.infoText}>• Network: {TESTNET_INFO.name}</Text>
          <Text style={styles.infoText}>• Currency: {TESTNET_INFO.currency}</Text>
          <Text style={styles.infoText}>• Get test funds: {TESTNET_INFO.faucet}</Text>
          <Text style={styles.infoText}>• Explorer: {TESTNET_INFO.explorer}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
  },
  walletCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 15,
  },
  addressContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    color: Colors.light.icon,
    fontFamily: 'monospace',
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 4,
  },
  networkText: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: Colors.light.icon,
    marginBottom: 4,
  },
  refreshButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: Colors.light.text,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
  },
  statusError: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successDetails: {
    marginTop: 10,
  },
  errorDetails: {
    marginTop: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 8,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontFamily: 'monospace',
  },
  errorMessage: {
    fontSize: 14,
    color: '#721c24',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
});
