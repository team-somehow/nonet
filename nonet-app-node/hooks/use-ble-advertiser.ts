import { useState } from 'react';
import { Alert } from 'react-native';
import BleAdvertiser from 'react-native-ble-advertiser';
import base64 from 'react-native-base64';
import { useBleContext } from '@/contexts/BleContext';

export function useBleAdvertiser() {
  const [isAdvertising, setIsAdvertising] = useState(false);
  const { appendLog, requestPermissionsOrFail } = useBleContext();

  async function startAdvertiseHello() {
    const ok = await requestPermissionsOrFail();
    if (!ok) return;

    const payloadText = 'HELLO';
    appendLog('Advertising payload: ' + payloadText);

    try {
      const adv: any = BleAdvertiser;
      const payloadBytes = new TextEncoder().encode(payloadText);
      const byteArray = Array.from(payloadBytes);
      const b64 = base64.encode(String.fromCharCode(...payloadBytes));

      appendLog(
        'BleAdvertiser methods: ' + Object.getOwnPropertyNames(adv).join(', ')
      );

      // setCompanyId if available
      try {
        if (adv && adv.setCompanyId) {
          adv.setCompanyId(0xffff);
          appendLog('setCompanyId(0xffff) called');
        }
      } catch (e: any) {
        appendLog('setCompanyId error: ' + (e?.message || e));
      }

      // Helper: try a call and return true on success
      const tryCall = async (desc: string, fn: () => any) => {
        appendLog(`Trying: ${desc}`);
        try {
          const res = fn();
          if (res && typeof res.then === 'function') await res;
          appendLog(`Success: ${desc}`);
          return true;
        } catch (err: any) {
          appendLog(`Failed: ${desc} -> ${err?.message ?? String(err)}`);
          return false;
        }
      };

      // Try various advertising methods
      if (adv && adv.startAdvertising) {
        const ok1 = await tryCall('startAdvertising(base64, options)', () =>
          adv.startAdvertising(b64, {
            manufacturerId: 0xffff,
            connectable: false,
          })
        );
        if (ok1) {
          setIsAdvertising(true);
          return;
        }
      }

      // Build a deterministic UUID-like string from payload bytes
      const hex = byteArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .padEnd(32, '0')
        .slice(0, 32);
      const uuidLike = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
      )}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

      if (adv && adv.broadcast) {
        const methods = [
          () =>
            adv.broadcast(uuidLike, byteArray, {
              connectable: false,
              includeDeviceName: false,
            }),
          () =>
            adv.broadcast([uuidLike], byteArray, {
              connectable: false,
              includeDeviceName: false,
            }),
          () => adv.broadcast(b64),
          () => adv.broadcast([], byteArray, { connectable: false }),
        ];

        for (let i = 0; i < methods.length; i++) {
          const success = await tryCall(
            `broadcast method ${i + 1}`,
            methods[i]
          );
          if (success) {
            setIsAdvertising(true);
            return;
          }
        }
      }

      if (adv && adv.broadcastChunk) {
        const ok6 = await tryCall('broadcastChunk(byteArray)', () =>
          adv.broadcastChunk(byteArray)
        );
        if (ok6) {
          setIsAdvertising(true);
          return;
        }
      }

      if (adv && adv.start) {
        const ok7 = await tryCall('start(base64)', () => adv.start(b64));
        if (ok7) {
          setIsAdvertising(true);
          return;
        }
      }

      appendLog(
        'All advertise attempts failed. See above logs for native errors.'
      );
      Alert.alert(
        'Advertise failed',
        'All advertise attempts failed — check logs for details.'
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
    setIsAdvertising(false);
  }

  return {
    isAdvertising,
    startAdvertiseHello,
    stopAdvertise,
  };
}
