import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Surface,
  Modal,
  Portal,
  List,
  Divider,
  Chip,
  useTheme,
  Avatar,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { CURRENCIES, CHAINS, DEFAULT_CURRENCY, DEFAULT_CHAIN, Currency, Chain } from '@/constants/assets';
import { TransactionLoader } from '@/components/TransactionLoader';

export default function TransactionPage(): React.JSX.Element {
  const { toAddress } = useLocalSearchParams<{ toAddress: string }>();
  const { userWalletAddress, isLoggedIn } = useWallet();
  const theme = useTheme();
  
  // Transaction state
  const [amount, setAmount] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [selectedChain, setSelectedChain] = useState<Chain>(DEFAULT_CHAIN);
  const [memo, setMemo] = useState<string>('');
  
  // Modal states
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showChainModal, setShowChainModal] = useState(false);
  const [showTransactionLoader, setShowTransactionLoader] = useState(false);

  const handleSubmitTransaction = async () => {
    if (!isLoggedIn || !userWalletAddress) {
      Alert.alert('Error', 'Please create a wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!toAddress) {
      Alert.alert('Error', 'Recipient address is required');
      return;
    }

    // Show the transaction loader with mesh network flow
    setShowTransactionLoader(true);
  };

  const generateOfflineTransactionHash = (): string => {
    // Generate a realistic-looking transaction hash for offline display
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  };

  const handleTransactionComplete = () => {
    setShowTransactionLoader(false);
    
    // Generate offline transaction hash and timestamp
    const txHash = generateOfflineTransactionHash();
    const timestamp = Date.now().toString();
    
    // Navigate to success page with transaction details
    router.replace({
      pathname: '/transaction-success',
      params: {
        amount,
        currency: selectedCurrency.symbol,
        toAddress: toAddress || '',
        fromAddress: userWalletAddress || '',
        chain: selectedChain.name,
        txHash,
        timestamp,
      },
    });
  };

  const handleTransactionCancel = () => {
    setShowTransactionLoader(false);
    Alert.alert('Transaction Cancelled', 'Your transaction has been cancelled.');
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <List.Item
      title={item.name}
      description={item.symbol}
      left={() => (
        <View style={styles.imageContainer}>
          <Image source={item.imageUrl} style={styles.chainImage} />
        </View>
      )}
      right={() => selectedCurrency.id === item.id ? <List.Icon icon="check" /> : null}
      onPress={() => {
        setSelectedCurrency(item);
        setShowCurrencyModal(false);
      }}
      style={styles.modalListItem}
      titleStyle={styles.modalItemTitle}
      descriptionStyle={styles.modalItemDescription}
    />
  );

  const renderChainItem = ({ item }: { item: Chain }) => (
    <List.Item
      title={item.name}
      description={item.symbol}
      left={() => (
        <View style={styles.imageContainer}>
          <Image source={item.imageUrl} style={styles.chainImage} />
        </View>
      )}
      right={() => selectedChain.id === item.id ? <List.Icon icon="check" /> : null}
      onPress={() => {
        setSelectedChain(item);
        setShowChainModal(false);
      }}
      style={styles.modalListItem}
      titleStyle={styles.modalItemTitle}
      descriptionStyle={styles.modalItemDescription}
    />
  );

  // Show loader if transaction is being processed
  if (showTransactionLoader) {
    return (
      <TransactionLoader
        onComplete={handleTransactionComplete}
        onCancel={handleTransactionCancel}
        transactionData={{
          amount,
          currency: selectedCurrency.symbol,
          toAddress: toAddress || '',
          chain: selectedChain.name,
        }}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Send Transaction
        </Text>

        {/* From Address */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>From (Your Wallet)</Text>
            <Surface style={styles.addressSurface} elevation={1}>
              <Text variant="bodyMedium" style={styles.addressText}>
                {userWalletAddress ? 
                  `${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}` : 
                  'No wallet connected'
                }
              </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* To Address */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>To (Recipient)</Text>
            <Surface style={styles.addressSurface} elevation={1}>
              <Text variant="bodyMedium" style={styles.addressText}>
                {toAddress ? `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}` : 'No address'}
              </Text>
            </Surface>
          </Card.Content>
        </Card>

        {/* Chain Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>Network</Text>
            <List.Item
              title={selectedChain.name}
              description={selectedChain.symbol}
              left={() => (
                <View style={styles.imageContainer}>
                  <Image source={selectedChain.imageUrl} style={styles.chainImage} />
                </View>
              )}
              right={() => <List.Icon icon="chevron-down" />}
              onPress={() => setShowChainModal(true)}
              style={styles.selectorItem}
            />
          </Card.Content>
        </Card>

        {/* Currency Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>Currency</Text>
            <List.Item
              title={selectedCurrency.name}
              description={selectedCurrency.symbol}
              left={() => (
                <View style={styles.imageContainer}>
                  <Image source={selectedCurrency.imageUrl} style={styles.chainImage} />
                </View>
              )}
              right={() => <List.Icon icon="chevron-down" />}
              onPress={() => setShowCurrencyModal(true)}
              style={styles.selectorItem}
            />
          </Card.Content>
        </Card>

        {/* Amount Input */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>Amount</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                mode="outlined"
                right={<TextInput.Affix text={selectedCurrency.symbol} />}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Memo (Optional) */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.label}>Memo (Optional)</Text>
            <TextInput
              style={styles.memoInput}
              value={memo}
              onChangeText={setMemo}
              placeholder="Add a note..."
              multiline
              mode="outlined"
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmitTransaction}
          disabled={!isLoggedIn || !amount || showTransactionLoader}
          loading={showTransactionLoader}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {showTransactionLoader ? 'Processing...' : 'Send Transaction'}
        </Button>

        {/* Cancel Button */}
        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>

      {/* Currency Selection Modal */}
      <Portal>
        <Modal
          visible={showCurrencyModal}
          onDismiss={() => setShowCurrencyModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge">Select Currency</Text>
              <Button onPress={() => setShowCurrencyModal(false)} mode="text">
                Close
              </Button>
            </View>
            <Divider />
            <FlatList
              data={CURRENCIES}
              renderItem={renderCurrencyItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => null}
            />
          </Surface>
        </Modal>
      </Portal>

      {/* Chain Selection Modal */}
      <Portal>
        <Modal
          visible={showChainModal}
          onDismiss={() => setShowChainModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge">Select Network</Text>
              <Button onPress={() => setShowChainModal(false)} mode="text">
                Close
              </Button>
            </View>
            <Divider />
            <FlatList
              data={CHAINS}
              renderItem={renderChainItem}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => null}
            />
          </Surface>
        </Modal>
      </Portal>
    </ScrollView>
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
    marginTop: 16,
  },
  card: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addressSurface: {
    padding: 12,
    borderRadius: 8,
  },
  addressText: {
    fontFamily: 'monospace',
  },
  selectorItem: {
    paddingHorizontal: 0,
  },
  amountContainer: {
    marginTop: 8,
  },
  amountInput: {
    fontSize: 18,
  },
  memoInput: {
    marginTop: 8,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  modalSurface: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalList: {
    maxHeight: 400,
    paddingVertical: 8,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 4,
  },
  chainImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalListItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 80,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  modalItemDescription: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
