import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import base64 from 'react-native-base64';
import BleAdvertiser from 'react-native-ble-advertiser';
import { BleManager, ScanMode } from 'react-native-ble-plx';

// A consistent UUID for your service. Both broadcaster and listener must use this.
const MESH_SERVICE_UUID = 'f1d0c001-c9e5-4d6c-96ff-7f73f4f99c15';
/**
 * Broadcasts a single data chunk over BLE advertisement.
 * It first tries to use service data, falling back to manufacturer data for compatibility.
 * @param chunk The data payload to broadcast (max 6 bytes with current config).
 */
export const broadcastOverBle = async (chunk: Uint8Array): Promise<void> => {
  const payloadAsArray = Array.from(chunk);

  try {
    // Stop any previous broadcast to send a new one.
    await (BleAdvertiser as any).stopBroadcast();

    try {
      // Preferred method: broadcast with service data.
      await (BleAdvertiser as any).broadcast(
        MESH_SERVICE_UUID,
        payloadAsArray,
        {
          connectable: false,
          includeDeviceName: false,
          includeTxPowerLevel: false,
          advertiseMode: (BleAdvertiser as any).ADVERTISE_MODE_LOW_LATENCY,
          txPowerLevel: (BleAdvertiser as any).ADVERTISE_TX_POWER_HIGH,
        }
      );
    } catch (serviceError) {
      console.warn(
        'Service data broadcast failed, trying manufacturer data:',
        serviceError
      );
      // Fallback method: broadcast with manufacturer data.
      await (BleAdvertiser as any).broadcastManufacturerData(
        0xffff,
        payloadAsArray,
        {
          connectable: false,
          includeDeviceName: false,
          includeTxPowerLevel: false,
        }
      );
    }

    console.log('Broadcast started successfully.');
  } catch (error: any) {
    console.error('BLE Broadcast Error:', error.message);
    Alert.alert(
      'Broadcast Error',
      `Failed to start BLE broadcast: ${error.message}`
    );
    await stopBleBroadcast();
  }
};

/**
 * Stops the BLE broadcast.
 */
export const stopBleBroadcast = async (): Promise<void> => {
  try {
    await (BleAdvertiser as any).stopBroadcast();
    console.log('BLE Broadcast stopped.');
  } catch (error: any) {
    console.error('BLE Stop Broadcast Error:', error.message);
  }
};

/**
 * A helper function to convert a Base64 string to a Uint8Array.
 * @param b64 The Base64 encoded string.
 * @returns A Uint8Array.
 */
/**
 * Listens for BLE advertisement packets and decodes them.
 * @param bleManager An instance of BleManager.
 * @param onChunkReceived A callback function invoked with the received data chunk.
 * @returns A function to stop the listener.
 */
export const listenOverBle = (
  bleManager: BleManager | null,
  onChunkReceived: (chunk: Uint8Array) => void
): (() => void) => {
  if (!bleManager) {
    console.error('BLE Manager not initialized');
    return () => {};
  }

  bleManager.startDeviceScan(
    null,
    {
      allowDuplicates: true,
      // 👇 **OPTIMIZATION: Use LowLatency scan mode for faster discovery**
      scanMode: ScanMode.LowLatency,
    },
    (error, device) => {
      // ... rest of your code remains the same
      if (error) {
        console.error('BLE Scan Error:', error.message);
        return;
      }

      if (!device) return;

      const serviceDataB64 = (device as any).serviceData?.[MESH_SERVICE_UUID];
      const manufacturerDataB64 = (device as any).manufacturerData;

      let chunk: Uint8Array | null = null;

      if (serviceDataB64) {
        try {
          chunk = base64ToUint8Array(serviceDataB64);
        } catch (e) {
          console.error('Error decoding service data:', e);
        }
      } else if (manufacturerDataB64) {
        try {
          const fullChunk = base64ToUint8Array(manufacturerDataB64);
          if (
            fullChunk.length > 2 &&
            fullChunk[0] === 255 &&
            fullChunk[1] === 255
          ) {
            chunk = fullChunk.slice(2);
          }
        } catch (e) {
          console.error('Error decoding manufacturer data:', e);
        }
      }

      if (chunk) {
        onChunkReceived(chunk);
      }
    }
  );

  return () => {
    if (bleManager) {
      bleManager.stopDeviceScan();
      console.log('BLE Scan stopped.');
    }
  };
};

