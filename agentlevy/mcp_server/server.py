"""AgentLevy MCP server — verification tools for human auditors via KIRO.

Phase 5 of the AgentLevy roadmap: an MCP (Model Context Protocol) server
that exposes the protocol's verification primitives as tools the IDE-agent
in KIRO (or Claude Desktop, or any MCP host) can call. A regulator,
internal auditor, or counterparty's due-diligence team installs this MCP
server and asks their IDE-agent to walk through a cert chain.

Tools exposed
-------------

  verify_cert(content_address, cert_json)
      Recompute sha256 over canonical bytes, validate Ed25519 signature,
      return structured verdict.

  expand_cert_chain(root_cert_json, depth=5)
      Walk subcontract_cert_addresses recursively (in this stateless
      version, the caller passes resolved cert JSONs since we don't have
      a registry yet). Returns the full tree.

  verify_hedera_anchor(content_address, hcs_topic, sequence_number)
      Query Hedera Mirror Node REST. Confirm the message body at the
      given (topic, sequence) decodes to content_address.

  verify_base_escrow(escrow_id, expected_hashlock)
      Read the deployed Base escrow contract state. Confirm the escrow's
      hashlock matches the expected cert content_address. Return current
      state (OPEN | RELEASED | REFUNDED).

  audit_cert_chain(cert_json)
      Composite tool: runs verify_cert + verify_hedera_anchor on a single
      cert and returns a structured audit report. The IDE-agent typically
      calls this for each cert in a chain to produce a full audit.

  emit_audit_cert(audit_results, auditor_seller_pubkey)
      Build a DerivationCert that attests to the audit just performed.
      Signs with a provided keypair seed (auditor's own). The audit becomes
      another link in the cert chain — recursive verifiability.

Discipline
----------

The MCP server holds no signing keys for the AgentLevy protocol's parties.
It only verifies and (optionally) signs *audit-summary* certs with the
auditor's own keypair, supplied per-call.

KIRO integration
----------------

Install this server in KIRO via ``~/.kiro/mcp.json``:

    {
      "mcpServers": {
        "agentlevy": {
          "command": "python",
          "args": ["-m", "agentlevy.mcp_server.server"],
          "cwd": "/path/to/AgentLevy-Base-UOR",
          "env": { "PYTHONPATH": "/path/to/AgentLevy-Base-UOR" }
        }
      }
    }

Then in KIRO: open the IDE, the MCP server is auto-discovered. Ask the
IDE-agent things like:

    "Audit cert sha256:eb22931717fea26f078b1b934c7c39ac7070de4c56c8a088594ed926951b4667
     against Hedera topic 0.0.8856047."

The agent will call verify_cert + verify_hedera_anchor + audit_cert_chain
and walk you through the verification step by step.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# Make the project root importable so tools can use the existing primitives.
ROOT = Path(__file__).resolve().parent.parent.parent
import sys
sys.path.insert(0, str(ROOT))

from agentlevy.primitives.canonical import to_canonical_bytes
from agentlevy.primitives.cert import DerivationCert
from agentlevy.primitives.signing import (
    Keypair,
    public_key_hex,
    sign,
    signature_hex,
    verify,
)


SERVER_NAME = "agentlevy"
SERVER_VERSION = "0.1.0"

# Hedera Mirror Node base URL (testnet by default; configurable).
DEFAULT_MIRROR_URL = os.environ.get(
    "HEDERA_MIRROR_NODE_URL",
    "https://testnet.mirrornode.hedera.com",
)


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS: list[Tool] = [
    Tool(
        name="verify_cert",
        description=(
            "Verify a DerivationCert: recompute sha256 of canonical bytes, "
            "confirm it matches the claimed content_address, validate the "
            "Ed25519 signature against seller_pubkey. Returns a structured "
            "verdict with detailed sub-checks."
        ),
        inputSchema={
            "type": "object",
            "required": ["content_address", "cert_json"],
            "properties": {
                "content_address": {
                    "type": "string",
                    "description": "Expected sha256:<hex> address",
                },
                "cert_json": {
                    "type": "object",
                    "description": "The full DerivationCert as JSON (model_dump output)",
                },
            },
        },
    ),
    Tool(
        name="verify_hedera_anchor",
        description=(
            "Verify that a content_address was anchored on Hedera HCS at the "
            "given topic + sequence. Calls Hedera Mirror Node REST API. "
            "Returns the consensus_timestamp + message body match status."
        ),
        inputSchema={
            "type": "object",
            "required": ["content_address", "hcs_topic", "sequence_number"],
            "properties": {
                "content_address": {"type": "string"},
                "hcs_topic": {"type": "string"},
                "sequence_number": {"type": "integer"},
                "mirror_url": {"type": "string"},
            },
        },
    ),
    Tool(
        name="audit_cert_chain",
        description=(
            "Composite audit: runs verify_cert + verify_hedera_anchor for one "
            "cert. Returns a structured audit-summary with per-step results. "
            "Use this as the building block for full-chain audits — call once "
            "per cert in the chain."
        ),
        inputSchema={
            "type": "object",
            "required": ["cert_json"],
            "properties": {
                "cert_json": {"type": "object"},
                "expected_address": {
                    "type": "string",
                    "description": "Optional. If supplied, verify the cert's "
                                   "computed content_address matches this.",
                },
                "mirror_url": {"type": "string"},
            },
        },
    ),
    Tool(
        name="verify_base_escrow",
        description=(
            "Read the live Base Sepolia HashlockEscrow contract state for a "
            "given escrow_id. Returns the escrow record (buyer, seller, "
            "amount, hashlock, deadline, released, refunded) and confirms "
            "the on-chain hashlock matches the expected cert content_address. "
            "Read-only — no transactions are submitted."
        ),
        inputSchema={
            "type": "object",
            "required": ["escrow_id_hex", "expected_cert_address"],
            "properties": {
                "escrow_id_hex": {
                    "type": "string",
                    "description": "Escrow ID as hex string (with or without 0x prefix), 64 hex chars",
                },
                "expected_cert_address": {
                    "type": "string",
                    "description": "Expected sha256:<hex> address that should be the hashlock",
                },
                "rpc_url": {
                    "type": "string",
                    "description": "Optional Base RPC URL override (default: BASE_RPC_URL env)",
                },
                "contract_address": {
                    "type": "string",
                    "description": "Optional contract address override (default: BASE_ESCROW_ADDRESS env)",
                },
            },
        },
    ),
    Tool(
        name="emit_audit_cert",
        description=(
            "Build and sign an audit-summary DerivationCert that attests to "
            "the audit just performed. The audit cert is itself a UOR-Passport-"
            "addressed, signable artifact — meaning the audit becomes another "
            "link in the cert chain. Returns the cert JSON ready for HCS "
            "anchoring (which is done outside this MCP server)."
        ),
        inputSchema={
            "type": "object",
            "required": ["audited_cert_address", "audit_results", "auditor_seed_hex"],
            "properties": {
                "audited_cert_address": {
                    "type": "string",
                    "description": "Content address of the cert that was audited",
                },
                "audit_results": {
                    "type": "object",
                    "description": "Output from audit_cert_chain (or merged from multiple)",
                },
                "auditor_seed_hex": {
                    "type": "string",
                    "description": "32-byte hex seed for the auditor's Ed25519 key. "
                                   "Provide via KIRO env config — never hardcode.",
                },
                "task_spec_address": {
                    "type": "string",
                    "description": "The TaskSpec governing the original work (optional)",
                },
            },
        },
    ),
]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def _verify_cert_impl(content_address: str, cert_json: dict) -> dict:
    """Re-derive the cert's content address and verify its signature."""
    try:
        cert = DerivationCert.model_validate(cert_json)
    except Exception as e:
        return {
            "ok": False,
            "stage": "parse",
            "error": f"Could not parse cert as DerivationCert: {e}",
        }

    # Recompute content address
    computed = cert.content_address()
    address_match = computed == content_address

    # Verify signature
    sig_ok = cert.verify_signature() if cert.signature else False

    return {
        "ok": address_match and sig_ok,
        "stage": "ok" if (address_match and sig_ok) else "fail",
        "checks": {
            "address_match": {
                "ok": address_match,
                "computed": computed,
                "claimed": content_address,
            },
            "signature_valid": {
                "ok": sig_ok,
                "signer_pubkey": cert.seller_pubkey,
            },
        },
        "cert_summary": {
            "operation": cert.operation_description.get("operation"),
            "timestamp": cert.timestamp.isoformat(),
            "subcontract_count": len(cert.subcontract_cert_addresses),
        },
    }


