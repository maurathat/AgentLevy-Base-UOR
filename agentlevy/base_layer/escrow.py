"""HashlockEscrow Python wrapper — Phase 2.8 settlement on Base Sepolia.

Wraps the deployed ``HashlockEscrow`` Solidity contract (see
``contracts/HashlockEscrow.sol``) for use by the AgentLevy buyer agent
(creates escrows) and the compliance agent (submits the final cert to
release funds).

Discipline
----------

* The hashlock is **always** ``sha256(cert_canonical_bytes)`` — this is
  the same SHA-256 used for the cert's UOR-Passport content address, so
  the same canonical bytes that produce a cert's content address also
  produce its escrow hashlock.
* Cert content addresses on AgentLevy are ``sha256:<64hex>`` strings;
  the escrow contract takes a raw 32-byte ``bytes32``. The wrapper
  handles the prefix conversion.
* The buyer wallet must approve USDC to the escrow contract for the
  full amount before calling ``create_escrow``. The wrapper exposes
  ``approve_usdc`` for convenience.

This module is chain-aware (web3.py, EOA private keys, etc.) but
deliberately does not import any AgentLevy primitive types — it
operates on raw content addresses and amounts so it can be tested in
isolation. The orchestrator layer wires the cert chain into it.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from eth_account import Account
from web3 import Web3
from web3.contract import Contract


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CONTENT_ADDRESS_PREFIX = "sha256:"


def content_address_to_hashlock(content_address: str) -> bytes:
    """Convert ``sha256:<64hex>`` to a raw 32-byte hashlock."""
    if not content_address.startswith(CONTENT_ADDRESS_PREFIX):
        raise ValueError(f"expected sha256: prefix, got {content_address[:10]!r}")
    hex_part = content_address[len(CONTENT_ADDRESS_PREFIX):]
    if len(hex_part) != 64:
        raise ValueError(f"expected 64-hex tail, got {len(hex_part)}")
    return bytes.fromhex(hex_part)


def _abi(name: str) -> list[dict]:
    """Load a contract ABI from contracts/abi/<name>.json (project root relative)."""
    here = Path(__file__).resolve()
    abi_path = here.parent.parent.parent / "contracts" / "abi" / f"{name}.json"
    with abi_path.open() as f:
        return json.load(f)["abi"]


# Minimal ERC-20 ABI for approve/balanceOf calls — kept inline to avoid a
# separate fixture file for a 2-method surface.
ERC20_ABI = [
    {"name": "approve", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "spender", "type": "address"},
                {"name": "amount", "type": "uint256"}],
     "outputs": [{"name": "", "type": "bool"}]},
    {"name": "balanceOf", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "account", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}]},
    {"name": "allowance", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "owner", "type": "address"},
                {"name": "spender", "type": "address"}],
     "outputs": [{"name": "", "type": "uint256"}]},
]


# ---------------------------------------------------------------------------
# Connection + contract handles
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BaseConfig:
    rpc_url: str
    chain_id: int
    escrow_address: str
    usdc_address: str

    @classmethod
    def from_env(cls) -> "BaseConfig":
        rpc = os.environ.get("BASE_RPC_URL", "").strip()
        if not rpc:
            raise RuntimeError("BASE_RPC_URL not set in .env")
        escrow = os.environ.get("BASE_ESCROW_ADDRESS", "").strip()
        if not escrow:
            raise RuntimeError(
                "BASE_ESCROW_ADDRESS not set. Run scripts/deploy_escrow.py first."
            )
        usdc = os.environ.get("BASE_USDC_CONTRACT", "").strip()
        if not usdc:
            raise RuntimeError("BASE_USDC_CONTRACT not set in .env")
        # Chain ID: Base Sepolia = 84532, mainnet Base = 8453
        chain_id_str = os.environ.get("BASE_CHAIN_ID", "").strip()
        if chain_id_str:
            chain_id = int(chain_id_str)
        else:
            # Probe the RPC to discover.
            chain_id = Web3(Web3.HTTPProvider(rpc)).eth.chain_id
        return cls(
            rpc_url=rpc,
            chain_id=chain_id,
            escrow_address=Web3.to_checksum_address(escrow),
            usdc_address=Web3.to_checksum_address(usdc),
        )


def _make_web3(cfg: BaseConfig) -> Web3:
    w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    if not w3.is_connected():
        raise RuntimeError(f"Cannot connect to {cfg.rpc_url}")
    return w3


def escrow_contract(cfg: BaseConfig, w3: Optional[Web3] = None) -> Contract:
    """Returns a web3.py Contract handle bound to the deployed HashlockEscrow."""
    w3 = w3 or _make_web3(cfg)
    return w3.eth.contract(address=cfg.escrow_address, abi=_abi("HashlockEscrow"))


def usdc_contract(cfg: BaseConfig, w3: Optional[Web3] = None) -> Contract:
    """Returns a web3.py Contract handle bound to the USDC ERC-20."""
    w3 = w3 or _make_web3(cfg)
    return w3.eth.contract(address=cfg.usdc_address, abi=ERC20_ABI)


# ---------------------------------------------------------------------------
# Public API: read
# ---------------------------------------------------------------------------

@dataclass
class EscrowState:
    """In-memory snapshot of an on-chain Escrow record."""
    escrow_id: bytes  # 32 bytes
    buyer: str
    seller: str
    amount: int       # USDC base units (6 decimals)
    hashlock: bytes   # 32 bytes
    deadline: int     # unix seconds
    released: bool
    refunded: bool

    @property
    def status(self) -> str:
        if self.released:
            return "RELEASED"
        if self.refunded:
            return "REFUNDED"
        return "OPEN"


def get_escrow(cfg: BaseConfig, escrow_id: bytes) -> Optional[EscrowState]:
    """Read an escrow record by ID. Returns None if it doesn't exist."""
    if len(escrow_id) != 32:
        raise ValueError("escrow_id must be 32 bytes")
    contract = escrow_contract(cfg)
    raw = contract.functions.escrows(escrow_id).call()
    buyer, seller, amount, hashlock, deadline, released, refunded = raw
    if buyer == "0x" + "0" * 40:
        return None
    return EscrowState(
        escrow_id=escrow_id,
        buyer=buyer,
        seller=seller,
        amount=amount,
        hashlock=bytes(hashlock),
        deadline=deadline,
        released=released,
        refunded=refunded,
    )