// Helper function remains the same
const base64ToUint8Array = (b64: string): Uint8Array => {
  const byteString = base64.decode(b64);
  return Uint8Array.from(byteString, (c) => c.charCodeAt(0));
};

export const encodeMessageToChunks = (message: string): Uint8Array[] => {
  // --- 1. Define Constants for the new protocol ---
  // ID (1) + Total Chunks (1) + ChunkNo/Flag (1) = 3 bytes
  const HEADER_SIZE = 3;
  const DATA_PER_CHUNK = 6; // Increased from 4 to 6 bytes
  const MAX_PAYLOAD_SIZE = HEADER_SIZE + DATA_PER_CHUNK; // Still 9 bytes total

  // --- 2. Encode the string message to a binary array ---
  const encoder = new TextEncoder();
  const binaryArray = encoder.encode(message);

  // --- 3. Calculate total chunks and generate a unique ID ---
  const totalChunks = Math.ceil(binaryArray.length / DATA_PER_CHUNK) || 1;

  // Throw an error if the message is too large for our new 7-bit chunk number
  // (2^7 - 1 = 127)
  if (totalChunks > 127) {
    throw new Error('Message is too large and exceeds the 127 chunk limit.');
  }

  // Generate a 1-byte (Uint8) random ID
  const idArray = new Uint8Array(1);
  crypto.getRandomValues(idArray);
  const uniqueId = idArray[0];

  // --- 4. Create each chunk ---
  const createdChunks: Uint8Array[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkNumber = i + 1;
    const chunkPayload = new Uint8Array(MAX_PAYLOAD_SIZE);
    const view = new DataView(chunkPayload.buffer);

    // -- Fill the header (3 bytes total) --
    view.setUint8(0, uniqueId); // 1 byte: Unique ID
    view.setUint8(1, totalChunks); // 1 byte: Total Chunks

    // 1 byte: Combine Chunk Number and Flag (is_ack = 0)
    // The first bit is the flag, the next 7 bits are the chunk number.
    // Since is_ack is 0, we just set the chunk number.
    view.setUint8(2, chunkNumber);

    // -- Fill the data part --
    const dataStartIndex = i * DATA_PER_CHUNK;
    const dataEndIndex = dataStartIndex + DATA_PER_CHUNK;
    const dataSlice = binaryArray.slice(dataStartIndex, dataEndIndex);
    chunkPayload.set(dataSlice, HEADER_SIZE);

    createdChunks.push(chunkPayload);
  }

  return createdChunks;
};

// Define the return type for clarity
type DataPayload = {
  id: number;
  totalChunks: number;
  chunkNumber: number;
  isAck: boolean;
  data: Uint8Array;
  decodedData: string;
};

export const decodeSingleChunk = (chunk: Uint8Array): DataPayload | null => {
  // The total size is 3 (header) + 6 (data) = 9 bytes
  const EXPECTED_CHUNK_SIZE = 9;
  const HEADER_SIZE = 3;

  if (chunk.length !== EXPECTED_CHUNK_SIZE) {
    console.error(
      `Invalid chunk length. Expected ${EXPECTED_CHUNK_SIZE} bytes.`
    );
    return null;
  }

  const view = new DataView(chunk.buffer);

  // --- 1. Parse the new 3-byte header ---
  const id = view.getUint8(0); // 1 byte: Unique ID
  const totalChunks = view.getUint8(1); // 1 byte: Total Chunks

  // Extract the combined chunk number and flag from the third byte
  const chunkNumAndFlagByte = view.getUint8(2);
  const isAck = (chunkNumAndFlagByte & 0b10000000) !== 0; // Check the first bit
  const chunkNumber = chunkNumAndFlagByte & 0b01111111; // Get the remaining 7 bits

  // --- 2. Extract the raw data payload ---
  const data = chunk.slice(HEADER_SIZE);

  // --- 3. Decode the raw data back to a string ---
  const decoder = new TextDecoder();
  const firstNullByte = data.indexOf(0);
  const dataWithoutPadding =
    firstNullByte === -1 ? data : data.slice(0, firstNullByte);
  const decodedData = decoder.decode(dataWithoutPadding);

  return {
    id,
    totalChunks,
    chunkNumber,
    isAck,
    data,
    decodedData,
  };
};

