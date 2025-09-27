import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { BleManager } from 'react-native-ble-plx';
import NetInfo from '@react-native-community/netinfo';

// Define a consistent UUID for your service. Both broadcaster and listener must use this.
// NOTE: This must match the UUID in test.tsx for cross-device communication
const MESH_SERVICE_UUID = '12345678-1234-5678-9abc-432156789012';

// WHITE_PAPER Protocol Constants - Optimized for BLE constraints
const PROTOCOL_VERSION = 1;
const PACKET_ID_SIZE = 2; // bytes
const INDEX_SIZE = 1; // byte (max 255 chunks)
const NUM_CHUNKS_SIZE = 1; // byte (max 255 chunks)
const IS_ACK_SIZE = 1; // byte
const HEADER_SIZE =
  1 + PACKET_ID_SIZE + INDEX_SIZE + NUM_CHUNKS_SIZE + IS_ACK_SIZE; // 6 bytes total

// BLE advertising constraints:
// - Total BLE GAP limit: 31 bytes
// - Service UUID overhead: ~16 bytes
// - BLE protocol overhead: ~7 bytes
// - Available for our payload: ~8 bytes maximum
const MAX_TOTAL_PAYLOAD = 8; // Conservative limit
const MAX_DATA_PER_CHUNK = MAX_TOTAL_PAYLOAD - HEADER_SIZE; // 2 bytes per chunk

// Master State Interface - as per WHITE_PAPER
interface PacketState {
  ack_mode: boolean; // as soon as first ACK received, toggle to true
  is_complete: boolean; // check if all data packets received
  number_of_chunks: number; // total number of possible chunks
  data: { [index: number]: string }; // indexed data chunks as binary strings
}

interface MasterState {
  [packetId: string]: PacketState;
}

// Packet structure as per WHITE_PAPER
interface NoNetPacket {
  version: number; // 1 byte
  id: number; // 2 bytes
  index: number; // 1 byte
  number_of_chunks: number; // 1 byte
  is_ack: boolean; // 1 byte
  data: Uint8Array; // remaining bytes
}

interface PacketProgress {
  packetId: number;
  receivedChunks: number;
  totalChunks: number;
  isAck: boolean;
}

