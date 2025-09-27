import React, { JSX, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import BleAdvertiser from "react-native-ble-advertiser";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import base64 from "react-native-base64";

// --- Core Configuration ---
const NONET_SERVICE_UUID = "12345678-1234-5678-9abc-123456789012";
const CHUNK_SIZE = 20; // Max bytes per chunk's data for binary protocol
const ADVERTISING_INTERVAL = 100; // Milliseconds between advertising each chunk.

// Binary Protocol Constants
const PROTOCOL_VERSION = 1;
const HASH_SIZE = 4; // 4-byte hash for payload identification
const HEADER_SIZE = 7; // version(1) + hash(4) + index(1) + total(1)

// --- Type Definitions ---
type LogType = "send" | "receive" | "system";
type LogItem = { id: string; text: string; type: LogType };

type Chunk = {
  h: string; // Payload Hash (used as unique ID)
  i: number; // Index of this chunk
  n: number; // Total number of chunks
  d: string; // Data payload for this chunk (hex string)
};

let logCounter = 0;

export default function Test(): JSX.Element {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const managerRef = useRef<BleManager | null>(null);
  const advertisingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // --- State Management for the Mesh Network ---
  const [activePayloads, setActivePayloads] = useState<Map<string, Chunk[]>>(
    new Map()
  );
  const [advertisingQueue, setAdvertisingQueue] = useState<Chunk[]>([]);
  const [processedPayloadHashes, setProcessedPayloadHashes] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    managerRef.current = new BleManager();
    appendLog("🔧 Initializing BLE Manager", "system");

    if (Platform.OS === "android") {
      try {
        if ((BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
          appendLog("📱 Android: Set company ID to 0xffff", "system");
        }
      } catch (e) {
        appendLog(`Advertiser init error: ${e}`, "system");
      }
    }
    startScan();
    return () => {
      appendLog("🧹 Cleaning up BLE resources", "system");
      stopScan();
      if (advertisingIntervalRef.current) {
        clearInterval(advertisingIntervalRef.current);
      }
      stopAdvertise();
      managerRef.current?.destroy();
    };
  }, []);

  // --- The Advertising Loop ---
  useEffect(() => {
    appendLog(
      `🔄 Advertising queue changed: ${advertisingQueue.length} chunks`,
      "system"
    );

    if (advertisingIntervalRef.current) {
      clearInterval(advertisingIntervalRef.current);
      advertisingIntervalRef.current = null;
      appendLog("⏹️ Cleared previous advertising interval", "system");
    }

    if (advertisingQueue.length === 0) {
      appendLog("📭 Queue empty, stopping advertising", "system");
      stopAdvertise();
      return;
    }

    appendLog(
      `📡 Starting broadcast loop for ${advertisingQueue.length} chunks`,
      "send"
    );

    // Log details about what's in the queue
    const queueSummary = advertisingQueue.reduce((acc, chunk) => {
      const key = `${chunk.h}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(queueSummary).forEach(([hash, count]) => {
      appendLog(`  📋 Payload ${hash}: ${count} chunks queued`, "send");
    });

    let currentIndex = 0;
    advertisingIntervalRef.current = setInterval(() => {
      if (advertisingQueue.length > 0) {
        const chunk = advertisingQueue[currentIndex];
        appendLog(
          `📤 Broadcasting chunk ${chunk.i + 1}/${chunk.n} of payload ${
            chunk.h
          }`,
          "send"
        );
        broadcastChunk(chunk);
        currentIndex = (currentIndex + 1) % advertisingQueue.length;
      }
    }, ADVERTISING_INTERVAL);

    return () => {
      if (advertisingIntervalRef.current) {
        clearInterval(advertisingIntervalRef.current);
      }
      stopAdvertise();
    };
  }, [advertisingQueue]);

  const appendLog = (t: string, type: LogType = "system") => {
    const item = { id: `${Date.now()}-${logCounter++}`, text: t, type };
    setLogs((p) => [item, ...p].slice(0, 100));
    console.log(`[NoNet-${type.toUpperCase()}]`, t);
  };

  async function requestPermissionsOrFail(): Promise<boolean> {
    // ... (permission logic remains the same)
    if (Platform.OS !== "android") return true;
    const perms = [
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ];
    const results = await Promise.all(perms.map((p) => request(p)));
    const allGranted = results.every((r) => r === RESULTS.GRANTED);
    if (!allGranted) {
      appendLog("Permissions missing.", "system");
      Alert.alert(
        "Permissions Required",
        "Please grant all Bluetooth permissions for the app to function."
      );
    }
    return allGranted;
  }

  // --- PAYLOAD MANAGER FUNCTIONS ---
  const handleCompletePayload = (payloadData: string, payloadHash: string) => {
    appendLog(`🎯 Processing complete payload ${payloadHash}`, "receive");
    appendLog(`📏 Payload size: ${payloadData.length} characters`, "receive");

    try {
      const jsonData = JSON.parse(payloadData);
      appendLog(`✅🎉 PAYLOAD COMPLETE: ${payloadHash}`, "receive");
      appendLog(
        `📦 Received JSON: ${JSON.stringify(jsonData).substring(0, 40)}...`,
        "receive"
      );
      appendLog(
        `📊 JSON structure: ${Object.keys(jsonData).join(", ")}`,
        "receive"
      );
      Alert.alert("Payload Assembled!", `Received: ${payloadHash}`);
    } catch (e) {
      appendLog(`✅🎉 PAYLOAD COMPLETE: ${payloadHash}`, "receive");
      appendLog(
        `📦 Received data: ${payloadData.substring(0, 40)}...`,
        "receive"
      );
      appendLog(`⚠️ Not valid JSON, treating as raw data`, "receive");
      Alert.alert("Payload Assembled!", `Received: ${payloadHash}`);
    }
  };

  const startBroadcastingPayload = (jsonPayload: any) => {
    appendLog("🚀 Starting broadcast for new payload...", "send");
    appendLog(`📝 Payload content: ${JSON.stringify(jsonPayload)}`, "send");

    const jsonString = JSON.stringify(jsonPayload);
    appendLog(`📏 JSON string length: ${jsonString.length} characters`, "send");

    const data = Array.from(new TextEncoder().encode(jsonString))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    appendLog(`🔢 Hex encoded length: ${data.length} characters`, "send");

    const payloadHash = data.substring(0, 8);
    const numChunks = Math.ceil(data.length / (CHUNK_SIZE * 2));
    appendLog(
      `🧮 Calculated ${numChunks} chunks needed (${
        CHUNK_SIZE * 2
      } hex chars per chunk)`,
      "send"
    );

    const newChunks: Chunk[] = [];
    for (let i = 0; i < numChunks; i++) {
      const startPos = i * CHUNK_SIZE * 2;
      const endPos = Math.min(startPos + CHUNK_SIZE * 2, data.length);
      const chunkData = data.slice(startPos, endPos);
      newChunks.push({ h: payloadHash, i, n: numChunks, d: chunkData });
      appendLog(
        `  🧩 Chunk ${i + 1}/${numChunks}: ${chunkData.length} hex chars`,
        "send"
      );
    }

    appendLog(
      `📝 Split payload ${payloadHash} into ${numChunks} chunks.`,
      "send"
    );

    setActivePayloads((prev) => {
      const newMap = new Map(prev).set(payloadHash, newChunks);
      appendLog(`📊 Active payloads: ${newMap.size} total`, "send");
      return newMap;
    });

    setAdvertisingQueue((prev) => {
      const newQueue = [...prev, ...newChunks];
      appendLog(`📋 Queue updated: ${newQueue.length} total chunks`, "send");
      return newQueue;
    });
  };

  const handleReceivedChunk = (chunk: Chunk) => {
    appendLog(`🎯 Processing received chunk: ${chunk.h}/${chunk.i}`, "receive");

    if (processedPayloadHashes.has(chunk.h)) {
      appendLog(`⏭️ Skipping already processed payload ${chunk.h}`, "receive");
      return;
    }

    if (!chunk.h || chunk.d === undefined) {
      appendLog(
        `❌ Invalid chunk data: hash=${chunk.h}, data=${chunk.d}`,
        "receive"
      );
      return;
    }

    const existingChunks = activePayloads.get(chunk.h) || [];
    appendLog(
      `📊 Existing chunks for ${chunk.h}: ${existingChunks.length}/${chunk.n}`,
      "receive"
    );

    if (existingChunks.some((c) => c.i === chunk.i)) {
      appendLog(
        `🔄 Duplicate chunk ${chunk.i} for payload ${chunk.h}`,
        "receive"
      );
      return;
    }

    appendLog(
      `👂 Received chunk ${chunk.i + 1}/${chunk.n} for payload ${chunk.h}`,
      "receive"
    );
    appendLog(`  📏 Chunk data length: ${chunk.d.length} hex chars`, "receive");

    const updatedChunks = [...existingChunks, chunk];
    setActivePayloads((prev) => {
      const newMap = new Map(prev).set(chunk.h, updatedChunks);
      appendLog(`📊 Updated active payloads: ${newMap.size} total`, "receive");
      return newMap;
    });

    // Also add received chunk to advertising queue to relay it
    setAdvertisingQueue((prev) => {
      // Avoid adding duplicates to the queue
      if (prev.some((c) => c.h === chunk.h && c.i === chunk.i)) {
        appendLog(
          `🔄 Chunk already in relay queue: ${chunk.h}/${chunk.i}`,
          "receive"
        );
        return prev;
      }
      const newQueue = [...prev, chunk];
      appendLog(
        `📡 Added chunk to relay queue: ${newQueue.length} total chunks`,
        "receive"
      );
      return newQueue;
    });

    if (updatedChunks.length === chunk.n) {
      appendLog(
        `🎉 All chunks received for payload ${chunk.h}! Assembling...`,
        "receive"
      );

      updatedChunks.sort((a, b) => a.i - b.i);
      const hexData = updatedChunks.map((c) => c.d).join("");
      appendLog(
        `🔗 Assembled hex data length: ${hexData.length} chars`,
        "receive"
      );

      const bytes = new Uint8Array(
        hexData.match(/.{2}/g)?.map((h) => parseInt(h, 16)) || []
      );
      appendLog(`📦 Converted to ${bytes.length} bytes`, "receive");

      const payloadData = new TextDecoder().decode(bytes);
      handleCompletePayload(payloadData, chunk.h);

      setProcessedPayloadHashes((prev) => {
        const newSet = new Set(prev).add(chunk.h);
        appendLog(
          `✅ Marked payload ${chunk.h} as processed (${newSet.size} total)`,
          "receive"
        );
        return newSet;
      });

      setActivePayloads((prev) => {
        const newMap = new Map(prev);
        newMap.delete(chunk.h);
        appendLog(
          `🧹 Removed completed payload from active list: ${newMap.size} remaining`,
          "receive"
        );
        return newMap;
      });

      setAdvertisingQueue((prev) => {
        const filtered = prev.filter((c) => c.h !== chunk.h);
        appendLog(
          `🧹 Removed completed payload chunks from queue: ${filtered.length} remaining`,
          "receive"
        );
        return filtered;
      });
    }
  };

  // --- BINARY PROTOCOL & BLE FUNCTIONS (These remain unchanged) ---
  // chunkToBinary, binaryToChunk, broadcastChunk, stopAdvertise, startScan, stopScan
  function chunkToBinary(chunk: Chunk): Uint8Array {
    appendLog(`🔄 Converting chunk to binary: ${chunk.h}/${chunk.i}`, "send");

    const dataBytes = chunk.d.length / 2;
    const totalSize = HEADER_SIZE + dataBytes;
    appendLog(
      `📏 Binary size: ${totalSize} bytes (${HEADER_SIZE} header + ${dataBytes} data)`,
      "send"
    );

    if (totalSize > 31) {
      appendLog(`❌ Binary chunk too large: ${totalSize} bytes`, "send");
      throw new Error(`Binary chunk too large: ${totalSize} bytes`);
    }

    const buffer = new Uint8Array(totalSize);
    let offset = 0;
    buffer[offset++] = PROTOCOL_VERSION;
    const hashBytes = new Uint8Array(
      chunk.h.match(/.{2}/g)?.map((h) => parseInt(h, 16)) || []
    );
    buffer.set(hashBytes, offset);
    offset += HASH_SIZE;
    buffer[offset++] = chunk.i;
    buffer[offset++] = chunk.n;
    const payloadBytes = new Uint8Array(
      chunk.d.match(/.{2}/g)?.map((h) => parseInt(h, 16)) || []
    );
    buffer.set(payloadBytes, offset);

    appendLog(`✅ Binary conversion complete: ${buffer.length} bytes`, "send");
    return buffer;
  }

  function binaryToChunk(buffer: Uint8Array): Chunk | null {
    appendLog(`🔍 Parsing binary data: ${buffer.length} bytes`, "receive");

    try {
      if (buffer.length < HEADER_SIZE) {
        appendLog(
          `❌ Buffer too small: ${buffer.length} < ${HEADER_SIZE}`,
          "receive"
        );
        return null;
      }

      let offset = 0;
      const version = buffer[offset++];
      if (version !== PROTOCOL_VERSION) {
        appendLog(
          `❌ Invalid protocol version: ${version} (expected ${PROTOCOL_VERSION})`,
          "receive"
        );
        return null;
      }

      const hashBytes = buffer.slice(offset, offset + HASH_SIZE);
      const hash = Array.from(hashBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      offset += HASH_SIZE;

      const index = buffer[offset++];
      const total = buffer[offset++];
      const payloadBytes = buffer.slice(offset);
      const data = Array.from(payloadBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      appendLog(
        `✅ Parsed chunk: ${hash}/${index} (${total} total, ${data.length} hex chars)`,
        "receive"
      );
      return { h: hash, i: index, n: total, d: data };
    } catch (e) {
      appendLog(`❌ Binary parsing error: ${e}`, "receive");
      return null;
    }
  }

  async function broadcastChunk(chunk: Chunk) {
    try {
      const binaryData = chunkToBinary(chunk);
      const payloadBytes = Array.from(binaryData);
      appendLog(
        `📡 Broadcasting ${payloadBytes.length} bytes for chunk ${chunk.h}/${chunk.i}`,
        "send"
      );

      const adv: any = BleAdvertiser;
      await adv.broadcast(NONET_SERVICE_UUID, payloadBytes, {
        connectable: false,
        includeDeviceName: false,
        includeTxPowerLevel: false,
      });
      appendLog(
        `✅ Broadcast complete for chunk ${chunk.h}/${chunk.i}`,
        "send"
      );
    } catch (err: any) {
      appendLog(
        `❌ Broadcast failed for chunk ${chunk.h}/${chunk.i}: ${err}`,
        "send"
      );
    }
  }

  function stopAdvertise() {
    appendLog("🛑 Stopping BLE advertising", "system");
    try {
      const adv: any = BleAdvertiser;
      if (adv.stopBroadcast) {
        adv.stopBroadcast();
        appendLog("✅ BLE advertising stopped", "system");
      }
    } catch (e) {
      appendLog(`❌ Error stopping advertising: ${e}`, "system");
    }
  }

  function startScan() {
    appendLog("🔎 Requesting permissions for BLE scan", "system");
    requestPermissionsOrFail().then((ok) => {
      if (!ok) {
        appendLog("❌ Permissions denied, cannot start scan", "system");
        return;
      }
      appendLog("🔎 Starting BLE device scan...", "system");
      const manager = managerRef.current;
      if (!manager) {
        appendLog("❌ BLE Manager not available", "system");
        return;
      }

      manager.startDeviceScan(
        [NONET_SERVICE_UUID],
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            appendLog(`❌ Scan error: ${error.message}`, "system");
            return;
          }

          if (!device) {
            appendLog("⚠️ Received null device in scan", "system");
            return;
          }

          const serviceData = (device as any).serviceData;
          if (serviceData && serviceData[NONET_SERVICE_UUID]) {
            appendLog(
              `📱 Device found: ${device.name || "Unknown"} (${device.id})`,
              "receive"
            );

            try {
              const decoded = base64.decode(serviceData[NONET_SERVICE_UUID]);
              const binaryData = new Uint8Array(
                Array.from(decoded, (c) => c.charCodeAt(0))
              );
              appendLog(
                `📦 Service data decoded: ${binaryData.length} bytes`,
                "receive"
              );

              const chunk = binaryToChunk(binaryData);
              if (chunk) {
                handleReceivedChunk(chunk);
              } else {
                appendLog(
                  "❌ Failed to parse chunk from service data",
                  "receive"
                );
              }
            } catch (e) {
              appendLog(`❌ Error processing service data: ${e}`, "receive");
            }
          }
        }
      );
      appendLog("✅ BLE scan started successfully", "system");
    });
  }

  function stopScan() {
    appendLog("🛑 Stopping BLE device scan", "system");
    managerRef.current?.stopDeviceScan();
    appendLog("✅ BLE scan stopped", "system");
  }

  // --- DUMMY DATA & STOP FUNCTION ---
  const createDummyPayload = () => {
    appendLog("🎭 Creating dummy test payload", "send");
    const dummyPayload = {
      type: "message",
      from: "alice",
      to: "bob",
      content: "This is a test message for the offline mesh network!",
      timestamp: Date.now(),
    };
    appendLog(
      `📝 Dummy payload created: ${Object.keys(dummyPayload).join(", ")}`,
      "send"
    );
    startBroadcastingPayload(dummyPayload);
  };

  const stopBroadcasting = () => {
    appendLog("🛑 User requested stop broadcast", "system");
    appendLog(
      `📊 Clearing ${advertisingQueue.length} chunks from queue`,
      "system"
    );
    setAdvertisingQueue([]);
    appendLog("✅ Broadcasting stopped and queue cleared", "system");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>NoNet Mesh Dashboard</Text>

      <View style={styles.splitScreenContainer}>
        {/* --- SENDING COLUMN --- */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Sending Activity</Text>
          <TouchableOpacity onPress={createDummyPayload} style={styles.button}>
            <Text style={styles.buttonText}>Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={stopBroadcasting}
            style={[styles.button, styles.stopButton]}
          >
            <Text style={styles.buttonText}>Stop All</Text>
          </TouchableOpacity>
          <FlatList
            style={styles.logContainer}
            data={logs.filter(
              (log) => log.type === "send" || log.type === "system"
            )}
            keyExtractor={(item) => item.id}
            inverted
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <Text style={styles.logText}>{item.text}</Text>
              </View>
            )}
          />
        </View>

        {/* --- RECEIVING COLUMN --- */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>Receiving Activity</Text>
          <FlatList
            style={styles.logContainer}
            data={logs.filter(
              (log) => log.type === "receive" || log.type === "system"
            )}
            keyExtractor={(item) => item.id}
            inverted
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <Text style={[styles.logText, styles.receiveLogText]}>
                  {item.text}
                </Text>
              </View>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f4f8" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    padding: 16,
    textAlign: "center",
    color: "#102a43",
  },
  splitScreenContainer: {
    flex: 1,
    flexDirection: "row",
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dbe2e8",
    borderRadius: 8,
    margin: 8,
    padding: 8,
    backgroundColor: "#fff",
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
    color: "#486581",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    elevation: 2,
  },
  stopButton: {
    backgroundColor: "#dc3545",
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 14 },
  logContainer: {
    flex: 1,
  },
  logItem: { paddingVertical: 5, borderBottomWidth: 1, borderColor: "#eee" },
  logText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#334e68",
  },
  receiveLogText: {
    color: "#0967d2",
  },
});
