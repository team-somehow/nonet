import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, PermissionsAndroid, Platform } from 'react-native';
import NearbyConnection from 'react-native-google-nearby-connection';

const SERVICE_ID = 'com.yourapp.nearby_service';
const LOCAL_NAME = 'NearDeviceAdvertiser';

export default function NearbyAdvertiserScreen() {
    const [status, setStatus] = useState('Idle');
    const [connectedEndpointId, setConnectedEndpointId] = useState(null);

    // --- 1. HANDLE RUNTIME PERMISSIONS (CRITICAL) ---
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            const perms = [
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            ];
            const granted = await PermissionsAndroid.requestMultiple(perms);
            
            const allGranted = Object.values(granted).every(
                status => status === PermissionsAndroid.RESULTS.GRANTED
            );
            if (!allGranted) {
                Alert.alert("Permission Error", "Nearby requires all Bluetooth and Location permissions.");
                return false;
            }
        }
        return true;
    };

    // --- 2. START ADVERTISING ---
    const startAdvertising = async () => {
        if (!await requestPermissions()) return;
        
        setStatus('Advertising...');
        
        // Setup Event Listeners
        NearbyConnection.onEndpointDiscovered(({ endpointId, endpointName }) => {
            console.log(`Discovered: ${endpointName}. Requesting connection...`);
            // Stop advertising and immediately request connection
            NearbyConnection.stopAdvertising(); 
            NearbyConnection.requestConnection(endpointId, LOCAL_NAME);
        });

        NearbyConnection.onConnected(({ endpointId, endpointName }) => {
            setStatus(`✅ Connected to ${endpointName}`);
            setConnectedEndpointId(endpointId);
            // Optionally, stop advertising/discovery after connection:
            NearbyConnection.stopAdvertising();
            NearbyConnection.stopDiscovery();
        });
        
        NearbyConnection.onPayloadReceived(({ endpointId, payload }) => {
            const data = payload.text || payload.bytes;
            Alert.alert("Data Received", `From ${endpointId}: ${data}`);
        });

        try {
            await NearbyConnection.startAdvertising(
                LOCAL_NAME,
                SERVICE_ID,
                true // Strategy is P2P_CLUSTER (recommended)
            );
        } catch (e) {
            setStatus(`Error: ${e.message}`);
        }
    };

    // --- 3. SEND DATA ---
    const sendData = () => {
        if (!connectedEndpointId) {
            Alert.alert("Error", "Not connected to any device.");
            return;
        }
        const message = "Hello from the Advertiser!";
        
        // Send the payload as a string (can also be bytes)
        NearbyConnection.sendPayload(
            connectedEndpointId,
            message
        );
        Alert.alert("Sent", message);
    };

    // --- 4. DISCONNECT/CLEANUP ---
    const stopAll = () => {
        NearbyConnection.stopAdvertising();
        NearbyConnection.stopDiscovery();
        if (connectedEndpointId) {
            NearbyConnection.disconnectFromEndpoint(connectedEndpointId);
        }
        setStatus('Idle');
        setConnectedEndpointId(null);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, marginBottom: 10 }}>Status: {status}</Text>
            <Text style={{ marginBottom: 20 }}>Connected ID: {connectedEndpointId || 'None'}</Text>

            <Button title="1. Start Advertising (Searchable)" onPress={startAdvertising} disabled={status !== 'Idle'} />
            
            <View style={{ marginVertical: 20 }}>
                <Button 
                    title="2. Send Data" 
                    onPress={sendData} 
                    disabled={!connectedEndpointId} 
                />
            </View>

            <Button title="3. Stop All Connections" onPress={stopAll} color="red" />
        </View>
    );
}

// To run this, you need a second device or app running the Discoverer logic, 
// using the same SERVICE_ID.