interface ProcessPacketResult {
  shouldBroadcast: boolean;
  completeMessage?: string;
  progress?: PacketProgress;
}

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
    console.log(`Payload data:`, payloadAsArray);

    // Start a new broadcast.
    // Try using manufacturer data instead of service data for better compatibility
    console.log(`Broadcasting with UUID: ${MESH_SERVICE_UUID}`);

    // First try the service data approach
    try {
      await (BleAdvertiser as any).broadcast(
        MESH_SERVICE_UUID,
        payloadAsArray,
        {
          // We are only sending data, so the device is not connectable.
          connectable: false,
          // Advertising options
          includeDeviceName: false,
          includeTxPowerLevel: false,
        }
      );
      console.log('Service data broadcast successful');
    } catch (serviceError) {
      console.log(
        'Service data broadcast failed, trying manufacturer data:',
        serviceError
      );

      // Fallback to manufacturer data approach
      await (BleAdvertiser as any).broadcastManufacturerData(
        0xffff,
        payloadAsArray,
        {
          connectable: false,
          includeDeviceName: false,
          includeTxPowerLevel: false,
        }
      );
      console.log('Manufacturer data broadcast successful');
    }

    console.log('Broadcast started successfully.');
  } catch (error: any) {
    console.error('BLE Broadcast Error:', error.message);
    Alert.alert(
      'Broadcast Error',
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
    console.log('BLE Broadcast stopped.');
  } catch (error: any) {
    console.error('BLE Stop Broadcast Error:', error.message);
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
    console.error('BLE Manager not initialized');
    return () => {}; // Return empty cleanup function
  }

  console.log(`Starting BLE scan for service: ${MESH_SERVICE_UUID}`);

  // Start scanning for ALL devices (not filtering by service UUID)
  // because the service data might not be properly detected when filtering
  bleManager.startDeviceScan(
    null, // Scan for all devices instead of filtering by service UUID
    { allowDuplicates: true }, // Allow duplicates to get continuous updates
    (error, device) => {
      if (error) {
        console.error('BLE Scan Error:', error.message);
        // Consider adding more robust error handling, e.g., stopping the scan.
        return;
      }

      if (!device) {
        console.log('No device found in scan callback');
        return;
      }

      // Check if this device is advertising our service UUID
      const hasOurService = device.serviceUUIDs?.includes(MESH_SERVICE_UUID);
      const hasServiceData =
        (device as any).serviceData &&
        (device as any).serviceData[MESH_SERVICE_UUID];

      if (!hasOurService && !hasServiceData) {
        return;
      }

      // Check both service data and manufacturer data
      const serviceDataB64 = (device as any).serviceData?.[MESH_SERVICE_UUID];
      const manufacturerData = (device as any).manufacturerData;

      console.log('Looking for service data with UUID:', MESH_SERVICE_UUID);
      console.log(
        'Available service data keys:',
        Object.keys((device as any).serviceData || {})
      );
      console.log('Manufacturer data:', manufacturerData);

      // Try service data first
      if (serviceDataB64) {
        console.log('Found service data, processing...');
        try {
          // 1. Decode the base64 string to a raw byte string.
          const byteString = base64.decode(serviceDataB64);

          // 2. Convert the raw byte string into a Uint8Array.
          const chunk = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            chunk[i] = byteString.charCodeAt(i);
          }

          console.log(
            `Received service data chunk with ${chunk.length} bytes.`
          );

          // 3. Pass the reconstructed chunk to the callback function.
          onChunkReceived(chunk);
        } catch (decodeError) {
          console.error('Error decoding service data:', decodeError);
        }
        return;
      }

      // Try manufacturer data as fallback
      if (manufacturerData) {
        console.log('Found manufacturer data, processing...');
        try {
          // 1. Decode the base64 string to a raw byte string.
          const byteString = base64.decode(manufacturerData);

          // 2. Convert the raw byte string into a Uint8Array.
          const fullChunk = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            fullChunk[i] = byteString.charCodeAt(i);
          }

          console.log(
            `Received manufacturer data chunk with ${fullChunk.length} bytes:`,
            Array.from(fullChunk)
          );

          // 3. Skip the first 2 bytes (company ID 0xFFFF) to get our 8-byte payload
          let chunk: Uint8Array;
          if (
            fullChunk.length >= 10 && // 2 bytes company ID + 8 bytes our payload
            fullChunk[0] === 255 &&
            fullChunk[1] === 255
          ) {
            // Strip the company ID prefix to get our 8-byte payload
            chunk = fullChunk.slice(2);
            console.log(
              `Stripped company ID, payload is now ${chunk.length} bytes:`,
              Array.from(chunk)
            );
          } else {
            // Use the full chunk if it doesn't have the expected prefix
            chunk = fullChunk;
            console.log(
              `No company ID found, using full chunk ${chunk.length} bytes:`,
              Array.from(chunk)
            );
          }

          // 4. Pass the reconstructed chunk to the callback function.
          onChunkReceived(chunk);
        } catch (decodeError) {
          console.error('Error decoding manufacturer data:', decodeError);
        }
        return;
      }

      console.log('No valid data found in service data or manufacturer data');
    }
  );

  // Return a function that the caller can use to stop the scan.
  const stopListener = () => {
    if (bleManager) {
      bleManager.stopDeviceScan();
      console.log('BLE Scan stopped.');
    }
  };

  return stopListener;
};

/**
 * Encodes a JSON message into NoNet protocol packets as per WHITE_PAPER specification
 */
