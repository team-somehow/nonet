import { ethers } from "ethers";

// --- Configuration ---
// Sepolia RPC endpoint. You can get one for free from services like Infura or Alchemy.
const RPC_URL = "https://testnet.evm.nodes.onflow.org";
const CONTRACT_ADDRESS = "0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01";

// --- Contract ABI ---
// A minimal ABI containing only the function we need to call.
const contractABI = [
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
      { internalType: "uint256", name: "validAfter", type: "uint256" },
      { internalType: "uint256", name: "validBefore", type: "uint256" },
      { internalType: "bytes32", name: "nonce", type: "bytes32" },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    name: "transferWithAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// --- Pre-signed Transaction Data ---
// The data you provided from the offline signing step.
const signedTxData = {
  from: "0x6af3d80cd34D1e58Bd922D7871C4e06Fb782613f",
  to: "0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01",
  value: "1000000000000000000",
  validAfter: "0",
  validBefore: "1759015285",
  nonce: "0x75823fd262fea0f6ae53f9a3a80a3617a35d48bf92e02a13801363a28d14fce3",
  signature:
    "0x1c9a9669f9e3af2e036679a022868714ac22d415e31bdf01d22b2d2bfb994ba410f77e968b302bd960c0c6684f9e4377ea620e6aafc43a09e33b69802da15eb31c",
};
// Hellloooo pettiboy here
// i know private key hardcode nahi karni chahiye par ispe kuch nahi hai
// thank you for your consideration :)))
const RELAYER_PRIVATE_KEY =
  "0xa5d69bd2a06efa55f9ca05b121cd0d617e48fdb83940727695812f3de7d70bc3";

(async () => {
  try {
    console.log("🚀 Starting transaction relayer script...");

    // 1. Set up the provider and signer (the "relayer").
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log(`\nRelayer Address: ${relayerWallet.address}`);
    const balance = await provider.getBalance(relayerWallet.address);
    console.log(
      `Relayer Balance: ${ethers.formatEther(balance)} native tokens`
    );

    if (balance === 0n) {
      console.warn(
        "⚠️ Warning: Relayer wallet has no ETH. The transaction will likely fail."
      );
    }

    // 3. Create an instance of the contract.
    const tokenContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI,
      relayerWallet
    );

    console.log("\n📡 Submitting transaction to the Sepolia network...");

    // 4. Call the contract function with the signed data.
    const tx = await tokenContract.transferWithAuthorization(
      signedTxData.from,
      signedTxData.to,
      signedTxData.value,
      signedTxData.validAfter,
      signedTxData.validBefore,
      signedTxData.nonce,
      signedTxData.signature
    );

    console.log(`⏳ Transaction sent! Waiting for confirmation...`);
    console.log(`Transaction Hash: ${tx.hash}`);

    // 5. Wait for the transaction to be mined.
    const receipt = await tx.wait();

    console.log("\n✅ Transaction confirmed!");
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`\nView on Etherscan:`);
    console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
  } catch (error: unknown) {
    console.error("\n❌ An error occurred:", error);
  }
})();
