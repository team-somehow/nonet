/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, JsonRpcProvider, Wallet, parseEther, formatEther } from "ethers";
import { CHAINS, getChainById } from '@/data/chains';

// Get Flow chain configuration
const FLOW_CHAIN = getChainById('flow');
if (!FLOW_CHAIN) {
  throw new Error('Flow chain configuration not found');
}

const TESTNET_RPC_URL = FLOW_CHAIN.rpcUrl;

// Transaction result interface
export interface SimpleTransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
}

/**
 * Send a simple FLOW transaction on Flow EVM testnet
 * @param privateKey - Sender's private key (with or without 0x prefix)
 * @param receiverAddress - Receiver's wallet address
 * @param amountInFlow - Amount to send in FLOW (as string, e.g., "0.01")
 * @returns Transaction result
 */
export async function sendSimpleTransaction(
  privateKey: string,
  receiverAddress: string,
  amountInFlow: string
): Promise<SimpleTransactionResult> {
  try {
    console.log('🚀 Starting simple Flow transaction...');
    console.log('Receiver:', receiverAddress);
    console.log('Amount:', amountInFlow, 'FLOW');

    // 1. Create provider (connect to Flow EVM testnet)
    const provider = new JsonRpcProvider(TESTNET_RPC_URL);
    console.log('✅ Provider connected to Flow EVM testnet');

    // 2. Create wallet from private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(cleanPrivateKey, provider);
    const senderAddress = await wallet.getAddress();
    console.log('✅ Wallet created. Sender address:', senderAddress);

    // 3. Check sender balance
    const balance = await provider.getBalance(senderAddress);
    const balanceInFlow = formatEther(balance);
    console.log('💰 Sender balance:', balanceInFlow, 'FLOW');

    // 4. Validate sufficient balance
    const amountToSend = parseFloat(amountInFlow);
    const currentBalance = parseFloat(balanceInFlow);
    
    if (amountToSend > currentBalance) {
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceInFlow} FLOW but trying to send ${amountInFlow} FLOW`,
      };
    }

    // 5. Validate receiver address
    if (!ethers.isAddress(receiverAddress)) {
      return {
        success: false,
        error: `Invalid receiver address: ${receiverAddress}`,
      };
    }

    // 6. Create transaction
    const transaction = {
      to: receiverAddress,
      value: parseEther(amountInFlow),
    };

    console.log('📝 Transaction created:', transaction);

    // 7. Send transaction
    console.log('⏳ Sending transaction...');
    const txResponse = await wallet.sendTransaction(transaction);
    console.log('🎉 Transaction sent! Hash:', txResponse.hash);

    // 8. Wait for confirmation (optional - you can remove this for faster response)
    console.log('⏳ Waiting for confirmation...');
    const receipt = await txResponse.wait();
    
    if (!receipt) {
      return {
        success: false,
        error: 'Transaction failed to get receipt',
        transactionHash: txResponse.hash,
      };
    }

    console.log('✅ Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());

    return {
      success: true,
      transactionHash: txResponse.hash,
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: receipt.gasPrice?.toString() || '0',
      blockNumber: receipt.blockNumber,
    };

  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Handle common errors
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient funds for transaction (including gas fees)';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection error. Please check your internet connection.';
    } else if (error.message?.includes('gas')) {
      errorMessage = 'Gas estimation failed. The transaction might fail or gas limit is too low.';
    } else if (error.message?.includes('nonce')) {
      errorMessage = 'Nonce error. Please try again in a few seconds.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get balance of an address
 * @param address - Wallet address to check
 * @returns Balance in FLOW as string
 */
export async function getBalance(address: string): Promise<string> {
  try {
    const provider = new JsonRpcProvider(TESTNET_RPC_URL);
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error('Failed to get balance:', error);
    throw error;
  }
}

/**
 * Validate if an address is valid
 * @param address - Address to validate
 * @returns True if valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Get current gas price
 * @returns Gas price in Gwei as string
 */
export async function getCurrentGasPrice(): Promise<string> {
  try {
    const provider = new JsonRpcProvider(TESTNET_RPC_URL);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    return formatEther(gasPrice * 1000000000n); // Convert to Gwei
  } catch (error) {
    console.error('Failed to get gas price:', error);
    return '20'; // Default 20 Gwei
  }
}

// Export Flow EVM testnet info from centralized config
export const TESTNET_INFO = {
  name: FLOW_CHAIN.name,
  rpcUrl: FLOW_CHAIN.rpcUrl,
  chainId: FLOW_CHAIN.chainId,
  currency: FLOW_CHAIN.nativeCurrency.symbol,
  explorer: FLOW_CHAIN.explorer,
  faucet: FLOW_CHAIN.faucet,
};
