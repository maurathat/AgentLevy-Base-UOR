# AgentLevy — Project Summary

**Three-page brief · Consensus EasyA Hackathon · May 2026**

> *AgentLevy makes AI-agent commerce cryptographically auditable: two AI agents complete a real KYC compliance task, settle on Base in USDC via a hashlock escrow, and anchor every cert to Hedera — producing an audit trail any third party can verify from public keys alone, across two independent ledgers, with no trusted intermediary.*

---

## 1 · What

**AgentLevy is an open-source verifiable agent-commerce protocol.** It lets two or more AI agents negotiate, execute, and settle work — and produce a cryptographically-verifiable record of *what each agent actually did* that any third party can audit from public keys alone, with no trusted intermediary at the verify step.

The hackathon submission ships a **live, end-to-end demonstration** of the protocol applied to **KYC compliance** — beneficial-ownership extraction plus subcontracted sanctions screening — with three AI agents collaborating across three runtimes (local Python, AWS Lambda, KIRO IDE), settling onchain on Base Sepolia, and anchoring every step to Hedera Consensus Service.

**Five primitives** make the protocol work:

| Primitive | What it does |
|---|---|
| **TaskSpec** | Buyer + seller dual-signed work contract |
| **DerivationCert** | Seller's signed attestation of work performed, with content-addressed references to inputs, outputs, and any subcontracted child certs |
| **HashlockEscrow** | Solidity contract on Base that releases USDC when `sha256(certPayload) == hashlock` matches |
| **HCS audit anchor** | Every signed cert has its content address published to Hedera Consensus Service for tamper-evident timestamping |
| **MCP audit server** | Stdio-transport MCP server exposing five verification tools to KIRO IDE so human auditors verify the cert chain inside their AI agent's IDE |

AgentLevy is the **first reference implementation** of two open standards we authored: **VTEAI** (Verified Task Escrow + Attestation Interface — ERC draft, CC0, April 2026) and **UOR-ADDR-1** (chain-agnostic Universal Object Reference Address — community proposal). All content addresses are **byte-identical** to UOR Foundation's canonical reference implementation (verified live against `mcp.uor.foundation/encode_address`).

---

## 2 · Why

**Agent commerce in 2026 has a structural trust problem.**

When two AI agents transact across vendors — Anthropic talks to OpenAI talks to a self-hosted agent — there is no way to **cryptographically prove what either agent actually did**. Today's stack solves *identity*: vendor logs, W3C DID registries (Civic, Worldcoin), agent-platform credentials (Hedera AgentKit, Anthropic Agent SDK), KYC'd marketplaces (Coinbase x402, Virtuals Protocol). All of that tells a counterparty (or a regulator) **who** an AI agent is.

**None of it tells you *what the agent actually did*.** A registered, KYC'd agent can claim to have run an analysis it didn't run, fabricate inputs, or hide a subcontracted step inside an unverifiable vendor log. The audit collapses the moment the vendor disappears or a counterparty disputes the record.

**This is the identity-versus-work-integrity gap.** It's becoming acute *now* because:

1. **Volume.** AI agents are doing real work — KYC verification, supply-chain attestation, claims adjudication, contract analysis — at enterprise scale.
2. **Cross-vendor reach.** Single-vendor stacks are the exception. Anthropic, OpenAI, Google, Meta, and a long tail of agent-platform startups all field agents that need to interoperate.
3. **Regulatory pressure.** Regulators are starting to require **cryptographic evidence**, not vendor-trusted databases. FinCEN, the EU AI Act enforcement bodies, FRE 902(13) for court admissibility — all moving the same direction.

AgentLevy closes the gap. **Math, not trust.** The audit verifies in 2046 the same way it verifies today, with no dependency on any vendor still existing or any agent still being active.

---

## 3 · How

**End-to-end flow** (the live demo, executable in one command from the repo):

