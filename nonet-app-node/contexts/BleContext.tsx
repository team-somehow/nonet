import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Platform, Alert } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import BleAdvertiser from 'react-native-ble-advertiser';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export type LogItem = { id: string; text: string };

interface BleContextType {
  logs: LogItem[];
  appendLog: (text: string) => void;
  clearLogs: () => void;
  managerRef: React.MutableRefObject<BleManager | null>;
  requestPermissionsOrFail: () => Promise<boolean>;
}

const BleContext = createContext<BleContextType | null>(null);

let logCounter = 0;

export function BleProvider({ children }: { children: React.ReactNode }) {
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
        console.log('[BLEPOC] advertiser init error', e);
      }
    }

    return () => {
      const m = managerRef.current;
      if (m) {
        try {
          m.stopDeviceScan();
        } catch {}
        m.destroy();
      }
    };
  }, []);

  const appendLog = (t: string) => {
    const item = { id: `${Date.now()}-${logCounter++}`, text: t };
    setLogs((p) => [item, ...p].slice(0, 200));
    console.log('[BLEPOC]', t);
  };

  const clearLogs = () => {
    setLogs([]);
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

  const value: BleContextType = {
    logs,
    appendLog,
    clearLogs,
    managerRef,
    requestPermissionsOrFail,
  };

  return <BleContext.Provider value={value}>{children}</BleContext.Provider>;
}

export function useBleContext() {
  const context = useContext(BleContext);
  if (!context) {
    throw new Error('useBleContext must be used within a BleProvider');
  }
  return context;
}