def _verify_hedera_anchor_impl(
    content_address: str,
    hcs_topic: str,
    sequence_number: int,
    mirror_url: str | None = None,
) -> dict:
    """Query the Hedera Mirror Node REST API for the anchor message."""
    base = (mirror_url or DEFAULT_MIRROR_URL).rstrip("/")
    url = f"{base}/api/v1/topics/{hcs_topic}/messages/{sequence_number}"
    try:
        r = httpx.get(url, timeout=10.0)
    except httpx.RequestError as e:
        return {"ok": False, "stage": "network", "error": str(e), "url": url}

    if r.status_code != 200:
        return {
            "ok": False,
            "stage": "http",
            "status_code": r.status_code,
            "url": url,
            "body_preview": r.text[:200],
        }

    data = r.json()
    encoded = data.get("message", "")
    try:
        decoded = base64.b64decode(encoded).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        decoded = None

    body_match = decoded == content_address
    return {
        "ok": body_match,
        "stage": "ok" if body_match else "fail",
        "url": url,
        "consensus_timestamp": data.get("consensus_timestamp"),
        "running_hash": data.get("running_hash"),
        "message_decoded": decoded,
        "expected": content_address,
    }


def _audit_cert_chain_impl(
    cert_json: dict,
    expected_address: str | None = None,
    mirror_url: str | None = None,
) -> dict:
    """Composite: cert verification + (if anchored) Hedera anchor verification."""
    try:
        cert = DerivationCert.model_validate(cert_json)
    except Exception as e:
        return {"ok": False, "stage": "parse", "error": str(e)}

    address = cert.content_address()
    if expected_address and address != expected_address:
        return {
            "ok": False,
            "stage": "address",
            "error": "Computed content_address does not match expected.",
            "computed": address,
            "expected": expected_address,
        }

    cert_check = _verify_cert_impl(address, cert_json)

    anchor_check: dict | None = None
    if cert.hcs_receipt:
        anchor_check = _verify_hedera_anchor_impl(
            address,
            cert.hcs_receipt.topic_id,
            cert.hcs_receipt.sequence_number,
            mirror_url=mirror_url,
        )

    return {
        "ok": cert_check["ok"] and (anchor_check is None or anchor_check["ok"]),
        "audited_address": address,
        "audited_at": datetime.now(timezone.utc).isoformat(),
        "cert_verification": cert_check,
        "anchor_verification": anchor_check,
    }


