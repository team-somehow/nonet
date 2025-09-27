import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';
import { ec as EC } from 'elliptic';

export interface ScannedAddress {
  id: string;
  address: string;
  timestamp: Date;
}

export interface WalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  createdAt: Date;
}

export interface TransactionData {
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: string;
  data?: string;
  chainId?: number;
}

export interface SignedTransaction {
  rawTransaction: string;
  transactionHash: string;
  r: string;
  s: string;
  v: string;
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
  
  // Crypto utility functions
  validatePrivateKey: (privateKey: string) => boolean;
  deriveAddressFromPrivateKey: (privateKey: string) => string;
  signMessage: (message: string, privateKey: string) => string;
  signTransaction: (transactionData: TransactionData) => Promise<SignedTransaction>;
  
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

// Initialize elliptic curve (secp256k1 - same as Bitcoin/Ethereum)
const ec = new EC('secp256k1');

// Generate a real ECDSA wallet with proper key pair and address derivation
const generateRealWallet = (): { address: string; privateKey: string; publicKey: string } => {
  try {
    console.log('🔐 Starting ECDSA wallet generation...');
    
    // Generate a random private key (32 bytes)
    const keyPair = ec.genKeyPair();
    
    // Get private key as hex string
    const privateKeyHex = keyPair.getPrivate('hex').padStart(64, '0');
    const privateKey = `0x${privateKeyHex}`;
    
    // Get public key (uncompressed format: 04 + x + y coordinates)
    const publicKeyHex = keyPair.getPublic('hex');
    const publicKey = `0x${publicKeyHex}`;
    
    // Generate Ethereum address from public key
    const address = generateEthereumAddress(publicKeyHex);
    
    console.log('✅ Wallet generated successfully');
    console.log('Private key length:', privateKey.length);
    console.log('Public key length:', publicKey.length);
    console.log('Address:', address);
    
    return {
      address,
      privateKey,
      publicKey,
    };
  } catch (error) {
    console.error('❌ Error generating wallet:', error);
    throw new Error('Failed to generate cryptographic wallet');
  }
};

// Generate Ethereum address from public key
const generateEthereumAddress = (publicKeyHex: string): string => {
  try {
    // Remove '04' prefix if present (uncompressed public key indicator)
    const cleanPublicKey = publicKeyHex.startsWith('04') ? publicKeyHex.slice(2) : publicKeyHex;
    
    // Convert hex to word array for crypto-js
    const publicKeyWords = CryptoJS.enc.Hex.parse(cleanPublicKey);
    
    // Calculate Keccak-256 hash
    const hash = CryptoJS.SHA3(publicKeyWords, { outputLength: 256 });
    
    // Take last 20 bytes (40 hex characters) as address
    const addressHex = hash.toString(CryptoJS.enc.Hex).slice(-40);
    
    // Add '0x' prefix and apply checksum
    return applyEthereumChecksum(`0x${addressHex}`);
  } catch (error) {
    console.error('Error generating Ethereum address:', error);
    throw new Error('Failed to generate Ethereum address');
  }
};

// Apply EIP-55 checksum to Ethereum address
const applyEthereumChecksum = (address: string): string => {
  try {
    const addressLower = address.toLowerCase().replace('0x', '');
    const hash = CryptoJS.SHA3(addressLower, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
    
    let checksumAddress = '0x';
    for (let i = 0; i < addressLower.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += addressLower[i].toUpperCase();
      } else {
        checksumAddress += addressLower[i];
      }
    }
    
    return checksumAddress;
  } catch (error) {
    console.error('Error applying checksum:', error);
    return address; // Return original if checksum fails
  }
};

// Utility functions for wallet operations
const validatePrivateKey = (privateKey: string): boolean => {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace('0x', '');
    
    // Check if it's a valid hex string of 64 characters (32 bytes)
    if (cleanKey.length !== 64) return false;
    if (!/^[0-9a-fA-F]+$/.test(cleanKey)) return false;
    
    // Try to create a key pair from it
    const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
    return keyPair.validate().result;
  } catch {
    return false;
  }
};

const deriveAddressFromPrivateKey = (privateKey: string): string => {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace('0x', '');
    
    // Create key pair from private key
    const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
    
    // Get public key
    const publicKeyHex = keyPair.getPublic('hex');
    
    // Generate address from public key
    return generateEthereumAddress(publicKeyHex);
  } catch (error) {
    console.error('Error deriving address:', error);
    throw new Error('Invalid private key');
  }
};

const signMessage = (message: string, privateKey: string): string => {
  try {
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace('0x', '');
    
    // Create key pair from private key
    const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
    
    // Hash the message
    const messageHash = CryptoJS.SHA3(message, { outputLength: 256 });
    const messageHashHex = messageHash.toString(CryptoJS.enc.Hex);
    
    // Sign the hash
    const signature = keyPair.sign(messageHashHex, 'hex');
    
    // Return signature in hex format
    return `0x${signature.r.toString('hex').padStart(64, '0')}${signature.s.toString('hex').padStart(64, '0')}${signature.recoveryParam?.toString(16) || '0'}`;
  } catch (error) {
    console.error('Error signing message:', error);
    throw new Error('Failed to sign message');
  }
};

