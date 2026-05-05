// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title HashlockEscrow — minimal cert-hash conditional release for AgentLevy on Base
/// @notice Buyer escrows USDC with a hashlock on the expected final-cert content
///         address. Anyone can submit the cert payload; if its SHA-256 matches
///         the hashlock, the escrow releases to the seller. The buyer can refund
///         after the deadline if no valid cert is submitted.
///
/// Design notes
/// ------------
/// * Deliberately minimal — the AgentLevy whitepaper §7.1 makes a big deal about
///   small verifier surface. ~50 LoC of Solidity, no external calls beyond the
///   ERC-20 transferFrom/transfer pair.
/// * Hashlock uses SHA-256 (not keccak256) to align with the project's
///   UOR-Passport content addressing — every cert's content_address is
///   `sha256:<hex>` of canonical bytes.
/// * Single contract holds many escrows keyed by escrowId (deterministic from
///   buyer + seller + nonce + hashlock).
/// * One ERC-20 supported per deployment (USDC by default) for surface
///   minimization. Multi-asset variants are out of scope for the demo.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract HashlockEscrow {
    IERC20 public immutable token;

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        bytes32 hashlock;       // sha256 of expected cert canonical bytes
        uint256 deadline;       // unix; after this, buyer can refund if not released
        bool released;
        bool refunded;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        bytes32 hashlock,
        uint256 deadline
    );
    event EscrowReleased(bytes32 indexed escrowId, bytes32 certHash);
    event EscrowRefunded(bytes32 indexed escrowId);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    /// @notice Create a new escrow. Buyer must have approved this contract for `amount` first.
    /// @param seller   Recipient of the funds when the cert hash matches.
    /// @param amount   USDC base units (6 decimals on Base).
    /// @param hashlock SHA-256 of the expected final cert's canonical bytes.
    /// @param deadline Unix timestamp; after this, buyer can refund.
    /// @param nonce    Buyer-chosen uniqueness for the escrowId derivation.
    /// @return escrowId Deterministic ID for this escrow.
    function createEscrow(
        address seller,
        uint256 amount,
        bytes32 hashlock,
        uint256 deadline,
        bytes32 nonce
    ) external returns (bytes32 escrowId) {
        require(seller != address(0), "seller=0");
        require(amount > 0, "amount=0");
        require(deadline > block.timestamp, "deadline past");

        escrowId = keccak256(abi.encode(msg.sender, seller, hashlock, nonce));
        require(escrows[escrowId].buyer == address(0), "exists");

        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            hashlock: hashlock,
            deadline: deadline,
            released: false,
            refunded: false
        });

        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom failed");

        emit EscrowCreated(escrowId, msg.sender, seller, amount, hashlock, deadline);
    }

    /// @notice Submit the cert payload. If sha256(payload) matches the
    ///         hashlock, releases the escrow to the seller. Anyone can call —
    ///         the cert is its own proof.
    function finishEscrow(bytes32 escrowId, bytes calldata certPayload) external {
        Escrow storage e = escrows[escrowId];
        require(e.buyer != address(0), "no escrow");
        require(!e.released, "released");
        require(!e.refunded, "refunded");
        require(sha256(certPayload) == e.hashlock, "cert mismatch");

        e.released = true;
        require(token.transfer(e.seller, e.amount), "transfer failed");

        emit EscrowReleased(escrowId, sha256(certPayload));
    }

    /// @notice Buyer refund after the deadline if no valid cert was submitted.
    function refund(bytes32 escrowId) external {
        Escrow storage e = escrows[escrowId];
        require(e.buyer != address(0), "no escrow");
        require(msg.sender == e.buyer, "not buyer");
        require(!e.released, "released");
        require(!e.refunded, "refunded");
        require(block.timestamp >= e.deadline, "before deadline");

        e.refunded = true;
        require(token.transfer(e.buyer, e.amount), "transfer failed");

        emit EscrowRefunded(escrowId);
    }
}
