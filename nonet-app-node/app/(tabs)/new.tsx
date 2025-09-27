import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import base64 from "react-native-base64";
import BleAdvertiser from "react-native-ble-advertiser";
import { BleManager } from "react-native-ble-plx";

// Define a consistent UUID for your service. Both broadcaster and listener must use this.
const MESH_SERVICE_UUID = "12345678-1234-5678-9abc-dedede880880";

/**
 * Broadcasts a single data chunk over BLE advertisement (GAP).
 * @param chunk The data payload to broadcast (max ~20-30 bytes, depends on device).
 */
export const broadcastOverBle = async (chunk: Uint8Array): Promise<void> => {
  // The react-native-ble-advertiser library expects a plain array of numbers (bytes).
  const payloadAsArray = Array.from(chunk);

  try {
    // Stop any previous broadcast to send a new one.
    // This is important for sending a sequence of different chunks.
    await (BleAdvertiser as any).stopBroadcast();

    console.log(`Broadcasting chunk with ${payloadAsArray.length} bytes.`);

    // Start a new broadcast.
    // The chunk data is embedded in the 'serviceData' field of the advertisement.
    await (BleAdvertiser as any).broadcast(MESH_SERVICE_UUID, payloadAsArray, {
      // We are only sending data, so the device is not connectable.
      connectable: false,
      // Advertising options
      includeDeviceName: false,
      includeTxPowerLevel: false,
    });

    console.log("Broadcast started successfully.");
  } catch (error: any) {
    console.error("BLE Broadcast Error:", error.message);
    Alert.alert(
      "Broadcast Error",
      `Failed to start BLE broadcast: ${error.message}`
    );
    // You might want to stop broadcasting entirely if one chunk fails
    await stopBleBroadcast();
  }
};

/**
 * Stops the BLE broadcast.
 */
export const stopBleBroadcast = async (): Promise<void> => {
  try {
    await (BleAdvertiser as any).stopBroadcast();
    console.log("BLE Broadcast stopped.");
  } catch (error: any) {
    console.error("BLE Stop Broadcast Error:", error.message);
  }
};

/**
 * Listens for BLE advertisement packets containing our specific service UUID.
 *
 * @param bleManager An instance of BleManager.
 * @param onChunkReceived A callback function that will be invoked with the received data chunk.
 * @returns A function that can be called to stop the listener.
 */
export const listenOverBle = (
  bleManager: BleManager | null,
  onChunkReceived: (chunk: Uint8Array) => void
): (() => void) => {
  if (!bleManager) {
    console.error("BLE Manager not initialized");
    return () => {}; // Return empty cleanup function
  }

  console.log(`Starting BLE scan for service: ${MESH_SERVICE_UUID}`);

  // Start scanning for devices that are advertising our specific service UUID.
  bleManager.startDeviceScan(
    [MESH_SERVICE_UUID],
    { allowDuplicates: true }, // Allow duplicates to get continuous updates
    (error, device) => {
      if (error) {
        console.error("BLE Scan Error:", error.message);
        // Consider adding more robust error handling, e.g., stopping the scan.
        return;
      }

      if (!device || !(device as any).serviceData) {
        return; // Ignore devices without service data.
      }

      // The service data is often encoded in base64 by the ble-plx library.
      const serviceDataB64 = (device as any).serviceData[MESH_SERVICE_UUID];

      if (serviceDataB64) {
        try {
          // 1. Decode the base64 string to a raw byte string.
          const byteString = base64.decode(serviceDataB64);

          // 2. Convert the raw byte string into a Uint8Array.
          const chunk = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            chunk[i] = byteString.charCodeAt(i);
          }

          console.log(`Received chunk with ${chunk.length} bytes.`);

          // 3. Pass the reconstructed chunk to the callback function.
          onChunkReceived(chunk);
        } catch (decodeError) {
          console.error("Error decoding service data:", decodeError);
        }
      }
    }
  );

  // Return a function that the caller can use to stop the scan.
  const stopListener = () => {
    if (bleManager) {
      bleManager.stopDeviceScan();
      console.log("BLE Scan stopped.");
    }
  };

  return stopListener;
};