def _verify_base_escrow_impl(
    escrow_id_hex: str,
    expected_cert_address: str,
    rpc_url: str | None = None,
    contract_address: str | None = None,
) -> dict:
    """Read the deployed HashlockEscrow contract state for a given escrow_id."""
    try:
        from agentlevy.base_layer.escrow import (
            BaseConfig,
            content_address_to_hashlock,
            get_escrow,
        )
    except ImportError as e:
        return {"ok": False, "stage": "import", "error": str(e)}

    # Allow per-call overrides without polluting the env.
    rpc = rpc_url or os.environ.get("BASE_RPC_URL", "https://sepolia.base.org")
    escrow_addr = contract_address or os.environ.get("BASE_ESCROW_ADDRESS", "")
    if not escrow_addr:
        return {"ok": False, "stage": "config", "error": "BASE_ESCROW_ADDRESS not set"}

    try:
        from web3 import Web3
        cfg = BaseConfig(
            rpc_url=rpc,
            chain_id=Web3(Web3.HTTPProvider(rpc)).eth.chain_id,
            escrow_address=Web3.to_checksum_address(escrow_addr),
            usdc_address=Web3.to_checksum_address(
                os.environ.get("BASE_USDC_CONTRACT", "0x036CbD53842c5426634e7929541eC2318f3dCF7e")
            ),
        )

        escrow_id_bytes = bytes.fromhex(escrow_id_hex.removeprefix("0x"))
        if len(escrow_id_bytes) != 32:
            return {"ok": False, "stage": "input", "error": "escrow_id must be 32 bytes (64 hex chars)"}

        state = get_escrow(cfg, escrow_id_bytes)
        if state is None:
            return {"ok": False, "stage": "lookup", "error": "Escrow not found on-chain"}

        # Compare on-chain hashlock against expected cert address
        expected_hashlock = content_address_to_hashlock(expected_cert_address)
        hashlock_match = state.hashlock == expected_hashlock

        return {
            "ok": hashlock_match,
            "stage": "ok" if hashlock_match else "fail",
            "escrow": {
                "buyer": state.buyer,
                "seller": state.seller,
                "amount_usdc": state.amount / 1e6,
                "amount_base_units": state.amount,
                "hashlock_hex": state.hashlock.hex(),
                "deadline": state.deadline,
                "deadline_iso": datetime.fromtimestamp(state.deadline, timezone.utc).isoformat(),
                "released": state.released,
                "refunded": state.refunded,
                "status": state.status,
            },
            "hashlock_check": {
                "ok": hashlock_match,
                "expected_address": expected_cert_address,
                "expected_hashlock_hex": expected_hashlock.hex(),
                "on_chain_hashlock_hex": state.hashlock.hex(),
            },
            "explorer_url": f"https://sepolia.basescan.org/address/{cfg.escrow_address}",
        }
    except Exception as e:
        return {"ok": False, "stage": "rpc", "error": str(e), "type": type(e).__name__}


