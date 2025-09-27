import { Platform, PermissionsAndroid } from 'react-native';

export interface PermissionStatus {
  camera: boolean;
  bluetooth: boolean;
  allGranted: boolean;
}

/**
 * Request Bluetooth permissions (Android only)
 * Shows native permission dialogs directly
 */
export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    // iOS - Bluetooth permissions are handled automatically
    return true;
  }

  try {
    const androidVersion = Platform.Version as number;
    
    let bluetoothPermissions: string[] = [];
    
    if (androidVersion >= 31) {
      // Android 12+ requires new Bluetooth permissions
      bluetoothPermissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];
    } else {
      // Android 11 and below
      bluetoothPermissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
      ];
    }

    const bluetoothResults = await PermissionsAndroid.requestMultiple(bluetoothPermissions);
    
    // Check if all Bluetooth permissions were granted
    return Object.values(bluetoothResults).every(
      (result) => result === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.error('Error requesting Bluetooth permissions:', error);
    return false;
  }
};

/**
 * Check current permission status without requesting
 */
export const checkPermissionStatus = async (): Promise<PermissionStatus> => {
  const results: PermissionStatus = {
    camera: false,
    bluetooth: false,
    allGranted: false,
  };

  try {
    // Check camera permission
    const [cameraPermission] = useCameraPermissions();
    results.camera = cameraPermission?.granted || false;

    // Check Bluetooth permissions (Android)
    if (Platform.OS === 'android') {
      const bluetoothScan = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
      );
      
      results.bluetooth = bluetoothScan;
    } else {
      results.bluetooth = true; // iOS handles automatically
    }

    results.allGranted = results.camera && results.bluetooth;

    return results;
  } catch (error) {
    console.error('Error checking permission status:', error);
    return results;
  }
};