export const encodeMessageToChunks = (message: string): Uint8Array[] => {
  // --- 1. Define Constants based on our protocol ---
  const HEADER_SIZE = 13;
  const DATA_PER_CHUNK = 10;
  const MAX_PAYLOAD_SIZE = 23;

  // --- 2. Encode the string message to a binary array ---
  const encoder = new TextEncoder();
  const binaryArray = encoder.encode(message);

  // --- 3. Calculate total chunks and generate a unique ID ---
  const totalChunks = Math.ceil(binaryArray.length / DATA_PER_CHUNK) || 1;
  const idArray = new Uint32Array(1);
  crypto.getRandomValues(idArray);
  const uniqueId = idArray[0];
  console.log("Unique ID:", uniqueId);

  // --- 4. Create each chunk ---
  const createdChunks: Uint8Array[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkNumber = i + 1;
    const chunkPayload = new Uint8Array(MAX_PAYLOAD_SIZE);
    const view = new DataView(chunkPayload.buffer);

    // -- Fill the header --
    view.setUint32(0, uniqueId, true); // Unique ID
    view.setUint32(4, totalChunks, true); // Total Chunks
    view.setUint32(8, chunkNumber, true); // Chunk Number
    view.setUint8(12, 0); // Flags (is_ack = 0)

    // -- Fill the data part --
    const dataStartIndex = i * DATA_PER_CHUNK;
    const dataEndIndex = dataStartIndex + DATA_PER_CHUNK;
    const dataSlice = binaryArray.slice(dataStartIndex, dataEndIndex);
    chunkPayload.set(dataSlice, HEADER_SIZE);

    createdChunks.push(chunkPayload);
  }

  return createdChunks;
};

export interface DataPayload {
  id: number;
  totalChunks: number;
  chunkNumber: number;
  isAck: boolean;
  data: Uint8Array;
  decodedData: string;
}

export const decodeSingleChunk = (chunk: Uint8Array): DataPayload | null => {
  if (chunk.length !== 23) {
    console.error("Invalid chunk length. Expected 23 bytes.");
    return null;
  }

  const HEADER_SIZE = 13;
  const view = new DataView(chunk.buffer);

  // --- 1. Parse the header ---
  const id = view.getUint32(0, true);
  const totalChunks = view.getUint32(4, true);
  const chunkNumber = view.getUint32(8, true);
  const flags = view.getUint8(12);
  const isAck = (flags & 1) === 1;

  // --- 2. Extract the raw data payload ---
  const data = chunk.slice(HEADER_SIZE);

  // --- 3. Decode the raw data back to a string ---
  const decoder = new TextDecoder();
  // Find the first null byte (padding) to avoid including it in the string
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
  const [message, setMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState([
    "Listening for messages...",
    'Signal detected: "Hello from nearby device"',
    'Signal detected: "Testing broadcast"',
  ]);
  const [chunks, setChunks] = useState<Uint8Array[]>([]);

  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    // Initialize BLE manager
    managerRef.current = new BleManager();

    // Initialize BLE advertiser for Android
    if (Platform.OS === "android") {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        console.log("advertiser init error", e);
      }
    }

    // Start listening
    const stopListener = listenOverBle(managerRef.current, (chunk) => {
      const decodedChunk = decodeSingleChunk(chunk);
      console.log("Decoded Chunk:", decodedChunk);
    });

    return () => {
      stopListener();
      const manager = managerRef.current;
      if (manager) {
        manager.destroy();
      }
    };
  }, []);

  const handleStartBroadcasting = () => {
    if (!message) {
      alert("Please enter a message to broadcast.");
      return;
    }

    // Call the abstracted function to get the chunks
    const createdChunks = encodeMessageToChunks(message);

    // Update state and log the results
    setChunks(createdChunks);
    setIsBroadcasting(true);
    console.log("Original Message:", message);
    console.log("Generated Chunks:", createdChunks);

    // send chunks via ble
    broadcastOverBle(createdChunks[0]);

    for (const chunk of createdChunks) {
      const decodedChunk = decodeSingleChunk(chunk);
      console.log("Decoded Chunk:", decodedChunk);
    }
  };

  const handleStopBroadcasting = () => {
    setIsBroadcasting(false);
  };

  return (
    <View style={styles.container}>
      {/* Broadcaster Section - Top Half */}
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
            <Text style={styles.buttonText}>Start Broadcasting</Text>
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
            <Text style={styles.buttonText}>Stop Broadcasting</Text>
          </TouchableOpacity>
        </View>

        {isBroadcasting && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>🔴 Broadcasting: {message}</Text>
          </View>
        )}
      </View>

      {/* Receiver Section - Bottom Half */}
      <View style={styles.receiverSection}>
        <Text style={styles.sectionTitle}>Receiver</Text>

        <ScrollView
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
        >
          {receivedMessages.map((msg, index) => (
            <View key={index} style={styles.messageItem}>
              <Text style={styles.messageText}>{msg}</Text>
              <Text style={styles.timestamp}>
                {new Date().toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>🎧 Listening...</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  broadcasterSection: {
    flex: 1,
    backgroundColor: "#e3f2fd",
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  receiverSection: {
    flex: 1,
    backgroundColor: "#f3e5f5",
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  textInput: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#f44336",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  statusContainer: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f44336",
  },
  statusText: {
    color: "#f44336",
    fontSize: 14,
    textAlign: "center",
  },
  messagesList: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  messageItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  messageText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  listeningIndicator: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4CAF50",
    alignItems: "center",
  },
  listeningText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default App;
