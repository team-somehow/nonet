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
  Switch,
} from 'react-native-paper';
import base64 from 'react-native-base64';
import BleAdvertiser from 'react-native-ble-advertiser';
import { BleManager, ScanMode } from 'react-native-ble-plx';

// A consistent UUID for your service.
const MESH_SERVICE_UUID = 'f1d0c001-c9e5-4d6c-96ff-7f73f4f99c15';

// --- BLE Communication Functions ---

/**
 * Broadcasts a single data chunk over BLE advertisement.
 * This version is made resilient to errors for use in a rapid loop.
 */
export const broadcastOverBle = async (chunk: Uint8Array): Promise<void> => {
  const payloadAsArray = Array.from(chunk);

  // FIX: Make the stop call more resilient to prevent crashes in the loop.
  // It will silently fail if there's nothing to stop, which is fine.
  try {
    await (BleAdvertiser as any).stopBroadcast();
  } catch (error) {
    // This error is ignored as it's expected on the first run or during rapid changes.
  }

  try {
    // Preferred method: broadcast with service data.
    await (BleAdvertiser as any).broadcast(MESH_SERVICE_UUID, payloadAsArray, {
      connectable: false,
      includeDeviceName: false,
      includeTxPowerLevel: false,
      advertiseMode: (BleAdvertiser as any).ADVERTISE_MODE_LOW_LATENCY,
      txPowerLevel: (BleAdvertiser as any).ADVERTISE_TX_POWER_HIGH,
    });
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
};

/**
 * Stops the BLE broadcast entirely.
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
 * Listens for BLE advertisement packets.
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
      scanMode: ScanMode.LowLatency,
    },
    (error, device) => {
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

/**
 * A helper function to convert a Base64 string to a Uint8Array.
 */
const base64ToUint8Array = (b64: string): Uint8Array => {
  const byteString = base64.decode(b64);
  return Uint8Array.from(byteString, (c) => c.charCodeAt(0));
};

// --- Custom Data Protocol ---

/**
 * Encodes a string message into protocol-compliant chunks.
 */
export const encodeMessageToChunks = (
  message: string,
  options: { id?: number; isAck?: boolean } = {}
): Uint8Array[] => {
  const HEADER_SIZE = 3;
  const DATA_PER_CHUNK = 6;
  const MAX_PAYLOAD_SIZE = HEADER_SIZE + DATA_PER_CHUNK;

  const encoder = new TextEncoder();
  const binaryArray = encoder.encode(message);
  const totalChunks = Math.ceil(binaryArray.length / DATA_PER_CHUNK) || 1;

  if (totalChunks > 127) {
    throw new Error('Message is too large and exceeds the 127 chunk limit.');
  }

  let uniqueId = options.id;
  if (uniqueId === undefined) {
    const idArray = new Uint8Array(1);
    crypto.getRandomValues(idArray);
    uniqueId = idArray[0];
  }

  const isAck = options.isAck || false;
  const createdChunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkNumber = i + 1;
    const chunkPayload = new Uint8Array(MAX_PAYLOAD_SIZE);
    const view = new DataView(chunkPayload.buffer);

    view.setUint8(0, uniqueId);
    view.setUint8(1, totalChunks);

    let chunkNumAndFlagByte = chunkNumber;
    if (isAck) {
      chunkNumAndFlagByte |= 0b10000000;
    }
    view.setUint8(2, chunkNumAndFlagByte);

    const dataStartIndex = i * DATA_PER_CHUNK;
    const dataSlice = binaryArray.slice(
      dataStartIndex,
      dataStartIndex + DATA_PER_CHUNK
    );
    chunkPayload.set(dataSlice, HEADER_SIZE);

    createdChunks.push(chunkPayload);
  }
  return createdChunks;
};

type DataPayload = {
  id: number;
  totalChunks: number;
  chunkNumber: number;
  isAck: boolean;
  data: Uint8Array;
  decodedData: string;
};

/**
 * Decodes a single protocol-compliant chunk.
 */
