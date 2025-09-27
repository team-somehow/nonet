/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers, JsonRpcProvider, Wallet, parseEther, formatEther } from "ethers";
import { getChainById, getCurrencyById, getNativeCurrencyForChain, type ChainConfig, type CurrencyConfig } from '@/data/chains';

// Multi-chain transaction result interface
export interface MultiChainTransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  chainId: number;
  chainName: string;
  currency: string;
}

// Multi-chain transaction parameters
export interface TransactionParams {
  privateKey: string;
  receiverAddress: string;
  amount: string;
  chainId: string;
  currencyId?: string;
}

/**
 * Send a transaction on any supported EVM chain
 * @param params - Transaction parameters
 * @returns Transaction result
 */
export async function sendMultiChainTransaction(
  params: TransactionParams
): Promise<MultiChainTransactionResult> {
  const { privateKey, receiverAddress, amount, chainId, currencyId } = params;

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

    // Get currency configuration (default to native currency)
    let currency: CurrencyConfig | undefined;
    if (currencyId) {
      currency = getCurrencyById(currencyId);
    } else {
      currency = getNativeCurrencyForChain(chainId);
    }

    if (!currency) {
      return {
        success: false,
        error: `Currency not found or not supported on ${chain.name}`,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: 'Unknown',
      };
    }

    console.log(`🚀 Starting ${chain.name} transaction...`);
    console.log('Chain:', chain.name);
    console.log('Currency:', currency.symbol);
    console.log('Receiver:', receiverAddress);
    console.log('Amount:', amount, currency.symbol);

    // 1. Create provider
    const provider = new JsonRpcProvider(chain.rpcUrl);
    console.log(`✅ Provider connected to ${chain.name}`);

    // 2. Create wallet from private key
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new Wallet(cleanPrivateKey, provider);
    const senderAddress = await wallet.getAddress();
    console.log('✅ Wallet created. Sender address:', senderAddress);

    // 3. Check sender balance
    let balance: bigint;
    let balanceFormatted: string;

    if (currency.isNative) {
      // Native currency balance
      balance = await provider.getBalance(senderAddress);
      balanceFormatted = formatEther(balance);
    } else {
      // ERC-20 token balance (if supported)
      if (!currency.contractAddress) {
        return {
          success: false,
          error: `Contract address not configured for ${currency.symbol}`,
          chainId: chain.chainId,
          chainName: chain.name,
          currency: currency.symbol,
        };
      }

      // ERC-20 balance check
      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const contract = new ethers.Contract(currency.contractAddress, erc20Abi, provider);
      balance = await contract.balanceOf(senderAddress);
      balanceFormatted = formatEther(balance);
    }

    console.log(`💰 Sender balance: ${balanceFormatted} ${currency.symbol}`);

    // 4. Validate sufficient balance
    const amountToSend = parseFloat(amount);
    const currentBalance = parseFloat(balanceFormatted);
    
    if (amountToSend > currentBalance) {
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceFormatted} ${currency.symbol} but trying to send ${amount} ${currency.symbol}`,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: currency.symbol,
      };
    }

    // 5. Validate receiver address
    if (!ethers.isAddress(receiverAddress)) {
      return {
        success: false,
        error: `Invalid receiver address: ${receiverAddress}`,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: currency.symbol,
      };
    }

    // 6. Create and send transaction
    let txResponse: any;

    if (currency.isNative) {
      // Native currency transaction
      const transaction = {
        to: receiverAddress,
        value: parseEther(amount),
        gasLimit: chain.gasSettings?.defaultGasLimit || '21000',
      };

      console.log('📝 Native transaction created:', transaction);
      txResponse = await wallet.sendTransaction(transaction);
    } else {
      // ERC-20 token transaction
      if (!currency.contractAddress) {
        throw new Error('Contract address not found for ERC-20 token');
      }

      const erc20Abi = [
        "function transfer(address to, uint256 amount) returns (bool)",
      ];

      const contract = new ethers.Contract(currency.contractAddress, erc20Abi, wallet);
      const transferAmount = parseEther(amount); // Adjust for token decimals if needed
      
      console.log('📝 ERC-20 transaction created');
      txResponse = await contract.transfer(receiverAddress, transferAmount);
    }

    console.log('🎉 Transaction sent! Hash:', txResponse.hash);

    // 7. Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await txResponse.wait();
    
    if (!receipt) {
      return {
        success: false,
        error: 'Transaction failed to get receipt',
        transactionHash: txResponse.hash,
        chainId: chain.chainId,
        chainName: chain.name,
        currency: currency.symbol,
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
      currency: currency.symbol,
    };

  } catch (error: any) {
    console.error('❌ Multi-chain transaction failed:', error);
    
    const chain = getChainById(chainId);
    const currency = currencyId ? getCurrencyById(currencyId) : getNativeCurrencyForChain(chainId);
    
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
      currency: currency?.symbol || 'Unknown',
    };
  }
}

/**
 * Get balance for any supported chain and currency
 * @param address - Wallet address to check
 * @param chainId - Chain ID
 * @param currencyId - Currency ID (optional, defaults to native)
 * @returns Balance as string
 */
export async function getMultiChainBalance(
  address: string,
  chainId: string,
  currencyId?: string
): Promise<string> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    let currency: CurrencyConfig | undefined;
    if (currencyId) {
      currency = getCurrencyById(currencyId);
    } else {
      currency = getNativeCurrencyForChain(chainId);
    }

    if (!currency) {
      throw new Error(`Currency not found for chain: ${chainId}`);
    }

    const provider = new JsonRpcProvider(chain.rpcUrl);

    if (currency.isNative) {
      // Native currency balance
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } else {
      // ERC-20 token balance
      if (!currency.contractAddress) {
        throw new Error(`Contract address not configured for ${currency.symbol}`);
      }

      const erc20Abi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const contract = new ethers.Contract(currency.contractAddress, erc20Abi, provider);
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();
      
      return formatEther(balance); // Adjust for proper decimals if needed
    }
  } catch (error) {
    console.error('Failed to get multi-chain balance:', error);
    throw error;
  }
}

/**
 * Get current gas price for a chain
 * @param chainId - Chain ID
 * @returns Gas price in Gwei as string
 */
export async function getChainGasPrice(chainId: string): Promise<string> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const provider = new JsonRpcProvider(chain.rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    
    // Convert to Gwei
    return formatEther(gasPrice * 1000000000n);
  } catch (error) {
    console.error('Failed to get gas price:', error);
    return chain?.gasSettings?.defaultGasPrice || '20'; // Default fallback
  }
}

/**
 * Validate if an address is valid for EVM chains
 * @param address - Address to validate
 * @returns True if valid, false otherwise
 */
export function isValidEVMAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Get transaction details from any supported chain
 * @param txHash - Transaction hash
 * @param chainId - Chain ID
 * @returns Transaction details or null
 */
export async function getMultiChainTransaction(
  txHash: string,
  chainId: string
): Promise<any> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const provider = new JsonRpcProvider(chain.rpcUrl);
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) return null;

    let receipt = null;
    try {
      receipt = await provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.warn('Receipt not available yet:', error);
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || "",
      value: formatEther(tx.value),
      gasUsed: receipt?.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() || "0",
      blockNumber: receipt?.blockNumber,
      timestamp: Date.now(),
      status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
      confirmations: receipt ? 1 : 0,
      chainId: chain.chainId,
      chainName: chain.name,
    };
  } catch (error) {
    console.error('Failed to get multi-chain transaction:', error);
    return null;
  }
}
