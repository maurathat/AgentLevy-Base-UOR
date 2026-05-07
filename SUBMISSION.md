# EasyA Consensus 2026 — Hackathon Submission

> **Track 2 · x402 on Base for Agents** — with stretch coverage of the agentic AWS track (Lambda + Bedrock + KIRO MCP).

---

## Project name

**AgentLevy** — verifiable agent commerce, two ledgers, no trusted intermediary.

---

## Short summary (114 chars)

> Two AI agents do KYC compliance, settle on Base via x402, anchor every cert to Hedera, audit in KIRO IDE.

*(Alt 124 chars):* Verifiable agent-commerce protocol — content-addressed cert chain on Base, Hedera audit anchor, KIRO + AWS Lambda agents.

---

## Full description

**The problem.** Agent commerce today rests on vendor trust. When two AI agents transact across vendors (Anthropic ↔ OpenAI ↔ self-hosted), the audit collapses if the vendor goes away or a counterparty disputes the log. Today's stack tells you *who* you're transacting with — same-vendor logs, DID registries, agent-platform credentials. **None of it tells you what the agent actually did.** Identity ≠ work-integrity. Regulators are starting to require cryptographic evidence, not vendor-trusted databases — and there's no protocol that delivers it for agent commerce.

**The solution.** AgentLevy is a verifiable agent-commerce protocol where two AI agents negotiate and execute a KYC compliance task — beneficial-ownership extraction plus subcontracted sanctions screening — and produce a content-addressed cert chain that any third party can audit from public keys alone, across two independent ledgers, with no trusted intermediary.

**How it works:**

1. **TaskSpec** — buyer agent drafts the contract (task type, inputs, price in USDC, deadline). Both buyer and compliance agent sign it.
2. **DerivationCert** — compliance agent does the work via Anthropic Claude (schema-locked structured output), subcontracts sanctions screening to a third agent (running on **AWS Lambda + Bedrock**), assembles a final cert with cryptographic references back to inputs and the subcontracted sanctions cert.
3. **Settlement on Base** — buyer creates a hashlock escrow on a deployed Solidity contract on Base Sepolia. The hashlock IS the expected cert content address. Submission of the matching cert payload triggers release in USDC. **No oracle. No off-chain settlement. No trust in either agent.**
4. **Audit anchor on Hedera** — every signed cert publishes its content address to a Hedera Consensus Service topic for tamper-evident timestamping. Independent witness, public Mirror Node REST verification.
5. **Audit in KIRO** — human auditors install the AgentLevy MCP server in KIRO. The IDE-agent gains 5 tools (verify_cert, verify_hedera_anchor, verify_base_escrow, audit_cert_chain, emit_audit_cert) to walk through cert chains and emit signed audit-summary certs. The audit becomes another link in the cert chain — recursively verifiable.

**Why two ledgers.** XRPL, Solana, Ethereum can each settle. Hedera, Polkadot, etc. can each timestamp. The composition — settlement on one chain + audit anchor on another — gives you cross-ledger redundancy + independent governance models. If Base reorgs, the audit lives on Hedera. If Hedera changes Council, the money is on Base. **No single chain bet is total.**

**Standards.** AgentLevy is the first reference implementation of two open standards we authored:

- **VTEAI** (Verified Task Escrow + Attestation Interface) — ERC draft, CC0, April 2026. The chain-neutral spec for verified-work settlement.
- **UOR-ADDR-1** (Universal Object Reference Address) — community proposal. Chain-agnostic content addressing.

Content addresses are **byte-identical** to UOR Foundation's canonical reference (verified live via `mcp.uor.foundation/encode_address`).

---

## Technical description

### SDKs and services used

#### Coinbase / Base (Track 2)

