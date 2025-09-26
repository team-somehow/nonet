import { useState } from 'react';
import { Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { useBleContext } from '@/contexts/BleContext';

export function useBleScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const { appendLog, managerRef, requestPermissionsOrFail } = useBleContext();

  function startScan() {
    requestPermissionsOrFail().then((ok) => {
      if (!ok) return;
      appendLog('Start scanning...');
      const manager = managerRef.current;
      if (!manager) {
        appendLog('Ble manager not initialized');
        return;
      }

      stopScan(); // Stop any existing scan

      manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            appendLog('Scan error: ' + error.message);
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
              if (decoded.includes('HELLO')) {
                appendLog('HELLO received — stopping scan');
                stopScan();
              }
            } catch (e) {
              appendLog('Decode error: ' + (e as any)?.message);
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

      setIsScanning(true);
    });
  }

  function stopScan() {
    try {
      const mgr = managerRef.current;
      if (mgr) mgr.stopDeviceScan();
    } catch {}
    appendLog('Stopped scan');
    setIsScanning(false);
  }

  return {
    isScanning,
    startScan,
    stopScan,
  };
}
