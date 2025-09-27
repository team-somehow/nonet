import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function TransactionSuccessPage(): React.JSX.Element {
  const { 
    amount, 
    currency, 
    toAddress, 
    fromAddress, 
    chain, 
    txHash,
    timestamp 
  } = useLocalSearchParams<{
    amount: string;
    currency: string;
    toAddress: string;
    fromAddress: string;
    chain: string;
    txHash: string;
    timestamp: string;
  }>();

  const handleGoHome = () => {
    router.replace('/(tabs)/');
  };

  const handleNewTransaction = () => {
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Icon */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Transaction Sent!</Text>
          <Text style={styles.successSubtitle}>
            Your transaction has been broadcast through the offline mesh network
          </Text>
        </View>

        {/* Transaction Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Broadcast</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Amount Sent</Text>
            <Text style={styles.summaryValue}>
              {amount} {currency}
            </Text>
          </View>

          {/* From Address */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>From</Text>
            <Text style={styles.summaryValueMono}>
              {fromAddress ? `${fromAddress.slice(0, 8)}...${fromAddress.slice(-8)}` : 'Unknown'}
            </Text>
          </View>

          {/* To Address */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>To</Text>
            <Text style={styles.summaryValueMono}>
              {toAddress ? `${toAddress.slice(0, 8)}...${toAddress.slice(-8)}` : 'Unknown'}
            </Text>
          </View>

          {/* Network */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Network</Text>
            <Text style={styles.summaryValue}>{chain}</Text>
          </View>

          {/* Transaction Hash */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Offline Transaction Hash</Text>
            <Text style={styles.summaryValueMono}>
              {txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-10)}` : 'Generating...'}
            </Text>
          </View>

          {/* Timestamp */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Initiated At</Text>
            <Text style={styles.summaryValue}>
              {timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Just now'}
            </Text>
          </View>
        </View>

        {/* Offline Notice */}
        <View style={styles.offlineNotice}>
          <View style={styles.offlineIcon}>
            <Text style={styles.offlineIconText}>📡</Text>
          </View>
          <View style={styles.offlineContent}>
            <Text style={styles.offlineTitle}>Offline Transaction</Text>
            <Text style={styles.offlineDescription}>
              This transaction was processed through our mesh network and will be confirmed once it reaches an internet gateway. No internet connection required!
            </Text>
          </View>
        </View>

        {/* Mesh Network Status */}
        <View style={styles.meshStatus}>
          <Text style={styles.meshTitle}>Mesh Network Route</Text>
          <View style={styles.meshSteps}>
            <View style={styles.meshStep}>
              <View style={[styles.meshStepIcon, styles.meshStepCompleted]}>
                <Text style={styles.meshStepText}>🔐</Text>
              </View>
              <Text style={styles.meshStepLabel}>Encrypted</Text>
            </View>
            <View style={styles.meshConnector} />
            <View style={styles.meshStep}>
              <View style={[styles.meshStepIcon, styles.meshStepCompleted]}>
                <Text style={styles.meshStepText}>📡</Text>
              </View>
              <Text style={styles.meshStepLabel}>Hopped</Text>
            </View>
            <View style={styles.meshConnector} />
            <View style={styles.meshStep}>
              <View style={[styles.meshStepIcon, styles.meshStepCompleted]}>
                <Text style={styles.meshStepText}>🌐</Text>
              </View>
              <Text style={styles.meshStepLabel}>Gateway</Text>
            </View>
            <View style={styles.meshConnector} />
            <View style={styles.meshStep}>
              <View style={[styles.meshStepIcon, styles.meshStepCompleted]}>
                <Text style={styles.meshStepText}>✅</Text>
              </View>
              <Text style={styles.meshStepLabel}>Broadcast</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
          >
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNewTransaction}
          >
            <Text style={styles.secondaryButtonText}>Send Another Transaction</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Note */}
        <Text style={styles.footerNote}>
          Your transaction is now in the queue and will be processed automatically when network connectivity is available.
        </Text>
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
  successHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  statusBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryValueMono: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.text,
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  offlineNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  offlineIcon: {
    marginRight: 12,
  },
  offlineIconText: {
    fontSize: 24,
  },
  offlineContent: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  offlineDescription: {
    fontSize: 14,
    color: Colors.light.icon,
    lineHeight: 20,
  },
  meshStatus: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  meshTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  meshSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meshStep: {
    alignItems: 'center',
  },
  meshStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  meshStepCompleted: {
    backgroundColor: '#E8F5E8',
  },
  meshStepText: {
    fontSize: 18,
  },
  meshStepLabel: {
    fontSize: 10,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  meshConnector: {
    width: 20,
    height: 2,
    backgroundColor: '#4CAF50',
    marginHorizontal: 5,
    marginBottom: 20,
  },
  actionButtons: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  secondaryButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 12,
    color: Colors.light.icon,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
