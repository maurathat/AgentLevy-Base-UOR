"""End-to-end demo orchestrator for AgentLevy on Base + Hedera + UOR.

Runs the full flow in one script (in-process, no HTTP between agents) so
the cert chain logic, escrow integration, and audit-trail anchoring are
all visible and demoable in ~90 seconds:

  1. Buyer drafts a TaskSpec (kyc.beneficial_ownership_verify) and
     dual-signs it with the seller (compliance agent).
  2. Compliance agent extracts beneficial owners from a synthetic
     corporate disclosure via the LLM stack (Anthropic, schema-locked).
  3. Compliance subcontracts sanctions screening to a third agent;
     sanctions runs an LLM-driven screen against a synthetic OFAC list
     and signs its own DerivationCert.
  4. Compliance assembles a parent DerivationCert referencing the
     sanctions cert by content address and signs it.
  5. Both certs are anchored to Hedera HCS for tamper-evident
     timestamping (mock by default; live if MOCK_HEDERA=false).
  6. Buyer escrows USDC on Base Sepolia with hashlock = sha256 of the
     final cert's canonical bytes.
  7. Compliance submits the final cert payload to the escrow contract;
     the contract verifies sha256(payload) == hashlock and releases USDC
     to the compliance agent.
  8. Audit trail printed: every signature, every content address, every
     HCS receipt, every Base transaction hash. A verifier holding only
     the public keys can re-check every step independently.

Usage
-----

    source .venv/bin/activate
    python -m agentlevy.agents.orchestrator

Pre-requisites: see README.md "Setup" section. Wallets must be funded
(BUYER needs ETH for gas + USDC for escrow; COMPLIANCE + SANCTIONS need
ETH for gas). HashlockEscrow contract must be deployed
(scripts/deploy_escrow.py).
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from eth_account import Account

# Project root on PYTHONPATH for `python -m` invocation
ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT / ".env", override=True)
sys.path.insert(0, str(ROOT))

from agentlevy.base_layer.escrow import (
    BaseConfig,
    approve_usdc,
    content_address_to_hashlock,
    create_escrow,
    finish_escrow,
    get_escrow,
    usdc_balance,
)
from agentlevy.hedera_layer.anchor import submit_anchor, verify_anchor
from agentlevy.llm.client import LLMClient
from agentlevy.llm.prompts import (
    COMPLIANCE_SYSTEM_PROMPT,
    SANCTIONS_SYSTEM_PROMPT,
)
from agentlevy.llm.schemas import (
    BeneficialOwnershipExtraction,
    SanctionsScreenResult,
)
from agentlevy.primitives.canonical import to_canonical_bytes
from agentlevy.primitives.cert import DerivationCert
from agentlevy.primitives.signing import Keypair, public_key_hex
from agentlevy.primitives.task_spec import (
    CURRENCY_USDC,
    InputRef,
    KYC_BENEFICIAL_OWNERSHIP,
    TaskSpec,
)


# ---------------------------------------------------------------------------
# Helpers — narrate the demo to the terminal
# ---------------------------------------------------------------------------

def banner(title: str) -> None:
    print()
    print("─" * 76)
    print(f"  {title}")
    print("─" * 76)


def step(num: int, title: str) -> None:
    print()
    print(f"  ▸ Step {num}: {title}")


def line(label: str, value) -> None:
    print(f"      {label:<30} {value}")


def short(s: str, n: int = 16) -> str:
    return s if len(s) <= n + 3 else s[: n // 2] + "…" + s[-(n // 2):]


# ---------------------------------------------------------------------------
# Agent identity helpers — in this demo, "agents" are Python keypairs +
# orchestrator functions. A production version moves them into separate
# FastAPI servers communicating over x402.
# ---------------------------------------------------------------------------

def keypair_from_eth_pk(eth_pk_hex: str) -> Keypair:
    """Derive an Ed25519 keypair from a hex-encoded EVM private key.

    Note: in production these are independent identities — the EVM key
    signs Base txs; the Ed25519 key signs cert payloads. We seed the
    Ed25519 key from the EVM key so a single .env field controls each
    agent. Different mathematical keys; same opaque secret.
    """
    raw = bytes.fromhex(eth_pk_hex.removeprefix("0x"))
    if len(raw) != 32:
        raise ValueError(f"expected 32-byte EVM key, got {len(raw)}")
    # Derive Ed25519 seed from the same 32 bytes (this would be a
    # separate field in a more careful implementation).
    return Keypair.from_seed(raw)


def eth_address_for(eth_pk_hex: str) -> str:
    return Account.from_key(eth_pk_hex).address


# ---------------------------------------------------------------------------
# Synthetic input loaders
# ---------------------------------------------------------------------------

def load_disclosure() -> tuple[str, str]:
    """Read the synthetic corporate disclosure. Returns (text, content_address)."""
    path = ROOT / "fixtures" / "synthetic" / "acme_disclosure.txt"
    text = path.read_text()
    import hashlib
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return text, f"sha256:{digest}"


def load_sanctions_list() -> tuple[dict, str]:
    """Read the synthetic sanctions list. Returns (parsed_json, content_address)."""
    path = ROOT / "fixtures" / "synthetic" / "sanctions_list.json"
    text = path.read_text()
    parsed = json.loads(text)
    import hashlib
    # Use the same canonicalization the cert chain uses, so the content
    # address is computed exactly the way every other reference resolves.
    canonical = to_canonical_bytes(parsed)
    digest = hashlib.sha256(canonical).hexdigest()
    return parsed, f"sha256:{digest}"


# ---------------------------------------------------------------------------
# The agents (in-process functions in this demo)
# ---------------------------------------------------------------------------

def compliance_agent_extract(
    *,
    llm: LLMClient,
    disclosure_text: str,
) -> BeneficialOwnershipExtraction:
    """Compliance agent's LLM call: extract beneficial owners."""
    return llm.complete_structured(
        system=COMPLIANCE_SYSTEM_PROMPT,
        user=(
            "Extract every beneficial owner disclosed in the document below. "
            "Use the 'name', 'ownership_percentage', and 'role' fields. "
            "Include the entity name in subject_entity. Document:\n\n"
            f"{disclosure_text}"
        ),
        schema=BeneficialOwnershipExtraction,
    )


