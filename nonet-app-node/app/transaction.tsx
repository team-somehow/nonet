import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/contexts/WalletContext';
import { CURRENCIES, CHAINS, DEFAULT_CURRENCY, DEFAULT_CHAIN, Currency, Chain } from '@/constants/assets';

export default function TransactionPage(): React.JSX.Element {
  const { toAddress } = useLocalSearchParams<{ toAddress: string }>();
  const { userWalletAddress, isLoggedIn } = useWallet();
  
  // Transaction state
  const [amount, setAmount] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [selectedChain, setSelectedChain] = useState<Chain>(DEFAULT_CHAIN);
  const [memo, setMemo] = useState<string>('');
  
  // Modal states
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showChainModal, setShowChainModal] = useState(false);
  
  // Transaction loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);

    // Simulate transaction processing
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Transaction Submitted',
        `Successfully sent ${amount} ${selectedCurrency.symbol} to ${toAddress.slice(0, 6)}...${toAddress.slice(-4)} on ${selectedChain.name}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 2000);
  };

  const renderCurrencyItem = ({ item }: { item: Currency }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedCurrency(item);
        setShowCurrencyModal(false);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.modalItemIcon} />
      <View style={styles.modalItemText}>
        <Text style={styles.modalItemName}>{item.name}</Text>
        <Text style={styles.modalItemSymbol}>{item.symbol}</Text>
      </View>
      {selectedCurrency.id === item.id && (
        <Text style={styles.selectedIndicator}>✓</Text>
      )}
    </TouchableOpacity>
  );

  const renderChainItem = ({ item }: { item: Chain }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedChain(item);
        setShowChainModal(false);
      }}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.modalItemIcon} />
      <View style={styles.modalItemText}>
        <Text style={styles.modalItemName}>{item.name}</Text>
        <Text style={styles.modalItemSymbol}>{item.symbol}</Text>
      </View>
      {selectedChain.id === item.id && (
        <Text style={styles.selectedIndicator}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Send Transaction</Text>

        {/* From Address */}
        <View style={styles.section}>
          <Text style={styles.label}>From (Your Wallet)</Text>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>
              {userWalletAddress ? 
                `${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}` : 
                'No wallet connected'
              }
            </Text>
          </View>
        </View>

        {/* To Address */}
        <View style={styles.section}>
          <Text style={styles.label}>To (Recipient)</Text>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText}>
              {toAddress ? `${toAddress.slice(0, 6)}...${toAddress.slice(-4)}` : 'No address'}
            </Text>
          </View>
        </View>

        {/* Chain Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Network</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowChainModal(true)}
          >
            <Image source={{ uri: selectedChain.imageUrl }} style={styles.selectorIcon} />
            <View style={styles.selectorText}>
              <Text style={styles.selectorName}>{selectedChain.name}</Text>
              <Text style={styles.selectorSymbol}>{selectedChain.symbol}</Text>
            </View>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Currency Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Currency</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowCurrencyModal(true)}
          >
            <Image source={{ uri: selectedCurrency.imageUrl }} style={styles.selectorIcon} />
            <View style={styles.selectorText}>
              <Text style={styles.selectorName}>{selectedCurrency.name}</Text>
              <Text style={styles.selectorSymbol}>{selectedCurrency.symbol}</Text>
            </View>
            <Text style={styles.selectorArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={Colors.light.icon}
            />
            <Text style={styles.amountCurrency}>{selectedCurrency.symbol}</Text>
          </View>
        </View>

        {/* Memo (Optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Memo (Optional)</Text>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="Add a note..."
            placeholderTextColor={Colors.light.icon}
            multiline
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isLoggedIn || !amount || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitTransaction}
          disabled={!isLoggedIn || !amount || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Processing...' : 'Send Transaction'}
          </Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CURRENCIES}
            renderItem={renderCurrencyItem}
            keyExtractor={(item) => item.id}
            style={styles.modalList}
          />
        </View>
      </Modal>

      {/* Chain Selection Modal */}
      <Modal
        visible={showChainModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Network</Text>
            <TouchableOpacity onPress={() => setShowChainModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CHAINS}
            renderItem={renderChainItem}
            keyExtractor={(item) => item.id}
            style={styles.modalList}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  addressContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.light.text,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  selectorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  selectorText: {
    flex: 1,
  },
  selectorName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  selectorSymbol: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  selectorArrow: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  amountInput: {
    flex: 1,
    padding: 15,
    fontSize: 18,
    color: Colors.light.text,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    paddingRight: 15,
  },
  memoInput: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
    color: Colors.light.text,
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.icon,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: Colors.light.icon,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.icon,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  modalClose: {
    fontSize: 18,
    color: Colors.light.icon,
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 15,
  },
  modalItemText: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  modalItemSymbol: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  selectedIndicator: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: 'bold',
  },
});
