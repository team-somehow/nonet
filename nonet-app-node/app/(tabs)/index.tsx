import React, { JSX, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { BleManager, Device } from "react-native-ble-plx";
import BleAdvertiser from "react-native-ble-advertiser";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import base64 from "react-native-base64";

const logNow = (...args: any[]) => console.log("[BLEPOC]", ...args);

type LogItem = { id: string; text: string };

let logCounter = 0; // Add a counter to ensure unique keys

export default function App(): JSX.Element {
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
    const results: Array<{ p: string; r: string }> = [];

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

    const payloadText = "HELLO";
    appendLog("Advertising payload: " + payloadText);

    try {
      const payloadBytes = new TextEncoder().encode(payloadText);
      let b64: string;
      try {
        b64 = (base64 as any).encodeFromByteArray
          ? (base64 as any).encodeFromByteArray(payloadBytes)
          : base64.encode(String.fromCharCode(...payloadBytes));
      } catch (e) {
        b64 = base64.encode(String.fromCharCode(...payloadBytes));
      }

      // Support multiple API names across versions
      const adv: any = BleAdvertiser;
      if (adv && adv.broadcast) {
        // Convert base64 string to byte array for the broadcast method
        const byteArray = Array.from(payloadBytes);
        adv.broadcast(
          byteArray,
          {
            advertisedServiceUuid: null,
            manufacturerId: 0xffff,
            connectable: false,
          },
          0
        );
      } else if (adv && adv.startAdvertising) {
        adv.startAdvertising(b64, {
          manufacturerId: 0xffff,
          connectable: false,
        });
      } else if (adv && adv.start) {
        adv.start(b64);
      } else {
        appendLog(
          "No known BleAdvertiser method found. Inspect library version."
        );
        Alert.alert(
          "Advertiser missing",
          "BleAdvertiser API not available in this build."
        );
        return;
      }

      appendLog("Started advertising HELLO (check other device)");
      setMode("advertising");
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
    } catch {}
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
