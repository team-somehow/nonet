import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { useWallet, ScannedAddress } from "@/contexts/WalletContext";
import { 
  NeoBrutalButton, 
  NeoBrutalCard, 
  NeoBrutalHeader, 
  NeoBrutalBadge,
  NeoBrutalDivider 
} from '@/components/NeoBrutalismComponents';
import { NeoBrutalismColors } from '@/constants/neoBrutalism';

export default function Scan(): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");

  // Use wallet context
  const {
    scannedAddresses,
    addScannedAddress,
    clearScannedAddresses,
    removeScannedAddress,
  } = useWallet();

  const isValidWalletAddress = (address: string): boolean => {
    // Basic validation for Ethereum-style addresses
    const ethPattern = /^0x[a-fA-F0-9]{40}$/;
    return ethPattern.test(address);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isValidWalletAddress(data)) {
      Alert.alert(
        "Invalid Address",
        "The scanned QR code doesn't contain a valid wallet address."
      );
      return;
    }

    setIsScanning(false);

    // Automatically add to scanned addresses if not already present
    addScannedAddress(data);

    // Navigate directly to transaction page
    router.push({
      pathname: "/transaction",
      params: { toAddress: data },
    });
  };

  const clearAddresses = () => {
    Alert.alert(
      "Clear All Addresses",
      "Are you sure you want to clear all scanned addresses?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearScannedAddresses(),
        },
      ]
    );
  };

  const renderAddressItem = ({ item }: { item: ScannedAddress }) => (
    <View style={styles.addressItem}>
      <View style={styles.addressInfo}>
        <Text
          style={styles.addressText}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {item.address}
        </Text>
        <Text style={styles.timestampText}>
          {item.timestamp.toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.sendButton}
        onPress={() => {
          router.push({
            pathname: "/transaction",
            params: { toAddress: item.address },
          });
        }}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.message}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.message}>
            Camera permission is required to scan QR codes
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isScanning) {
    return (
      <SafeAreaView style={styles.container}>
        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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
            <Text style={styles.emptySubText}>
              Tap "Start Scanning" to scan your first QR code
            </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeoBrutalismColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: NeoBrutalismColors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  message: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scanButton: {
    backgroundColor: NeoBrutalismColors.primary,
    borderColor: NeoBrutalismColors.primary,
    borderWidth: 4,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 32,
    shadowColor: NeoBrutalismColors.primary,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  scanButtonText: {
    color: NeoBrutalismColors.textInverse,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  scanInstruction: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  addressesSection: {
    flex: 1,
  },
  addressesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  addressesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.text,
  },
  clearText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "500",
  },
  addressesList: {
    flex: 1,
  },
  addressItem: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addressInfo: {
    flex: 1,
    marginRight: 10,
  },
  addressText: {
    fontSize: 14,
    fontFamily: "monospace",
    color: Colors.light.text,
    marginBottom: 5,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  timestampText: {
    fontSize: 12,
    color: Colors.light.icon,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.light.icon,
    textAlign: "center",
  },
});
