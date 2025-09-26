import React, { JSX, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList, // Included to show logs (since your old component used it)
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundService from 'react-native-background-actions';
import base64 from "react-native-base64";
import { BleManager, Device } from "react-native-ble-plx";
import { PERMISSIONS, request, RESULTS } from "react-native-permissions"; // 🚨 NEW: Permission library

// --- CONSTANTS ---
const logNow = (...args: any[]) => console.log("[BLEPOC]", ...args);
type LogItem = { id: string; text: string };
let logCounter = 0;

const API_URL = 'https://ea2ea87b756d.ngrok-free.app/api/test-post';
const TASK_NAME = 'BLE_SCANNER_TASK';


// --- HELPER FUNCTIONS (API and Configuration) ---

async function sendApiPost(message) {
  try {
    const now = new Date().toISOString();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receivedMessage: message,
        timestamp: now
      }),
    });
    console.log(`[BG ACTION] API Success: ${response.ok}`);
  } catch (error) {
    console.error(`[BG ACTION] API Failed: ${error}`);
  }
}

// --- 1. THE CONTINUOUS BACKGROUND TASK ---
const bleScanTask = async (taskData) => {
  const manager = new BleManager();
  const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

  try {
    await new Promise(async (resolve) => {
      while (BackgroundService.isRunning()) {
        console.log("[BG ACTION] Service is awake. Starting 10s scan.");
        let isHelloReceived = false;

        manager.startDeviceScan(
          null,
          { allowDuplicates: true },
          async (error, device) => {
            if (error) {
              // This is the error line where the "not authorized" message originates
              console.error("[BLE/SCAN] Scan error in headless task:", error.message);
              // Handle the error gracefully without killing the loop instantly
              manager.stopDeviceScan();
              return;
            }
            if (!device || isHelloReceived) return;

            const md = (device as Device & any).manufacturerData;
            if (md) {
              try {
                const decoded = base64.decode(md);
                if (decoded.includes("HELLO")) {
                  isHelloReceived = true;
                  console.log(`[BG ACTION] HELLO received from ${device.id}.`);

                  await sendApiPost("HELLO");

                  manager.stopDeviceScan();
                }
              } catch (e) {
                console.error("[BG ACTION] Decode error:", (e as any)?.message);
              }
            }
          }
        );

        await sleep(10000); // Scan for 10 seconds
        manager.stopDeviceScan();

        await sleep(5000); // Pause for 5 seconds before next cycle
      }
      resolve();
    });
  } finally {
    manager.destroy();
  }
};


// RNBA Options (This is used to create the persistent notification)
const options = {
  taskName: TASK_NAME,
  taskTitle: 'Continuous BLE Monitoring',
  taskDesc: 'Scanning for HELLO signal in the background.',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  taskColor: '#00AA00',
  taskCritical: true,
  taskNotificationId: 1001,
  taskAllowStart: true,
  taskAllowRestart: true,
  taskAutoRestart: true,
  parameters: { delay: 0 },
};


// --------------------------------------------------------------------------
// 3. UI and Component Logic (COMPLETE)
// --------------------------------------------------------------------------
export default function App(): JSX.Element {
  const [mode, setMode] = useState<"idle" | "running">("idle");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const managerRef = useRef<BleManager | null>(null);

  // Initialize the BleManager (for foreground use/state management)
  useEffect(() => {
    managerRef.current = new BleManager();
    return () => {
      const m = managerRef.current;
      if (m) m.destroy();
    };
  }, []);

  const appendLog = (t: string) => {
    const item = { id: `${Date.now()}-${logCounter++}`, text: t };
    setLogs((p) => [item, ...p].slice(0, 200));
    logNow(t);
  };

  // 🚨 ADDED: Permission Request Function 🚨
  async function requestPermissionsOrFail(): Promise<boolean> {
    if (Platform.OS !== "android") return true;

    // NOTE: BLUETOOTH_ADVERTISE is necessary only if you were also advertising
    const perms = [
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION, // Needed for older Android
    ];
    const results: { p: string; r: string }[] = [];

    for (const p of perms) {
      try {
        // Use the request function from react-native-permissions
        const r = await request(p as any);
        results.push({ p, r });
      } catch (e) {
        results.push({ p, r: "error" });
      }
    }

    const failed = results.filter((x) => x.r !== RESULTS.GRANTED);
    if (failed.length) {
      appendLog("Permissions missing: " + JSON.stringify(failed));
      Alert.alert(
        "Permissions Required",
        "Bluetooth and Location permissions are necessary for background scanning."
      );
      return false;
    }
    appendLog("All required BLE permissions granted.");
    return true;
  }


  async function toggleBackgroundService() {
    if (await BackgroundService.isRunning()) {
      await BackgroundService.stop();
      setMode('idle');
      appendLog('Background service stopped.');
    } else {
      // 🚨 CRITICAL: Check permissions before attempting to start the native service 🚨
      const ok = await requestPermissionsOrFail();
      if (!ok) return;

      try {
        await BackgroundService.start(bleScanTask, options);
        setMode('running');
        appendLog('Background service started for continuous scanning.');
      } catch (e) {
        appendLog(`Failed to start background service: ${e}`);
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        BLE Mesh POC — Foreground Service (Android)
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
        <TouchableOpacity
          onPress={toggleBackgroundService}
          style={{
            backgroundColor: mode === "running" ? "#cc0000" : "#0044cc",
            padding: 12,
            borderRadius: 8,
            flex: 1,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {mode === "running" ? "Stop Background Scan" : "Start Continuous Scan"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ marginBottom: 8, fontWeight: "600" }}>Logs</Text>
      <FlatList
        style={{ flex: 1 }}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Text style={{ fontSize: 13 }}>{item.text}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}