def sanctions_agent_screen(
    *,
    llm: LLMClient,
    names: list[str],
    sanctions_list: dict,
) -> tuple[SanctionsScreenResult, str]:
    """Sanctions agent: returns (result, runtime_label).

    Two runtime modes:

      - **AWS Lambda + Bedrock** if ``AWS_SANCTIONS_AGENT_URL`` is set
        in .env. The sanctions agent runs as a serverless Lambda
        function on AWS (see aws/sanctions_agent/), calls Bedrock
        Claude for the LLM screen, and returns a structured
        ``SanctionsScreenResult`` over HTTPS. The cert chain authority
        (signing, Hedera anchoring) stays on the orchestrator.

      - **Local Anthropic via LLM stack** otherwise — uses the same
        client + cache that compliance uses.

    The split lets us demo "agent on AWS, cert chain on the orchestrator"
    without the Lambda holding any keys or signing authority.
    """
    aws_url = os.environ.get("AWS_SANCTIONS_AGENT_URL", "").strip()
    if aws_url:
        return _sanctions_via_aws(aws_url, names, sanctions_list), "aws-lambda-bedrock"

    user = (
        f"Screen each of these names against the sanctions list. "
        f"Use 'sanctions_list_version' = {sanctions_list['list_version']!r}. "
        f"Include 'screened_at' as the current UTC time. For each name, "
        f"include a hit entry (clear if no match).\n\n"
        f"Names: {names}\n\n"
        f"Sanctions list (synthetic):\n{json.dumps(sanctions_list, indent=2)}"
    )
    result = llm.complete_structured(
        system=SANCTIONS_SYSTEM_PROMPT,
        user=user,
        schema=SanctionsScreenResult,
    )
    return result, "local-anthropic"


def _sanctions_via_aws(
    url: str, names: list[str], sanctions_list: dict
) -> SanctionsScreenResult:
    """Call the AWS Lambda sanctions agent over HTTPS."""
    import httpx

    payload = {
        "names": names,
        "sanctions_list_version": sanctions_list.get("list_version", "OFAC-SDN-DEFAULT"),
        "sanctions_list": sanctions_list,
    }
    r = httpx.post(url, json=payload, timeout=60.0)
    r.raise_for_status()
    data = r.json()
    # Drop runtime metadata fields the schema doesn't carry; keep them
    # as side data the caller can read off the response if interested.
    runtime_meta = {k: data.pop(k, None) for k in ("model", "agent_runtime", "request_id")}
    result = SanctionsScreenResult.model_validate(data)
    # Stash the runtime metadata on the orchestrator's banner output via
    # a module-level cache (printed once per run).
    _LAST_AWS_META.update(runtime_meta)
    return result