export const decodeSingleChunk = (chunk: Uint8Array): DataPayload | null => {
  if (chunk.length !== 9) return null;

  const view = new DataView(chunk.buffer);
  const id = view.getUint8(0);
  const totalChunks = view.getUint8(1);
  const chunkNumAndFlagByte = view.getUint8(2);
  const isAck = (chunkNumAndFlagByte & 0b10000000) !== 0;
  const chunkNumber = chunkNumAndFlagByte & 0b01111111;
  const data = chunk.slice(3);

  const decoder = new TextDecoder();
  const firstNullByte = data.indexOf(0);
  const dataWithoutPadding =
    firstNullByte === -1 ? data : data.slice(0, firstNullByte);
  const decodedData = decoder.decode(dataWithoutPadding);

  return { id, totalChunks, chunkNumber, isAck, data, decodedData };
};

// --- App State & Logic ---

interface MessageState {
  totalChunks: number;
  isComplete: boolean;
  isAck: boolean;
  chunks: Map<number, Uint8Array>;
  fullMessage: string;
}

const mockApiRequest = async (originalMessage: string): Promise<string> => {
  console.log('Making mock API request for:', originalMessage);
  return new Promise((resolve) => {
    setTimeout(() => {
      const response = `API Response for "${originalMessage}"`;
      console.log('Mock API responded with:', response);
      resolve(response);
    }, 1500);
  });
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF5722',
  },
};