export const encodeMessageToPackets = (jsonMessage: object): NoNetPacket[] => {
  // Convert JSON to binary payload
  const messageStr = JSON.stringify(jsonMessage);
  const encoder = new TextEncoder();
  const binaryPayload = encoder.encode(messageStr);

  console.log(`Original message: ${messageStr}`);
  console.log(`Binary payload size: ${binaryPayload.length} bytes`);
  console.log(
    `Header size: ${HEADER_SIZE} bytes, Data per chunk: ${MAX_DATA_PER_CHUNK} bytes`
  );

  // Calculate total chunks needed
  const totalChunks = Math.ceil(binaryPayload.length / MAX_DATA_PER_CHUNK) || 1;

  // Generate unique packet ID
  const packetId = Math.floor(Math.random() * 65536); // 2-byte ID

  console.log(`Packet ID: ${packetId}, Total chunks: ${totalChunks}`);

  // Create packets
  const packets: NoNetPacket[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const startIndex = i * MAX_DATA_PER_CHUNK;
    const endIndex = Math.min(
      startIndex + MAX_DATA_PER_CHUNK,
      binaryPayload.length
    );
    const chunkData = binaryPayload.slice(startIndex, endIndex);

    const packet: NoNetPacket = {
      version: PROTOCOL_VERSION,
      id: packetId,
      index: i + 1, // 1-based indexing as per WHITE_PAPER
      number_of_chunks: totalChunks,
      is_ack: false, // Initial packets are not ACKs
      data: chunkData,
    };

    packets.push(packet);
  }

  return packets;
};

/**
 * Encodes a NoNet packet into binary format for BLE transmission
 */
export const encodePacketToBinary = (packet: NoNetPacket): Uint8Array => {
  const totalSize = HEADER_SIZE + packet.data.length;
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  let offset = 0;

  // Version (1 byte)
  view.setUint8(offset, packet.version);
  offset += 1;

  // ID (2 bytes)
  view.setUint16(offset, packet.id, true); // little endian
  offset += 2;

  // Index (1 byte)
  view.setUint8(offset, Math.min(packet.index, 255));
  offset += 1;

  // Number of chunks (1 byte)
  view.setUint8(offset, Math.min(packet.number_of_chunks, 255));
  offset += 1;

  // Is ACK (1 byte)
  view.setUint8(offset, packet.is_ack ? 1 : 0);
  offset += 1;

  // Data (remaining bytes)
  buffer.set(packet.data, offset);

  console.log(
    `Encoded packet: Total size ${buffer.length} bytes (Header: ${HEADER_SIZE}, Data: ${packet.data.length})`
  );
  return buffer;
};

/**
 * Decodes binary data back into a NoNet packet
 */
export const decodeBinaryToPacket = (
  buffer: Uint8Array
): NoNetPacket | null => {
  console.log(`Decoding packet: ${buffer.length} bytes:`, Array.from(buffer));

  if (buffer.length < HEADER_SIZE) {
    console.error(
      `Invalid packet length. Expected at least ${HEADER_SIZE} bytes, got ${buffer.length}`
    );
    return null;
  }

  const view = new DataView(buffer.buffer);
  let offset = 0;

  // Version (1 byte)
  const version = view.getUint8(offset);
  offset += 1;
  console.log(`Version: ${version}`);

  // ID (2 bytes)
  const id = view.getUint16(offset, true);
  offset += 2;
  console.log(`ID: ${id}`);

  // Index (1 byte)
  const index = view.getUint8(offset);
  offset += 1;
  console.log(`Index: ${index}`);

  // Number of chunks (1 byte)
  const number_of_chunks = view.getUint8(offset);
  offset += 1;
  console.log(`Number of chunks: ${number_of_chunks}`);

  // Is ACK (1 byte)
  const is_ack = view.getUint8(offset) === 1;
  offset += 1;
  console.log(`Is ACK: ${is_ack}`);

  // Data (remaining bytes)
  const data = buffer.slice(offset);
  console.log(`Data: ${data.length} bytes:`, Array.from(data));

  const packet = {
    version,
    id,
    index,
    number_of_chunks,
    is_ack,
    data,
  };

  console.log(`Decoded packet:`, packet);
  return packet;
};