# Cache for the most recent AWS Lambda metadata, displayed in Phase 4 banner.
_LAST_AWS_META: dict[str, str | None] = {}


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------

def main() -> None:
    banner("AgentLevy on Base + Hedera + UOR — End-to-End Demo")
    print()
    print("  Network:           Base Sepolia + Hedera Testnet")
    print("  Settlement:        XLS-100-style hashlock escrow on Base, paying in USDC")
    print("  Audit anchor:      Hedera Consensus Service (mock by default)")
    print("  Content addresses: UOR-Passport (sha256:hex, byte-identical to UOR ref)")
    print()

    # --- 0. Setup ---
    cfg = BaseConfig.from_env()
    line("Base RPC", cfg.rpc_url)
    line("Escrow contract", cfg.escrow_address)
    line("USDC contract", cfg.usdc_address)

    buyer_eth_pk = os.environ["BASE_BUYER_PRIVATE_KEY"]
    compliance_eth_pk = os.environ["BASE_COMPLIANCE_PRIVATE_KEY"]
    sanctions_eth_pk = os.environ["BASE_SANCTIONS_PRIVATE_KEY"]

    buyer_kp = keypair_from_eth_pk(buyer_eth_pk)
    compliance_kp = keypair_from_eth_pk(compliance_eth_pk)
    sanctions_kp = keypair_from_eth_pk(sanctions_eth_pk)

    buyer_addr = eth_address_for(buyer_eth_pk)
    compliance_addr = eth_address_for(compliance_eth_pk)
    sanctions_addr = eth_address_for(sanctions_eth_pk)

    line("Buyer", f"{buyer_addr}  ({usdc_balance(cfg, buyer_addr) / 1e6:.2f} USDC)")
    line("Compliance", f"{compliance_addr}  ({usdc_balance(cfg, compliance_addr) / 1e6:.2f} USDC)")
    line("Sanctions", f"{sanctions_addr}  ({usdc_balance(cfg, sanctions_addr) / 1e6:.2f} USDC)")

    llm = LLMClient()
    line("LLM cache mode", llm.cache.mode)

    # --- 1. Inputs ---
    banner("Phase 1 · Inputs")
    disclosure_text, disclosure_addr = load_disclosure()
    sanctions_list, sanctions_list_addr = load_sanctions_list()
    line("Disclosure addr", disclosure_addr)
    line("Sanctions list addr", sanctions_list_addr)

    # --- 2. TaskSpec (dual-signed) ---
    banner("Phase 2 · Buyer drafts TaskSpec; both parties sign")
    spec = TaskSpec(
        task_type=KYC_BENEFICIAL_OWNERSHIP,
        inputs=[InputRef(description="Acme Holdings disclosure", content_address=disclosure_addr)],
        expected_output_schema=BeneficialOwnershipExtraction.model_json_schema(),
        price_drops=500_000,        # 0.50 USDC
        chain="base",
        currency=CURRENCY_USDC,
        buyer_pubkey=public_key_hex(buyer_kp),
        seller_pubkey=public_key_hex(compliance_kp),
        deadline=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    spec.sign_buyer(buyer_kp)
    spec.sign_seller(compliance_kp)
    line("TaskSpec content addr", spec.content_address())
    line("Both signatures valid", spec.is_fully_signed())
    line("Currency", spec.currency)
    line("Price (USDC base units)", spec.price_drops)

    # --- 3. Compliance does the work ---
    banner("Phase 3 · Compliance agent extracts beneficial ownership (LLM)")
    extraction = compliance_agent_extract(llm=llm, disclosure_text=disclosure_text)
    extraction_addr = "sha256:" + __import__("hashlib").sha256(
        to_canonical_bytes(extraction.model_dump(mode="json"))
    ).hexdigest()
    line("Subject entity", extraction.subject_entity)
    line("Owners found", len(extraction.owners))
    for o in extraction.owners:
        line(f"  - {o.name}", f"{o.ownership_percentage}%  role={o.role}")
    line("Output content addr", extraction_addr)

    # --- 4. Subcontract sanctions screening ---
    banner("Phase 4 · Compliance subcontracts sanctions screening")
    owner_names = [o.name for o in extraction.owners]
    sanctions_result, sanctions_runtime = sanctions_agent_screen(
        llm=llm, names=owner_names, sanctions_list=sanctions_list,
    )
    line("Agent runtime", sanctions_runtime)
    if _LAST_AWS_META.get("model"):
        line("Bedrock model", _LAST_AWS_META["model"])
    if _LAST_AWS_META.get("request_id"):
        line("Lambda request id", _LAST_AWS_META["request_id"])
    sanctions_output_addr = "sha256:" + __import__("hashlib").sha256(
        to_canonical_bytes(sanctions_result.model_dump(mode="json"))
    ).hexdigest()
    line("List version", sanctions_result.sanctions_list_version)
    line("Names screened", len(sanctions_result.hits))
    for h in sanctions_result.hits:
        flag = "✓" if h.severity == "clear" else "⚠️ "
        line(f"  {flag} {h.name_screened}", f"{h.severity}  matched_to={h.matched_sanctions_entry or '-'}")
    line("Sanctions output addr", sanctions_output_addr)

    # --- 5. Sanctions agent signs its DerivationCert ---
    banner("Phase 5 · Sanctions agent signs DerivationCert + anchors to HCS")
    sanctions_cert = DerivationCert(
        task_spec_address=spec.content_address(),
        input_addresses=[disclosure_addr, sanctions_list_addr],
        output_address=sanctions_output_addr,
        operation_description={
            "operation": "kyc.sanctions_screen",
            "inputs_described": ["beneficial-owner names", "synthetic OFAC list"],
            "outputs_described": ["per-name screening result"],
        },
        seller_pubkey=public_key_hex(sanctions_kp),
    )
    sanctions_cert.sign(sanctions_kp)
    sanctions_cert.anchor()
    line("Sanctions cert addr", sanctions_cert.content_address())
    line("Signature valid", sanctions_cert.verify_signature())
    line("HCS topic", sanctions_cert.hcs_receipt.topic_id)
    line("HCS sequence", sanctions_cert.hcs_receipt.sequence_number)
    line("HCS network", sanctions_cert.hcs_receipt.network)
    line("HCS verifies", sanctions_cert.verify_anchor())

    # --- 6. Compliance assembles and signs the parent cert ---
    banner("Phase 6 · Compliance signs final DerivationCert + anchors to HCS")
    final_cert = DerivationCert(
        task_spec_address=spec.content_address(),
        input_addresses=[disclosure_addr],
        output_address=extraction_addr,
        operation_description={
            "operation": "kyc.beneficial_ownership_extract",
            "inputs_described": ["Acme Holdings disclosure document"],
            "outputs_described": ["BeneficialOwnershipExtraction object"],
            "subcontracted_sanctions_screen": True,
        },
        subcontract_cert_addresses=[sanctions_cert.content_address()],
        seller_pubkey=public_key_hex(compliance_kp),
    )
    final_cert.sign(compliance_kp)
    final_cert.anchor()
    line("Final cert addr", final_cert.content_address())
    line("Signature valid", final_cert.verify_signature())
    line("Subcontract refs", len(final_cert.subcontract_cert_addresses))
    line("HCS sequence", final_cert.hcs_receipt.sequence_number)
    line("HCS verifies", final_cert.verify_anchor())

    # --- 7. Buyer escrows USDC on Base ---
    mock_base = os.environ.get("MOCK_BASE_SETTLEMENT", "false").strip().lower() == "true"
    if mock_base:
        banner("Phase 7 · Base settlement (mock — contract is live and deployed)")
        expected_address = final_cert.content_address()
        line("Hashlock target", expected_address)
        line("Live escrow contract", cfg.escrow_address)
        line("Verifiable on", f"https://sepolia.basescan.org/address/{cfg.escrow_address}")
        # Synthesize a deterministic mock escrow_id from buyer + seller + hashlock
        import hashlib as _hashlib
        nonce = b"\x00" * 32  # fixed for mock determinism
        synth = _hashlib.sha256(
            (buyer_addr + compliance_addr + expected_address).encode()
        ).digest()
        escrow_id = synth
        line("Escrow ID (mock)", "0x" + escrow_id.hex())
        line("Status (mock)", "OPEN — would have escrowed " + f"{spec.price_drops/1e6:.2f} USDC live")
        print()
        print("      ⓘ Mock settlement: skipping approve_usdc() + create_escrow() on-chain.")
        print("        Cert chain + Hedera anchor + LLM are all live; only the Base txs are")
        print("        synthesized. The escrow contract IS deployed (link above) and the")
        print("        full live flow runs with one env flag (MOCK_BASE_SETTLEMENT=false).")
        create = {"tx_hash": "MOCK_" + synth[:8].hex(), "block": 0, "gas": 0}
    else:
        banner("Phase 7 · Buyer escrows USDC on Base, hashlocked to final cert")
        expected_address = final_cert.content_address()
        line("Hashlock target", expected_address)

        print()
        print("      [tx] approving USDC...")
        approve = approve_usdc(cfg, buyer_eth_pk, spec.price_drops)
        line("approve tx", approve["tx_hash"])

        print("      [tx] creating escrow...")
        nonce = os.urandom(32)
        escrow_id, create = create_escrow(
            cfg,
            buyer_eth_pk,
            seller=compliance_addr,
            amount=spec.price_drops,
            expected_cert_content_address=expected_address,
            deadline_unix=int(time.time()) + 3600,
            nonce=nonce,
        )
        line("create tx", create["tx_hash"])
        line("Escrow ID", "0x" + escrow_id.hex())

        state = get_escrow(cfg, escrow_id)
        line("Escrow status", state.status)
        line("Escrow amount", f"{state.amount / 1e6:.2f} USDC")
        line("Escrow buyer", state.buyer)
        line("Escrow seller", state.seller)

    # --- 8. Compliance releases the escrow by submitting the cert ---
    if mock_base:
        banner("Phase 8 · Cert hash math (mock — contract verifies sha256 match live)")
        payload = final_cert.to_canonical_bytes()
        actual_sha = __import__("hashlib").sha256(payload).hexdigest()
        line("Cert canonical bytes", f"{len(payload)} bytes")
        line("sha256(payload) =", "sha256:" + actual_sha)
        line("Hashlock target =", final_cert.content_address())
        match = ("sha256:" + actual_sha) == final_cert.content_address()
        line("Match check", "✓ TRUE" if match else "✗ MISMATCH (would not release)")
        print()
        print("      ⓘ The deployed Solidity contract checks exactly this:")
        print("        require(sha256(certPayload) == hashlock, 'cert mismatch');")
        print("        Live USDC release is one env flag flip away.")
        finish = {"tx_hash": "MOCK_finish_" + actual_sha[:12], "block": 0, "gas": 0}
    else:
        banner("Phase 8 · Compliance releases escrow by submitting cert payload")
        payload = final_cert.to_canonical_bytes()
        line("Cert canonical bytes", f"{len(payload)} bytes")
        line("sha256(payload) =", "sha256:" + __import__("hashlib").sha256(payload).hexdigest())

        print("      [tx] submitting cert to escrow.finishEscrow...")
        finish = finish_escrow(cfg, compliance_eth_pk, escrow_id=escrow_id, cert_canonical_bytes=payload)
        line("finish tx", finish["tx_hash"])

        state = get_escrow(cfg, escrow_id)
        line("Escrow status", state.status)
        line("Compliance USDC bal", f"{usdc_balance(cfg, compliance_addr) / 1e6:.2f}")

    # --- 9. Audit trail ---
    banner("Phase 9 · Audit trail (verifiable from public keys alone)")
    print()
    print("  A verifier holding the 3 pubkeys + the cert chain can re-check:")
    print()
    print(f"    {'spec':<14} {short(spec.content_address(), 24)}  signed_by={short(spec.buyer_pubkey, 12)} + {short(spec.seller_pubkey, 12)}")
    print(f"    {'sanctions':<14} {short(sanctions_cert.content_address(), 24)}  signed_by={short(sanctions_cert.seller_pubkey, 12)}")
    print(f"      └── HCS topic {sanctions_cert.hcs_receipt.topic_id} seq #{sanctions_cert.hcs_receipt.sequence_number} ({sanctions_cert.hcs_receipt.network})")
    print(f"    {'final':<14} {short(final_cert.content_address(), 24)}  signed_by={short(final_cert.seller_pubkey, 12)}")
    print(f"      └── HCS topic {final_cert.hcs_receipt.topic_id} seq #{final_cert.hcs_receipt.sequence_number} ({final_cert.hcs_receipt.network})")
    print(f"      └── subcontracts → {short(final_cert.subcontract_cert_addresses[0], 24)}")
    print()
    print("  On-chain settlement (Base Sepolia):")
    print(f"    escrow_id      0x{escrow_id.hex()}")
    print(f"    create tx      https://sepolia.basescan.org/tx/{create['tx_hash']}")
    print(f"    finish tx      https://sepolia.basescan.org/tx/{finish['tx_hash']}")
    print()
    print("  ✓ Demo complete.")
    print()


if __name__ == "__main__":
    main()