def usdc_balance(cfg: BaseConfig, address: str) -> int:
    """Returns USDC balance of an address in base units (6 decimals)."""
    return usdc_contract(cfg).functions.balanceOf(
        Web3.to_checksum_address(address)
    ).call()


# ---------------------------------------------------------------------------
# Public API: write (require a signing key)
# ---------------------------------------------------------------------------

def _send_tx(w3: Web3, signer_pk: str, fn_call, *, gas: int) -> dict:
    """Build, sign, send a tx for a Web3 contract function call. Wait for receipt."""
    acct = Account.from_key(signer_pk)
    base_fee = w3.eth.gas_price
    tx = fn_call.build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": w3.eth.chain_id,
        "maxFeePerGas": max(base_fee * 2, w3.to_wei("0.01", "gwei")),
        "maxPriorityFeePerGas": w3.to_wei("0.001", "gwei"),
        "gas": gas,
    })
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status != 1:
        raise RuntimeError(f"tx reverted: {tx_hash.hex()}")
    return {"tx_hash": tx_hash.hex(), "block": receipt.blockNumber, "gas": receipt.gasUsed}


def approve_usdc(cfg: BaseConfig, signer_pk: str, amount: int) -> dict:
    """Approve the escrow contract to spend ``amount`` USDC of the signer."""
    w3 = _make_web3(cfg)
    fn = usdc_contract(cfg, w3).functions.approve(cfg.escrow_address, amount)
    return _send_tx(w3, signer_pk, fn, gas=120_000)


def create_escrow(
    cfg: BaseConfig,
    buyer_pk: str,
    *,
    seller: str,
    amount: int,
    expected_cert_content_address: str,
    deadline_unix: int,
    nonce: bytes = b"\x00" * 32,
) -> tuple[bytes, dict]:
    """Create an escrow on the deployed contract.

    Caller must have already called ``approve_usdc(...)`` for at least
    ``amount``. Returns (escrow_id, tx_info).
    """
    if len(nonce) != 32:
        raise ValueError("nonce must be 32 bytes")
    hashlock = content_address_to_hashlock(expected_cert_content_address)

    w3 = _make_web3(cfg)
    fn = escrow_contract(cfg, w3).functions.createEscrow(
        Web3.to_checksum_address(seller),
        amount,
        hashlock,
        deadline_unix,
        nonce,
    )
    tx_info = _send_tx(w3, buyer_pk, fn, gas=350_000)

    # Recompute escrowId locally (must match the contract's keccak256(abi.encode(...))).
    from eth_abi import encode as abi_encode
    buyer_addr = Account.from_key(buyer_pk).address
    encoded = abi_encode(
        ["address", "address", "bytes32", "bytes32"],
        [buyer_addr, Web3.to_checksum_address(seller), hashlock, nonce],
    )
    escrow_id = Web3.keccak(encoded)
    return bytes(escrow_id), tx_info


def finish_escrow(
    cfg: BaseConfig,
    submitter_pk: str,
    *,
    escrow_id: bytes,
    cert_canonical_bytes: bytes,
) -> dict:
    """Submit the cert canonical bytes to release the escrow.

    Anyone holding the cert can submit — the cert is its own proof.
    Conventionally the seller submits to release funds to themselves.
    """
    if len(escrow_id) != 32:
        raise ValueError("escrow_id must be 32 bytes")
    w3 = _make_web3(cfg)
    fn = escrow_contract(cfg, w3).functions.finishEscrow(escrow_id, cert_canonical_bytes)
    return _send_tx(w3, submitter_pk, fn, gas=200_000)


def refund_escrow(cfg: BaseConfig, buyer_pk: str, escrow_id: bytes) -> dict:
    """Buyer reclaims escrowed funds after the deadline."""
    if len(escrow_id) != 32:
        raise ValueError("escrow_id must be 32 bytes")
    w3 = _make_web3(cfg)
    fn = escrow_contract(cfg, w3).functions.refund(escrow_id)
    return _send_tx(w3, buyer_pk, fn, gas=120_000)
