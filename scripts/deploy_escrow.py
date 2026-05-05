"""One-shot deploy of contracts/HashlockEscrow.sol to Base Sepolia.

Compiles via py-solc-x (auto-installs solc 0.8.20 on first run), deploys
using the buyer wallet's private key from .env, prints the deployed
address, and writes it back into .env as BASE_ESCROW_ADDRESS.

Usage:
    source .venv/bin/activate
    pip install py-solc-x
    python scripts/deploy_escrow.py

Cost: ~0.0001 ETH testnet on Base Sepolia. Run once. The same contract
serves all subsequent escrows (one contract holds many escrow records
keyed by escrowId).
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

ENV = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV)

CONTRACT_PATH = Path(__file__).resolve().parent.parent / "contracts" / "HashlockEscrow.sol"
SOLC_VERSION = "0.8.20"


def _require(name: str) -> str:
    val = os.environ.get(name, "").strip()
    if not val:
        sys.exit(f"FATAL: {name} not set in {ENV}")
    return val


def main() -> None:
    try:
        from solcx import compile_source, install_solc, set_solc_version
    except ImportError:
        sys.exit("py-solc-x not installed. Run: pip install py-solc-x")

    from web3 import Web3
    from eth_account import Account

    rpc = _require("BASE_RPC_URL")
    usdc = _require("BASE_USDC_CONTRACT")
    deployer_pk = _require("BASE_BUYER_PRIVATE_KEY")  # buyer wallet pays for deploy

    print(f"Compiling {CONTRACT_PATH.name} with solc {SOLC_VERSION}...")
    install_solc(SOLC_VERSION)
    set_solc_version(SOLC_VERSION)
    compiled = compile_source(
        CONTRACT_PATH.read_text(),
        output_values=["abi", "bin"],
        solc_version=SOLC_VERSION,
    )
    contract_id, contract_iface = next(
        (k, v) for k, v in compiled.items() if k.endswith(":HashlockEscrow")
    )
    abi = contract_iface["abi"]
    bytecode = contract_iface["bin"]
    print(f"  ✓ compiled ({len(bytecode)//2} bytes)")

    w3 = Web3(Web3.HTTPProvider(rpc))
    if not w3.is_connected():
        sys.exit(f"Cannot connect to {rpc}")

    deployer = Account.from_key(deployer_pk)
    print(f"Deployer: {deployer.address}")
    bal = w3.eth.get_balance(deployer.address)
    print(f"  ETH balance: {w3.from_wei(bal, 'ether')}")

    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    # Base Sepolia gas is cheap (~0.001 gwei base fee). Use modest values
    # so the deploy fits in the small testnet faucet drip.
    base_fee = w3.eth.gas_price  # current network gas price
    tx = Contract.constructor(usdc).build_transaction({
        "from": deployer.address,
        "nonce": w3.eth.get_transaction_count(deployer.address),
        "chainId": w3.eth.chain_id,
        "maxFeePerGas": max(base_fee * 2, w3.to_wei("0.01", "gwei")),
        "maxPriorityFeePerGas": w3.to_wei("0.001", "gwei"),
        "gas": 3_000_000,  # bumped: Base L2 includes L1 data costs in gas
    })
    est_cost_eth = w3.from_wei(tx["maxFeePerGas"] * tx["gas"], "ether")
    print(f"  Est. max cost: {est_cost_eth} ETH")
    signed = deployer.sign_transaction(tx)
    print("Submitting deploy tx...")
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"  tx: {tx_hash.hex()}")
    print("  waiting for receipt...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status != 1:
        sys.exit(f"Deploy failed. Receipt: {receipt}")

    addr = receipt.contractAddress
    print()
    print("✓ Deployed.")
    print(f"  Address:        {addr}")
    print(f"  Block:          {receipt.blockNumber}")
    print(f"  Gas used:       {receipt.gasUsed:,}")
    print(f"  Explorer:       https://sepolia.basescan.org/address/{addr}")
    print(f"  Underlying USDC: {usdc}")

    # Write the address back into .env
    text = ENV.read_text()
    text = re.sub(
        r"^BASE_ESCROW_ADDRESS=.*$",
        f"BASE_ESCROW_ADDRESS={addr}",
        text,
        count=1,
        flags=re.MULTILINE,
    )
    ENV.write_text(text)
    print(f"  ✓ BASE_ESCROW_ADDRESS written to .env")


if __name__ == "__main__":
    main()
