import React from 'react';
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
  Surface,
  Divider,
  Chip,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';

export default function TransactionSuccessPage(): React.JSX.Element {
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success Icon */}
        <View style={styles.successHeader}>
          <Surface style={styles.successIconContainer} elevation={3}>
            <Text style={styles.successIcon}>🎉</Text>
          </Surface>
          <Text variant="headlineMedium" style={[styles.successTitle, { color: theme.colors.onBackground }]}>
            Transaction Sent!
          </Text>
          <Text variant="bodyLarge" style={[styles.successSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Your transaction has been broadcast through the offline mesh network
          </Text>
        </View>

        {/* Transaction Summary Card */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <Text variant="titleLarge" style={styles.summaryTitle}>Transaction Summary</Text>
              <Chip mode="flat" style={styles.statusChip} textStyle={styles.statusText}>
                ✓ Broadcast
              </Chip>
            </View>

            <Divider style={styles.divider} />

            {/* Amount */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>Amount Sent</Text>
              <Text variant="headlineSmall" style={styles.summaryValue}>
                {amount} {currency}
              </Text>
            </View>

            {/* From Address */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>From</Text>
              <Surface style={styles.addressSurface} elevation={1}>
                <Text variant="bodyMedium" style={styles.summaryValueMono}>
                  {fromAddress ? `${fromAddress.slice(0, 8)}...${fromAddress.slice(-8)}` : 'Unknown'}
                </Text>
              </Surface>
            </View>

            {/* To Address */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>To</Text>
              <Surface style={styles.addressSurface} elevation={1}>
                <Text variant="bodyMedium" style={styles.summaryValueMono}>
                  {toAddress ? `${toAddress.slice(0, 8)}...${toAddress.slice(-8)}` : 'Unknown'}
                </Text>
              </Surface>
            </View>

            {/* Network */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>Network</Text>
              <Chip mode="outlined">{chain}</Chip>
            </View>

            {/* Transaction Hash */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>Offline Transaction Hash</Text>
              <Surface style={styles.addressSurface} elevation={1}>
                <Text variant="bodySmall" style={styles.summaryValueMono}>
                  {txHash ? `${txHash.slice(0, 10)}...${txHash.slice(-10)}` : 'Generating...'}
                </Text>
              </Surface>
            </View>

            {/* Timestamp */}
            <View style={styles.summaryItem}>
              <Text variant="labelMedium" style={styles.summaryLabel}>Initiated At</Text>
              <Text variant="bodyMedium" style={styles.summaryValue}>
                {timestamp ? new Date(parseInt(timestamp)).toLocaleString() : 'Just now'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Offline Notice */}
        <Card style={styles.offlineCard}>
          <Card.Content>
            <View style={styles.offlineNotice}>
              <Surface style={styles.offlineIconSurface} elevation={2}>
                <Text style={styles.offlineIconText}>📡</Text>
              </Surface>
              <View style={styles.offlineContent}>
                <Text variant="titleMedium" style={styles.offlineTitle}>Offline Transaction</Text>
                <Text variant="bodyMedium" style={styles.offlineDescription}>
                  This transaction was processed through our mesh network and will be confirmed once it reaches an internet gateway. No internet connection required!
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

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
          <Button
            mode="contained"
            onPress={handleGoHome}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
          >
            Go to Home
          </Button>

          <Button
            mode="outlined"
            onPress={handleNewTransaction}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
          >
            Send Another Transaction
          </Button>
        </View>

        {/* Footer Note */}
        <Text variant="bodySmall" style={[styles.footerNote, { color: theme.colors.onSurfaceVariant }]}>
          Your transaction is now in the queue and will be processed automatically when network connectivity is available.
        </Text>
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
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 40,
  },
  successTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  summaryCard: {
    marginBottom: 16,
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
    fontWeight: '500',
  },
  meshConnector: {
    width: 20,
    height: 2,
    backgroundColor: '#4CAF50',
    marginHorizontal: 5,
    marginBottom: 20,
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Paper component styles
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    flex: 1,
  },
  statusChip: {
    backgroundColor: '#E8F5E8',
  },
  statusText: {
    fontWeight: '600',
  },
  divider: {
    marginBottom: 16,
  },
  summaryItem: {
    marginBottom: 12,
  },
  summaryLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontWeight: '600',
  },
  summaryValueMono: {
    fontFamily: 'monospace',
  },
  addressSurface: {
    padding: 8,
    borderRadius: 6,
  },
  offlineCard: {
    marginBottom: 16,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineIconSurface: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  offlineIconText: {
    fontSize: 20,
  },
  offlineContent: {
    flex: 1,
  },
  offlineTitle: {
    marginBottom: 4,
  },
  offlineDescription: {
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
