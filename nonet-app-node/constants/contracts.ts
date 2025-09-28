// Contract configuration constants
export const CONTRACT_CONFIG = {
  RPC_URL: "https://testnet.evm.nodes.onflow.org",
  CONTRACT_ADDRESS: "0xc7a5Fd47Bc5725600E03124263056C897fb96b6c",
  RELAYER_PRIVATE_KEY:
    "0xa5d69bd2a06efa55f9ca05b121cd0d617e48fdb83940727695812f3de7d70bc3",
};

// Contract ABI for transferWithAuthorization function
export const CONTRACT_ABI = [
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

// Transaction payload structure for mesh network broadcasting
export interface TransactionPayload {
  type: "TRANSFER_WITH_AUTHORIZATION";
  contractAddress: string;
  functionName: string;
  parameters: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
    signature: string;
  };
}
