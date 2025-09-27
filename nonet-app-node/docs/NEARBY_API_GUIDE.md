# Google Nearby API Integration Guide

## Overview

The Google Nearby Connections API allows Android devices to discover and connect to each other using Bluetooth, Wi-Fi, and other local connectivity technologies. This implementation provides a complete solution for peer-to-peer communication without internet connectivity.

## Features Implemented

### ✅ **Core Functionality**
- **Device Discovery**: Find nearby devices advertising their services
- **Device Advertising**: Make your device discoverable to others
- **Connection Management**: Connect/disconnect from discovered devices
- **Message Exchange**: Send and receive text messages between connected devices
- **Connection Negotiation**: Accept/reject incoming connection requests

### ✅ **UI Components**
- **Real-time Discovery**: Live list of discovered devices with connection status
- **Connection Controls**: Toggle switches for advertising and discovery
- **Message Interface**: Chat-like interface for sending/receiving messages
- **Connection Dialogs**: Modal dialogs for connection approval/rejection
- **Error Handling**: User-friendly error messages and status indicators

## Architecture

### Context Provider (`NearbyContext.tsx`)
The `NearbyProvider` manages all Google Nearby API interactions and provides:

```typescript
interface NearbyContextType {
  // Connection state
  isAdvertising: boolean;
  isDiscovering: boolean;
  discoveredEndpoints: DiscoveredEndpoint[];
  connectedEndpoints: DiscoveredEndpoint[];
  messages: ReceivedMessage[];
  
  // Connection methods
  startAdvertising: (endpointName: string, serviceId: string) => Promise<void>;
  stopAdvertising: (serviceId: string) => Promise<void>;
  startDiscovering: (serviceId: string) => Promise<void>;
  stopDiscovering: (serviceId: string) => Promise<void>;
  
  // Endpoint management
  connectToEndpoint: (serviceId: string, endpointId: string) => Promise<void>;
  disconnectFromEndpoint: (serviceId: string, endpointId: string) => Promise<void>;
  acceptConnection: (serviceId: string, endpointId: string) => Promise<void>;
  rejectConnection: (serviceId: string, endpointId: string) => Promise<void>;
  
  // Messaging
  sendMessage: (serviceId: string, endpointId: string, message: string) => Promise<void>;
  clearMessages: () => void;
}
```

### UI Component (`nearby.tsx`)
The Nearby tab provides a comprehensive interface for:
- **Connection Controls**: Toggle advertising and discovery
- **Device List**: View discovered devices and their connection status
- **Messaging**: Send/receive messages with connected devices
- **Connection Management**: Handle incoming connection requests

## Usage Guide

### 1. **Basic Setup**
The Nearby API is automatically available in the app through the `useNearby` hook:

```typescript
import { useNearby } from '@/contexts/NearbyContext';

const {
  startAdvertising,
  startDiscovering,
  connectToEndpoint,
  sendMessage
} = useNearby();
```

### 2. **Making Device Discoverable**
```typescript
// Start advertising your device
await startAdvertising('My Device Name', 'com.nonetapp.nearby');

// Stop advertising
await stopAdvertising('com.nonetapp.nearby');
```

### 3. **Discovering Other Devices**
```typescript
// Start discovering nearby devices
await startDiscovering('com.nonetapp.nearby');

// Access discovered devices
const { discoveredEndpoints } = useNearby();
```

### 4. **Connecting to Devices**
```typescript
// Connect to a discovered endpoint
await connectToEndpoint('com.nonetapp.nearby', endpointId);

// Handle connection requests (in event listeners)
await acceptConnection('com.nonetapp.nearby', endpointId);
// or
await rejectConnection('com.nonetapp.nearby', endpointId);
```

### 5. **Sending Messages**
```typescript
// Send a message to a connected endpoint
await sendMessage('com.nonetapp.nearby', endpointId, 'Hello, World!');

// Access message history
const { messages } = useNearby();
```

## Configuration

### Android Configuration
The following Android configurations have been automatically applied:

#### **build.gradle (Project)**
```gradle
dependencies {
    classpath('com.android.tools.build:gradle:8.0.2')
    classpath('com.google.gms:google-services:4.3.15')
}

allprojects {
    repositories {
        maven { url "https://maven.google.com" }
    }
}
```

