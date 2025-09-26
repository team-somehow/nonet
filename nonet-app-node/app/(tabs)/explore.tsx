import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useBleManager } from '@/hooks/use-ble-manager';
import { useBleScanner } from '@/hooks/use-ble-scanner';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ReceiverTab() {
  const { logs, clearLogs } = useBleManager();
  const { isScanning, startScan, stopScan } = useBleScanner();
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          📱 Receiver
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Listen for BLE messages from nearby devices
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.controlSection}>
        <TouchableOpacity
          onPress={() => {
            if (isScanning) stopScan();
            else startScan();
          }}
          style={[
            styles.primaryButton,
            {
              backgroundColor: isScanning
                ? Colors[colorScheme ?? 'light'].destructive
                : Colors[colorScheme ?? 'light'].tint,
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {isScanning ? '🛑 Stop Scanning' : '🔍 Start Scanning'}
          </Text>
        </TouchableOpacity>

        <ThemedView style={styles.statusContainer}>
          <ThemedText style={styles.statusLabel}>Status:</ThemedText>
          <ThemedText
            style={[
              styles.statusText,
              {
                color: isScanning
                  ? Colors[colorScheme ?? 'light'].tint
                  : Colors[colorScheme ?? 'light'].text,
              },
            ]}
          >
            {isScanning ? '🟢 Scanning for messages' : '⚫ Idle'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.infoBox}>
          <ThemedText style={styles.infoText}>
            💡 Tip: Start scanning to listen for HELLO messages from sender
            devices. The scan will automatically stop when a HELLO message is
            received.
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.logsSection}>
        <View style={styles.logsHeader}>
          <ThemedText type="defaultSemiBold" style={styles.logsTitle}>
            Activity Logs
          </ThemedText>
          <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          style={styles.logsList}
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThemedView style={styles.logItem}>
              <ThemedText style={styles.logText}>{item.text}</ThemedText>
            </ThemedView>
          )}
          showsVerticalScrollIndicator={false}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  controlSection: {
    marginBottom: 24,
  },
  primaryButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(0,122,255,0.5)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  logsSection: {
    flex: 1,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsTitle: {
    fontSize: 18,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  clearButtonText: {
    color: '#cc0000',
    fontWeight: '600',
  },
  logsList: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 8,
  },
  logItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  logText: {
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
