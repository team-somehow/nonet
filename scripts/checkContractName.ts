import { ethers } from "ethers";

// Configuration
const RPC_URL = "https://testnet.evm.nodes.onflow.org";
const CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c";

// ERC-20 ABI for name() and symbol() functions
const erc20ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

(async () => {
  try {
    console.log("🔍 Checking deployed contract details...");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, erc20ABI, provider);

    // Get contract details
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();

    console.log("\n📋 Contract Details:");
    console.log(`Name: "${name}"`);
    console.log(`Symbol: "${symbol}"`);
    console.log(`Decimals: ${decimals}`);

    console.log("\n🔧 EIP-712 Domain should be:");
    console.log(`{`);
    console.log(`  name: "${name}",`);
    console.log(`  version: "1",`);
    console.log(`  chainId: 545,`);
    console.log(`  verifyingContract: "${CONTRACT_ADDRESS}"`);
    console.log(`}`);
  } catch (error) {
    console.error("❌ Error checking contract:", error);
  }
})();
