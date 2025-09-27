import React, { useEffect, useState, useRef } from 'react';
import { Alert, View, StyleSheet, ScrollView, Platform } from 'react-native';
import {
  Provider as PaperProvider,
  DefaultTheme,
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Badge,
  Surface,
} from 'react-native-paper';
import base64 from 'react-native-base64';
import BleAdvertiser from 'react-native-ble-advertiser';
import { BleManager, ScanMode } from 'react-native-ble-plx';

// A consistent UUID for your service. Both broadcaster and listener must use this.
const MESH_SERVICE_UUID = 'f1d0c001-c9e5-4d6c-96ff-7f73f4f99c15';

interface MessageState {
  totalChunks: number;
  isComplete: boolean;
  chunks: Map<number, string>; // This is the 'data map'
}
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

// Custom theme for better UI
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF5722',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    placeholder: '#999999',
  },
};

const App = () => {
  // Note: Bluetooth permissions are handled at wallet creation level
  // If user reaches this screen, we assume all necessary permissions are granted
  
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const managerRef = useRef<BleManager | null>(null);
  const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // --- 2. Initialize the Master State using a ref ---
  // The key is the message ID, and the value is the MessageState object.
  const masterStateRef = useRef(new Map<number, MessageState>());

  useEffect(() => {
    managerRef.current = new BleManager();

    if (Platform.OS === 'android') {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        console.error('BLE advertiser init error:', e);
      }
    }

    // --- 3. Implement the new reassembly logic in the listener ---
    const stopListener = listenOverBle(managerRef.current, (chunk) => {
      const decodedChunk = decodeSingleChunk(chunk);
      if (!decodedChunk || decodedChunk.isAck) {
        return;
      }

      const { id, totalChunks, chunkNumber, decodedData } = decodedChunk;
      const masterState = masterStateRef.current;

      // If the message is already complete, ignore all subsequent chunks for it.
      if (masterState.get(id)?.isComplete) {
        return;
      }

      // If this is the first packet for a new message ID, create its entry.
      if (!masterState.has(id)) {
        console.log(`Creating new entry in master state for message ID: ${id}`);
        masterState.set(id, {
          totalChunks: totalChunks,
          isComplete: false,
          chunks: new Map<number, string>(),
        });
      }

      const messageEntry = masterState.get(id)!;

      // Only accept and store missing packets. Ignore duplicate chunks.
      if (messageEntry.chunks.has(chunkNumber)) {
        return; // This chunk has already been received.
      }

      console.log(
        `Storing chunk ${chunkNumber}/${totalChunks} for message ID: ${id}`
      );
      messageEntry.chunks.set(chunkNumber, decodedData);

      // Check if the message is now complete.
      if (messageEntry.chunks.size === messageEntry.totalChunks) {
        // Mark as complete to ignore future packets for this ID.
        messageEntry.isComplete = true;

        // Log the required completion message.
        console.log(
          `✅ Received the complete chunked pack of ${messageEntry.totalChunks} chunks by receiver`
        );

        // Reassemble the full message in the correct order.
        let fullMessage = '';
        for (let i = 1; i <= messageEntry.totalChunks; i++) {
          fullMessage += messageEntry.chunks.get(i) || '';
        }

        // Update the UI.
        setReceivedMessages((prev) => {
          const formattedMessage = `[${new Date().toLocaleTimeString()}] ${fullMessage}`;
          return [...prev, formattedMessage];
        });
      }
    });

    return () => {
      stopListener();
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
      }
      managerRef.current?.destroy();
    };
  }, []); // Effect runs only once on mount.

  // handleStartBroadcasting and handleStopBroadcasting remain unchanged.
  const handleStartBroadcasting = () => {
    if (!message.trim()) {
      Alert.alert('Input Error', 'Please enter a message to broadcast.');
      return;
    }
    const createdChunks = encodeMessageToChunks(message);
    if (createdChunks.length === 0) {
      return;
    }
    setIsBroadcasting(true);
    let chunkIndex = 0;
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
    }
    broadcastIntervalRef.current = setInterval(() => {
      if (chunkIndex >= createdChunks.length) {
        chunkIndex = 0;
      }
      broadcastOverBle(createdChunks[chunkIndex]);
      chunkIndex++;
    }, 250);
  };

  const handleStopBroadcasting = () => {
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }
    stopBleBroadcast();
    setIsBroadcasting(false);
  };

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        {/* Broadcaster Section */}
        <Surface style={styles.broadcasterSection} elevation={2}>
          <Title style={styles.sectionTitle}>Broadcaster</Title>
          <TextInput
            mode="outlined"
            label="Message to broadcast"
            placeholder="Enter message to broadcast..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            style={styles.textInput}
          />
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleStartBroadcasting}
              disabled={isBroadcasting || !message.trim()}
              style={[styles.button, styles.startButton]}
              buttonColor={
                isBroadcasting || !message.trim() ? '#ccc' : '#4CAF50'
              }
              textColor="white"
            >
              Start
            </Button>
            <Button
              mode="contained"
              onPress={handleStopBroadcasting}
              disabled={!isBroadcasting}
              style={[styles.button, styles.stopButton]}
              buttonColor={!isBroadcasting ? '#ccc' : '#f44336'}
              textColor="white"
            >
              Stop
            </Button>
          </View>
          {isBroadcasting && (
            <Card style={styles.statusContainer}>
              <Card.Content>
                <Paragraph style={styles.statusText}>
                  🔴 Broadcasting: {message}
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </Surface>

        {/* Receiver Section */}
        <Surface style={styles.receiverSection} elevation={2}>
          <Title style={styles.sectionTitle}>Receiver</Title>
          <Card style={styles.messagesList}>
            <ScrollView contentContainerStyle={styles.messagesScrollContent}>
              {receivedMessages.length === 0 ? (
                <Paragraph style={styles.placeholderText}>
                  Listening for messages...
                </Paragraph>
              ) : (
                receivedMessages.map((msg, index) => (
                  <Card key={index} style={styles.messageItem} mode="outlined">
                    <Card.Content>
                      <Paragraph style={styles.messageText}>{msg}</Paragraph>
                    </Card.Content>
                  </Card>
                ))
              )}
            </ScrollView>
          </Card>
          <Card style={styles.listeningIndicator} mode="outlined">
            <Card.Content style={styles.listeningContent}>
              <Badge visible={true} style={styles.listeningBadge}>
                🎧
              </Badge>
              <Text style={styles.listeningText}>Listening for signals...</Text>
            </Card.Content>
          </Card>
        </Surface>
      </View>
    </PaperProvider>
  );
};

// Updated styles for Paper components and better layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  broadcasterSection: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    padding: 20,
    margin: 10,
    borderRadius: 12,
    // Fixed positioning to prevent button overlap
    justifyContent: 'flex-start',
  },
  receiverSection: {
    flex: 1,
    backgroundColor: '#f3e5f5',
    padding: 20,
    margin: 10,
    borderRadius: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  textInput: {
    marginBottom: 20,
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    // Fixed spacing to prevent overlap
    paddingHorizontal: 5,
  },
  button: {
    flex: 0.47,
    marginHorizontal: 5,
    // Ensure buttons have proper minimum height
    minHeight: 48,
    justifyContent: 'center',
  },
  startButton: {},
  stopButton: {},
  statusContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  statusText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 8,
  },
  messagesScrollContent: {
    padding: 10,
    flexGrow: 1,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#999',
    paddingTop: 20,
  },
  messageItem: {
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  listeningIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderColor: '#4CAF50',
  },
  listeningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningBadge: {
    marginRight: 10,
    backgroundColor: '#4CAF50',
  },
  listeningText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default App;
