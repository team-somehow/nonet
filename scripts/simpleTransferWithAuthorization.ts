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
  const KNOWN_PRIVATE_KEY =
    "0xa5d69bd2a06efa55f9ca05b121cd0d617e48fdb83940727695812f3de7d70bc3"; // Your test wallet
  const wallet = new ethers.Wallet(KNOWN_PRIVATE_KEY);
  const fromAddress = wallet.address;

  console.log("From Address (Token Owner):", fromAddress);

  const TOKEN_CONTRACT_ADDRESS = "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c"; // Flow EVM testnet contract
  const tokenContractAddress = TOKEN_CONTRACT_ADDRESS;

  const toAddress = "0x9f1C289Cc26fd335bfF6cF05947787994248CF1c"; // Recipient address
  const chainId = 545; // flow on evm testnet

  // --- 2. Message Parameters ---
  const now = Math.floor(Date.now() / 1000);
  const transferValue = {
    from: fromAddress,
    to: toAddress,
    value: ethers.parseUnits("1", 18), // Transfer 1 token (18 decimals)
    validAfter: 0n, // Immediately valid
    validBefore: BigInt(now + 3600), // Valid for 1 hour
    nonce: ethers.randomBytes(32), // A unique, random nonce to prevent replay attacks
  };

  // --- 3. Create Message Hash (Simple Keccak256) ---
  // This mimics what the contract does: keccak256(abi.encodePacked(...))
  const messageHash = ethers.solidityPackedKeccak256(
    [
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "bytes32",
      "address",
      "uint256",
    ],
    [
      transferValue.from,
      transferValue.to,
      transferValue.value,
      transferValue.validAfter,
      transferValue.validBefore,
      transferValue.nonce,
      tokenContractAddress, // Contract address
      chainId, // Chain ID
    ]
  );

  console.log("Message Hash:", messageHash);

  // --- 4. Sign the Message Hash ---
  // The contract expects an Ethereum signed message, so we need to add the prefix
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  // --- 5. Split signature into v, r, s components ---
  const splitSignature = ethers.Signature.from(signature);

  // --- 6. Output ---
  console.log("--- Transaction Parameters ---");
  console.log("from:        ", transferValue.from);
  console.log("to:          ", transferValue.to);
  console.log("value:       ", transferValue.value.toString());
  console.log("validAfter:  ", transferValue.validAfter.toString());
  console.log("validBefore: ", transferValue.validBefore.toString());
  console.log("nonce:       ", ethers.hexlify(transferValue.nonce));
  console.log("messageHash: ", messageHash);
  console.log("signature:   ", signature);
  console.log("signature length:", signature.length);

  console.log("\n--- Signature Components ---");
  console.log("v:", splitSignature.v);
  console.log("r:", splitSignature.r);
  console.log("s:", splitSignature.s);

  // --- 7. Final JSON Output ---
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

  // --- 8. Verification Step ---
  console.log("\n--- Signature Verification ---");
  try {
    // Recreate the message hash
    const recreatedMessageHash = ethers.solidityPackedKeccak256(
      [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
        "address",
        "uint256",
      ],
      [
        transferValue.from,
        transferValue.to,
        transferValue.value,
        transferValue.validAfter,
        transferValue.validBefore,
        transferValue.nonce,
        tokenContractAddress,
        chainId,
      ]
    );

    console.log("Recreated message hash:", recreatedMessageHash);
    console.log("Hashes match:", messageHash === recreatedMessageHash);

    // Recover the signer from our signature
    const recoveredSigner = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      signature
    );
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
