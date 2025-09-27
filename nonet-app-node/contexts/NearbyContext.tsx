import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NearbyConnection, { 
  CommonStatusCodes, 
  ConnectionsStatusCodes, 
  Strategy, 
  Payload, 
  PayloadTransferUpdate 
} from 'react-native-google-nearby-connection';

export interface DiscoveredEndpoint {
  endpointId: string;
  endpointName: string;
  serviceId: string;
  isConnected: boolean;
}

export interface ConnectionInfo {
  endpointId: string;
  endpointName: string;
  authenticationToken: string;
  serviceId: string;
  incomingConnection: boolean;
}

export interface ReceivedMessage {
  id: string;
  endpointId: string;
  endpointName: string;
  message: string;
  timestamp: Date;
  type: 'sent' | 'received';
}

export interface PayloadInfo {
  serviceId: string;
  endpointId: string;
  payloadType: string;
  payloadId: string;
  bytesTransferred?: number;
  totalBytes?: number;
  payloadStatus?: string;
}

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
  
  // Status
  lastError: string | null;
  connectionInfo: ConnectionInfo | null;
  payloadInfo: PayloadInfo | null;
}

const NearbyContext = createContext<NearbyContextType | undefined>(undefined);

interface NearbyProviderProps {
  children: ReactNode;
}