1. **Buyer agent** drafts a `TaskSpec` for beneficial-ownership verification. Signs it with Ed25519. Funds a `HashlockEscrow` contract instance on Base Sepolia with USDC; the hashlock is the SHA-256 of the **expected final cert content address**.
2. **Compliance agent** receives the task, runs the work via Anthropic Claude Haiku 4.5 with a schema-locked Pydantic structured output. Then **subcontracts** sanctions screening to a third agent.
3. **Sanctions agent** runs as an AWS Lambda function (Python 3.13, arm64) behind API Gateway, calling AWS Bedrock Claude Haiku 4.5 with tool-use enforced. Returns a fully-formed signed `DerivationCert` whose content address goes back into the parent compliance cert's `subcontract_cert_addresses` list.
4. **Compliance agent** assembles the final `DerivationCert` referencing the inputs, the outputs, and the subcontracted sanctions cert. Signs it.
5. **Settlement.** The final cert payload is submitted on-chain to the Base `HashlockEscrow` contract. The contract runs **one** verification: `require(sha256(certPayload) == e.hashlock)`. If it matches, USDC releases to the seller. **No oracle. No off-chain settlement. No trust in either agent.**
6. **Audit anchor.** Every signed cert has its content address submitted to Hedera Consensus Service (HCS topic `0.0.8856047` on testnet) producing an authoritative consensus timestamp + monotonic sequence number.
7. **Human audit.** A regulator opens KIRO IDE with the AgentLevy MCP server installed. The IDE-agent gains five tools: `verify_cert`, `verify_hedera_anchor`, `verify_base_escrow`, `audit_cert_chain`, `emit_audit_cert`. The audit becomes another signed cert — recursively verifiable.

**The verification model** is the protocol's defining property. A verifier holding only `(buyer_pubkey, compliance_pubkey, sanctions_pubkey, the cert chain)` can independently re-check **five things**:

1. Every Ed25519 signature is valid against canonical bytes.
2. Every `sha256:<64hex>` content address resolves (recompute over JCS-RFC8785 + NFC canonical bytes).
3. Every back-reference resolves: TaskSpec → DerivationCert → subcontracted cert all chain by hash.
4. Every cert was witnessed by Hedera (single HTTP `GET` against Mirror Node REST returns the message body and consensus timestamp).
5. The escrow released against the final cert hash on Base Sepolia public transaction history.

**Math, not trust.** No vendor needs to still exist. No agent needs to still be active.

---

## 4 · Technologies

### Languages + frameworks

- **Python 3.10+** — protocol core, agent runtimes, Hedera + Base SDKs, MCP server (~2,600 LoC)
- **Solidity 0.8.20** — `HashlockEscrow` contract (~100 LoC, single sha256-equality release condition)
- **TypeScript / Next.js 15 / React 19 / Tailwind 3.4** — live website (Vercel-deployed)
- **AWS SAM** — IaC for the Lambda + API Gateway + IAM in 92-line `template.yaml`

### SDKs + libraries

- **Anthropic Python SDK** — Claude Haiku 4.5 with tool-use enforced for schema-locked structured output
- **Coinbase x402 Python SDK** — HTTP 402 + payment-required protocol primitives
- **`@coinbase/cdp-sdk` + `@coinbase/onchainkit`** — installed in `web/` for browser-side wallet UX
- **Hiero Python SDK** — pure-Python Hedera SDK from LF Decentralized Trust (no Java dependency)
- **MCP Python SDK** — stdio-transport MCP server exposing five verification tools to KIRO IDE
- **`web3.py` + `py-solc-x`** — Base RPC + Solidity compilation/deployment
- **`pydantic`** — structured-output validation for every LLM call + cert primitives
- **`cryptography`** — Ed25519 signing/verification (NIST/OpenSSL bindings; no custom crypto)

### Sponsor technologies (live in this submission)

| Sponsor | What we used | Where |
|---|---|---|
| **Coinbase / Base** | Base Sepolia + USDC + EIP-3009 + x402 SDK | Settlement |
| **AWS** | Lambda + API Gateway + Bedrock (Claude Haiku 4.5 global cross-region) + SAM + CloudWatch + KIRO IDE | Sanctions sub-agent + human audit |
| **Hedera** | Hedera Consensus Service + Mirror Node REST API | Audit anchor |
| **Anthropic** | Claude Haiku 4.5 via Anthropic SDK + Bedrock | Both agents' LLM backbone |
| **UOR Foundation** | PRISM ring algebra (vendored, MIT) + UOR MCP `encode_address` for live cross-validation | Content-addressing substrate |

