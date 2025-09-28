import { ethers } from "ethers";

// --- Configuration ---
// Sepolia RPC endpoint. You can get one for free from services like Infura or Alchemy.
const RPC_URL = "https://testnet.hashio.io/api";
const CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c";

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
// Fresh signature generated from transferWithAuthorization.ts
const signedTxData = {
  from: "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c",
  to: "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c",
  value: "1000000000000000000",
  validAfter: "0",
  validBefore: "1759027309",
  nonce: "0x28b70fae6e6aec3bc4d2486ac65655b3c6d842f4141a321fb6c6448efe72d9dc",
  signature:
    "0xa0a7e6aa3dc85c13cf946e8c634afa43941c929e1d23316368698ba4f95ed926747b41c95372d3d47a1b4d56161eb3c19f7b2fd1453f6f6e007a700c31258dd11c",
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

    console.log("\n📡 Submitting transaction to Flow EVM testnet...");

    // Debug: Print transaction parameters
    console.log("\n--- Transaction Parameters ---");
    console.log("from:", signedTxData.from);
    console.log("to:", signedTxData.to);
    console.log("value:", signedTxData.value);
    console.log("validAfter:", signedTxData.validAfter);
    console.log("validBefore:", signedTxData.validBefore);
    console.log("nonce:", signedTxData.nonce);
    console.log("signature:", signedTxData.signature);
    console.log("signature length:", signedTxData.signature.length);

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
    console.log(`\nView on Flow EVM Explorer:`);
    console.log(`https://evm-testnet.flowscan.io/tx/${tx.hash}`);
  } catch (error: unknown) {
    console.error("\n❌ An error occurred:", error);
  }
})();