/**
 * Master State Manager - implements the WHITE_PAPER protocol logic
 */
class MasterStateManager {
  private masterState: MasterState = {};
  private hasInternet: boolean = false;

  constructor() {
    // Monitor internet connectivity
    NetInfo.addEventListener((state) => {
      this.hasInternet = state.isConnected || false;
      console.log(`Internet connectivity: ${this.hasInternet}`);
    });
  }

  /**
   * Process an incoming packet according to WHITE_PAPER logic
   */
  processIncomingPacket(packet: NoNetPacket): ProcessPacketResult {
    const packetIdStr = packet.id.toString();

    console.log(
      `Processing packet ID: ${packet.id}, Index: ${packet.index}, Is ACK: ${packet.is_ack}`
    );

    // Check if packet ID exists in master state
    if (this.masterState[packetIdStr]) {
      return this.handleExistingPacket(packet, packetIdStr);
    } else {
      return this.handleNewPacket(packet, packetIdStr);
    }
  }

  private handleExistingPacket(
    packet: NoNetPacket,
    packetIdStr: string
  ): ProcessPacketResult {
    const state = this.masterState[packetIdStr];

    // Check for ACK conflicts - obey the is_ack true one
    if (state.ack_mode !== packet.is_ack && packet.is_ack) {
      console.log(
        `ACK conflict detected for packet ${packet.id}, preferring ACK=true`
      );
      state.ack_mode = true;
      state.is_complete = false;
      state.number_of_chunks = packet.number_of_chunks;
      state.data = {};
    }

    // If is_complete and has internet, make request and create ACK response
    if (state.is_complete && this.hasInternet && !packet.is_ack) {
      console.log(
        `Complete packet ${packet.id} received by internet-connected node`
      );
      return this.handleInternetRequest(packet, packetIdStr);
    }

    // If not complete, fill the packet at correct place in data map
    if (!state.is_complete) {
      const dataStr = this.uint8ArrayToString(packet.data);
      state.data[packet.index] = dataStr;

      console.log(
        `📥 Added chunk ${packet.index}/${state.number_of_chunks} to packet ${packet.id}`
      );
      console.log(
        `📊 Current chunks: ${Object.keys(state.data).length}/${
          state.number_of_chunks
        }`
      );
      console.log(`📦 Current state:`, state);

      // Check if all chunks received
      if (Object.keys(state.data).length === state.number_of_chunks) {
        state.is_complete = true;
        console.log(
          `🎯 All chunks received for packet ${packet.id}! Reconstructing...`
        );
        const completeMessage = this.reconstructMessage(state);
        console.log(`Packet ${packet.id} is now complete: ${completeMessage}`);
        return { shouldBroadcast: true, completeMessage };
      }
    }

    return {
      shouldBroadcast: state.is_complete,
      progress: this.buildProgress(packet.id, state),
    };
  }

  private handleNewPacket(
    packet: NoNetPacket,
    packetIdStr: string
  ): ProcessPacketResult {
    console.log(`Creating new entry for packet ${packet.id}`);

    const dataStr = this.uint8ArrayToString(packet.data);

    this.masterState[packetIdStr] = {
      ack_mode: packet.is_ack,
      is_complete: false,
      number_of_chunks: packet.number_of_chunks,
      data: { [packet.index]: dataStr },
    };

    // Check if this single packet completes the message
    if (packet.number_of_chunks === 1) {
      this.masterState[packetIdStr].is_complete = true;
      const completeMessage = this.reconstructMessage(
        this.masterState[packetIdStr]
      );
      console.log(
        `Single-chunk packet ${packet.id} complete: ${completeMessage}`
      );
      return { shouldBroadcast: true, completeMessage };
    }

    return {
      shouldBroadcast: false,
      progress: this.buildProgress(packet.id, this.masterState[packetIdStr]),
    };
  }