export const NearbyProvider: React.FC<NearbyProviderProps> = ({ children }) => {
  const [isAdvertising, setIsAdvertising] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [connectedEndpoints, setConnectedEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [payloadInfo, setPayloadInfo] = useState<PayloadInfo | null>(null);

  // Initialize event listeners
  useEffect(() => {
    setupEventListeners();
    return () => {
      cleanupEventListeners();
    };
  }, []);

  const setupEventListeners = () => {
    console.log('🔧 Setting up Nearby Connection event listeners...');

    // Discovery events
    NearbyConnection.onDiscoveryStarting(({ serviceId }) => {
      console.log('🔍 Discovery starting for service:', serviceId);
    });

    NearbyConnection.onDiscoveryStarted(({ serviceId }) => {
      console.log('✅ Discovery started for service:', serviceId);
      setIsDiscovering(true);
    });

    NearbyConnection.onDiscoveryStartFailed(({ serviceId, statusCode }) => {
      console.log('❌ Discovery failed for service:', serviceId, 'Status:', statusCode);
      setIsDiscovering(false);
      setLastError(`Discovery failed: ${statusCode}`);
    });

    NearbyConnection.onEndpointDiscovered(({ endpointId, endpointName, serviceId }) => {
      console.log('📱 Endpoint discovered:', { endpointId, endpointName, serviceId });
      const newEndpoint: DiscoveredEndpoint = {
        endpointId,
        endpointName,
        serviceId,
        isConnected: false,
      };
      setDiscoveredEndpoints(prev => {
        const exists = prev.find(e => e.endpointId === endpointId);
        if (exists) return prev;
        return [...prev, newEndpoint];
      });
    });

    NearbyConnection.onEndpointLost(({ endpointId, endpointName, serviceId }) => {
      console.log('📱❌ Endpoint lost:', { endpointId, endpointName, serviceId });
      setDiscoveredEndpoints(prev => prev.filter(e => e.endpointId !== endpointId));
      setConnectedEndpoints(prev => prev.filter(e => e.endpointId !== endpointId));
    });

    // Advertising events
    NearbyConnection.onAdvertisingStarting(({ endpointName, serviceId }) => {
      console.log('📢 Advertising starting:', { endpointName, serviceId });
    });

    NearbyConnection.onAdvertisingStarted(({ endpointName, serviceId }) => {
      console.log('✅ Advertising started:', { endpointName, serviceId });
      setIsAdvertising(true);
    });

    NearbyConnection.onAdvertisingStartFailed(({ endpointName, serviceId, statusCode }) => {
      console.log('❌ Advertising failed:', { endpointName, serviceId, statusCode });
      setIsAdvertising(false);
      setLastError(`Advertising failed: ${statusCode}`);
    });

    // Connection events
    NearbyConnection.onConnectionInitiatedToEndpoint(({ 
      endpointId, 
      endpointName, 
      authenticationToken, 
      serviceId, 
      incomingConnection 
    }) => {
      console.log('🤝 Connection initiated:', { endpointId, endpointName, authenticationToken, serviceId, incomingConnection });
      setConnectionInfo({
        endpointId,
        endpointName,
        authenticationToken,
        serviceId,
        incomingConnection,
      });
    });

    NearbyConnection.onConnectedToEndpoint(({ endpointId, endpointName, serviceId }) => {
      console.log('✅ Connected to endpoint:', { endpointId, endpointName, serviceId });
      
      // Update discovered endpoints
      setDiscoveredEndpoints(prev => 
        prev.map(e => e.endpointId === endpointId ? { ...e, isConnected: true } : e)
      );
      
      // Add to connected endpoints
      setConnectedEndpoints(prev => {
        const exists = prev.find(e => e.endpointId === endpointId);
        if (exists) return prev;
        return [...prev, {
          endpointId,
          endpointName,
          serviceId,
          isConnected: true,
        }];
      });
      
      setConnectionInfo(null);
    });

    NearbyConnection.onEndpointConnectionFailed(({ endpointId, endpointName, serviceId, statusCode }) => {
      console.log('❌ Connection failed:', { endpointId, endpointName, serviceId, statusCode });
      setLastError(`Connection failed: ${statusCode}`);
      setConnectionInfo(null);
    });

    NearbyConnection.onDisconnectedFromEndpoint(({ endpointId, endpointName, serviceId }) => {
      console.log('🔌 Disconnected from endpoint:', { endpointId, endpointName, serviceId });
      
      // Update discovered endpoints
      setDiscoveredEndpoints(prev => 
        prev.map(e => e.endpointId === endpointId ? { ...e, isConnected: false } : e)
      );
      
      // Remove from connected endpoints
      setConnectedEndpoints(prev => prev.filter(e => e.endpointId !== endpointId));
    });

    // Payload events
    NearbyConnection.onReceivePayload(({ serviceId, endpointId, payloadType, payloadId }) => {
      console.log('📦 Payload received:', { serviceId, endpointId, payloadType, payloadId });
      setPayloadInfo({ serviceId, endpointId, payloadType, payloadId });
      
      // If it's a bytes payload, read it
      if (payloadType === Payload.BYTES) {
        NearbyConnection.readBytes(serviceId, endpointId, payloadId)
          .then(({ bytes }) => {
            const endpointName = connectedEndpoints.find(e => e.endpointId === endpointId)?.endpointName || endpointId;
            const newMessage: ReceivedMessage = {
              id: Date.now().toString(),
              endpointId,
              endpointName,
              message: bytes,
              timestamp: new Date(),
              type: 'received',
            };
            setMessages(prev => [newMessage, ...prev]);
          })
          .catch(error => {
            console.error('Failed to read bytes:', error);
            setLastError('Failed to read received message');
          });
      }
    });

    NearbyConnection.onPayloadUpdate(({ 
      serviceId, 
      endpointId, 
      bytesTransferred, 
      totalBytes, 
      payloadId, 
      payloadStatus 
    }) => {
      console.log('📊 Payload update:', { serviceId, endpointId, bytesTransferred, totalBytes, payloadId, payloadStatus });
      setPayloadInfo(prev => prev ? {
        ...prev,
        bytesTransferred,
        totalBytes,
        payloadStatus,
      } : null);
    });

    NearbyConnection.onSendPayloadFailed(({ serviceId, endpointId, statusCode }) => {
      console.log('❌ Send payload failed:', { serviceId, endpointId, statusCode });
      setLastError(`Send failed: ${statusCode}`);
    });
  };

  const cleanupEventListeners = () => {
    console.log('🧹 Cleaning up Nearby Connection event listeners...');
    // Note: The library doesn't provide explicit cleanup methods
    // but listeners should be automatically cleaned up when the component unmounts
  };

  // Connection methods
  const startAdvertising = async (endpointName: string, serviceId: string): Promise<void> => {
    try {
      console.log('📢 Starting advertising...', { endpointName, serviceId });
      setLastError(null);
      await NearbyConnection.startAdvertising(
        endpointName,
        serviceId,
        Strategy.P2P_CLUSTER // or Strategy.P2P_STAR, Strategy.P2P_POINT_TO_POINT
      );
    } catch (error) {
      console.error('❌ Failed to start advertising:', error);
      setLastError('Failed to start advertising');
      throw error;
    }
  };

  const stopAdvertising = async (serviceId: string): Promise<void> => {
    try {
      console.log('📢🛑 Stopping advertising...', serviceId);
      await NearbyConnection.stopAdvertising(serviceId);
      setIsAdvertising(false);
    } catch (error) {
      console.error('❌ Failed to stop advertising:', error);
      setLastError('Failed to stop advertising');
      throw error;
    }
  };

  const startDiscovering = async (serviceId: string): Promise<void> => {
    try {
      console.log('🔍 Starting discovery...', serviceId);
      setLastError(null);
      setDiscoveredEndpoints([]);
      await NearbyConnection.startDiscovering(serviceId);
    } catch (error) {
      console.error('❌ Failed to start discovery:', error);
      setLastError('Failed to start discovery');
      throw error;
    }
  };

  const stopDiscovering = async (serviceId: string): Promise<void> => {
    try {
      console.log('🔍🛑 Stopping discovery...', serviceId);
      await NearbyConnection.stopDiscovering(serviceId);
      setIsDiscovering(false);
    } catch (error) {
      console.error('❌ Failed to stop discovery:', error);
      setLastError('Failed to stop discovery');
      throw error;
    }
  };

  const connectToEndpoint = async (serviceId: string, endpointId: string): Promise<void> => {
    try {
      console.log('🤝 Connecting to endpoint...', { serviceId, endpointId });
      setLastError(null);
      await NearbyConnection.connectToEndpoint(serviceId, endpointId);
    } catch (error) {
      console.error('❌ Failed to connect to endpoint:', error);
      setLastError('Failed to connect to endpoint');
      throw error;
    }
  };

  const disconnectFromEndpoint = async (serviceId: string, endpointId: string): Promise<void> => {
    try {
      console.log('🔌 Disconnecting from endpoint...', { serviceId, endpointId });
      await NearbyConnection.disconnectFromEndpoint(serviceId, endpointId);
    } catch (error) {
      console.error('❌ Failed to disconnect from endpoint:', error);
      setLastError('Failed to disconnect from endpoint');
      throw error;
    }
  };

  const acceptConnection = async (serviceId: string, endpointId: string): Promise<void> => {
    try {
      console.log('✅ Accepting connection...', { serviceId, endpointId });
      setLastError(null);
      await NearbyConnection.acceptConnection(serviceId, endpointId);
    } catch (error) {
      console.error('❌ Failed to accept connection:', error);
      setLastError('Failed to accept connection');
      throw error;
    }
  };

  const rejectConnection = async (serviceId: string, endpointId: string): Promise<void> => {
    try {
      console.log('❌ Rejecting connection...', { serviceId, endpointId });
      await NearbyConnection.rejectConnection(serviceId, endpointId);
      setConnectionInfo(null);
    } catch (error) {
      console.error('❌ Failed to reject connection:', error);
      setLastError('Failed to reject connection');
      throw error;
    }
  };

  const sendMessage = async (serviceId: string, endpointId: string, message: string): Promise<void> => {
    try {
      console.log('💬 Sending message...', { serviceId, endpointId, message });
      setLastError(null);
      await NearbyConnection.sendBytes(serviceId, endpointId, message);
      
      // Add to messages as sent
      const endpointName = connectedEndpoints.find(e => e.endpointId === endpointId)?.endpointName || endpointId;
      const newMessage: ReceivedMessage = {
        id: Date.now().toString(),
        endpointId,
        endpointName,
        message,
        timestamp: new Date(),
        type: 'sent',
      };
      setMessages(prev => [newMessage, ...prev]);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setLastError('Failed to send message');
      throw error;
    }
  };

  const clearMessages = (): void => {
    setMessages([]);
  };

  const contextValue: NearbyContextType = {
    // State
    isAdvertising,
    isDiscovering,
    discoveredEndpoints,
    connectedEndpoints,
    messages,
    lastError,
    connectionInfo,
    payloadInfo,
    
    // Methods
    startAdvertising,
    stopAdvertising,
    startDiscovering,
    stopDiscovering,
    connectToEndpoint,
    disconnectFromEndpoint,
    acceptConnection,
    rejectConnection,
    sendMessage,
    clearMessages,
  };

  return (
    <NearbyContext.Provider value={contextValue}>
      {children}
    </NearbyContext.Provider>
  );
};

// Custom hook to use the nearby context
export const useNearby = (): NearbyContextType => {
  const context = useContext(NearbyContext);
  if (context === undefined) {
    throw new Error('useNearby must be used within a NearbyProvider');
  }
  return context;
};

export default NearbyContext;
