import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import QRCode from 'react-native-qrcode-svg';
import { Colors } from '@/constants/theme';

export default function Show(): React.JSX.Element {
  const [accountAddress, setAccountAddress] = useState<string>('0x742d35Cc6634C0532925a3b8D404d0C8b7b8E5c2');

  const generateNewAddress = () => {
    // Generate a mock Web3 wallet address for demonstration
    const randomHex = () => Math.floor(Math.random() * 16).toString(16);
    const newAddress = '0x' + Array.from({ length: 40 }, () => randomHex()).join('');
    setAccountAddress(newAddress);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet Address QR Code</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={accountAddress}
          size={200}
          color="black"
          backgroundColor="white"
        />
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>Address:</Text>
        <TextInput
          style={styles.addressInput}
          value={accountAddress}
          onChangeText={setAccountAddress}
          placeholder="Enter wallet address"
          placeholderTextColor={Colors.light.icon}
          multiline
        />
      </View>

      {/* <TouchableOpacity style={styles.generateButton} onPress={generateNewAddress}>
        <Text style={styles.generateButtonText}>Generate New Address</Text>
      </TouchableOpacity> */}
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
  generateButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