- **Coinbase x402 Python SDK** — protocol primitives for HTTP 402 + payment-required flows; integrated for agent-to-agent micro-settlement extensions
- **`@coinbase/cdp-sdk`** + **`@coinbase/onchainkit`** — installed in `web/` for future browser-side wallet UI; CDP API key configured for Base Sepolia RPC
- **Base Sepolia testnet** — settlement chain
- **Solidity 0.8.20 + py-solc-x** — `HashlockEscrow` contract deployed at [`0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3)
- **USDC on Base Sepolia** — ERC-20 EIP-3009-compatible asset for settlement

**What made Base + x402 *uniquely* possible:**

The Base x402 spec + USDC `transferWithAuthorization` let us implement *settlement-conditional-on-cryptographic-evidence* with ~10 LoC of Solidity verification — `require(sha256(certPayload) == hashlock, "cert mismatch")`. No general-purpose escrow contract needed. The hashlock pattern + USDC's offline-signed transfer authorization mean buyer commits to the expected cryptographic outcome at escrow creation; seller cannot retroactively renegotiate. Smart-contract minimalism = auditable in an afternoon, not a week of formal verification.

#### AWS / Bedrock / Lambda / KIRO (agentic-track stretch)

- **AWS Lambda** (Python 3.13, arm64, 512 MB, 60 s timeout) — sanctions screening agent runtime
- **AWS API Gateway HTTP API** — HTTPS endpoint at `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen`
- **AWS Bedrock — Claude Haiku 4.5** (model ID: `global.anthropic.claude-haiku-4-5-20251001-v1:0`, global cross-region inference profile)
- **AWS SAM** — IaC; one `template.yaml` deploys Lambda + API Gateway + IAM role
- **AWS CloudWatch Logs** — execution logs for the agent
- **AWS KIRO IDE** — MCP server host for human auditors
- **MCP Python SDK** — server runs as stdio-transport MCP, exposes 5 verification tools to the IDE-agent

**What made AWS *uniquely* possible:**

- **Lambda's stateless model** fits the "agent does one focused thing, returns, moves on" pattern perfectly — no idle compute cost, scales to zero between invocations, scales infinitely under load.
- **Bedrock global cross-region inference profile** auto-routes Claude calls across all available AWS regions — *zero ops on our side*. We pick a model ID, AWS handles failover and capacity.
- **SAM + arm64 Lambda** made the deploy a one-shot `template.yaml` — Lambda + API Gateway + IAM role + permissions in 92 lines.
- **KIRO's native MCP support** meant we could plug verification tools into the IDE-agent without writing a KIRO-specific extension. The auditor's IDE-agent gets fully-tooled access to our cert chain with zero IDE-side code — install via `~/.kiro/mcp.json`, reload, done.

#### Hedera (independent witness)

- **Hedera Consensus Service** — testnet topic `0.0.8856047`, accessible at https://hashscan.io/testnet/topic/0.0.8856047
- **Hiero Python SDK** — pure-Python Hedera SDK from the LF Decentralized Trust project (no Java dependency)
- **Hedera Mirror Node REST API** — public, SDK-free verification endpoint

**What made Hedera *uniquely* possible:**

HCS provides **authoritative consensus timestamps** + **monotonic sequence numbers per topic** at \$0.0001/message. The Mirror Node REST API is publicly queryable — *no SDK required for verification*. Judges / regulators / counterparties can re-verify with `curl` against `https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8856047/messages/1`. Independent governance from Base validators (Hedera Council includes Google, IBM, Boeing, Standard Bank, etc.).

#### Anthropic + UOR Foundation

- **Anthropic Python SDK** — schema-locked LLM calls via tool-use API; same model (Claude Haiku 4.5) used both directly and via Bedrock for output consistency
- **UOR Foundation PRISM** — algebraic ring-coordinate system at Q(31), 256-bit, MIT-licensed; vendored at `vendor/prism.py`
- **UOR-Passport content addressing** — `sha256:<64hex>` derived from JCS-RFC8785 + NFC canonical bytes; byte-identical to `mcp.uor.foundation/encode_address`

---

## Repository structure

```
AgentLevy-Base-UOR/
├── agentlevy/                # Python core (chain-neutral protocol)
│   ├── primitives/           # canonical, signing, task_spec, cert (UOR-aligned)
│   ├── llm/                  # Anthropic client + cache + schemas + prompts
│   ├── hedera_layer/         # HCS audit anchor (live + mock)
│   ├── base_layer/           # Base RPC + escrow contract Python wrapper
│   ├── mcp_server/           # Phase 5: MCP server for KIRO
│   └── agents/               # orchestrator (end-to-end demo)
├── aws/sanctions_agent/      # AWS Lambda (Python) + SAM template
├── contracts/                # Solidity HashlockEscrow + ABI
├── web/                      # Next.js website (Vercel-deployed)
├── pitch/                    # Whitepaper + standards drafts (VTEAI, UOR-ADDR-1)
├── scripts/                  # setup_hcs_topic.py, deploy_escrow.py, etc.
├── tests/                    # 128 tests across primitives + LLM + Hedera
├── fixtures/                 # synthetic KYC inputs + cached LLM responses
└── vendor/prism.py           # UOR Foundation PRISM (MIT, vendored)
```

---

## Live verifiable artifacts

| Artifact | URL |
|---|---|
| **Live website** | [https://agentlevy-maurathats-projects.vercel.app](https://agentlevy-maurathats-projects.vercel.app) |
| **GitHub repository** (this submission — Base + AWS + KIRO) | https://github.com/maurathat/AgentLevy-Base-UOR |
| **Sibling implementation** (XRPL + RLUSD — same protocol, different chain adapter) | https://github.com/maurathat/AgentLevy-XRPL-UOR |
| **Deployed Solidity escrow** (Base Sepolia) | https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3 |
| **Hedera HCS audit topic** (testnet) | https://hashscan.io/testnet/topic/0.0.8856047 |
| **AWS Lambda endpoint** | `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen` |
| **VTEAI ERC draft** | [pitch/VTEAI-DRAFT.md](pitch/VTEAI-DRAFT.md) |
| **UOR-ADDR-1 proposal** | [pitch/UOR-ADDR-PROPOSAL.md](pitch/UOR-ADDR-PROPOSAL.md) |
| **Whitepaper** | [pitch/WHITEPAPER.md](pitch/WHITEPAPER.md) |
| **Security audit** (self-audit; 0 HIGH, 2 MEDIUM, 4 LOW; Bandit clean across 2,642 LoC) | [pitch/SECURITY-AUDIT.md](pitch/SECURITY-AUDIT.md) |

---

## Slides (Canva — required by submission)

🎴 **Canva deck:** https://canva.link/7ryvxqciltivzga

Source files (also in repo):
- [pitch/agentlevy-demo-deck.md](pitch/agentlevy-demo-deck.md) — markdown source (13 slides, team first)
- [pitch/agentlevy-demo-deck.pdf](pitch/agentlevy-demo-deck.pdf) — branded PDF render
- [pitch/agentlevy-demo-deck.pptx](pitch/agentlevy-demo-deck.pptx) — PowerPoint export

---

## Demo video + Loom walkthrough

🎬 **Live demo (Loom):** https://www.loom.com/share/985ff83882844954996efad678b181c2

> Screen-capture of the AgentLevy demo running end-to-end — agents collaborating, certs anchoring, escrow releasing on Base Sepolia.

🎙️ **Slide walkthrough (Loom):** https://www.loom.com/share/cc05c68f9c174920b54a851794a9645b

> Slide-by-slide narrated walkthrough of the AgentLevy protocol — the gap, the cert chain, two-ledger settlement on Base + Hedera, AWS Lambda subcontracted sanctions agent, and the KIRO MCP audit composition.

Both also embedded live on the website at https://agentlevy-maurathats-projects.vercel.app/deck

---

## License

Apache License 2.0. Vendored PRISM retains its upstream MIT license.

— Maura Clark · @maurathat
