import { ethers } from "ethers";

// Configuration
const RPC_URL = "https://testnet.evm.nodes.onflow.org";
const CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c";
const WALLET_ADDRESS = "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c";

// ERC-20 ABI for balance checking
const erc20ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
];

(async () => {
  try {
    console.log("🔍 Checking token balance...");

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, erc20ABI, provider);

    // Get token details
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();

    // Get balance
    const balance = await contract.balanceOf(WALLET_ADDRESS);
    const formattedBalance = ethers.formatUnits(balance, decimals);

    console.log("\n📋 Token Details:");
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);

    console.log("\n💰 Balance Information:");
    console.log(`Wallet: ${WALLET_ADDRESS}`);
    console.log(`Raw Balance: ${balance.toString()}`);
    console.log(`Formatted Balance: ${formattedBalance} ${symbol}`);

    // Check if balance is sufficient for transfer
    const transferAmount = ethers.parseUnits("1", decimals);
    console.log(
      `\nTransfer Amount: ${ethers.formatUnits(
        transferAmount,
        decimals
      )} ${symbol}`
    );
    console.log(
      `Sufficient Balance: ${balance >= transferAmount ? "✅ YES" : "❌ NO"}`
    );

    if (balance < transferAmount) {
      console.log("\n⚠️  Insufficient balance for transfer!");
      console.log("You need to mint tokens to this address first.");
    }
  } catch (error) {
    console.error("❌ Error checking balance:", error);
  }
})();
