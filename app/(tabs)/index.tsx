import React, { JSX, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BackgroundFetch from 'react-native-background-fetch';
import base64 from "react-native-base64";
import BleAdvertiser from "react-native-ble-advertiser";
import { BleManager, Device } from "react-native-ble-plx";
import { PERMISSIONS, request, RESULTS } from "react-native-permissions";
const SCHEDULED_TASK_ID = 'com.yourcompany.short-task';
const logNow = (...args: any[]) => console.log("[BLEPOC]", ...args);

type LogItem = { id: string; text: string };

let logCounter = 0; // Add a counter to ensure unique keys
const API_URL = 'https://ea2ea87b756d.ngrok-free.app/api/test-post';

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
    if (response.ok) {
      console.log(`[BLE/API] Success: Sent '${message}' to server.`);
    } else {
      console.error(`[BLE/API] Failed: Server returned status ${response.status}`);
    }
  } catch (error) {
    console.error(`[BLE/API] Failed to reach server: ${error}`);
  }
}

export default function App(): JSX.Element {


  const myHeadlessTask = async (taskId) => {
    const now = new Date(Date.now()).toISOString();
    console.log(`[BackgroundFetch] Task ID: ${taskId} starting BLE scan at: ${now}`);

    const manager = new BleManager(); // Initialize manager inside the task
    let scanTimeout = null;

    try {
      // --- START SHORT SCAN ---
      scanTimeout = setTimeout(() => {
        manager.stopDeviceScan();
        console.log(`[BLE/SCAN] Scan timed out (5s).`);
        BackgroundFetch.finish(taskId); // Finish the task if scan times out
      }, 5000); // Only scan for 5 seconds to stay within the task time limit

      manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        async (error, device) => {
          if (error) {
            console.error("[BLE/SCAN] Scan error in headless task:", error.message);
            manager.stopDeviceScan();
            clearTimeout(scanTimeout);
            BackgroundFetch.finish(taskId);
            return;
          }
          if (!device) return;

          const md = (device as Device & any).manufacturerData;
          if (md) {
            try {
              const decoded = base64.decode(md);
              if (decoded.includes("HELLO")) {
                console.log(`[BLE/SCAN] HELLO received from ${device.id}.`);

                // 1. Process the HELLO message
                await sendApiPost("HELLO");

                // 2. Stop the current task and cleanup
                manager.stopDeviceScan();
                clearTimeout(scanTimeout);

                // 3. Signal completion
                BackgroundFetch.finish(taskId);
              }
            } catch (e) {
              console.error("[BLE/SCAN] Decode error:", (e as any)?.message);
            }
          }
        }
      );

    } catch (error) {
      console.error('[BackgroundFetch] Task failed:', error);
    }

    // NOTE: finish(taskId) is called inside the scan callback OR the timeout.
    // We do NOT call it here, as we need the scan to run first.
  };

  BackgroundFetch.registerHeadlessTask(myHeadlessTask);



  useEffect(() => {
    async function initBackgroundFetch() {
      try {
        const status = await BackgroundFetch.configure(
          {
            stopOnTerminate: false,
            startOnBoot: true,
            requiredNetworkType: BackgroundFetch.NETWORK_TYPE_CELLULAR,
            enableHeadless: true,
          },
          // Pass a dummy function for the default fetch event to prevent unexpected crashes
          async (taskId) => {
            console.log(`[BG] Default fetch task running (${taskId}).`);
            // Immediately finish the default task
            BackgroundFetch.finish(taskId);
          },
          (taskId) => { // Timeout callback
            console.warn(`[BG] Default task timed out: ${taskId}`);
            BackgroundFetch.finish(taskId);
          }
        );

        console.log('[BackgroundFetch] Configuration Status:', status);


        try {
          // 🚨 Schedule the custom, frequent task to trigger the scanning
          await BackgroundFetch.scheduleTask({
            taskId: SCHEDULED_TASK_ID,
            delay: 60000, // 1 minute
            periodic: true,
            forceAlarmManager: true, // For frequent Android runs
          });
          console.log('[BackgroundFetch] Custom 1-minute scan task scheduled.');
          myHeadlessTask('initial-start'); // Optional: start an initial scan immediately
        } catch (e) {
          console.warn('[BackgroundFetch] Custom task scheduling failed:', e);
        }

        return status;
      } catch (error) {
        console.error('Failed to configure background fetch:', error);
        return BackgroundFetch.STATUS_DENIED;
      }
    }
    initBackgroundFetch();
  }, []);

  const [mode, setMode] = useState<"idle" | "advertising" | "scanning">("idle");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    managerRef.current = new BleManager();
    if (Platform.OS === "android") {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        logNow("advertiser init error", e);
      }
    }

    return () => {
      stopScan();
      stopAdvertise();
      const m = managerRef.current;
      if (m) m.destroy();
    };
  }, []);

  const appendLog = (t: string) => {
    const item = { id: `${Date.now()}-${logCounter++}`, text: t }; // Use timestamp + counter for unique keys
    setLogs((p) => [item, ...p].slice(0, 200));
    logNow(t);
  };

  async function requestPermissionsOrFail(): Promise<boolean> {
    if (Platform.OS !== "android") return true;
    const perms = [
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
      PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    ];
    const results: { p: string; r: string }[] = [];

    for (const p of perms) {
      try {
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
        "Permissions required",
        "Please grant BLE permissions in system settings for this app to work."
      );
      return false;
    }
    appendLog("All BLE permissions granted");
    return true;
  }

  // Advertise helpers
  async function startAdvertiseHello() {
    const ok = await requestPermissionsOrFail();
    if (!ok) return;

    const payloadText = "abadaba";
    appendLog("Advertising payload: " + payloadText);

    try {
      const adv: any = BleAdvertiser;
      const payloadBytes = new TextEncoder().encode(payloadText); // Uint8Array
      const byteArray = Array.from(payloadBytes); // [72,69,76,76,79]
      const b64 = base64.encode(String.fromCharCode(...payloadBytes));

      appendLog(
        "BleAdvertiser methods: " + Object.getOwnPropertyNames(adv).join(", ")
      );

      // setCompanyId if available (some versions require this)
      try {
        if (adv && adv.setCompanyId) {
          adv.setCompanyId(0xffff);
          appendLog("setCompanyId(0xffff) called");
        }
      } catch (e: any) {
        appendLog("setCompanyId error: " + (e?.message || e));
      }

      // Helper: try a call and return true on success
      const tryCall = async (desc: string, fn: () => any) => {
        appendLog(`Trying: ${desc}`);
        try {
          const res = fn();
          // handle promise-returning native methods
          if (res && typeof res.then === "function") await res;
          appendLog(`Success: ${desc}`);
          return true;
        } catch (err: any) {
          appendLog(`Failed: ${desc} -> ${err?.message ?? String(err)}`);
          return false;
        }
      };

      // 1) Preferred: startAdvertising(base64, options)
      if (adv && adv.startAdvertising) {
        const ok1 = await tryCall("startAdvertising(base64, options)", () =>
          adv.startAdvertising(b64, {
            manufacturerId: 0xffff,
            connectable: false,
          })
        );
        if (ok1) {
          setMode("advertising");
          return;
        }
      }

      // Build a deterministic UUID-like string from payload bytes (safe fallback)
      const hex = byteArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .padEnd(32, "0")
        .slice(0, 32);
      const uuidLike = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
      )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

      // 2) Try broadcast with string UUID as first arg: broadcast(uuidString, [bytes], options)
      if (adv && adv.broadcast) {
        const ok2 = await tryCall(
          "broadcast(uuidString, byteArray, options)",
          () =>
            adv.broadcast(uuidLike, byteArray, {
              connectable: false,
              includeDeviceName: false,
            })
        );
        if (ok2) {
          setMode("advertising");
          return;
        }

        // 3) Try broadcast with array-first signature (README style): broadcast([uuid], [bytes], options)
        const ok3 = await tryCall("broadcast([uuid], byteArray, options)", () =>
          adv.broadcast([uuidLike], byteArray, {
            connectable: false,
            includeDeviceName: false,
          })
        );
        if (ok3) {
          setMode("advertising");
          return;
        }

        // 4) Try broadcast with base64 single-arg (some versions accept base64 string)
        const ok4 = await tryCall("broadcast(base64String)", () =>
          adv.broadcast(b64)
        );
        if (ok4) {
          setMode("advertising");
          return;
        }

        // 5) Try broadcast([], byteArray, options) (some docs/examples)
        const ok5 = await tryCall("broadcast([], byteArray, options)", () =>
          adv.broadcast([], byteArray, { connectable: false })
        );
        if (ok5) {
          setMode("advertising");
          return;
        }
      }

      // 6) Try broadcastChunk if available (raw bytes)
      if (adv && adv.broadcastChunk) {
        const ok6 = await tryCall("broadcastChunk(byteArray)", () =>
          adv.broadcastChunk(byteArray)
        );
        if (ok6) {
          setMode("advertising");
          return;
        }
      }

      // 7) Fallback: start(base64)
      if (adv && adv.start) {
        const ok7 = await tryCall("start(base64)", () => adv.start(b64));
        if (ok7) {
          setMode("advertising");
          return;
        }
      }

      // nothing succeeded
      appendLog(
        "All advertise attempts failed. See above logs for native errors."
      );
      Alert.alert(
        "Advertise failed",
        "All advertise attempts failed — check logs for details."
      );
    } catch (e: any) {
      appendLog("Advertise error: " + (e?.message || e));
      console.error(e);
    }
  }

  function stopAdvertise() {
    try {
      const adv: any = BleAdvertiser;
      if (adv.stopBroadcast) adv.stopBroadcast();
      else if (adv.stopAdvertising) adv.stopAdvertising();
      else if (adv.stop) adv.stop();
    } catch (e) {
      // ignore
    }
    appendLog("Stopped advertising");
    setMode("idle");
  }

  // Scanning
  function startScan() {
    requestPermissionsOrFail().then((ok) => {
      if (!ok) return;
      appendLog("Start scanning...");
      const manager = managerRef.current;
      if (!manager) {
        appendLog("Ble manager not initialized");
        return;
      }
      stopScan();
      manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            appendLog("Scan error: " + error.message);
            return;
          }
          if (!device) return;

          // manufacturerData is base64 string when present
          const md = (device as Device & any).manufacturerData;
          if (md) {
            try {
              const decoded = base64.decode(md);
              appendLog(
                `Received manuf adv from ${device.id}: "${decoded}" rssi=${device.rssi}`
              );
              if (decoded.includes("HELLO")) {
                appendLog("HELLO received — stopping scan");
                stopScan();
              }
            } catch (e) {
              appendLog("Decode error: " + (e as any)?.message);
            }
          } else if (device.localName) {
            appendLog(
              `Found device localName=${device.localName} id=${device.id}`
            );
          } else {
            appendLog(`Found device id=${device.id} rssi=${device.rssi}`);
          }
        }
      );

      setMode("scanning");
    });
  }

  function stopScan() {
    try {
      const mgr = managerRef.current;
      if (mgr) mgr.stopDeviceScan();
    } catch { }
    appendLog("Stopped scan");
    setMode("idle");
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        BLE Mesh POC — Expo (Android) — HELLO
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (mode === "advertising") stopAdvertise();
            else startAdvertiseHello();
          }}
          style={{
            backgroundColor: mode === "advertising" ? "#cc0000" : "#00aa00",
            padding: 12,
            borderRadius: 8,
            flex: 1,
            marginRight: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {mode === "advertising" ? "Stop Advertising" : "Advertise HELLO"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (mode === "scanning") stopScan();
            else startScan();
          }}
          style={{
            backgroundColor: mode === "scanning" ? "#cc0000" : "#0044cc",
            padding: 12,
            borderRadius: 8,
            flex: 1,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {mode === "scanning" ? "Stop Scanning" : "Scan"}
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