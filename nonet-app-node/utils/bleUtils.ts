import base64 from 'react-native-base64';
import BleAdvertiser from 'react-native-ble-advertiser';
import { BleManager, ScanMode } from 'react-native-ble-plx';

// --- Constants ---
export const MESH_SERVICE_UUID = 'f1d0c001-c9e5-4d6c-96ff-7f73f4f99c15';

export type MessageState = {
  id: number;
  totalChunks: number;
  isComplete: boolean;
  isAck: boolean;
  chunks: Map<number, Uint8Array>;
  fullMessage: string;
};

// --- BLE Broadcasting Functions ---
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

// --- Data Conversion Functions ---
export const base64ToUint8Array = (b64: string): Uint8Array => {
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

// --- BLE Listening Function ---
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