---

## 5 · Chains + Why each was uniquely possible

### Base Sepolia — Settlement layer

**Why Base specifically:** Coinbase x402 + USDC `transferWithAuthorization` (EIP-3009) let us implement *settlement-conditional-on-cryptographic-evidence* in roughly **10 lines of Solidity verification logic** — one `require(sha256(certPayload) == hashlock)` call. No general-purpose escrow contract needed. The hashlock pattern + USDC's offline-signed transfer authorization mean the buyer commits to the expected cryptographic outcome at escrow funding; the seller cannot retroactively renegotiate. **Smart-contract minimalism = auditable in an afternoon, not a week of formal verification.**

Live deployment: [`0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3)

### Hedera — Audit anchor

**Why Hedera specifically:** HCS provides **authoritative consensus timestamps** + **monotonic sequence numbers per topic** at $0.0001 per message. The Mirror Node REST API is **publicly queryable** — *no SDK required for verification*. Judges, regulators, or counterparties can re-verify with `curl` against `https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8856047/messages/N`. Independent governance from Base validators (the Hedera Council includes Google, IBM, Boeing, LG, Standard Bank, etc.).

Live deployment: HCS testnet topic [`0.0.8856047`](https://hashscan.io/testnet/topic/0.0.8856047)

### AWS Bedrock + Lambda — Subcontracted agent runtime

**Why AWS specifically:** Lambda's stateless model fits the "agent does one focused thing, returns" pattern perfectly — no idle compute cost, scales to zero between invocations, scales infinitely under load. Bedrock's **global cross-region inference profile** auto-routes Claude calls across all available AWS regions with **zero ops on our side**. We pick a model ID; AWS handles failover and capacity. SAM + arm64 Lambda made the deploy a one-shot 92-line `template.yaml`.

Live deployment: `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen` (Lambda + API Gateway + Bedrock)

### Why two ledgers (Base + Hedera)

Each chain plays its strength. **Base** is built for cheap, fast, conditional settlement. **Hedera HCS** is built for high-throughput consensus ordering with independent governance. Combining them gives:

- **Independent witnesses.** If Base reorgs, the audit lives on Hedera. If Hedera changes Council, the money is on Base. Neither bet is total.
- **Independent governance models.** Coinbase governs Base validators; Hedera Council governs HCS. Regulatory acceptance varies by jurisdiction; having both means a bank can pick the chain whose governance their regulator already accepts.
- **Settlement decoupled from audit.** Base says *the money moved*; Hedera says *the cert existed at this exact moment, witnessed by separate consensus*. You audit one without trusting the other.

A **sibling implementation** ([AgentLevy-XRPL-UOR](https://github.com/maurathat/AgentLevy-XRPL-UOR), public) demonstrates the same protocol primitives behind XRPL XLS-100 SmartEscrow + RLUSD — proving the chain-binding adapter pattern works. **One protocol, two live chains today.**

---

## 6 · Live status (everything working today)

| Component | URL / address |
|---|---|
| **Live website** | https://agentlevy-maurathats-projects.vercel.app |
| **GitHub repository** | https://github.com/maurathat/AgentLevy-Base-UOR (Apache 2.0) |
| **Sibling repository** | https://github.com/maurathat/AgentLevy-XRPL-UOR |
| **Base Sepolia escrow** | [`0x5A23958A…6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3) |
| **Hedera HCS audit topic** | [`0.0.8856047`](https://hashscan.io/testnet/topic/0.0.8856047) |
| **AWS Lambda endpoint** | `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen` |
| **VTEAI ERC draft** | `pitch/VTEAI-DRAFT.md` (CC0) |
| **UOR-ADDR-1 proposal** | `pitch/UOR-ADDR-PROPOSAL.md` |
| **Whitepaper** | `pitch/WHITEPAPER.md` (~5,000 words) |
| **Security audit** | `pitch/SECURITY-AUDIT.md` (0 HIGH, 2 MEDIUM, 4 LOW; Bandit clean across 2,642 LoC) |
| **Test suite** | 128 tests passing across primitives + LLM + Hedera + cert |

---

*Maura Clark · founder, AgentLevy / Kessai · Consensus EasyA Hackathon · Miami · May 2026*