const App = () => {
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState<MessageState[]>([]);
  const [hasInternet, setHasInternet] = useState(true);

  const managerRef = useRef<BleManager | null>(null);
  const masterStateRef = useRef(new Map<number, MessageState>());
  const broadcastQueueRef = useRef(new Map<number, Uint8Array[]>());
  const masterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastCursorRef = useRef({ queueIndex: 0, chunkIndex: 0 });

  const hasInternetRef = useRef(hasInternet);
  useEffect(() => {
    hasInternetRef.current = hasInternet;
  }, [hasInternet]);

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

    const stopListener = listenOverBle(managerRef.current, (chunk) => {
      const decodedChunk = decodeSingleChunk(chunk);
      if (!decodedChunk) return;

      const { id, totalChunks, chunkNumber, isAck } = decodedChunk;
      const masterState = masterStateRef.current;
      let messageEntry = masterState.get(id);

      if (messageEntry && !messageEntry.isAck && isAck) {
        console.log(`ACK packet for ID ${id} overwrites previous state.`);
        messageEntry = undefined;
        masterState.delete(id);
      }

      if (!messageEntry) {
        messageEntry = {
          totalChunks,
          isComplete: false,
          isAck,
          chunks: new Map<number, Uint8Array>(),
          fullMessage: '',
        };
        masterState.set(id, messageEntry);
      }

      if (messageEntry.isComplete || messageEntry.chunks.has(chunkNumber)) {
        return;
      }

      messageEntry.chunks.set(chunkNumber, chunk);

      if (messageEntry.chunks.size === messageEntry.totalChunks) {
        messageEntry.isComplete = true;

        let fullBinary = new Uint8Array(messageEntry.totalChunks * 6);
        let offset = 0;
        for (let i = 1; i <= messageEntry.totalChunks; i++) {
          const part = messageEntry.chunks.get(i)!.slice(3);
          fullBinary.set(part, offset);
          offset += part.length;
        }
        const decoder = new TextDecoder();
        const fullMessage = decoder.decode(fullBinary).replace(/\0/g, '');
        messageEntry.fullMessage = fullMessage;

        setReceivedMessages(Array.from(masterState.values()));

        if (hasInternetRef.current) {
          handleApiResponse(id, fullMessage);
        } else {
          console.log(`No internet. Relaying message ID ${id}.`);
          addToBroadcastQueue(id, Array.from(messageEntry.chunks.values()));
        }
      }
    });

    return () => {
      stopListener();
      if (masterIntervalRef.current) {
        clearInterval(masterIntervalRef.current);
      }
      managerRef.current?.destroy();
    };
  }, []);

  const handleApiResponse = async (id: number, message: string) => {
    const apiResponse = await mockApiRequest(message);
    const ackChunks = encodeMessageToChunks(apiResponse, { id, isAck: true });

    masterStateRef.current.set(id, {
      totalChunks: ackChunks.length,
      isComplete: true,
      isAck: true,
      chunks: new Map(ackChunks.map((chunk, i) => [i + 1, chunk])),
      fullMessage: apiResponse,
    });
    setReceivedMessages(Array.from(masterStateRef.current.values()));
    addToBroadcastQueue(id, ackChunks);
  };

  const addToBroadcastQueue = (id: number, chunks: Uint8Array[]) => {
    broadcastQueueRef.current.set(id, chunks);
    if (!masterIntervalRef.current) {
      startMasterBroadcastLoop();
    }
  };

  const startMasterBroadcastLoop = () => {
    setIsBroadcasting(true);
    if (masterIntervalRef.current) clearInterval(masterIntervalRef.current);

    masterIntervalRef.current = setInterval(() => {
      const queue = Array.from(broadcastQueueRef.current.values());
      if (queue.length === 0) {
        stopMasterBroadcastLoop();
        return;
      }

      let { queueIndex, chunkIndex } = broadcastCursorRef.current;
      if (queueIndex >= queue.length) queueIndex = 0;

      const chunksToBroadcast = queue[queueIndex];
      if (chunkIndex >= chunksToBroadcast.length) chunkIndex = 0;

      broadcastOverBle(chunksToBroadcast[chunkIndex]);

      chunkIndex++;
      if (chunkIndex >= chunksToBroadcast.length) {
        chunkIndex = 0;
        queueIndex++;
      }
      broadcastCursorRef.current = { queueIndex, chunkIndex };
    }, 250);
  };

  const stopMasterBroadcastLoop = () => {
    if (masterIntervalRef.current) {
      clearInterval(masterIntervalRef.current);
      masterIntervalRef.current = null;
    }
    stopBleBroadcast();
    setIsBroadcasting(false);
  };

  const handleStartUserBroadcast = () => {
    const chunks = encodeMessageToChunks(message, { isAck: false });
    const id = decodeSingleChunk(chunks[0])!.id;

    masterStateRef.current.set(id, {
      totalChunks: chunks.length,
      isComplete: true,
      isAck: false,
      chunks: new Map(chunks.map((c, i) => [i + 1, c])),
      fullMessage: message,
    });
    setReceivedMessages(Array.from(masterStateRef.current.values()));
    addToBroadcastQueue(id, chunks);
  };

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <Surface style={styles.broadcasterSection} elevation={2}>
          <Title style={styles.sectionTitle}>Mesh Node</Title>
          <View style={styles.internetSwitchContainer}>
            <Text>Internet Status:</Text>
            <Switch value={hasInternet} onValueChange={setHasInternet} />
          </View>
          <TextInput
            mode="outlined"
            label="Broadcast New Message"
            value={message}
            onChangeText={setMessage}
            style={styles.textInput}
          />
          <Button
            mode="contained"
            onPress={handleStartUserBroadcast}
            disabled={!message.trim()}
            style={styles.button}
          >
            Broadcast Message
          </Button>
        </Surface>

        <Surface style={styles.receiverSection} elevation={2}>
          <Title style={styles.sectionTitle}>Network Messages</Title>
          <ScrollView>
            {receivedMessages.length === 0 ? (
              <Paragraph style={styles.placeholderText}>
                Listening for messages...
              </Paragraph>
            ) : (
              [...receivedMessages].reverse().map((msg, index) => (
                <Card
                  key={`${msg.fullMessage}-${index}`}
                  style={[
                    styles.messageCard,
                    { backgroundColor: msg.isAck ? '#e8f5e9' : '#fff3e0' },
                  ]}
                >
                  <Card.Content>
                    <Title style={styles.messageTitle}>
                      {msg.isAck ? '✅ Response (ACK)' : '✉️ Request'}
                    </Title>
                    <Paragraph>{msg.fullMessage}</Paragraph>
                    <Badge
                      style={styles.messageBadge}
                    >{`Chunks: ${msg.chunks.size}/${msg.totalChunks}`}</Badge>
                  </Card.Content>
                </Card>
              ))
            )}
          </ScrollView>
        </Surface>
      </View>
    </PaperProvider>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
    paddingTop: Platform.OS === 'android' ? 25 : 50,
  },
  broadcasterSection: {
    padding: 15,
    margin: 10,
    borderRadius: 12,
  },
  receiverSection: {
    flex: 1,
    padding: 15,
    margin: 10,
    marginTop: 0,
    borderRadius: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  internetSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textInput: {
    marginBottom: 10,
  },
  button: {
    paddingVertical: 5,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
  messageCard: {
    marginBottom: 8,
  },
  messageTitle: {
    fontSize: 16,
  },
  messageBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
});

export default App;