  private handleInternetRequest(
    packet: NoNetPacket,
    packetIdStr: string
  ): ProcessPacketResult {
    // Simulate internet request processing
    // In real implementation, this would make HTTP request and wait for response
    console.log(`Making internet request for packet ${packet.id}`);

    // Create ACK response with new data (simulated response)
    const responseData = `Response for packet ${packet.id}`;
    // In real implementation, you would create and broadcast response packets
    console.log(`Would create ACK response packets for ${packet.id}`);

    // Update master state with ACK mode
    const state = this.masterState[packetIdStr];
    state.ack_mode = true;
    state.is_complete = true;

    // In real implementation, you would broadcast the response packets
    console.log(`Created ACK response packets for ${packet.id}`);

    return { shouldBroadcast: true, completeMessage: responseData };
  }

  private reconstructMessage(state: PacketState): string {
    console.log('🔧 Reconstructing message from state:', state);

    const sortedIndices = Object.keys(state.data)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b);

    console.log('📋 Sorted indices:', sortedIndices);

    // Collect all data bytes in order
    const allBytes: number[] = [];
    for (const index of sortedIndices) {
      const chunkData = state.data[index];
      console.log(
        `📦 Chunk ${index}: "${chunkData}" (length: ${chunkData.length})`
      );

      // Convert string back to bytes
      for (let i = 0; i < chunkData.length; i++) {
        allBytes.push(chunkData.charCodeAt(i));
      }
    }

    console.log('🔢 All bytes:', allBytes);

    // Convert to Uint8Array and decode
    const bytes = new Uint8Array(allBytes);
    const decoder = new TextDecoder();
    const result = decoder.decode(bytes);

