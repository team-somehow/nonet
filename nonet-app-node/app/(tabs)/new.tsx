// App.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  ProgressBar,
  Chip,
} from 'react-native-paper';
import base64 from 'react-native-base64';
import BleAdvertiser from 'react-native-ble-advertiser';
import { BleManager, ScanMode } from 'react-native-ble-plx';

// --- Constants & Theme ---
const MESH_SERVICE_UUID = 'f1d0c001-c9e5-4d6c-96ff-7f73f4f99c15';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF5722',
  },
};

type MessageState = {
  id: number;
  totalChunks: number;
  isComplete: boolean;
  isAck: boolean;
  chunks: Map<number, Uint8Array>;
  fullMessage: string;
};

// --- Utilities / Mock API ---
const mockApiRequest = async (originalMessage: string): Promise<string> => {
  return new Promise((resolve) =>
    setTimeout(() => resolve(`API Response for "${originalMessage}"`), 1500)
  );
};

// --- BLE helpers (resilient) ---
export const broadcastOverBle = async (chunk: Uint8Array): Promise<void> => {
  const payloadAsArray = Array.from(chunk);
  try {
    await (BleAdvertiser as any).stopBroadcast();
  } catch {
    /* ignore */
  }

  try {
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
    try {
      await (BleAdvertiser as any).broadcastManufacturerData(
        0xffff,
        payloadAsArray,
        {
          connectable: false,
          includeDeviceName: false,
          includeTxPowerLevel: false,
        }
      );
    } catch (manuErr) {
      console.error('Manufacturer broadcast also failed:', manuErr);
    }
  }
};

export const stopBleBroadcast = async (): Promise<void> => {
  try {
    await (BleAdvertiser as any).stopBroadcast();
  } catch {
    /* ignore */
  }
};

const base64ToUint8Array = (b64: string): Uint8Array => {
  const byteString = base64.decode(b64);
  return Uint8Array.from(byteString, (c) => c.charCodeAt(0));
};

// --- Protocol encoding/decoding ---
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
    if (typeof crypto !== 'undefined' && (crypto as any).getRandomValues) {
      (crypto as any).getRandomValues(idArray);
    } else {
      idArray[0] = Math.floor(Math.random() * 256);
    }
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

    let chunkNumAndFlagByte = chunkNumber & 0b01111111;
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

export const decodeSingleChunk = (
  chunk: Uint8Array
):
  | (MessageState & {
      chunkNumber: number;
      data: Uint8Array;
      decodedData: string;
    })
  | null => {
  if (!chunk || chunk.length < 3) return null;
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

  return {
    id,
    totalChunks,
    isComplete: false,
    isAck,
    chunks: new Map<number, Uint8Array>(),
    fullMessage: '',
    chunkNumber,
    data,
    decodedData,
  } as any;
};

// --- listenOverBle that returns the stop fn ---
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
    try {
      bleManager.stopDeviceScan();
    } catch {
      /* ignore */
    }
    console.log('BLE Scan stopped (stop function called).');
  };
};

