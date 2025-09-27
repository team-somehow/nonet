/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendSimpleTransaction, getBalance } from './simpleTransaction';

/**
 * Demo function - Easy to test Flow transaction
 * Just provide: private key, receiver address, and amount
 */
export async function demoFlowTransaction(
  privateKey: string,
  receiverAddress: string,
  amountInFlow: string
) {
  console.log('🚀 Demo Flow Transaction Starting...');
  console.log('From Private Key:', privateKey.slice(0, 6) + '...');
  console.log('To Address:', receiverAddress);
  console.log('Amount:', amountInFlow, 'FLOW');
  
  try {
    const result = await sendSimpleTransaction(privateKey, receiverAddress, amountInFlow);
    
    if (result.success) {
      console.log('✅ Flow Transaction Success!');
      console.log('Transaction Hash:', result.transactionHash);
      console.log('Block Number:', result.blockNumber);
      console.log('Gas Used:', result.gasUsed);
      console.log('View on Flow EVM Explorer: https://evm-testnet.flowscan.io/tx/' + result.transactionHash);
      
      return {
        success: true,
        hash: result.transactionHash,
        message: 'Flow transaction sent successfully!'
      };
    } else {
      console.log('❌ Flow Transaction Failed:', result.error);
      
      return {
        success: false,
        error: result.error,
        message: 'Flow transaction failed!'
      };
    }
  } catch (error: any) {
    console.error('💥 Demo Flow Transaction Error:', error);
    
    return {
      success: false,
      error: error.message,
      message: 'Demo Flow transaction encountered an error!'
    };
  }
}

/**
 * Quick FLOW balance check
 */
export async function checkFlowBalance(address: string) {
  try {
    const balance = await getBalance(address);
    console.log(`💰 FLOW Balance for ${address}: ${balance} FLOW`);
    return balance;
  } catch (error) {
    console.error('Failed to check Flow balance:', error);
    return '0';
  }
}

// Example usage (commented out):
/*
// Example 1: Send 0.01 FLOW
const result = await demoFlowTransaction(
  'YOUR_PRIVATE_KEY_HERE',
  '0xRECEIVER_ADDRESS_HERE', 
  '0.01'
);

// Example 2: Check FLOW balance
const balance = await checkFlowBalance('0xYOUR_ADDRESS_HERE');

// Example 3: Get test FLOW tokens
// Visit: https://testnet-faucet.onflow.org/
// Connect your wallet and request test FLOW tokens
*/