    console.log('✨ Reconstructed message:', result);
    return result;
  }

  private uint8ArrayToString(data: Uint8Array): string {
    return String.fromCharCode(...data);
  }

  private buildProgress(packetId: number, state: PacketState): PacketProgress {
    const receivedChunks = Object.keys(state.data).length;
    const totalChunks = state.number_of_chunks || receivedChunks || 1;

    return {
      packetId,
      receivedChunks,
      totalChunks,
      isAck: state.ack_mode,
    };
  }

  /**
   * Get all complete packets that should be broadcast
   */
  getPacketsForBroadcast(): string[] {
    const packetIds: string[] = [];
    for (const [packetId, state] of Object.entries(this.masterState)) {
      if (state.is_complete) {
        packetIds.push(packetId);
      }
    }
    return packetIds;
  }

  /**
   * Get packet data for broadcasting
   */
  getPacketData(packetId: string): PacketState | null {
    return this.masterState[packetId] || null;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const App = () => {
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [receivedMessages, setReceivedMessages] = useState([
    'Listening for messages...',
  ]);
  const [packets, setPackets] = useState<NoNetPacket[]>([]);

  const managerRef = useRef<BleManager | null>(null);
  const masterStateManagerRef = useRef<MasterStateManager | null>(null);
  const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const currentBroadcastIndexRef = useRef<number>(0);
  const manualPacketsRef = useRef<NoNetPacket[]>([]);
  const manualBroadcastActiveRef = useRef<boolean>(false);
  const manualBroadcastRunningRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize BLE manager and Master State Manager
    managerRef.current = new BleManager();
    masterStateManagerRef.current = new MasterStateManager();

    // Initialize BLE advertiser for Android
    if (Platform.OS === 'android') {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        console.log('advertiser init error', e);
      }
    }

    // Start receiver thread - constantly listening for BLE packets
    const stopListener = listenOverBle(managerRef.current, (chunk) => {
      const packet = decodeBinaryToPacket(chunk);
      if (!packet || !masterStateManagerRef.current) {
        console.log('Failed to decode packet or no master state manager');
        return;
      }

      console.log('Received packet:', packet);

      // Process packet through master state manager
      const result =
        masterStateManagerRef.current.processIncomingPacket(packet);

      if (result.completeMessage) {
        console.log('🎉 COMPLETE MESSAGE RECEIVED:', result.completeMessage);
        setReceivedMessages((prev) => [
          `Complete message: ${result.completeMessage}`,
          ...prev.slice(0, 9), // Keep only last 10 messages
        ]);
      } else {
        console.log('📦 Partial packet received, waiting for more chunks');
      }

      if (result.progress) {
        const { packetId, receivedChunks, totalChunks, isAck } =
          result.progress;
        const progressLabel = isAck ? 'ACK' : 'DATA';
        const progressMessage = `Packet ${packetId} (${progressLabel}) progress: ${receivedChunks}/${totalChunks} chunks`;
        setReceivedMessages((prev) => [progressMessage, ...prev.slice(0, 9)]);
      }

      // If packet should be broadcast (is_complete), add to broadcast queue
      if (result.shouldBroadcast) {
        console.log(`Packet ${packet.id} should be broadcast`);
        // The broadcast thread will pick this up automatically
      }
    });

    // Start broadcast thread - constantly loops over complete packets and broadcasts them
    const startBroadcastThread = () => {
      broadcastIntervalRef.current = setInterval(() => {
        if (!masterStateManagerRef.current) return;

        const packetsForBroadcast =
          masterStateManagerRef.current.getPacketsForBroadcast();

        if (packetsForBroadcast.length === 0) return;

        // Cycle through packets to broadcast
        const currentPacketId =
          packetsForBroadcast[
            currentBroadcastIndexRef.current % packetsForBroadcast.length
          ];
        const packetData =
          masterStateManagerRef.current.getPacketData(currentPacketId);

        if (packetData && packetData.is_complete) {
          // Reconstruct and broadcast the complete packet
          broadcastCompletePacket(currentPacketId, packetData);
        }

        currentBroadcastIndexRef.current++;
      }, 1000); // Broadcast every 1 second
    };

    startBroadcastThread();

    return () => {
      stopListener();
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
      }
      const manager = managerRef.current;
      if (manager) {
        manager.destroy();
      }
    };
  }, []);

  const ensureManualBroadcastLoop = useCallback(() => {
    if (manualBroadcastRunningRef.current) {
      console.log('Manual broadcast loop already running');
      manualBroadcastActiveRef.current = true;
      return;
    }

    manualBroadcastRunningRef.current = true;
    manualBroadcastActiveRef.current = true;

    const runLoop = async () => {
      console.log('Starting manual broadcast loop');
      try {
        while (manualBroadcastActiveRef.current) {
          const packetsToSend = manualPacketsRef.current;

          if (!packetsToSend.length) {
            await sleep(500);
            continue;
          }

          console.log(
            `Manual broadcast loop cycling over ${packetsToSend.length} packets`
          );

          for (let i = 0; i < packetsToSend.length; i++) {
            if (!manualBroadcastActiveRef.current) {
              console.log('Manual broadcast loop interrupted');
              break;
            }

            const packet = packetsToSend[i];
            const binaryPacket = encodePacketToBinary(packet);

            console.log(
              `Manual broadcast packet ${i + 1}/${packetsToSend.length}:`,
              packet
            );

            try {
              await broadcastOverBle(binaryPacket);
            } catch (error) {
              console.log('Manual broadcast error', error);
            }

            const REPEAT_COUNT = 3;
            const ADVERTISEMENT_DURATION_MS = 700;

            for (let repeat = 1; repeat <= REPEAT_COUNT; repeat++) {
              if (!manualBroadcastActiveRef.current) {
                break;
              }

              if (repeat > 1) {
                try {
                  await broadcastOverBle(binaryPacket);
                } catch (repeatError) {
                  console.log('Manual broadcast repeat error', repeatError);
                }
              }

              await sleep(ADVERTISEMENT_DURATION_MS);
            }
          }
        }
      } finally {
        manualBroadcastRunningRef.current = false;
        console.log('Manual broadcast loop stopped');
      }
    };

    runLoop();
  }, []);

  /**
   * Broadcast a complete packet by cycling through its chunks
   */
  const broadcastCompletePacket = async (
    packetId: string,
    packetData: PacketState
  ) => {
    console.log(`Broadcasting complete packet ${packetId}`);

    // Reconstruct the complete message
    const sortedIndices = Object.keys(packetData.data)
      .map((k) => parseInt(k))
      .sort((a, b) => a - b);

    // Broadcast each chunk of the complete packet
    for (const index of sortedIndices) {
      const chunkData = packetData.data[index];
      const bytes = new Uint8Array(chunkData.length);
      for (let i = 0; i < chunkData.length; i++) {
        bytes[i] = chunkData.charCodeAt(i);
      }

      // Create packet for this chunk
      const packet: NoNetPacket = {
        version: PROTOCOL_VERSION,
        id: parseInt(packetId),
        index: index,
        number_of_chunks: packetData.number_of_chunks,
        is_ack: packetData.ack_mode,
        data: bytes,
      };

      // Encode and broadcast
      const binaryPacket = encodePacketToBinary(packet);
      await broadcastOverBle(binaryPacket);

      // Small delay between chunks
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const handleStartBroadcasting = () => {
    if (!message) {
      alert('Please enter a message to broadcast.');
      return;
    }

    try {
      // Parse message as JSON (as per WHITE_PAPER example)
      let jsonMessage;
      try {
        jsonMessage = JSON.parse(message);
      } catch {
        // If not valid JSON, create a simple message object
        jsonMessage = {
          from: 'local_device',
          to: 'network',
          data: message,
          value: Date.now().toString(),
        };
      }

      // Create packets using WHITE_PAPER protocol
      const createdPackets = encodeMessageToPackets(jsonMessage);

      // Update state and log the results
      setPackets(createdPackets);
      setIsBroadcasting(true);
      console.log('Original Message:', jsonMessage);
      console.log('Generated Packets:', createdPackets);

      manualPacketsRef.current = createdPackets;
      manualBroadcastActiveRef.current = true;
      ensureManualBroadcastLoop();
    } catch (error) {
      console.error('Error creating packets:', error);
      alert('Error creating packets: ' + error);
    }
  };

  const handleStopBroadcasting = async () => {
    setIsBroadcasting(false);
    manualBroadcastActiveRef.current = false;
    manualPacketsRef.current = [];
    await stopBleBroadcast();
  };

  return (
    <View style={styles.container}>
      {/* Broadcaster Section - Top Half */}
      <View style={styles.broadcasterSection}>
        <Text style={styles.sectionTitle}>Broadcaster</Text>

        <TextInput
          style={styles.textInput}
          placeholder='Enter JSON message (e.g., {"from": "0x123", "to": "0x456", "data": "hello", "value": "1000"}) or plain text...'
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity
          style={styles.exampleButton}
          onPress={() =>
            setMessage(
              '{"from": "0xasdhklhadfjlhsafd", "to": "0xfdsafdsfd", "data": "dfadfasdfasdf", "value": "ddsfadhfljashkdfaldkjasdkfjhaksdj"}'
            )
          }
        >
          <Text style={styles.exampleButtonText}>Load WHITE_PAPER Example</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exampleButton, { backgroundColor: '#FF9800' }]}
          onPress={() => setMessage('{"test": "short message"}')}
        >
          <Text style={styles.exampleButtonText}>Load Short Test Message</Text>
        </TouchableOpacity>

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
            <Text style={styles.statusText}>
              🔴 Broadcasting NoNet Protocol
            </Text>
            <Text style={styles.statusText}>Packets: {packets.length}</Text>
            <Text style={styles.statusText}>
              Message: {message.substring(0, 50)}...
            </Text>
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
    backgroundColor: '#f5f5f5',
  },
  broadcasterSection: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#ddd',
  },
  receiverSection: {
    flex: 1,
    backgroundColor: '#f3e5f5',
    padding: 20,
  },
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  statusText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  messageItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  listeningIndicator: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4CAF50',
    alignItems: 'center',
  },
  listeningText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  exampleButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  exampleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default App;
