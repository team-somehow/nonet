import React, { JSX, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import BleAdvertiser from 'react-native-ble-advertiser';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import base64 from 'react-native-base64';

const logNow = (...args: any[]) => console.log('[BLEPOC]', ...args);

// Hardcoded BLE Service and Characteristic UUIDs
const NONET_SERVICE_UUID = '12345678-1234-5678-9abc-123456789012';
const NONET_CHARACTERISTIC_UUID = '87654321-4321-8765-cba9-210987654321';

type LogItem = { id: string; text: string };

let logCounter = 0; // Add a counter to ensure unique keys

export default function Test(): JSX.Element {
  const [mode, setMode] = useState<'idle' | 'advertising' | 'scanning'>('idle');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const managerRef = useRef<BleManager | null>(null);

  useEffect(() => {
    managerRef.current = new BleManager();
    if (Platform.OS === 'android') {
      try {
        if (BleAdvertiser && (BleAdvertiser as any).setCompanyId) {
          (BleAdvertiser as any).setCompanyId(0xffff);
        }
      } catch (e) {
        logNow('advertiser init error', e);
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
    if (Platform.OS !== 'android') return true;
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
        results.push({ p, r: 'error' });
      }
    }
    const failed = results.filter((x) => x.r !== RESULTS.GRANTED);
    if (failed.length) {
      appendLog('Permissions missing: ' + JSON.stringify(failed));
      Alert.alert(
        'Permissions required',
        'Please grant BLE permissions in system settings for this app to work.'
      );
      return false;
    }
    appendLog('All BLE permissions granted');
    return true;
  }

  // Advertise helpers
  async function startAdvertiseHello() {
    const ok = await requestPermissionsOrFail();
    if (!ok) return;

    const payloadText = 'abadaba';
    appendLog('Advertising payload: ' + payloadText);

    try {
      const adv: any = BleAdvertiser;
      const payloadBytes = new TextEncoder().encode(payloadText); // Uint8Array
      const byteArray = Array.from(payloadBytes); // [72,69,76,76,79]
      const b64 = base64.encode(String.fromCharCode(...payloadBytes));

      appendLog(
        'BleAdvertiser methods: ' + Object.getOwnPropertyNames(adv).join(', ')
      );

      // setCompanyId if available (some versions require this)
      try {
        if (adv && adv.setCompanyId) {
          adv.setCompanyId(0xffff);
          appendLog('setCompanyId(0xffff) called');
        }
      } catch (e: any) {
        appendLog('setCompanyId error: ' + (e?.message || e));
      }

      // Use the working method: broadcast with service UUID
      if (adv && adv.broadcast) {
        appendLog(
          `Starting broadcast with service UUID: ${NONET_SERVICE_UUID}`
        );
        appendLog(`Payload: ${payloadText}`);

        try {
          await adv.broadcast(NONET_SERVICE_UUID, byteArray, {
            connectable: false,
            includeDeviceName: false,
            includeTxPowerLevel: false,
          });
          appendLog('🎉 Broadcasting successfully started with service UUID!');
          setMode('advertising');
          return;
        } catch (err: any) {
          appendLog(`Broadcast failed: ${err?.message ?? String(err)}`);
          Alert.alert('Advertise failed', 'Could not start BLE advertising.');
          return;
        }
      }

      // BleAdvertiser not available or broadcast method missing
      appendLog('BleAdvertiser.broadcast method not available');
      Alert.alert(
        'Advertise failed',
        'BLE advertising is not supported on this device.'
      );
    } catch (e: any) {
      appendLog('Advertise error: ' + (e?.message || e));
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
    appendLog('Stopped advertising');
    setMode('idle');
  }

  // Scanning
  function startScan() {
    requestPermissionsOrFail().then((ok) => {
      if (!ok) return;
      appendLog(`Start scanning for service UUID: ${NONET_SERVICE_UUID}`);
      const manager = managerRef.current;
      if (!manager) {
        appendLog('Ble manager not initialized');
        return;
      }
      stopScan();

      // Filter by our specific service UUID
      manager.startDeviceScan(
        [NONET_SERVICE_UUID],
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            appendLog('Scan error: ' + error.message);
            return;
          }
          if (!device) return;

          appendLog(`Found NoNet device: ${device.id} rssi=${device.rssi}`);

          // Check if device has our service
          if (
            device.serviceUUIDs &&
            device.serviceUUIDs.includes(NONET_SERVICE_UUID)
          ) {
            appendLog(`✅ Device ${device.id} has NoNet service!`);

            // Try to read the characteristic data
            if (device.isConnectable) {
              appendLog(`Attempting to connect to ${device.id}...`);
              connectAndReadCharacteristic(device);
            } else {
              appendLog(
                `Device ${device.id} is not connectable, checking advertisement data`
              );
              // Check advertisement data for our payload
              checkAdvertisementData(device);
            }
          } else {
            appendLog(
              `Device ${device.id} found but doesn't advertise our service`
            );
          }
        }
      );

      setMode('scanning');
    });
  }

  // Helper function to connect and read characteristic
  async function connectAndReadCharacteristic(device: Device) {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      appendLog(`Connecting to ${device.id}...`);
      const connectedDevice = await manager.connectToDevice(device.id);
      appendLog(`Connected! Discovering services...`);

      const deviceWithServices =
        await connectedDevice.discoverAllServicesAndCharacteristics();
      appendLog(`Services discovered, reading characteristic...`);

      const characteristic =
        await deviceWithServices.readCharacteristicForService(
          NONET_SERVICE_UUID,
          NONET_CHARACTERISTIC_UUID
        );

      if (characteristic.value) {
        const decoded = base64.decode(characteristic.value);
        appendLog(`📡 Characteristic data received: "${decoded}"`);

        if (decoded.includes('abadaba')) {
          appendLog('🎉 HELLO received via characteristic — stopping scan');
          stopScan();
        }
      }

      // Disconnect after reading
      await connectedDevice.cancelConnection();
      appendLog(`Disconnected from ${device.id}`);
    } catch (error: any) {
      appendLog(`Connection/read error: ${error?.message || error}`);
    }
  }

  // Helper function to check advertisement data
  function checkAdvertisementData(device: Device) {
    // Check service data for our service UUID
    const serviceData = (device as any).serviceData;
    if (serviceData && serviceData[NONET_SERVICE_UUID]) {
      try {
        const decoded = base64.decode(serviceData[NONET_SERVICE_UUID]);
        appendLog(`📡 Service data received: "${decoded}"`);

        if (decoded.includes('abadaba')) {
          appendLog('🎉 HELLO received via service data — stopping scan');
          stopScan();
        }
      } catch (e) {
        appendLog('Service data decode error: ' + (e as any)?.message);
      }
    }

    // Fallback: check manufacturer data
    const md = (device as Device & any).manufacturerData;
    if (md) {
      try {
        const decoded = base64.decode(md);
        appendLog(`📡 Manufacturer data: "${decoded}"`);

        if (decoded.includes('abadaba')) {
          appendLog('🎉 HELLO received via manufacturer data — stopping scan');
          stopScan();
        }
      } catch (e) {
        appendLog('Manufacturer data decode error: ' + (e as any)?.message);
      }
    }
  }

  function stopScan() {
    try {
      const mgr = managerRef.current;
      if (mgr) mgr.stopDeviceScan();
    } catch {}
    appendLog('Stopped scan');
    setMode('idle');
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>
        BLE Mesh POC — Expo (Android) — HELLO
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (mode === 'advertising') stopAdvertise();
            else startAdvertiseHello();
          }}
          style={{
            backgroundColor: mode === 'advertising' ? '#cc0000' : '#00aa00',
            padding: 12,
            borderRadius: 8,
            flex: 1,
            marginRight: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>
            {mode === 'advertising' ? 'Stop Advertising' : 'Advertise HELLO'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (mode === 'scanning') stopScan();
            else startScan();
          }}
          style={{
            backgroundColor: mode === 'scanning' ? '#cc0000' : '#0044cc',
            padding: 12,
            borderRadius: 8,
            flex: 1,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>
            {mode === 'scanning' ? 'Stop Scanning' : 'Scan'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ marginBottom: 8, fontWeight: '600' }}>Logs</Text>
      <FlatList
        style={{ flex: 1 }}
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderColor: '#eee',
            }}
          >
            <Text style={{ fontSize: 13 }}>{item.text}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
