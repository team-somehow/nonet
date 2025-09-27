import { ethers } from "ethers";

// --- Configuration ---
// Sepolia RPC endpoint. You can get one for free from services like Infura or Alchemy.
const SEPOLIA_RPC_URL = "https://eth-sepolia.public.blastapi.io";
const PAYPAL_CONTRACT_ADDRESS = "0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9";

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
      { internalType: "uint8", name: "v", type: "uint8" },
      { internalType: "bytes32", name: "r", type: "bytes32" },
      { internalType: "bytes32", name: "s", type: "bytes32" },
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
  from: "0x55Bfe2fc949e14788c89e88045a6fa1777F0CBBC",
  to: "0xcCffd74D0ADf8641E487E6679bD707B7e2FE968B",
  value: "1000000",
  validAfter: "0",
  validBefore: "1759010045",
  nonce: "0x2f6f8f012809ae9c6a9548535eac1e906c26451609a03d0fd8376b1ef267a631",
  v: "27",
  r: "0x3717edef66d940169013a01c3e341b686df2c581e034da8158e613318557dca1",
  s: "0x23755295f2a3e5d286eb929febec9060a01b7c02dd753b08c387042ed64ffb93",
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
    // This wallet needs to have Sepolia ETH to pay for the transaction fee.
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log(`\nRelayer Address: ${relayerWallet.address}`);
    const balance = await provider.getBalance(relayerWallet.address);
    console.log(`Relayer Balance: ${ethers.formatEther(balance)} Sepolia ETH`);

    if (balance === 0n) {
      console.warn(
        "⚠️ Warning: Relayer wallet has no ETH. The transaction will likely fail."
      );
    }

    // 3. Create an instance of the contract.
    const tokenContract = new ethers.Contract(
      PAYPAL_CONTRACT_ADDRESS,
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
      signedTxData.v,
      signedTxData.r,
      signedTxData.s
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
