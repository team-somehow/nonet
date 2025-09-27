import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScannedAddress {
  id: string;
  address: string;
  timestamp: Date;
}

export interface WalletData {
  address: string;
  privateKey: string;
  createdAt: Date;
}

interface WalletContextType {
  // Wallet states
  userWalletAddress: string | null;
  isLoggedIn: boolean;
  walletData: WalletData | null;
  
  // Scanned addresses state
  scannedAddresses: ScannedAddress[];
  
  // Wallet functions
  createWallet: () => Promise<WalletData>;
  loadWallet: () => Promise<void>;
  clearWallet: () => Promise<void>;
  logout: () => Promise<void>;
  
  // Scanned addresses functions
  addScannedAddress: (address: string) => void;
  clearScannedAddresses: () => void;
  removeScannedAddress: (id: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  WALLET_DATA: '@wallet_data',
  SCANNED_ADDRESSES: '@scanned_addresses',
};

// Generate a mock wallet address and private key
const generateMockWallet = (): { address: string; privateKey: string } => {
  const randomHex = (length: number) => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  return {
    address: `0x${randomHex(40)}`,
    privateKey: `0x${randomHex(64)}`,
  };
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [userWalletAddress, setUserWalletAddress] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [scannedAddresses, setScannedAddresses] = useState<ScannedAddress[]>([]);

  // Load wallet and scanned addresses on app start
  useEffect(() => {
    loadWallet();
    loadScannedAddresses();
  }, []);

  // Create a new wallet
  const createWallet = async (): Promise<WalletData> => {
    try {
      const { address, privateKey } = generateMockWallet();
      const newWalletData: WalletData = {
        address,
        privateKey,
        createdAt: new Date(),
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_DATA, JSON.stringify(newWalletData));

      // Update state
      setWalletData(newWalletData);
      setUserWalletAddress(address);
      setIsLoggedIn(true);

      return newWalletData;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  };

  // Load existing wallet from storage
  const loadWallet = async (): Promise<void> => {
    try {
      const storedWallet = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_DATA);
      if (storedWallet) {
        const parsedWallet: WalletData = JSON.parse(storedWallet);
        // Convert createdAt string back to Date object
        parsedWallet.createdAt = new Date(parsedWallet.createdAt);
        
        setWalletData(parsedWallet);
        setUserWalletAddress(parsedWallet.address);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  // Clear wallet data
  const clearWallet = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_DATA);
      setWalletData(null);
      setUserWalletAddress(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error clearing wallet:', error);
    }
  };

  // Logout user (clear wallet and scanned addresses)
  const logout = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.WALLET_DATA, STORAGE_KEYS.SCANNED_ADDRESSES]);
      setWalletData(null);
      setUserWalletAddress(null);
      setIsLoggedIn(false);
      setScannedAddresses([]);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Load scanned addresses from storage
  const loadScannedAddresses = async (): Promise<void> => {
    try {
      const storedAddresses = await AsyncStorage.getItem(STORAGE_KEYS.SCANNED_ADDRESSES);
      if (storedAddresses) {
        const parsedAddresses: ScannedAddress[] = JSON.parse(storedAddresses);
        // Convert timestamp strings back to Date objects
        const addressesWithDates = parsedAddresses.map(addr => ({
          ...addr,
          timestamp: new Date(addr.timestamp),
        }));
        setScannedAddresses(addressesWithDates);
      }
    } catch (error) {
      console.error('Error loading scanned addresses:', error);
    }
  };

  // Save scanned addresses to storage
  const saveScannedAddresses = async (addresses: ScannedAddress[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCANNED_ADDRESSES, JSON.stringify(addresses));
    } catch (error) {
      console.error('Error saving scanned addresses:', error);
    }
  };

  // Add a new scanned address
  const addScannedAddress = (address: string): void => {
    // Check if address already exists
    const addressExists = scannedAddresses.some(item => item.address === address);
    if (addressExists) {
      throw new Error('Address already exists');
    }

    const newAddress: ScannedAddress = {
      id: Date.now().toString(),
      address,
      timestamp: new Date(),
    };

    const updatedAddresses = [newAddress, ...scannedAddresses];
    setScannedAddresses(updatedAddresses);
    saveScannedAddresses(updatedAddresses);
  };

  // Clear all scanned addresses
  const clearScannedAddresses = (): void => {
    setScannedAddresses([]);
    saveScannedAddresses([]);
  };

  // Remove a specific scanned address
  const removeScannedAddress = (id: string): void => {
    const updatedAddresses = scannedAddresses.filter(addr => addr.id !== id);
    setScannedAddresses(updatedAddresses);
    saveScannedAddresses(updatedAddresses);
  };

  const contextValue: WalletContextType = {
    // States
    userWalletAddress,
    isLoggedIn,
    walletData,
    scannedAddresses,
    
    // Wallet functions
    createWallet,
    loadWallet,
    clearWallet,
    logout,
    
    // Scanned addresses functions
    addScannedAddress,
    clearScannedAddresses,
    removeScannedAddress,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
