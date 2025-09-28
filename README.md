# 🌐 NONET - Decentralized Mesh Network for Offline Blockchain Transactions

> **Revolutionary application enabling cryptocurrency transactions through Bluetooth Low Energy mesh networking - no internet required!**

[![React Native](https://img.shields.io/badge/React%20Native-0.81.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0.10-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-~5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 What is NONET?

NONET is a groundbreaking mobile application that enables **offline cryptocurrency transactions** using Bluetooth Low Energy (BLE) mesh networking. When you don't have internet access, NONET creates a peer-to-peer network with nearby devices, allowing your transaction to "hop" through multiple devices until it reaches someone with internet connectivity who can broadcast it to the blockchain.

### ⚡ Key Features

- 📡 **Mesh Network Transactions** - Send crypto without internet
- 🔐 **Multi-Chain Support** - Flow, Hedera, Ethereum compatible
- ⚡ **BLE Protocol** - Custom packet fragmentation system
- 🛡️ **EIP-3009 Integration** - Gasless meta-transactions
- 📱 **Mobile-First** - Native Android experience
- 🎨 **Modern UI** - Clean, intuitive design system

---

## 🛠 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

```bash
# Required
Node.js 18+
npm or yarn
Git

# For mobile development
Android Studio (for Android)
```

### 📱 Installation & Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/nonet.git
   cd nonet
   ```

2. **Navigate to App Directory**

   ```bash
   cd nonet-app-node
   ```

3. **Install Dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

4. **Install Expo CLI (if not already installed)**
   ```bash
   npm install -g @expo/cli
   ```

### 🚀 Running the Application

#### Development Mode

```bash
# Start the Expo development server
npm start

# This will open Expo DevTools in your browser
# Scan the QR code with Expo Go app (Android)
# Or press 'a' for Android emulator
```

#### Platform-Specific Commands

```bash
# Android (requires Android Studio/emulator)
npm run android

# Web (for testing UI components)
npm run web
```

#### Production Build

```bash
# Build for Android
npm run build
```

### 📋 Required Permissions

The app requires the following permissions to function:

#### Android

- `BLUETOOTH` - For BLE communication
- `BLUETOOTH_ADMIN` - For BLE advertising
- `ACCESS_FINE_LOCATION` - Required for BLE scanning on Android
- `CAMERA` - For QR code scanning

---

## 📁 Repository Structure

```
nonet/
├── 📱 nonet-app-node/           # Main React Native application
│   ├── app/                     # Expo Router pages
│   │   ├── (tabs)/             # Tab-based navigation
│   │   │   ├── index.tsx       # Home/Dashboard
│   │   │   ├── mesh.tsx        # Mesh network status
│   │   │   └── show.tsx        # Transaction history
│   │   ├── transaction.tsx     # Send transaction
│   │   └── wallet-demo.tsx     # Wallet management
│   ├── components/             # Reusable UI components
│   │   ├── NeoBrutalismComponents.tsx  # UI components
│   │   └── ui/                 # Base UI components
│   ├── contexts/               # React Context providers
│   │   ├── BleContext.tsx      # 🔥 Core BLE mesh networking
│   │   └── WalletContext.tsx   # Wallet state management
│   ├── utils/                  # Utility functions
│   │   └── bleUtils.ts         # 🔥 BLE protocol implementation
│   ├── lib/                    # Business logic
│   │   └── multiChainTransaction.ts  # 🔥 Blockchain integration
│   └── data/
│       └── chains.ts           # Supported blockchain configs
├── 📜 contracts/               # Smart contracts
│   ├── AuthAndMintToken.sol    # EIP-3009 implementation
│   └── EIPThreeDoubleZeroNine.sol
├── 🛠 scripts/                 # Utility scripts
└── 📚 Documentation files
```

### 🔥 Core Files Explained

#### `contexts/BleContext.tsx`

The heart of the mesh networking system. Manages:

- BLE device scanning and advertising
- Packet fragmentation and reassembly
- Message state tracking
- Internet gateway detection

#### `utils/bleUtils.ts`

Low-level BLE protocol implementation:

- Packet encoding/decoding
- Message fragmentation algorithm
- BLE advertising and scanning functions

#### `lib/multiChainTransaction.ts`

Blockchain integration layer:

- Multi-chain transaction support
- EIP-3009 meta-transaction implementation
- Gas estimation and fee management

---

## 🔧 Technical Deep Dive

### How Mesh Networking Works

NONET implements a custom protocol over Bluetooth Low Energy (BLE) to create a mesh network:

#### 1. **Packet Structure**

Each BLE advertisement carries an 11-byte payload:

```
┌─────────────┬─────────────┬─────────────┬─────────────────────┐
│     ID      │ Total Chunks│ Chunk Index │        Data         │
│   1 byte    │   1 byte    │   1 byte    │      8 bytes        │
│  (0-255)    │  (0-255)    │  (0-127)    │    (payload)        │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
```

#### 2. **Message Fragmentation**

Large transactions are split into 8-byte chunks:

```typescript
const HEADER_SIZE = 3;
const DATA_PER_CHUNK = 8;
const MAX_PAYLOAD_SIZE = HEADER_SIZE + DATA_PER_CHUNK;
```

#### 3. **Network Topology**

```
[Device A] --BLE--> [Device B] --BLE--> [Device C] --Internet--> [Blockchain]
   (Sender)         (Relay)           (Gateway)
```

#### 4. **State Management**

Each device maintains a master state of all active messages:

```json
{
    "packet.id": {
        "ack_mode": false,
        "is_complete": false,
        "number_of_chunks": 10,
        "data": {
            1: "binary_chunk_1",
            2: "binary_chunk_2",
            ...
        }
    }
}
```

### BLE Protocol Flow

1. **Message Creation**: Transaction data is encoded and fragmented
2. **Broadcasting**: Fragments are advertised via BLE GAP
3. **Relay Propagation**: Nearby devices receive and re-broadcast
4. **Gateway Processing**: Internet-connected device submits to blockchain
5. **Acknowledgment**: Response propagates back through mesh network

### Blockchain Integration

#### Supported Networks

- **Flow EVM Testnet** (Chain ID: 545)
- **Hedera Testnet** (Chain ID: 296)
- **Ethereum Sepolia** (Chain ID: 11155111)

#### Smart Contract Addresses

- **Hedera Testnet**: [`0xc6C46289fA5FdC583Cdb5e5C2900af4333423787`](https://hashscan.io/testnet/contract/0.0.6915692)
- **Flow Testnet**: [`0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01`](https://evm-testnet.flowscan.io/address/0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01)

#### EIP-3009 Meta-Transactions

NONET implements EIP-3009 for gasless transactions:

```solidity
function transferWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes calldata signature
) public
```

**Benefits:**

- Third parties can pay gas fees
- Transactions signed offline
- Replay attack protection via nonces

---

## 🎯 Usage Guide

### 1. **Create/Import Wallet**

- Generate new wallet or import existing private key
- Wallet stored securely on device

### 2. **Send Transaction**

- Enter recipient address (or scan QR code)
- Specify amount and select blockchain
- Sign transaction offline

### 3. **Mesh Broadcasting**

- Transaction fragments broadcast via BLE
- Nearby NONET devices automatically relay
- Continues until reaching internet-connected device

### 4. **Blockchain Submission**

- Gateway device submits to blockchain
- Confirmation propagates back through mesh
- Transaction appears in recipient's wallet

---

## 🔒 Security Features

### Cryptographic Security

- **ECDSA Signatures**: All transactions cryptographically signed
- **EIP-712**: Structured data signing for meta-transactions
- **Nonce Protection**: Prevents replay attacks

### Network Security

- **Packet Ordering**: Fragments reassembled in correct sequence
- **Duplicate Prevention**: Each packet processed only once
- **Data Integrity**: Binary data verified during reassembly

### Privacy

- **Non-Custodial**: Users control private keys
- **Local Storage**: Keys encrypted on device
- **Pseudonymous**: Addresses don't reveal identity

---

## 🚀 Development

### Customizing BLE Protocol

The BLE protocol can be modified in `utils/bleUtils.ts`:

- Adjust packet structure
- Modify fragmentation algorithm
- Change advertising parameters

### UI Customization

NONET uses a modern design system (`components/NeoBrutalismComponents.tsx`):

- Clean typography
- Intuitive color scheme
- Responsive design elements

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### BLE Testing

- Requires physical devices (BLE doesn't work in simulators)
- Test with multiple devices for mesh functionality
- Use Android devices for best BLE compatibility

### Blockchain Testing

- Use testnet tokens (available from faucets)
- Test transactions on supported networks
- Verify smart contract interactions

---

## 🤝 Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Maintain design consistency
- Test BLE functionality on physical devices
- Document new features thoroughly

---

## 📊 Performance Metrics

### BLE Transmission

- **Advertisement Interval**: 250ms per packet
- **Data Rate**: ~32 bytes/second per connection
- **Range**: ~100 meters in open space
- **Concurrent Connections**: Device-dependent

### Network Scalability

- **Optimal Mesh Size**: 5-20 nodes
- **Maximum Message Size**: ~1KB (127 chunks × 8 bytes)
- **Typical Transaction**: 3-5 chunks (~200-400 bytes)

---

## 🛣 Roadmap

### Phase 1: Core Features ✅

- [x] BLE mesh networking
- [x] Multi-chain transactions
- [x] EIP-3009 integration
- [x] Modern UI design

### Phase 2: Enhanced Features 🚧

- [ ] Advanced routing algorithms
- [ ] Network topology visualization
- [ ] Performance optimizations
- [ ] Additional blockchain support

### Phase 3: Advanced Features 📋

- [ ] LoRa integration for extended range
- [ ] Layer 2 scaling solutions
- [ ] Cross-chain bridges
- [ ] Reputation system for relays
- [ ] Response authenticity verification (signature-based validation to prevent fake data injection)

---

## 🐛 Troubleshooting

### Common Issues

#### BLE Not Working

- Ensure location permissions granted (Android)
- Check Bluetooth is enabled
- Test on physical devices (not simulators)

#### Transaction Failures

- Verify sufficient balance for gas fees
- Check network connectivity for gateway devices
- Ensure valid recipient addresses

#### App Crashes

- Clear app data and restart
- Check React Native logs: `npx react-native log-android`
- Verify all dependencies installed correctly

### Debug Mode

Enable debug logging in `contexts/BleContext.tsx`:

```typescript
const DEBUG = true; // Set to true for verbose logging
```
