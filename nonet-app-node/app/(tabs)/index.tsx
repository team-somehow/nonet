import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useBleManager } from '@/hooks/use-ble-manager';
import { useBleAdvertiser } from '@/hooks/use-ble-advertiser';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SenderTab() {
  const { logs, clearLogs } = useBleManager();
  const { isAdvertising, startAdvertiseHello, stopAdvertise } =
    useBleAdvertiser();
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          📡 Sender
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Broadcast BLE messages to nearby devices
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.controlSection}>
        <TouchableOpacity
          onPress={() => {
            if (isAdvertising) stopAdvertise();
            else startAdvertiseHello();
          }}
          style={[
            styles.primaryButton,
            {
              backgroundColor: isAdvertising
                ? Colors[colorScheme ?? 'light'].destructive
                : Colors[colorScheme ?? 'light'].tint,
            },
          ]}
        >
          <Text style={styles.buttonText}>
            {isAdvertising ? '🛑 Stop Broadcasting' : '📡 Start Broadcasting'}
          </Text>
        </TouchableOpacity>

        <ThemedView style={styles.statusContainer}>
          <ThemedText style={styles.statusLabel}>Status:</ThemedText>
          <ThemedText
            style={[
              styles.statusText,
              {
                color: isAdvertising
                  ? Colors[colorScheme ?? 'light'].tint
                  : Colors[colorScheme ?? 'light'].text,
              },
            ]}
          >
            {isAdvertising ? '🟢 Broadcasting HELLO message' : '⚫ Idle'}
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
