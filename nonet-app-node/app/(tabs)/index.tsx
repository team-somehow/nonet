import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/theme';

interface ScannedAddress {
  id: string;
  address: string;
  timestamp: Date;
}

export default function Scan(): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAddresses, setScannedAddresses] = useState<ScannedAddress[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');

  const isValidWalletAddress = (address: string): boolean => {
    // Basic validation for Ethereum-style addresses
    const ethPattern = /^0x[a-fA-F0-9]{40}$/;
    return ethPattern.test(address);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isValidWalletAddress(data)) {
      Alert.alert("Invalid Address", "The scanned QR code doesn't contain a valid wallet address.");
      return;
    }

    // Check if address already exists
    const addressExists = scannedAddresses.some(item => item.address === data);
    if (addressExists) {
      Alert.alert("Duplicate Address", "This wallet address has already been scanned.");
      return;
    }

    const newAddress: ScannedAddress = {
      id: Date.now().toString(),
      address: data,
      timestamp: new Date(),
    };

    setScannedAddresses(prev => [newAddress, ...prev]);
    setIsScanning(false);
    Alert.alert("Success", `Wallet address scanned successfully!\n\n${data}`);
  };

  const clearAddresses = () => {
    Alert.alert(
      "Clear All Addresses",
      "Are you sure you want to clear all scanned addresses?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => setScannedAddresses([]) }
      ]
    );
  };

  const renderAddressItem = ({ item }: { item: ScannedAddress }) => (
    <View style={styles.addressItem}>
      <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
        {item.address}
      </Text>
      <Text style={styles.timestampText}>
        {item.timestamp.toLocaleString()}
      </Text>
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan QR codes</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanInstruction}>
              Point your camera at a QR code containing a wallet address
            </Text>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setIsScanning(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code Scanner</Text>
      
      <TouchableOpacity 
        style={styles.scanButton} 
        onPress={() => setIsScanning(true)}
      >
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>

      <View style={styles.addressesSection}>
        <View style={styles.addressesHeader}>
          <Text style={styles.addressesTitle}>
            Scanned Addresses ({scannedAddresses.length})
          </Text>
          {scannedAddresses.length > 0 && (
            <TouchableOpacity onPress={clearAddresses}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {scannedAddresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No addresses scanned yet</Text>
            <Text style={styles.emptySubText}>Tap "Start Scanning" to scan your first QR code</Text>
          </View>
        ) : (
          <FlatList
            data={scannedAddresses}
            renderItem={renderAddressItem}
            keyExtractor={(item) => item.id}
            style={styles.addressesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
  message: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addressesSection: {
    flex: 1,
  },
  addressesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addressesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  clearText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  addressesList: {
    flex: 1,
  },
  addressItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.light.text,
    marginBottom: 5,
  },
  timestampText: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: 'center',
  },
});