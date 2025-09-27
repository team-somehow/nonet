import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export interface PermissionStatus {
  camera: boolean;
  bluetooth: boolean;
  allGranted: boolean;
}

/**
 * Request all necessary permissions for the app
 * This includes: Camera, Bluetooth (Android)
 */
export const requestAllPermissions = async (): Promise<PermissionStatus> => {
  const results: PermissionStatus = {
    camera: false,
    bluetooth: false,
    allGranted: false,
  };

  try {
    // 1. Request Camera Permission
    console.log('📷 Requesting camera permission...');
    const { status: cameraStatus } = await useCameraPermissions()[1]();
    results.camera = cameraStatus === 'granted';
    
    if (results.camera) {
      console.log('✅ Camera permission granted');
    } else {
      console.log('❌ Camera permission denied');
    }

    // 2. Request Bluetooth Permissions (Android only)
    if (Platform.OS === 'android') {
      console.log('📶 Requesting Bluetooth permissions...');
      
      // Check Android version for different permission requirements
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

      try {
        const bluetoothResults = await PermissionsAndroid.requestMultiple(bluetoothPermissions);
        
        // Check if all Bluetooth permissions were granted
        const bluetoothGranted = Object.values(bluetoothResults).every(
          (result) => result === PermissionsAndroid.RESULTS.GRANTED
        );
        
        results.bluetooth = bluetoothGranted;
        
        if (results.bluetooth) {
          console.log('✅ All Bluetooth permissions granted');
        } else {
          console.log('❌ Some Bluetooth permissions denied:', bluetoothResults);
        }
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        results.bluetooth = false;
      }
    } else {
      // iOS - Bluetooth permissions are handled automatically
      results.bluetooth = true;
      console.log('✅ iOS Bluetooth permissions handled automatically');
    }

    // Check if all permissions are granted
    results.allGranted = results.camera && results.bluetooth;

    console.log('📋 Permission Summary:', {
      camera: results.camera ? '✅' : '❌',
      bluetooth: results.bluetooth ? '✅' : '❌',
      allGranted: results.allGranted ? '✅' : '❌',
    });

    return results;
  } catch (error) {
    console.error('❌ Error requesting permissions:', error);
    return results;
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

/**
 * Show permission explanation dialog
 */
export const showPermissionExplanation = (): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'Permissions Required',
      'NoNet needs the following permissions to work properly:\n\n' +
      '📷 Camera - To scan QR codes for wallet addresses\n' +
      '📶 Bluetooth - To communicate with nearby devices\n\n' +
      'These permissions help create a secure, offline transaction network.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Grant Permissions',
          onPress: () => resolve(true),
        },
      ]
    );
  });
};

/**
 * Show permission denied dialog with options
 */
export const showPermissionDeniedDialog = (deniedPermissions: string[]): Promise<boolean> => {
  return new Promise((resolve) => {
    const permissionList = deniedPermissions.join(', ');
    
    Alert.alert(
      'Permissions Required',
      `The following permissions were denied: ${permissionList}\n\n` +
      'NoNet requires these permissions to function properly. ' +
      'You can grant them in your device settings or try again.',
      [
        {
          text: 'Skip for Now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Try Again',
          onPress: () => resolve(true),
        },
      ]
    );
  });
};