def _emit_audit_cert_impl(
    audited_cert_address: str,
    audit_results: dict,
    auditor_seed_hex: str,
    task_spec_address: str | None = None,
) -> dict:
    """Sign an audit-summary DerivationCert with the auditor's keypair."""
    try:
        seed = bytes.fromhex(auditor_seed_hex.removeprefix("0x"))
    except ValueError as e:
        return {"ok": False, "error": f"auditor_seed_hex invalid: {e}"}
    if len(seed) != 32:
        return {"ok": False, "error": f"auditor_seed must be 32 bytes, got {len(seed)}"}

    auditor_kp = Keypair.from_seed(seed)

    # Build an audit cert. We use the same DerivationCert envelope —
    # the audit's content address is sha256 of:
    #   - operation: "audit.cert_verification"
    #   - subcontract_cert_addresses: [audited_cert_address]
    #   - operation_description: {audit_results: ...}
    audit_output_address = "sha256:" + hashlib.sha256(
        to_canonical_bytes(audit_results)
    ).hexdigest()

    # We require a task_spec_address; if not provided, synthesize one
    # representing "auditor self-initiated audit, no escrow."
    spec_addr = task_spec_address or "sha256:" + ("0" * 64)

    audit_cert = DerivationCert(
        task_spec_address=spec_addr,
        input_addresses=[audited_cert_address],
        output_address=audit_output_address,
        operation_description={
            "operation": "audit.cert_verification",
            "audited_cert_address": audited_cert_address,
            "audit_summary": audit_results,
            "audit_method": "agentlevy-mcp-server",
            "audit_protocol_version": SERVER_VERSION,
        },
        subcontract_cert_addresses=[audited_cert_address],
        seller_pubkey=public_key_hex(auditor_kp),
    )
    audit_cert.sign(auditor_kp)

    return {
        "ok": True,
        "audit_cert": audit_cert.model_dump(mode="json"),
        "audit_content_address": audit_cert.content_address(),
        "audit_signer_pubkey": audit_cert.seller_pubkey,
        "next_step": (
            "Anchor this audit cert to Hedera HCS using the project's "
            "anchor module: `from agentlevy.hedera_layer.anchor import "
            "submit_anchor; submit_anchor(audit_cert['content_address'])`."
        ),
    }


# ---------------------------------------------------------------------------
# MCP server wiring
# ---------------------------------------------------------------------------

server = Server(SERVER_NAME)


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Dispatch to the implementation by tool name."""
    try:
        if name == "verify_cert":
            result = _verify_cert_impl(
                arguments["content_address"],
                arguments["cert_json"],
            )
        elif name == "verify_hedera_anchor":
            result = _verify_hedera_anchor_impl(
                arguments["content_address"],
                arguments["hcs_topic"],
                arguments["sequence_number"],
                mirror_url=arguments.get("mirror_url"),
            )
        elif name == "audit_cert_chain":
            result = _audit_cert_chain_impl(
                arguments["cert_json"],
                expected_address=arguments.get("expected_address"),
                mirror_url=arguments.get("mirror_url"),
            )
        elif name == "verify_base_escrow":
            result = _verify_base_escrow_impl(
                arguments["escrow_id_hex"],
                arguments["expected_cert_address"],
                rpc_url=arguments.get("rpc_url"),
                contract_address=arguments.get("contract_address"),
            )
        elif name == "emit_audit_cert":
            result = _emit_audit_cert_impl(
                arguments["audited_cert_address"],
                arguments["audit_results"],
                arguments["auditor_seed_hex"],
                task_spec_address=arguments.get("task_spec_address"),
            )
        else:
            result = {"ok": False, "error": f"Unknown tool: {name}"}
    except KeyError as e:
        result = {"ok": False, "error": f"Missing required arg: {e}"}
    except Exception as e:
        result = {"ok": False, "error": str(e), "type": type(e).__name__}

    # MCP returns a list of content blocks; we return a single JSON text block.
    return [TextContent(type="text", text=json.dumps(result, indent=2))]


async def main() -> None:
    """Run the MCP server over stdio (the standard transport for KIRO)."""
    async with stdio_server() as (read, write):
        await server.run(
            read,
            write,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