// Sign transaction data using ECDSA
const signTransactionData = (transactionData: TransactionData, privateKey: string): SignedTransaction => {
  try {
    console.log('🔐 Signing transaction with ECDSA...');
    
    // Remove 0x prefix if present
    const cleanKey = privateKey.replace('0x', '');
    
    // Create key pair from private key
    const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
    
    // Set default values for transaction fields
    const tx = {
      to: transactionData.to,
      value: transactionData.value || '0',
      gasLimit: transactionData.gasLimit || '21000',
      gasPrice: transactionData.gasPrice || '20000000000', // 20 Gwei
      nonce: transactionData.nonce || '0',
      data: transactionData.data || '0x',
      chainId: transactionData.chainId || 1,
    };
    
    // Create transaction hash for signing (simplified RLP encoding)
    const txData = `${tx.nonce}${tx.gasPrice}${tx.gasLimit}${tx.to}${tx.value}${tx.data}${tx.chainId}`;
    const txHash = CryptoJS.SHA3(txData, { outputLength: 256 });
    const txHashHex = txHash.toString(CryptoJS.enc.Hex);
    
    console.log('📝 Transaction data to sign:', {
      to: tx.to,
      value: tx.value,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      nonce: tx.nonce,
      chainId: tx.chainId,
    });
    
    // Sign the transaction hash
    const signature = keyPair.sign(txHashHex, 'hex');
    
    const r = signature.r.toString('hex').padStart(64, '0');
    const s = signature.s.toString('hex').padStart(64, '0');
    const v = (signature.recoveryParam! + (tx.chainId * 2) + 35).toString(16);
    
    // Create raw transaction (simplified)
    const rawTransaction = `0x${txData}${v}${r}${s}`;
    
    // Create transaction hash
    const transactionHash = CryptoJS.SHA3(rawTransaction, { outputLength: 256 }).toString(CryptoJS.enc.Hex);
    
    const signedTx: SignedTransaction = {
      rawTransaction,
      transactionHash: `0x${transactionHash}`,
      r: `0x${r}`,
      s: `0x${s}`,
      v: `0x${v}`,
    };
    
    console.log('✅ Transaction signed successfully');
    console.log('📋 Signed Transaction Details:', {
      transactionHash: signedTx.transactionHash,
      rawTransaction: signedTx.rawTransaction.slice(0, 50) + '...',
      signature: {
        r: signedTx.r,
        s: signedTx.s,
        v: signedTx.v,
      },
    });
    
    return signedTx;
  } catch (error) {
    console.error('❌ Error signing transaction:', error);
    throw new Error('Failed to sign transaction');
  }
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
    const initializeWallet = async () => {
      try {
        await loadWallet();
        await loadScannedAddresses();
        console.log('✅ Wallet context initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing wallet context:', error);
      }
    };

    initializeWallet();
  }, []);

  // Create a new wallet with real ECDSA cryptography
  const createWallet = async (): Promise<WalletData> => {
    try {
      console.log('🔐 Generating new ECDSA wallet...');
      
      // Generate real cryptographic wallet
      const { address, privateKey, publicKey } = generateRealWallet();
      
      const newWalletData: WalletData = {
        address,
        privateKey,
        publicKey,
        createdAt: new Date(),
      };

      console.log('✅ Wallet generated successfully:', {
        address,
        publicKeyLength: publicKey.length,
        privateKeyLength: privateKey.length,
      });

      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_DATA, JSON.stringify(newWalletData));

      // Update state
      setWalletData(newWalletData);
      setUserWalletAddress(address);
      setIsLoggedIn(true);

      return newWalletData;
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      throw new Error('Failed to create cryptographic wallet');
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
        
        // Handle legacy wallets that might not have publicKey
        if (!parsedWallet.publicKey && parsedWallet.privateKey) {
          try {
            // Derive public key from private key for legacy wallets
            const cleanKey = parsedWallet.privateKey.replace('0x', '');
            const keyPair = ec.keyFromPrivate(cleanKey, 'hex');
            parsedWallet.publicKey = `0x${keyPair.getPublic('hex')}`;
            
            // Save updated wallet data with public key
            await AsyncStorage.setItem(STORAGE_KEYS.WALLET_DATA, JSON.stringify(parsedWallet));
            console.log('🔄 Updated legacy wallet with public key');
          } catch (error) {
            console.error('Failed to derive public key from private key:', error);
          }
        }
        
        setWalletData(parsedWallet);
        setUserWalletAddress(parsedWallet.address);
        setIsLoggedIn(true);
        
        console.log('📱 Loaded wallet:', {
          address: parsedWallet.address,
          hasPublicKey: !!parsedWallet.publicKey,
          createdAt: parsedWallet.createdAt,
        });
      }
    } catch (error) {
      console.error('❌ Error loading wallet:', error);
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
    // Check if address already exists, if so, just return without adding
    const addressExists = scannedAddresses.some(item => item.address === address);
    if (addressExists) {
      return; // Silently ignore duplicates
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

  // Sign transaction using wallet's private key
  const signTransaction = async (transactionData: TransactionData): Promise<SignedTransaction> => {
    try {
      if (!walletData?.privateKey) {
        throw new Error('No wallet found. Please create a wallet first.');
      }

      console.log('🔐 Starting transaction signing process...');
      console.log('📝 Transaction data received:', transactionData);

      // Sign the transaction using the wallet's private key
      const signedTx = signTransactionData(transactionData, walletData.privateKey);

      console.log('✅ Transaction signing completed');
      console.log('🚀 Ready to broadcast transaction');

      return signedTx;
    } catch (error) {
      console.error('❌ Error in signTransaction:', error);
      throw error;
    }
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
    
    // Crypto utility functions
    validatePrivateKey,
    deriveAddressFromPrivateKey,
    signMessage,
    signTransaction,
    
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