const App = () => {
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    managerRef.current = new BleManager();

    // Set a default company ID for the advertiser library.
    if (Platform.OS === 'android') {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        console.error('BLE advertiser init error:', e);
      }
    }

    const stopListener = listenOverBle(managerRef.current, (chunk) => {
      const decodedChunk = decodeSingleChunk(chunk);
      if (decodedChunk) {
        console.log('Received data:', decodedChunk.decodedData);
        // Append new messages to the list, ensuring no duplicates from rapid scans
        setReceivedMessages((prev) => {
          const newMessage = `[${new Date().toLocaleTimeString()}] ${
            decodedChunk.decodedData
          }`;
          // Add the message only if it's not the same as the most recent one
          return prev.at(-1)?.endsWith(decodedChunk.decodedData)
            ? prev
            : [...prev, newMessage];
        });
      }
    });

    // Cleanup on unmount
    return () => {
      stopListener();
      managerRef.current?.destroy();
    };
  }, []);

  const handleStartBroadcasting = () => {
    if (!message.trim()) {
      Alert.alert('Input Error', 'Please enter a message to broadcast.');
      return;
    }

    const createdChunks = encodeMessageToChunks(message);
    console.log('createdChunks', createdChunks);
    setIsBroadcasting(true);

    // Broadcast the first chunk.
    // NOTE: For multi-chunk messages, you would need to implement a mechanism
    // to cycle through `createdChunks` with a delay between each broadcast.
    if (createdChunks.length > 0) {
      broadcastOverBle(createdChunks[0]);
    }
  };

  const handleStopBroadcasting = () => {
    stopBleBroadcast();
    setIsBroadcasting(false);
  };

  return (
    <View style={styles.container}>
      {/* Broadcaster Section */}
      <View style={styles.broadcasterSection}>
        <Text style={styles.sectionTitle}>Broadcaster</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter message to broadcast..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.startButton,
              isBroadcasting && styles.disabledButton,
            ]}
            onPress={handleStartBroadcasting}
            disabled={isBroadcasting || !message.trim()}
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.stopButton,
              !isBroadcasting && styles.disabledButton,
            ]}
            onPress={handleStopBroadcasting}
            disabled={!isBroadcasting}
          >
            <Text style={styles.buttonText}>Stop</Text>
          </TouchableOpacity>
        </View>
        {isBroadcasting && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>🔴 Broadcasting: "{message}"</Text>
          </View>
        )}
      </View>

      {/* Receiver Section */}
      <View style={styles.receiverSection}>
        <Text style={styles.sectionTitle}>Receiver</Text>
        <ScrollView
          style={styles.messagesList}
          contentContainerStyle={{ padding: 10 }}
        >
          {receivedMessages.length === 0 ? (
            <Text style={styles.placeholderText}>
              Listening for messages...
            </Text>
          ) : (
            receivedMessages.map((msg, index) => (
              <View key={index} style={styles.messageItem}>
                <Text style={styles.messageText}>{msg}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>🎧 Listening for signals...</Text>
        </View>
      </View>
    </View>
  );
};

// --- Styles (simplified for brevity, you can keep your original styles) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  broadcasterSection: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  receiverSection: { flex: 1, backgroundColor: '#f3e5f5', padding: 20 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  button: { flex: 0.45, padding: 15, borderRadius: 10, alignItems: 'center' },
  startButton: { backgroundColor: '#4CAF50' },
  stopButton: { backgroundColor: '#f44336' },
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  statusContainer: {
    marginTop: 15,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  statusText: { color: '#f44336', fontSize: 14, textAlign: 'center' },
  messagesList: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 15,
  },
  placeholderText: { textAlign: 'center', color: '#999', paddingTop: 20 },
  messageItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  messageText: { fontSize: 14, color: '#333' },
  listeningIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  listeningText: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
});

export default App;