#### **build.gradle (App)**
```gradle
apply plugin: "com.google.gms.google-services"

android {
    defaultConfig {
        minSdkVersion Math.max(rootProject.ext.minSdkVersion, 16)
        multiDexEnabled true
    }
}

dependencies {
    implementation('com.google.android.gms:play-services-nearby:19.0.0')
    implementation('com.android.support:appcompat-v7:28.0.0')
    implementation('com.android.support:multidex:1.0.3')
    implementation(project(':react-native-google-nearby-connection'))
}
```

#### **settings.gradle**
```gradle
include ':react-native-google-nearby-connection'
project(':react-native-google-nearby-connection').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-google-nearby-connection/android')
```

#### **MainApplication.kt**
```kotlin
import com.butchmarshall.reactnative.google.nearby.connection.NearbyConnectionPackage

override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(NearbyConnectionPackage())
    }
```

### Permissions
The following permissions are required and have been added to `AndroidManifest.xml`:

```xml
<!-- Location permissions (required for device discovery) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

<!-- Network permissions -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>

<!-- Bluetooth permissions -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>

<!-- Additional permissions -->
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>

<!-- Hardware features -->
<uses-feature android:name="android.hardware.bluetooth" android:required="false"/>
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false"/>
<uses-feature android:name="android.hardware.wifi" android:required="false"/>
```

## Event Handling

The context automatically handles all Google Nearby API events:

### Discovery Events
- `onDiscoveryStarting` / `onDiscoveryStarted` / `onDiscoveryStartFailed`
- `onEndpointDiscovered` / `onEndpointLost`

### Advertising Events
- `onAdvertisingStarting` / `onAdvertisingStarted` / `onAdvertisingStartFailed`

### Connection Events
- `onConnectionInitiatedToEndpoint`
- `onConnectedToEndpoint` / `onEndpointConnectionFailed`
- `onDisconnectedFromEndpoint`

### Payload Events
- `onReceivePayload` / `onPayloadUpdate`
- `onSendPayloadFailed`

## Testing

### Prerequisites
1. **Physical Devices**: The Nearby API requires physical Android devices (does not work in emulators)
2. **Location Services**: Enable location services on both devices
3. **Permissions**: Grant all required permissions when prompted
4. **Proximity**: Devices should be within Bluetooth/Wi-Fi range (typically 10-100 meters)

### Test Scenarios
1. **Basic Discovery**: Start advertising on one device, discovery on another
2. **Connection**: Connect devices and verify connection status
3. **Messaging**: Send messages between connected devices
4. **Disconnection**: Test graceful disconnection and reconnection
5. **Error Handling**: Test with permissions disabled, devices out of range, etc.

## Troubleshooting

### Common Issues

#### **Discovery Not Working**
- Ensure location permissions are granted
- Check that location services are enabled
- Verify both devices are using the same service ID
- Try restarting Bluetooth/Wi-Fi

#### **Connection Failures**
- Check that both devices have granted all required permissions
- Ensure devices are within range
- Verify the authentication token matches on both devices
- Try restarting the app or clearing app data

#### **Messages Not Received**
- Confirm devices are properly connected (not just discovered)
- Check that payload events are being handled correctly
- Verify the message format is compatible

#### **Build Errors**
- Ensure all Gradle configurations are correct
- Check that Google Play Services are installed on the device
- Verify the google-services.json file is in the correct location
- Clean and rebuild the project

### Debug Logs
The implementation includes comprehensive logging. Check the console for:
- 🔧 Setup messages
- 🔍 Discovery events
- 📢 Advertising events
- 🤝 Connection events
- 💬 Message events
- ❌ Error messages

## Limitations

1. **Android Only**: Currently only supports Android (iOS support would require additional implementation)
2. **Physical Devices**: Does not work in emulators
3. **Range**: Limited by Bluetooth/Wi-Fi range
4. **Permissions**: Requires multiple sensitive permissions
5. **Battery**: May impact battery life when actively discovering/advertising

## Future Enhancements

- **File Transfer**: Support for sending files between devices
- **Audio/Video**: Support for audio and video streaming
- **Group Messaging**: Support for multi-device group communication
- **Encryption**: Additional security layers for sensitive data
- **Background Operation**: Support for background discovery and messaging

## References

- [Google Nearby Connections API Documentation](https://developers.google.com/nearby/connections/overview)
- [react-native-google-nearby-connection GitHub](https://github.com/butchmarshall/react-native-google-nearby-connection)
- [Android Nearby Connections Guide](https://developers.google.com/nearby/connections/android/get-started)
