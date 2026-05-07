# Why we used each technology — AgentLevy

**One-page tech-choice rationale for EasyA judging. ~600 words.**

---

### Base (settlement chain)

We settle on Base Sepolia because Base + USDC give us a production-grade L2 with the lowest possible verifier surface for our cert-conditional release rule. Our `HashlockEscrow` is **~100 lines of Solidity** with **one** required check — `require(sha256(certPayload) == hashlock)` — and zero external calls beyond the standard ERC-20 USDC transfer. No oracles, no time branches, no re-entrancy surface. Base's security model + USDC's audited contract = we add minimum new attack surface to ship verifiable agent commerce. Live deployment: [`0x5A23958A…6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3).

---

### Coinbase x402

x402 is the missing payment layer for AI agents. Its HTTP 402 + payment-required pattern, combined with **EIP-3009 `transferWithAuthorization`** on USDC, lets buyers commit funds + cryptographic preconditions in one offline-signed authorization — exactly the primitive AgentLevy needs for hashlock-conditional release. The Coinbase x402 Python SDK is integrated in the repo; our HashlockEscrow contract is x402-compatible by construction. x402 made it possible to do *settlement-conditional-on-cryptographic-evidence* in 10 lines of Solidity instead of a custom token contract.

---

### AWS Lambda

The compliance agent **subcontracts** sanctions screening to a third agent. Lambda was the right runtime because the sub-agent's job is stateless and bursty: receive request → call LLM → return signed cert. Lambda's no-idle-cost + scale-to-zero model fits perfectly — we pay nothing when no agents are working and scale infinitely when they are. SAM made the deploy a one-shot 92-line `template.yaml` (Lambda + API Gateway + IAM role + permissions). Live endpoint: `https://1q4dt1zune.execute-api.us-east-1.amazonaws.com/screen`.

---

### AWS Bedrock

The sub-agent calls Claude Haiku 4.5 via Bedrock's **global cross-region inference profile** (`global.anthropic.claude-haiku-4-5-20251001-v1:0`). The global profile auto-routes calls across all available AWS regions — **zero ops on our side** for failover or capacity. Tool-use is enforced so the LLM returns a Pydantic-validated `SanctionsScreenResult` every time. Same model used both via direct Anthropic SDK (compliance agent) and via Bedrock (sanctions agent), so output structure is consistent across runtimes.

---

### KIRO IDE (AWS)

KIRO has native MCP (Model Context Protocol) support built in. We wrote a stdio-transport MCP server that exposes **5 verification tools** to KIRO's IDE-agent: `verify_cert`, `verify_hedera_anchor`, `verify_base_escrow`, `audit_cert_chain`, `emit_audit_cert`. A regulator installs our MCP server in `~/.kiro/settings/mcp.json`, reloads, and their IDE-agent gains full audit capability — **zero IDE-side code to write**. The audit becomes a signed cert too, so whoever audits the audit gets the same recursive guarantees. KIRO's first-class MCP support is what made it possible to plug verification into a regulator's actual workflow.

---

### Hedera Consensus Service (audit anchor)

Hedera HCS provides **authoritative consensus timestamps + monotonic sequence numbers per topic at $0.0001 per message** — the cheapest way to get tamper-evident ordering on a public chain. The Mirror Node REST API is publicly queryable, so judges, regulators, or counterparties can re-verify any cert anchor with **a single curl, no SDK needed**. Hedera's governance is independent from Base — Council includes Google, IBM, Boeing, LG, Standard Bank — so combining the two ledgers gives us cross-chain audit redundancy without trusting either chain's governance alone. Live topic: [`0.0.8856047`](https://hashscan.io/testnet/topic/0.0.8856047).

---

### UOR Foundation (content-addressing substrate)

Every reference in our cert chain — TaskSpec → DerivationCert → subcontracted child cert — is a **UOR-Passport content address** (`sha256:<64hex>` over JCS-RFC8785 + NFC canonical bytes). UOR-Passport is the chain-neutral content-addressing standard from UOR Foundation; it's what makes our certs portable across any chain or system. Our addresses are **byte-identical** to UOR Foundation's canonical reference implementation — verified live against `mcp.uor.foundation/encode_address` on May 3, 2026. This means any UOR-aware tooling — including third-party verifiers we don't control — can audit our cert chain natively.

---

*Maura Clark · founder, AgentLevy / Kessai · Consensus EasyA, Miami, May 2026*
