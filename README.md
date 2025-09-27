```json
{
    "packet.id": {
        "ack_mode": false,      // as soon as the first ack is received this is toggled to `true`, is_complete is toggled back to `false`, `number_of_chunks` are reset, and `data` is reset
        "is_complete": false,   // this kept to check if all data packets are recieved
        "number_of_chunks": 10  // total number of possible chunks
        "data": {
            1: "101010010100001001",
            2: "101010010100001001",
            3: "101010010100001001",
            ....
            9: "101010010100001001",
            10: "101010010100001001",
        }
    }
}
```

ERC 20 Hedera Testnet Contract Addresses: (0xc6C46289fA5FdC583Cdb5e5C2900af4333423787)[https://hashscan.io/testnet/contract/0.0.6915692]
Flow Tesnet contract: (0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01)[https://evm-testnet.flowscan.io/address/0x8569641E34E1f9A985D85104f2C55c8c5c0cDb01]