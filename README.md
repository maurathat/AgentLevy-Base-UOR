# AgentLevy-Base-UOR

> **EasyA Consensus 2026 Hackathon — Track 2: x402 on Base for Agents.** Verifiable agent-commerce protocol. Two AI agents negotiate and execute a KYC compliance task, settle on Base via a hashlock USDC escrow, and anchor every cert to Hedera Consensus Service for tamper-evident timestamping. The audit trail is verifiable from public keys alone, across two independent ledgers, with no trusted intermediary.

🌐 **Live website:** *(paste current Vercel URL after submission)*
📦 **Repo:** https://github.com/maurathat/AgentLevy-Base-UOR
🔍 **Live escrow contract** (Base Sepolia): [`0x5A23958A…6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3)
📜 **Live HCS audit topic** (Hedera Testnet): [`0.0.8856047`](https://hashscan.io/testnet/topic/0.0.8856047)
🤖 **Live AWS Lambda agent**: `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen`

---

## 🎬 Demo video

*Paste screen-capture demo URL here once recorded (YouTube / Vimeo / Loom)*

> **What the demo shows**: Animated walkthrough of the cert chain forming — TaskSpec drafted, both signatures, compliance agent extracts beneficial owners via Anthropic, sanctions agent runs on AWS Lambda, both certs anchored on Hedera HCS, escrow settles when sha256 matches. ~90 seconds.

## 🎙️ Audio walkthrough (Loom)

*Paste Loom URL here once recorded*

> 5–10 minute walkthrough of the project, repo structure, technology choices, and a live demo. Required by hackathon submission rules.

## 🖼️ Screenshots

*Replace with actual screenshots after capture*

| Page | Screenshot |
|---|---|
| Landing | `docs/screenshots/landing.png` |
| Demo (animated walkthrough) | `docs/screenshots/demo.png` |
| Architecture | `docs/screenshots/architecture.png` |
| Audit (KIRO MCP) | `docs/screenshots/audit.png` |

---

## How the blockchain interaction works

AgentLevy uses **two blockchains** simultaneously, each playing to its strength:

### Base (settlement)

The buyer agent deposits USDC into a **deployed `HashlockEscrow` Solidity contract** on Base Sepolia. The escrow is conditional on a single rule: when anyone submits a payload whose `sha256(payload)` matches the hashlock committed at escrow creation, the contract releases the USDC to the seller. The hashlock IS the expected cert content address.

```solidity
function finishEscrow(bytes32 escrowId, bytes calldata certPayload) external {
    Escrow storage e = escrows[escrowId];
    require(!e.released, "released");
    require(sha256(certPayload) == e.hashlock, "cert mismatch");  // the only check
    e.released = true;
    require(token.transfer(e.seller, e.amount), "transfer failed");
    emit EscrowReleased(escrowId, sha256(certPayload));
}
```

That's it. **No oracle. No off-chain settlement. The cert IS the proof.**

### Hedera (audit anchor)

Independently, every signed `DerivationCert` publishes its content address to a Hedera Consensus Service topic via `TopicMessageSubmit`. HCS provides:

- An authoritative **consensus timestamp** (when did this cert exist, witnessed by Hedera consensus?)
- A **monotonic sequence number** within the topic
- A **publicly queryable Mirror Node REST API** — `curl-able` verification

```python
# agentlevy/hedera_layer/anchor.py — submitting an anchor
tx = TopicMessageSubmitTransaction()
tx.set_topic_id(TopicId.from_string("0.0.8856047"))
tx.set_message(content_address)  # "sha256:eb22...4667"
receipt = tx.execute(client)
```

```bash
# anyone can re-verify with curl, no SDK needed:
curl https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8856047/messages/1
```

### The composition

| Layer | Chain | What it provides |
|---|---|---|
| **Settlement** | Base Sepolia | XLS-100-style hashlock escrow, releases USDC on cert-hash match |
| **Audit anchor** | Hedera Testnet | Consensus-witnessed timestamp + sequence number per cert |

Settlement says *the money moved*. The audit anchor says *the cert existed at this exact moment, witnessed by consensus*. Together: cross-ledger redundancy + independent governance.

---

## Architecture

**Three runtimes. One cert chain.**

```
   ┌─────────────────────────────────────────────────────────┐
   │  Buyer agent (orchestrator)                             │
   │    drafts TaskSpec, signs, deposits USDC into escrow    │
   └────────────────────┬────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
   ┌──────────────────┐       ┌──────────────────┐
   │  Compliance      │ ────▶ │  Sanctions agent │
   │  agent (local)   │       │  (AWS Lambda +   │
   │  + Anthropic     │       │   Bedrock Haiku) │
   └────────┬─────────┘       └────────┬─────────┘
            │                          │
            │  signs DerivationCerts   │
            │                          │
            ▼                          ▼
   ┌─────────────────────────────────────────────┐
   │       UOR-Passport content addresses        │
   │   (sha256 of JCS-RFC8785 canonical bytes)   │
   └─────────────────┬───────────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
   ┌──────────────────┐       ┌──────────────────┐
   │  Base settlement │       │  Hedera HCS      │
   │  (escrow USDC    │       │  (consensus      │
   │   releases on    │       │   timestamps for │
   │   sha256 match)  │       │   every cert)    │
   └──────────────────┘       └──────────────────┘

   ┌───────────────────────────────────────────────────────────┐
   │  Phase 5: AgentLevy MCP server in KIRO IDE                │
   │  Auditors verify cert chains step-by-step + emit signed   │
   │  audit-summary certs (recursive verifiability)            │
   └───────────────────────────────────────────────────────────┘
```

---

## What's in the repo

```
AgentLevy-Base-UOR/
├── README.md                        # this file
├── SUBMISSION.md                    # EasyA submission text (summary, description, technical)
├── CANONICAL_FORM.md                # JCS-RFC8785 + NFC discipline
├── LICENSE                          # Apache 2.0
├── .env.example                     # template (Base + Hedera + LLM + AWS creds)
├── requirements.txt                 # Python deps (chain-neutral protocol)
├── vendor/
│   └── prism.py                     # UOR Foundation PRISM (MIT, vendored)
├── agentlevy/                       # Python core (chain-neutral protocol)
│   ├── primitives/                  # canonical, signing, task_spec, cert (UOR-aligned)
│   ├── llm/                         # Anthropic client + cache + schemas + prompts
│   ├── hedera_layer/                # HCS audit anchor (mock + live)
│   ├── base_layer/                  # Base RPC + escrow contract Python wrapper
│   ├── prism_layer/                 # PRISM Q(31) wrapper
│   ├── mcp_server/                  # Phase 5: MCP server for KIRO
│   ├── agents/orchestrator.py       # end-to-end demo runner
│   └── protocol/                    # bounded-turn negotiation (future)
├── aws/sanctions_agent/             # AWS Lambda (Python) + SAM IaC
│   ├── handler.py                   # Lambda entry; calls Bedrock Claude Haiku 4.5
│   ├── template.yaml                # SAM: Lambda + API Gateway + IAM
│   ├── requirements.txt             # boto3
│   └── README.md                    # deploy instructions
├── contracts/
│   ├── HashlockEscrow.sol           # ~100 LoC Solidity
│   └── abi/HashlockEscrow.json      # compiled ABI for the Python wrapper
├── web/                             # Next.js website (Vercel-deployed)
│   ├── app/
│   │   ├── page.tsx                 # landing
│   │   ├── demo/page.tsx            # animated walkthrough
│   │   ├── architecture/page.tsx    # 3-layer breakdown + Phase 4 callout
│   │   └── audit/page.tsx           # KIRO + AgentLevy MCP composition
│   ├── components/                  # Brand header/footer + Tailwind/Kessai theme
│   └── lib/demo-data.ts             # hardcoded captured live-run results
├── pitch/                           # Whitepaper + standards drafts + Gamma decks
│   ├── WHITEPAPER.md                # ~5,000 words: architecture, landscape, use cases, risk
│   ├── VTEAI-DRAFT.md               # ERC draft, CC0, April 2026 (we authored)
│   ├── UOR-ADDR-PROPOSAL.md         # community proposal, April 2026 (we co-contribute)
│   └── agentlevy-demo-deck.md       # 12-slide deck (Gamma-importable; Canva conversion required for EasyA submission)
├── scripts/
│   ├── setup_hcs_topic.py           # Hedera topic creator (one-shot)
│   ├── deploy_escrow.py             # Base contract deployer (one-shot)
│   └── make_sample_cert.py          # deterministic sample cert for KIRO testing
├── tests/                           # 128 tests, all chain-neutral
├── docs/                            # UOR Foundation overview, byte-identical proof
├── Kessai/                          # brand kit (logos, colors, typography)
└── fixtures/                        # synthetic KYC inputs + cached LLM responses
```

---

## Setup

**Requires:** Python ≥ 3.10, Node ≥ 18, AWS CLI + SAM CLI (for the AWS Lambda deploy).

### 1. Python core (cert primitives + LLM + Hedera)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Node / website

```bash
cd web
npm install
cd ..
```

### 3. Environment

```bash
cp .env.example .env
```

Fill in:
- `ANTHROPIC_API_KEY` — for the local Anthropic-direct fallback
- `BASE_RPC_URL` — `https://sepolia.base.org`
- `BASE_ESCROW_ADDRESS` — already set to `0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3` (deployed)
- `BASE_BUYER_PRIVATE_KEY` / `BASE_COMPLIANCE_PRIVATE_KEY` / `BASE_SANCTIONS_PRIVATE_KEY` — generate via `scripts/make_sample_cert.py` or use your own EOA private keys
- `HEDERA_OPERATOR_ID` / `HEDERA_OPERATOR_PRIVATE_KEY` — from portal.hedera.com (free testnet)
- `HEDERA_HCS_TOPIC_ID` — `0.0.8856047` (use ours, or `python scripts/setup_hcs_topic.py` to create your own)
- `AWS_SANCTIONS_AGENT_URL` — optional; if unset, orchestrator uses local Anthropic
- `MOCK_HEDERA=false` (live anchor) and `MOCK_BASE_SETTLEMENT=true` (mock escrow if your buyer has no USDC)

### 4. Run end-to-end

```bash
python -m agentlevy.agents.orchestrator
```

Walks the full 9-phase demo (TaskSpec → both LLM calls → cert chain → Hedera anchors → escrow hash math → audit trail). Uses the configured AWS Lambda for sanctions screening if reachable; falls back to local Anthropic gracefully if Bedrock returns errors.

### 5. Run tests

```bash
python -m pytest tests/
# 128 passed, 2 skipped (live integration tests)
```

### 6. Run the website locally

```bash
cd web
npm run dev
# http://localhost:3000
```

---

## Standards alignment

- **VTEAI** (Verified Task Escrow + Attestation Interface) — ERC draft, CC0, April 2026. **Authored by this project.** [pitch/VTEAI-DRAFT.md](pitch/VTEAI-DRAFT.md)
- **UOR-ADDR-1** (Universal Object Reference Address) — community proposal. **Co-contributed by this project.** [pitch/UOR-ADDR-PROPOSAL.md](pitch/UOR-ADDR-PROPOSAL.md)
- **PRISM** — UOR Foundation reference implementation, vendored at [vendor/prism.py](vendor/prism.py) (MIT)

Content addresses are **byte-identical** to UOR Foundation's canonical reference. Verified live via `mcp.uor.foundation/encode_address`. See [docs/UOR_PASSPORT_VERIFIED.md](docs/UOR_PASSPORT_VERIFIED.md).

---

## Pitch material

- **[Whitepaper](pitch/WHITEPAPER.md)** — ~5,000-word deep-dive: architecture, competitive landscape (Coinbase x402, Virtuals ACP, etc.), customer use cases (banks, M&A, title, healthcare, legal docs, AI inference), risk model, roadmap (Phase 4 AgentCore + Phase 5 KIRO MCP).
- **[Demo deck](pitch/agentlevy-demo-deck.md)** — 12-slide hackathon deck (Markdown source; converted to Canva for EasyA submission).
- **[VTEAI ERC draft](pitch/VTEAI-DRAFT.md)** + **[UOR-ADDR-1 proposal](pitch/UOR-ADDR-PROPOSAL.md)** — the standards.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE). Vendored PRISM (`vendor/prism.py`) retains its upstream MIT license; see [vendor/LICENSE-prism](vendor/LICENSE-prism).

— Maura Clark · @maurathat
