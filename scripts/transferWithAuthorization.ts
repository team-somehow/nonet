import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import { ec as EC } from "elliptic";

const ec = new EC("secp256k1");

// Apply EIP-55 checksum to Ethereum address
const applyEthereumChecksum = (address: string): string => {
  try {
    const addressLower = address.toLowerCase().replace("0x", "");
    const hash = CryptoJS.SHA3(addressLower, { outputLength: 256 }).toString(
      CryptoJS.enc.Hex
    );

    let checksumAddress = "0x";
    for (let i = 0; i < addressLower.length; i++) {
      if (parseInt(hash[i], 16) >= 8) {
        checksumAddress += addressLower[i].toUpperCase();
      } else {
        checksumAddress += addressLower[i];
      }
    }

    return checksumAddress;
  } catch (error) {
    console.error("Error applying checksum:", error);
    return address; // Return original if checksum fails
  }
};

// Generate Ethereum address from public key
const generateEthereumAddress = (publicKeyHex: string): string => {
  try {
    // Remove '04' prefix if present (uncompressed public key indicator)
    const cleanPublicKey = publicKeyHex.startsWith("04")
      ? publicKeyHex.slice(2)
      : publicKeyHex;

    // Convert hex to word array for crypto-js
    const publicKeyWords = CryptoJS.enc.Hex.parse(cleanPublicKey);

    // Calculate Keccak-256 hash
    const hash = CryptoJS.SHA3(publicKeyWords, { outputLength: 256 });

    // Take last 20 bytes (40 hex characters) as address
    const addressHex = hash.toString(CryptoJS.enc.Hex).slice(-40);

    // Add '0x' prefix and apply checksum
    return applyEthereumChecksum(`0x${addressHex}`);
  } catch (error) {
    console.error("Error generating Ethereum address:", error);
    throw new Error("Failed to generate Ethereum address");
  }
};
// Generate a real ECDSA wallet with proper key pair and address derivation
const generateRealWallet = (): {
  address: string;
  privateKey: string;
  publicKey: string;
} => {
  try {
    console.log("🔐 Starting ECDSA wallet generation...");

    // Generate a random private key (32 bytes)
    const keyPair = ec.genKeyPair();

    // Get private key as hex string
    const privateKeyHex = keyPair.getPrivate("hex").padStart(64, "0");
    const privateKey = `0x${privateKeyHex}`;

    // Get public key (uncompressed format: 04 + x + y coordinates)
    const publicKeyHex = keyPair.getPublic("hex");
    const publicKey = `0x${publicKeyHex}`;

    // Generate Ethereum address from public key
    const address = generateEthereumAddress(publicKeyHex);

    console.log("✅ Wallet generated successfully");
    console.log("Private key length:", privateKey.length);
    console.log("Public key length:", publicKey.length);
    console.log("Address:", address);

    return {
      address,
      privateKey,
      publicKey,
    };
  } catch (error) {
    console.error("❌ Error generating wallet:", error);
    throw new Error("Failed to generate cryptographic wallet");
  }
};

(async () => {
  // --- 1. Setup ---

  // For testing, let's use a known private key that has tokens
  // In production, use the actual wallet that owns the tokens
  const KNOWN_PRIVATE_KEY =
    "0xa5d69bd2a06efa55f9ca05b121cd0d617e48fdb83940727695812f3de7d70bc3"; // Your test wallet
  const wallet = new ethers.Wallet(KNOWN_PRIVATE_KEY);
  const fromAddress = wallet.address;

  console.log("From Address (Token Owner):", fromAddress);

  const TOKEN_CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c"; // Flow EVM testnet contract
  const tokenContractAddress = TOKEN_CONTRACT_ADDRESS;

  const toAddress = "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c"; // Recipient address (your relayer address)
  const chainId = 545; // flow on evm testnet

  // --- 2. EIP-712 Domain ---
  // This identifies the smart contract and chain you're interacting with.
  // The 'name' and 'version' must match what's defined in your ERC20 contract.

  // IMPORTANT: The 'name' must match exactly what was used when deploying the contract
  // From contract query: name is "somehow"
  const domain = {
    name: "somehow", // This matches the deployed contract name
    version: "1", // The EIP-712 version string from the contract
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
    value: ethers.parseUnits("1", 18), // Transfer 1 token (18 decimals as per contract)
    validAfter: 0n, // Immediately valid (use BigInt for consistency)
    validBefore: BigInt(now + 3600), // Valid for 1 hour (use BigInt for consistency)
    nonce: ethers.randomBytes(32), // A unique, random nonce to prevent replay attacks
  };

  // --- 5. Sign the Message ---
  // This is the core "offline" step. It uses the user's private key to sign the typed data.
  const signature = await wallet.signTypedData(domain, types, transferValue);

  // --- 6. Split signature into v, r, s components ---
  const splitSignature = ethers.Signature.from(signature);

  // --- 7. Output ---
  // These are the parameters someone else (a "relayer") will use to call the contract.
  console.log("--- Transaction Parameters ---");
  console.log("from:        ", transferValue.from);
  console.log("to:          ", transferValue.to);
  console.log("value:       ", transferValue.value.toString());
  console.log("validAfter:  ", transferValue.validAfter.toString());
  console.log("validBefore: ", transferValue.validBefore.toString());
  console.log("nonce:       ", ethers.hexlify(transferValue.nonce));
  console.log("signature:   ", signature);
  console.log("signature length:", signature.length);

  console.log("\n--- Signature Components ---");
  console.log("v:", splitSignature.v);
  console.log("r:", splitSignature.r);
  console.log("s:", splitSignature.s);

  // --- 8. Final JSON Output ---
  console.log("\n--- JSON for submitTxnOnChain.ts script ---");
  console.log("\n```json");
  console.log(
    JSON.stringify(
      {
        from: transferValue.from,
        to: transferValue.to,
        value: transferValue.value.toString(),
        validAfter: transferValue.validAfter.toString(),
        validBefore: transferValue.validBefore.toString(),
        nonce: ethers.hexlify(transferValue.nonce),
        signature: signature, // Combined signature for contract
      },
      null,
      2
    )
  );
  console.log("```");

  console.log("\n--- Legacy format (v, r, s components) ---");
  console.log("v:", splitSignature.v.toString());
  console.log("r:", splitSignature.r);
  console.log("s:", splitSignature.s);

  // --- 9. Verification Step ---
  console.log("\n--- Signature Verification ---");
  try {
    // Recreate the digest that the contract will create
    const recreatedDigest = ethers.TypedDataEncoder.hash(
      domain,
      types,
      transferValue
    );
    console.log("Recreated digest:", recreatedDigest);

    // Recover the signer from our signature
    const recoveredSigner = ethers.recoverAddress(recreatedDigest, signature);
    console.log("Recovered signer:", recoveredSigner);
    console.log("Expected signer:", fromAddress);
    console.log(
      "Signature valid:",
      recoveredSigner.toLowerCase() === fromAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Verification error:", error);
  }
})();
