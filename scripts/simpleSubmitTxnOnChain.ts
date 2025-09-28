import { ethers } from "ethers";

// --- Configuration ---
const RPC_URL = "https://testnet.evm.nodes.onflow.org";
const CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c"; // Update with your deployed simple contract address

// --- Contract ABI ---
// ABI for the simplified transferWithAuthorization function
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
// Replace this with the output from simpleTransferWithAuthorization.ts
const signedTxData = {
  from: "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c",
  to: "0x09fAF606dC609687792847662B0Af4E4C4F4995B",
  value: "1000000000000000000",
  validAfter: "0",
  validBefore: "1759016811",
  nonce: "0x74926be4e89f5588490a121419f51f0b308017ead435dd0786f9face9eb9c138",
  signature:
    "0xc5b8bde480565fbe462642afede2f196db468c602c919ffb1521ff4273415892654aacddd94427b0c85bf1824013dfa41b0352cbaa20793f2f175b44e16a61b51b",
};

// Relayer private key (pays for gas)
const RELAYER_PRIVATE_KEY =
  "0xa5d69bd2a06efa55f9ca05b121cd0d617e48fdb83940727695812f3de7d70bc3";

(async () => {
  try {
    console.log("🚀 Starting simple transaction relayer script...");

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
        "⚠️ Warning: Relayer wallet has no tokens. The transaction will likely fail."
      );
    }

    // 2. Create an instance of the contract.
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

    // 3. Call the contract function with the signed data.
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

    // 4. Wait for the transaction to be mined.
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
