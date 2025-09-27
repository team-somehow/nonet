import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/contexts/WalletContext';

export default function Show(): React.JSX.Element {
  const { userWalletAddress, isLoggedIn, createWallet, walletData } = useWallet();
  const [customAddress, setCustomAddress] = useState<string>('');
  
  // Use user's wallet address if logged in, otherwise use custom address
  const displayAddress = userWalletAddress || customAddress || '0x742d35Cc6634C0532925a3b8D404d0C8b7b8E5c2';

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      Alert.alert("Success", "New wallet created successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to create wallet");
    }
  };

  const generateRandomAddress = () => {
    // Generate a mock Web3 wallet address for demonstration
    const randomHex = () => Math.floor(Math.random() * 16).toString(16);
    const newAddress = '0x' + Array.from({ length: 40 }, () => randomHex()).join('');
    setCustomAddress(newAddress);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Address QR Code</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={displayAddress}
          size={200}
          color="black"
          backgroundColor="white"
        />
      </View>

      {/* Wallet Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {isLoggedIn ? "Wallet Connected" : "No Wallet"}
        </Text>
        {walletData && (
          <Text style={styles.createdText}>
            Created: {walletData.createdAt.toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>
          {isLoggedIn ? "Your Wallet Address:" : "Custom Address:"}
        </Text>
        {isLoggedIn ? (
          <Text style={styles.walletAddressText}>{userWalletAddress}</Text>
        ) : (
          <TextInput
            style={styles.addressInput}
            value={customAddress}
            onChangeText={setCustomAddress}
            placeholder="Enter custom wallet address"
            placeholderTextColor={Colors.light.icon}
            multiline
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        {!isLoggedIn && (
          <TouchableOpacity style={styles.createWalletButton} onPress={handleCreateWallet}>
            <Text style={styles.buttonText}>Create Wallet</Text>
          </TouchableOpacity>
        )}
        
        {!isLoggedIn && (
          <TouchableOpacity style={styles.generateButton} onPress={generateRandomAddress}>
            <Text style={styles.buttonText}>Generate Random Address</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 30,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 30,
  },
  addressContainer: {
    width: '100%',
    marginBottom: 30,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 10,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    backgroundColor: 'white',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  statusContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 5,
  },
  createdText: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  walletAddressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.light.text,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  createWalletButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
