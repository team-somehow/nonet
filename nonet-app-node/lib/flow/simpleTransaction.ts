/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, JsonRpcProvider, Wallet, parseEther, formatEther } from "ethers";
import { getChainById, type ChainConfig } from '@/data/chains';

// Transaction result interface
export interface SimpleTransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  chainId?: number;
  chainName?: string;
  currency?: string;
}

// Transaction parameters interface
export interface TransactionParams {
  privateKey: string;
  receiverAddress: string;
  amount: string;
  chainId: string;
}

/**
 * Send a simple transaction on any supported EVM chain
 * @param params - Transaction parameters including chain info
 * @returns Transaction result
 */
export async function sendSimpleTransaction(
  params: TransactionParams
): Promise<SimpleTransactionResult> {
  const { privateKey, receiverAddress, amount, chainId } = params;
  
  try {
    // Get chain configuration
    const chain = getChainById(chainId);
    if (!chain) {
      return {
        success: false,
        error: `Unsupported chain: ${chainId}`,
        chainId: 0,
        chainName: 'Unknown',
        currency: 'Unknown',
      };
    }

    console.log(`🚀 Starting ${chain.name} transaction...`);
    console.log('Chain:', chain.name);
    console.log('Currency:', chain.nativeCurrency.symbol);
    console.log('Receiver:', receiverAddress);
    console.log('Amount:', amount, chain.nativeCurrency.symbol);

    // 1. Create provider (connect to selected chain)
    const provider = new JsonRpcProvider(chain.rpcUrl);
    console.log(`✅ Provider connected to ${chain.name}`);

    // 2. Create wallet from private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(cleanPrivateKey, provider);
    const senderAddress = await wallet.getAddress();
    console.log('✅ Wallet created. Sender address:', senderAddress);

    // 3. Check sender balance
    const balance = await provider.getBalance(senderAddress);
    const balanceFormatted = formatEther(balance);
    console.log(`💰 Sender balance: ${balanceFormatted} ${chain.nativeCurrency.symbol}`);

    // 4. Validate sufficient balance
    const amountToSend = parseFloat(amount);
    const currentBalance = parseFloat(balanceFormatted);
    
    if (amountToSend > currentBalance) {
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceFormatted} ${chain.nativeCurrency.symbol} but trying to send ${amount} ${chain.nativeCurrency.symbol}`,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: chain.nativeCurrency.symbol,
      };
    }

    // 5. Validate receiver address
    if (!ethers.isAddress(receiverAddress)) {
      return {
        success: false,
        error: `Invalid receiver address: ${receiverAddress}`,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: chain.nativeCurrency.symbol,
      };
    }

    // 6. Create transaction
    const transaction = {
      to: receiverAddress,
      value: parseEther(amount),
      gasLimit: chain.gasSettings?.defaultGasLimit || '21000',
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
        chainId: chain.chainId,
        chainName: chain.name,
        currency: chain.nativeCurrency.symbol,
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
      chainId: chain.chainId,
      chainName: chain.name,
      currency: chain.nativeCurrency.symbol,
    };

  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    const chain = getChainById(chainId);
    
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
      chainId: chain?.chainId || 0,
      chainName: chain?.name || 'Unknown',
      currency: chain?.nativeCurrency.symbol || 'Unknown',
    };
  }
}

/**
 * Get balance of an address on any supported chain
 * @param address - Wallet address to check
 * @param chainId - Chain ID (defaults to 'flow')
 * @returns Balance as string
 */
export async function getBalance(address: string, chainId: string = 'flow'): Promise<string> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const provider = new JsonRpcProvider(chain.rpcUrl);
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
 * Get current gas price for any supported chain
 * @param chainId - Chain ID (defaults to 'flow')
 * @returns Gas price in Gwei as string
 */
export async function getCurrentGasPrice(chainId: string = 'flow'): Promise<string> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const provider = new JsonRpcProvider(chain.rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    return formatEther(gasPrice * 1000000000n); // Convert to Gwei
  } catch (error) {
    console.error('Failed to get gas price:', error);
    const chain = getChainById(chainId);
    return chain?.gasSettings?.defaultGasPrice || '20'; // Default fallback
  }
}

/**
 * Get chain info for any supported chain
 * @param chainId - Chain ID (defaults to 'flow')
 * @returns Chain information object
 */
export function getChainInfo(chainId: string = 'flow') {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return {
    name: chain.name,
    rpcUrl: chain.rpcUrl,
    chainId: chain.chainId,
    currency: chain.nativeCurrency.symbol,
    explorer: chain.explorer,
    faucet: chain.faucet,
  };
}

// Export Flow EVM testnet info for backward compatibility
export const TESTNET_INFO = getChainInfo('flow');