// --- Main App ---
const App = () => {
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [hasInternet, setHasInternet] = useState(true);
  const [, forceRerender] = useState(0);

  const managerRef = useRef<BleManager | null>(null);
  const masterStateRef = useRef<Map<number, MessageState>>(new Map());
  const broadcastQueueRef = useRef<Map<number, Uint8Array[]>>(new Map());
  const masterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastCursorRef = useRef<{ queueIndex: number; chunkIndex: number }>(
    { queueIndex: 0, chunkIndex: 0 }
  );
  const hasInternetRef = useRef(hasInternet);

  const stopScannerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    hasInternetRef.current = hasInternet;
  }, [hasInternet]);

  const handleIncomingChunk = (chunk: Uint8Array) => {
    const decoded = decodeSingleChunk(chunk);
    if (!decoded) return;

    const { id, totalChunks, chunkNumber, isAck } = decoded;
    const masterState = masterStateRef.current;
    let entry = masterState.get(id);

    if (entry && !entry.isAck && isAck) {
      masterState.delete(id);
      entry = undefined;
    }

    if (!entry) {
      entry = {
        id,
        totalChunks,
        isComplete: false,
        isAck,
        chunks: new Map<number, Uint8Array>(),
        fullMessage: '',
      };
      masterState.set(id, entry);
    }

    if (entry.isComplete || entry.chunks.has(chunkNumber)) {
      return;
    }

    entry.chunks.set(chunkNumber, chunk);
    forceRerender((n) => n + 1);

    if (entry.chunks.size === entry.totalChunks) {
      entry.isComplete = true;

      const DATA_PER_CHUNK = 6;
      const fullBinary = new Uint8Array(entry.totalChunks * DATA_PER_CHUNK);
      let offset = 0;
      for (let i = 1; i <= entry.totalChunks; i++) {
        const part = entry.chunks.get(i)!.slice(3);
        fullBinary.set(part, offset);
        offset += part.length;
      }
      const decoder = new TextDecoder();
      const fullMessage = decoder.decode(fullBinary).replace(/\0/g, '');
      entry.fullMessage = fullMessage;

      forceRerender((n) => n + 1);

      if (hasInternetRef.current && !entry.isAck) {
        handleApiResponse(id, fullMessage);
      } else if (!hasInternetRef.current) {
        addToBroadcastQueue(id, Array.from(entry.chunks.values()));
      }
    }
  };

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

    stopScannerRef.current = listenOverBle(
      managerRef.current,
      handleIncomingChunk
    );

    return () => {
      try {
        stopScannerRef.current?.();
      } catch {}
      stopScannerRef.current = null;

      if (masterIntervalRef.current) {
        clearInterval(masterIntervalRef.current);
        masterIntervalRef.current = null;
      }
      try {
        managerRef.current?.destroy();
      } catch {}
      managerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApiResponse = async (id: number, messageText: string) => {
    try {
      const apiResponse = await mockApiRequest(messageText);
      const ackChunks = encodeMessageToChunks(apiResponse, { id, isAck: true });

      const ackState: MessageState = {
        id,
        totalChunks: ackChunks.length,
        isComplete: true,
        isAck: true,
        chunks: new Map(ackChunks.map((chunk, i) => [i + 1, chunk])),
        fullMessage: apiResponse,
      };
      masterStateRef.current.set(id, ackState);
      forceRerender((n) => n + 1);

      addToBroadcastQueue(id, ackChunks);
    } catch (err) {
      console.error('API handling error', err);
    }
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

    broadcastCursorRef.current = { queueIndex: 0, chunkIndex: 0 };

    masterIntervalRef.current = setInterval(() => {
      const entries = Array.from(broadcastQueueRef.current.entries());
      if (entries.length === 0) {
        stopMasterBroadcastLoop();
        return;
      }

      let { queueIndex, chunkIndex } = broadcastCursorRef.current;
      if (queueIndex >= entries.length) queueIndex = 0;

      const [currentId, chunksToBroadcast] = entries[queueIndex]!;
      if (!chunksToBroadcast || chunksToBroadcast.length === 0) {
        broadcastQueueRef.current.delete(currentId);
        broadcastCursorRef.current = { queueIndex: 0, chunkIndex: 0 };
        return;
      }

      if (chunkIndex >= chunksToBroadcast.length) chunkIndex = 0;

      try {
        broadcastOverBle(chunksToBroadcast[chunkIndex]);
      } catch (e) {
        console.error('broadcast error', e);
      }

      chunkIndex++;
      if (chunkIndex >= chunksToBroadcast.length) {
        chunkIndex = 0;
        queueIndex++;
        if (queueIndex >= entries.length) queueIndex = 0;
      }

      broadcastCursorRef.current = { queueIndex, chunkIndex };
      forceRerender((n) => n + 1);
    }, 250);
  };

  const stopMasterBroadcastLoop = () => {
    if (masterIntervalRef.current) {
      clearInterval(masterIntervalRef.current);
      masterIntervalRef.current = null;
    }
    stopBleBroadcast();
    setIsBroadcasting(false);
    broadcastCursorRef.current = { queueIndex: 0, chunkIndex: 0 };
    forceRerender((n) => n + 1);
  };

  const handleStartUserBroadcast = () => {
    try {
      const chunks = encodeMessageToChunks(message, { isAck: false });
      const id = decodeSingleChunk(chunks[0])!.id;

      const newState: MessageState = {
        id,
        totalChunks: chunks.length,
        isComplete: true,
        isAck: false,
        chunks: new Map(chunks.map((c, i) => [i + 1, c])),
        fullMessage: message,
      };

      masterStateRef.current.set(id, newState);
      forceRerender((n) => n + 1);
      addToBroadcastQueue(id, chunks);
      setMessage('');
    } catch (err) {
      Alert.alert(
        'Error',
        (err as Error).message || 'Failed to encode message'
      );
    }
  };

  // Clear everything & stop (single button)
  const clearEverythingAndStop = () => {
    if (
      masterStateRef.current.size === 0 &&
      broadcastQueueRef.current.size === 0 &&
      !isBroadcasting
    ) {
      return;
    }

    Alert.alert(
      'Clear Everything & Stop',
      'This will clear received messages, clear the broadcast queue, and stop broadcasting. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all & stop',
          style: 'destructive',
          onPress: async () => {
            // --- 1. Stop all current operations ---
            if (stopScannerRef.current) {
              stopScannerRef.current();
              stopScannerRef.current = null;
            }
            if (masterIntervalRef.current) {
              clearInterval(masterIntervalRef.current);
              masterIntervalRef.current = null;
            }
            await stopBleBroadcast();

            // --- 2. Destroy the BleManager instance to clear the native cache ---
            if (managerRef.current) {
              managerRef.current.destroy();
              managerRef.current = null;
            }

            // --- 3. Clear all application-level state ---
            masterStateRef.current.clear();
            broadcastQueueRef.current.clear();
            setIsBroadcasting(false);
            broadcastCursorRef.current = { queueIndex: 0, chunkIndex: 0 };

            // Force a UI update to reflect the cleared state
            forceRerender((n) => n + 1);

            // --- 4. Re-initialize and restart the scanner after a short delay ---
            setTimeout(() => {
              try {
                // Create a new BleManager instance
                managerRef.current = new BleManager();
                // Start listening again
                stopScannerRef.current = listenOverBle(
                  managerRef.current,
                  handleIncomingChunk
                );
                console.log('BLE stack reset and scanner restarted.');
              } catch (e) {
                console.error('Failed to restart scanner after clear:', e);
              }
            }, 500); // Increased delay slightly for stability
          },
        },
      ]
    );
  };

  // UI helpers
  const getCurrentBroadcastInfo = (): { id?: number; text?: string } => {
    const entries = Array.from(broadcastQueueRef.current.entries());
    if (entries.length === 0) return {};
    let idx = broadcastCursorRef.current.queueIndex;
    if (idx >= entries.length) idx = 0;
    const [id] = entries[idx];
    const state = masterStateRef.current.get(id);
    if (!state) {
      const chunks = entries[idx][1];
      try {
        const maybe = decodeSingleChunk(chunks[0]) as any;
        return {
          id,
          text: maybe?.decodedData?.slice(0, 120) ?? 'Broadcasting...',
        };
      } catch {
        return { id, text: 'Broadcasting...' };
      }
    }
    const maxLen = 60;
    const text =
      state.fullMessage.length > maxLen
        ? `${state.fullMessage.slice(0, maxLen)}...`
        : state.fullMessage;
    return { id: state.id, text };
  };

  const getProgressFor = (state: MessageState) => {
    const received = state.chunks.size;
    const total = state.totalChunks || 1;
    const percent = Math.round((received / total) * 100);
    return { received, total, percent };
  };

  const renderReceivedMessageCard = (state: MessageState) => {
    const progress = getProgressFor(state);
    return (
      <Card
        key={`msg-${state.id}`}
        style={[
          styles.messageCard,
          { backgroundColor: state.isAck ? '#e8f5e9' : '#fff3e0' },
        ]}
      >
        <Card.Content>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title style={styles.messageTitle}>
              {state.isAck ? '✅ Response (ACK)' : '✉️ Request'}
            </Title>
            <Chip compact>{`${progress.percent}%`}</Chip>
          </View>

          <Paragraph numberOfLines={3}>
            {state.fullMessage ||
              (state.isComplete ? '(decoded)' : '(incomplete)')}
          </Paragraph>

          <View style={{ marginTop: 8 }}>
            <Text
              style={{ marginBottom: 6 }}
            >{`Chunks: ${progress.received}/${progress.total}`}</Text>
            <ProgressBar
              progress={progress.percent / 100}
              style={{ height: 8, borderRadius: 6 }}
            />
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}
            >
              {Array.from({ length: state.totalChunks }, (_, i) => {
                const idx = i + 1;
                const have = state.chunks.has(idx);
                return (
                  <Badge
                    key={idx}
                    style={[
                      styles.chunkBadge,
                      have ? styles.chunkHave : styles.chunkMissing,
                    ]}
                  >
                    {idx}
                  </Badge>
                );
              })}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const allMessages = Array.from(masterStateRef.current.values()).sort(
    (a, b) => b.id - a.id
  );
  const currentBroadcast = getCurrentBroadcastInfo();

  return (
    <PaperProvider theme={theme}>
      <View style={styles.container}>
        <Surface style={styles.broadcasterSection} elevation={2}>
          <Title style={styles.sectionTitle}>Mesh Node</Title>

          <View style={styles.internetSwitchContainer}>
            <Text>Internet Status:</Text>
            <Switch value={hasInternet} onValueChange={setHasInternet} />
            <View style={{ width: 12 }} />
            <Button
              mode="outlined"
              onPress={() => {
                if (isBroadcasting) stopMasterBroadcastLoop();
                else startMasterBroadcastLoop();
              }}
            >
              {isBroadcasting ? 'Stop Broadcasting' : 'Start Broadcasting'}
            </Button>
          </View>

          <View style={{ marginVertical: 8 }}>
            <Text style={{ fontSize: 13, color: '#555' }}>
              Currently broadcasting:
            </Text>
            <Paragraph style={{ fontWeight: '700', marginTop: 2 }}>
              {isBroadcasting && currentBroadcast.text
                ? `🔊 ${currentBroadcast.text}`
                : '— not broadcasting —'}
            </Paragraph>
          </View>

          <TextInput
            mode="outlined"
            label="Broadcast New Message"
            value={message}
            onChangeText={setMessage}
            style={styles.textInput}
            multiline
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
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Title style={styles.sectionTitle}>Network Messages</Title>
            <Button mode="text" onPress={clearEverythingAndStop} compact>
              Clear
            </Button>
          </View>

          <ScrollView>
            {allMessages.length === 0 ? (
              <Paragraph style={styles.placeholderText}>
                Listening for messages...
              </Paragraph>
            ) : (
              allMessages.map((msg) => renderReceivedMessageCard(msg))
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
    marginBottom: 12,
  },
  internetSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  textInput: {
    marginBottom: 10,
    minHeight: 64,
  },
  button: {
    paddingVertical: 6,
  },
  placeholderText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
  messageCard: {
    marginBottom: 10,
  },
  messageTitle: {
    fontSize: 16,
  },
  chunkBadge: {
    margin: 3,
    paddingHorizontal: 6,
  },
  chunkHave: {
    backgroundColor: '#c8e6c9',
    color: '#0b6623',
  },
  chunkMissing: {
    backgroundColor: '#ffe0b2',
    color: '#6a4a00',
  },
});

export default App;
