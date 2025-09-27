import { ethers } from "ethers";

(async () => {
  // --- 1. Setup (Replace with your actual data) ---
  const privateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // A sample private key (e.g., from Hardhat/Anvil)
  const wallet = new ethers.Wallet(privateKey);
  const fromAddress = await wallet.getAddress();

  const tokenContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Example contract address
  const toAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Recipient address
  const chainId = 31337; // Example chain ID (e.g., Hardhat local network)

  // --- 2. EIP-712 Domain ---
  // This identifies the smart contract and chain you're interacting with.
  // The 'name' and 'version' must match what's defined in your ERC20 contract.
  const domain = {
    name: "MyErc20Token", // The token's name
    version: "1", // The contract version
    chainId: chainId,
    verifyingContract: tokenContractAddress,
  };

  // --- 3. EIP-712 Types ---
  // This defines the structure of the message you are signing.
  // The names and types MUST exactly match the struct in the smart contract.
  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  // --- 4. Message Value ---
  // These are the actual parameters for the transfer.
  const now = Math.floor(Date.now() / 1000);
  const transferValue = {
    from: fromAddress,
    to: toAddress,
    value: ethers.parseUnits("1", 18), // Transfer 1 token (assuming 18 decimals)
    validAfter: 0, // Immediately valid
    validBefore: now + 3600, // Valid for 1 hour
    nonce: ethers.randomBytes(32), // A unique, random nonce to prevent replay attacks
  };

  // --- 5. Sign the Message ---
  // This is the core "offline" step. It uses the user's private key to sign the typed data.
  const signature = await wallet.signTypedData(domain, types, transferValue);

  // --- 6. Output ---
  // These are the parameters someone else (a "relayer") will use to call the contract.
  console.log("--- Transaction Parameters ---");
  console.log("from:        ", transferValue.from);
  console.log("to:          ", transferValue.to);
  console.log("value:       ", transferValue.value.toString());
  console.log("validAfter:  ", transferValue.validAfter);
  console.log("validBefore: ", transferValue.validBefore);
  console.log("nonce:       ", ethers.hexlify(transferValue.nonce));
  console.log("signature:   ", signature);
})();
