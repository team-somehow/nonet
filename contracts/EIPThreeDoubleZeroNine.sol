// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract EIPThreeDoubleZeroNine is ERC20, Ownable {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using ECDSA for bytes32;

    // Storage for used nonces to prevent signature replay attacks
    EnumerableSet.Bytes32Set private _authorizationUsed;
    
    // Total supply defined here
    uint256 public constant TOTAL_SUPPLY = 1_000_000;

    // Event for authorization usage
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    constructor(string memory name, string memory symbol)
        ERC20(name, symbol)
        Ownable(msg.sender)
    {
        // Mint initial supply to the deployer
        _mint(msg.sender, TOTAL_SUPPLY * 10**decimals());
    }

    /**
     * @notice Executes a transfer using an off-chain signed authorization with simple keccak256 hashing.
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
    require(validAfter <= block.timestamp, "SimpleAuth: valid after");
    require(validBefore >= block.timestamp, "SimpleAuth: valid before");
    require(_authorizationUsed.add(nonce), "SimpleAuth: nonce used");

    bytes32 messageHash = keccak256(
        abi.encodePacked(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            address(this),
            block.chainid
        )
    );

    address recoveredSigner = ECDSA.recover(
        keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)),
        signature
    );
    require(recoveredSigner == from, "SimpleAuth: signature mismatch");

    _transfer(from, to, value);
    emit AuthorizationUsed(from, nonce);
}

    /**
     * @notice Creates 'amount' tokens and assigns them to 'to'.
     * @dev Only callable by the contract owner (the deployer).
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Helper function to generate the message hash for signing
     * @dev This can be used off-chain to generate the correct hash for signing
     */
    function getMessageHash(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) public view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce,
                address(this),
                block.chainid
            )
        );
    }
}
