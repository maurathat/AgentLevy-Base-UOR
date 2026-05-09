# Quickstart — Run AgentLevy in Under 5 Minutes

This guide is for technical evaluators (Foundation grants reviewers, partners, VCs doing due diligence) who want to **see the protocol working** rather than read about it.

Three paths, in order of effort:

| Path | Time | What you'll see |
|---|---|---|
| **A. Verify live artifacts (zero install)** | 30 seconds | Real on-chain deployments and a Hedera audit trail you can independently re-check |
| **B. Run the orchestrator locally** | ~5 minutes | The full protocol running end-to-end: three agents, multi-step subcontracting, cert chain forming, settlement |
| **C. Verify a cert chain in your IDE via MCP** | ~10 minutes | The auditor experience: `verify_cert`, `verify_hedera_anchor`, `verify_base_escrow`, recursive audit certs |

---

## Path A — Verify live artifacts (no install)

These are public, on-chain, verifiable from any browser or `curl`. **You don't need our cooperation to check them.**

### 1. The deployed Solidity escrow contract

[**HashlockEscrow on Base Sepolia**](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3) — `0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3`

Open BaseScan → see the verified contract source, its transactions, and its event log. This is the actual settlement layer.

### 2. The Hedera HCS audit topic

[**HCS topic on Hedera Testnet**](https://hashscan.io/testnet/topic/0.0.8856047) — `0.0.8856047`

Or via the public Mirror Node API (no SDK or auth required):

```bash
curl https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8856047/messages | jq '.messages[0]'
```

Each message is a content address that was anchored as a cert was produced. **Anyone can verify.**

### 3. The AWS Lambda sanctions agent

```bash
curl -X POST https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen \
  -H "Content-Type: application/json" \
  -d '{"names": ["John Smith"], "list_id": "test"}'
```

Returns a structured `SanctionsScreenResult` from a Bedrock-Claude-Haiku-4.5 sub-agent.

### 4. UOR Foundation byte-identical verification

Verifies that AgentLevy content addresses are byte-identical to UOR Foundation's canonical reference:

```bash
curl -X POST https://mcp.uor.foundation/tools/encode_address \
  -H "Content-Type: application/json" \
  -d '{"input": "{\"foo\": \"bar\"}"}'
```

That's the same SHA-256 you'd get from running AgentLevy's `to_canonical_bytes()` and hashing — verifiable mathematically, not by trust.

---

## Path B — Run the orchestrator locally

The full protocol running end-to-end on your machine in ~5 minutes. **Zero credentials required** (cache-mode + mock settlement).

### Prerequisites

- Python ≥ 3.10 ([install](https://www.python.org/downloads/))
- `git`

### Step 1 — Clone and install

```bash
git clone https://github.com/maurathat/AgentLevy-Base-UOR.git
cd AgentLevy-Base-UOR

python3 -m venv .venv
source .venv/bin/activate         # macOS/Linux
# .venv\Scripts\activate          # Windows

pip install -r requirements.txt
```

### Step 2 — Run the test suite (verify the build)

```bash
pytest tests/ -q
```

You should see **128 tests passing** across primitives, signing, canonicalization, cert chains, Hedera HCS anchor, and the LLM stack. *No failures.* If anything fails, open an issue — that means something's drifted in your environment.

### Step 3 — Run the end-to-end orchestrator (cache-mode + mock settlement)

```bash
LLM_CACHE_MODE=cache MOCK_HEDERA=true MOCK_BASE_SETTLEMENT=true \
python -m agentlevy.agents.orchestrator
```

Watch the terminal as the protocol runs end-to-end:

1. **Buyer agent** drafts a `TaskSpec` for beneficial-ownership verification, signs it
2. **Compliance agent** signs accepting it; both sigs verify
3. **Compliance agent** runs the LLM call (cached fixture; deterministic replay)
4. **Compliance agent subcontracts** sanctions screening → falls back to local LLM (cached); produces a signed sanctions cert
5. **Compliance agent** assembles the final `DerivationCert` referencing the inputs and the subcontracted sanctions cert
6. **Hedera HCS anchor** records each cert's content address (mock mode synthesizes deterministic receipts)
7. **Base escrow** releases USDC iff the cert's SHA-256 matches the hashlock (mock mode synthesizes the on-chain release)
8. Final cert chain printed: every reference resolves by hash; every signature verifies; every anchor matches.

### Step 4 — Run with live testnet (optional)

To run against the live Base Sepolia + Hedera testnet (instead of mock):

1. Copy `.env.example` to `.env` and fill in the testnet credentials (Base Sepolia funded wallets + Hedera operator + USDC contract addresses already prefilled)
2. Run with no mock flags:

   ```bash
   python -m agentlevy.agents.orchestrator
   ```

The same flow now anchors real Hedera HCS messages and (if your Base wallet is USDC-funded) releases real USDC on Base Sepolia. Output includes BaseScan and HashScan links you can verify.

---

## Path C — Verify a cert chain in your IDE (KIRO MCP)

For evaluators who want to experience the **auditor workflow** — not the operator workflow — the AgentLevy MCP server installs in **AWS KIRO IDE** (or any MCP-compatible client) and gives the IDE-agent five verification tools. Recursive auditability — your audit becomes another signed cert.

### 1. Install KIRO

[Download KIRO](https://kiro.dev) (AWS's AI-augmented IDE with native MCP support).

### 2. Add the AgentLevy MCP server to KIRO's config

Create `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "agentlevy": {
      "command": "/path/to/AgentLevy-Base-UOR/.venv/bin/python",
      "args": ["-m", "agentlevy.mcp_server.server"],
      "cwd": "/path/to/AgentLevy-Base-UOR",
      "env": {
        "PYTHONPATH": "/path/to/AgentLevy-Base-UOR",
        "HEDERA_MIRROR_NODE_URL": "https://testnet.mirrornode.hedera.com"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Replace `/path/to/AgentLevy-Base-UOR` with your absolute path.

### 3. Reload KIRO and ask the IDE-agent to verify a cert

After reload, KIRO's IDE-agent will have these tools available:

- `verify_cert(content_address, cert_json)` — recompute address, verify Ed25519 signature
- `verify_hedera_anchor(content_address, topic_id, sequence_number)` — fetch from Mirror Node, verify match
- `verify_base_escrow(escrow_id, expected_cert_address)` — confirm on-chain hashlock + release
- `audit_cert_chain(cert_json)` — composite verification (signature + anchor)
- `emit_audit_cert(audited_cert, auditor_keypair)` — sign and emit an audit-summary cert (the audit becomes part of the chain)

Try in KIRO chat:

> *"Verify the sample cert at `agentlevy/mcp_server/sample_cert.json` against Hedera testnet topic 0.0.8856047."*

The IDE-agent calls the tools, fetches the live Mirror Node response, and tells you whether the cert chain is valid. **You're using your own AI agent to verify the work of other AI agents — that's the "audit becomes a cert" pattern.**

A working KIRO MCP run is documented with screenshots in the [README](README.md#-phase-5-kiro-mcp-server--verified-live-on-may-6-2026).

---

## What you'll have verified

After running through all three paths:

- ✅ The Solidity contract is real, deployed, transaction-ready (BaseScan)
- ✅ The Hedera audit topic exists and has anchored real cert content addresses (HashScan + Mirror Node REST)
- ✅ The AWS Lambda sub-agent runs Bedrock-Claude inferences against a public endpoint
- ✅ Content addresses are byte-identical to UOR Foundation canonical reference (`mcp.uor.foundation`)
- ✅ The local protocol runs end-to-end with deterministic, replayable fixtures
- ✅ 128 tests pass on a fresh clone
- ✅ The auditor workflow integrates natively into KIRO IDE via MCP

That's verification from public keys + math, not from anyone's database. If we disappear tomorrow, every artifact above remains independently verifiable. **That's the point of the protocol.**

---

## What this proves

Five things, in order of relevance to evaluators:

1. **The protocol works end-to-end on testnet today** — not slideware
2. **The cryptographic verification holds** — anyone can re-derive content addresses and verify signatures with public-domain libraries
3. **The standards (VTEAI + UOR-ADDR-1) are open** — see [maurathat/verifiable-agent-settlement-standards](https://github.com/maurathat/verifiable-agent-settlement-standards)
4. **The architecture is chain-neutral** — same protocol primitives compile to a sibling implementation on XRPL ([AgentLevy-XRPL-UOR](https://github.com/maurathat/AgentLevy-XRPL-UOR)), with Sui adapter on the roadmap
5. **The auditor experience is real** — not a research demo; an MCP server that integrates with production IDEs (KIRO + Claude Desktop)

---

## Questions / next steps

- **Repository:** [github.com/maurathat/AgentLevy-Base-UOR](https://github.com/maurathat/AgentLevy-Base-UOR) (this repo)
- **Standards:** [github.com/maurathat/verifiable-agent-settlement-standards](https://github.com/maurathat/verifiable-agent-settlement-standards)
- **Whitepaper:** [pitch/WHITEPAPER.md](pitch/WHITEPAPER.md)
- **Security audit:** [pitch/SECURITY-AUDIT.md](pitch/SECURITY-AUDIT.md) (0 HIGH, 2 MEDIUM, 4 LOW; Bandit clean across 2,642 LoC)
- **Live website:** [agentlevy-maurathats-projects.vercel.app](https://agentlevy-maurathats-projects.vercel.app)
- **Loom walkthrough video:** linked from the [README](README.md)

For partnership, grant, or technical due-diligence conversations: open an issue, or reach Maura Clark via the contact details in the README.

---

*Last verified working: 2026-05-09. If anything in this guide is broken on a fresh clone, that's a bug — please open an issue.*
