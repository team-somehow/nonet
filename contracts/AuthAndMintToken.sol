// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; // For signature recovery
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract AuthAndMintToken is ERC20, Ownable, EIP712 {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using ECDSA for bytes32;

    // EIP-3009 Transfer Typehash
    bytes32 private constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    // Storage for used nonces to prevent signature replay attacks
    EnumerableSet.Bytes32Set private _authorizationUsed;
    
    // Total supply defined here
    uint256 public constant TOTAL_SUPPLY = 1_000_000;

    // Event required by EIP-3009
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        Ownable(msg.sender)
        EIP712(name, "1") // EIP-712 Domain: Token Name, Version "1"
    {
        // Mint initial supply to the deployer
        _mint(msg.sender, TOTAL_SUPPLY * 10**decimals());
    }

    // --- Standard ERC-20 Functions (Inherited) ---
    // Includes: transfer, balanceOf, approve, transferFrom

    // --- EIP-3009 Function ---
    
    /**
     * @notice Executes a transfer using an off-chain signed authorization (EIP-3009).
     * @dev The 'from' address signs the message; the transaction sender (msg.sender) is the gas payer.
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes calldata signature
    ) public {
        // 1. Validate Time and Nonce
        require(validAfter <= block.timestamp, "AuthToken: valid after");
        require(validBefore >= block.timestamp, "AuthToken: valid before");
        require(_authorizationUsed.add(nonce), "AuthToken: nonce used");
        
        // 2. Hash the EIP-712 message
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                    from,
                    to,
                    value,
                    validAfter,
                    validBefore,
                    nonce
                )
            )
        );

        // 3. Recover signer address and verify it matches the 'from' address
        address recoveredSigner = digest.recover(signature);
        require(recoveredSigner == from, "AuthToken: signature mismatch");

        // 4. Execute Transfer
        _transfer(from, to, value);
        
        emit AuthorizationUsed(from, nonce);
    }

    // --- Minting Function ---

    /**
     * @notice Creates 'amount' tokens and assigns them to 'to'.
     * @dev Only callable by the contract owner (the deployer).
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}