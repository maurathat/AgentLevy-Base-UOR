# AgentLevy: A Verifiable-Work Settlement Protocol for Agent Commerce

**Whitepaper · v1.0 · May 2026**

> **AgentLevy is the open-source reference implementation of a two-standard protocol for cryptographically-verifiable agent commerce — content-addressed derivation certificates anchored across two independent ledgers (Base Sepolia settlement + Hedera HCS audit anchor), with no trusted third party at the verify step. A sibling implementation on XRPL XLS-100 SmartEscrow + RLUSD demonstrates the same protocol primitives behind a different chain adapter — *one protocol, two live chains*.**
>
> This whitepaper is the deep-dive companion to:
> - **[VTEAI ERC draft](VTEAI-DRAFT.md)** — the settlement-state-machine standard
> - **[UOR-ADDR-1 community proposal](UOR-ADDR-PROPOSAL.md)** — the chain-agnostic content-addressing standard
> - **[Source repository — Base + AWS + KIRO (this submission)](https://github.com/maurathat/AgentLevy-Base-UOR)** — Apache 2.0 licensed
> - **[Sibling repository — XRPL + RLUSD](https://github.com/maurathat/AgentLevy-XRPL-UOR)** — same protocol, different chain adapter
> - **[Pitch decks](kessai-funding-deck.md)** ([demo deck](agentlevy-demo-deck.md), [funding deck](kessai-funding-deck.md), [one-pager](kessai-onepager.md))

---

## 0. Executive Summary

Agent commerce today rests on vendor trust. Two AI agents transact by exchanging API calls and trusting each other's logs — a model that works inside a single vendor's walled garden, breaks the moment they don't share one, and collapses entirely when either party (or the vendor itself) goes away.

Existing identity primitives — DID registries, KYC'd agent platforms, Coinbase x402, Virtuals Protocol's ACP — solve **who** an agent is. None of them solve **what an agent actually did**, in a way that's verifiable years later by anyone holding only public keys.

AgentLevy closes that gap with a small set of primitives:

- **TaskSpec** — a buyer + seller dual-signed work-acceptance contract.
- **DerivationCert** — a seller's signed attestation of work performed against a TaskSpec, with content-addressed references to inputs, outputs, and any subcontracted child certs.
- **Two-ledger settlement** — a `HashlockEscrow` Solidity contract on Base Sepolia holds USDC with a hashlock on the expected final-cert content address (releases when `sha256(certPayload) == hashlock`); Hedera Consensus Service anchors every cert hash with an authoritative consensus timestamp. The same protocol runs on XRPL via XLS-100 SmartEscrow + RLUSD in the sibling implementation — UOR-ADDR-1's chain-binding adapter pattern keeps the agents and certs chain-agnostic.
- **UOR-Passport content addresses** — every reference uses `sha256:<64hex>` derived from JCS-RFC8785 + NFC canonical bytes, byte-identical to the UOR Foundation's reference implementation.

A verifier holding `(buyer_pubkey, seller_pubkey, sanctions_pubkey, the cert chain)` can independently reconstruct: every signature, every content address, every cross-reference, every consensus timestamp, every settlement event — across two independent ledgers, with no trusted intermediary.

The reference implementation is AgentLevy (Apache 2.0). The commercial productization is Kessai (enterprise SaaS). The standards underneath (VTEAI + UOR-ADDR-1) are open and we're co-authoring both.

---

## 1. The Problem: Identity ≠ Work-Integrity

Agent commerce in 2026 has two characteristics that didn't exist five years ago:

1. **Volume.** AI agents are doing real work — KYC verification, supply-chain attestation, claims adjudication, code review, contract analysis. The transaction count is enterprise-scale.
2. **Cross-vendor reach.** Anthropic, OpenAI, Google, Meta, and a long tail of agent-platform startups all field agents that need to interoperate. Single-vendor stacks are the exception, not the rule.

The current trust model has not kept pace. Today's stack tells a counterparty (and a regulator) **who** an agent is:

- **Vendor logs** — when both agents are in the same platform, the vendor sees both sides and can resolve disputes.
- **DID registries** (Civic, Worldcoin, Moca AIR Kit) — agents register cryptographic identity that resolves under W3C DID methods.
- **Agent-platform credentials** — Hedera AgentKit, Anthropic agent SDK, Fetch.ai, Olas Network — each platform issues attestations of "yes this is a registered agent."
- **KYC'd marketplaces** — Coinbase x402 and similar require verified agent identity before payment rails open.

None of these solve **what** the agent actually did. A registered, KYC'd agent can:

- Claim to have run an analysis it didn't run.
- Show a log that doesn't match the actual computation.
- Reference inputs it never processed.

The audit collapses when the vendor goes away (logs become unreadable), when the registry de-lists an agent (credential revocation breaks past attestations), or when a counterparty disputes the log content (he-said-she-said with no neutral arbiter).

For high-stakes use cases — KYC compliance, M&A escrow, regulatory reporting, AI governance — "trust the vendor's database" is no longer acceptable. Regulators are increasingly asking for **cryptographic** evidence: signatures, timestamps, hashes, math. Identity-only credentials don't provide it.

The gap to close: **make the work itself cryptographically verifiable**, with no trusted third party at the verify step. That's what AgentLevy demonstrates and what VTEAI/UOR-ADDR-1 standardize.

---

## 2. Architecture: How AgentLevy Works

The protocol has four primitives, two ledgers, and one verification model.

### 2.1 The Primitives

#### TaskSpec

A `TaskSpec` is the work-acceptance contract. Buyer drafts it; seller accepts and counter-signs. Once dual-signed, it's a binding statement of what work will be done, by whom, for how much, by when.

Fields (selected):
- `task_id` — UUID assigned at construction
- `task_type` — e.g., `kyc.beneficial_ownership_verify`
- `inputs` — list of content-address references (`sha256:<64hex>`) to the source documents
- `expected_output_schema` — JSON Schema describing the output shape
- `price_drops` — settlement amount in chain-native units
- `currency` — `USDC` (default for Base) / `RLUSD` (XRPL sibling) / `ETH` / `XRP`; chain-aware
- `chain` — `base` (this submission) or `xrpl` (sibling impl)
- `buyer_pubkey`, `seller_pubkey` — Ed25519 public keys (32 raw bytes, hex-encoded)
- `deadline` — UTC, ISO 8601
- `signature_buyer`, `signature_seller` — detached Ed25519 signatures (64 raw bytes, hex-encoded)

The signatures are **detached**: `to_canonical_bytes()` excludes them. Re-canonicalizing a signed spec produces the same bytes that were originally signed. This invariant is critical: it means the canonical bytes (and therefore the content address) are stable across the sign/verify cycle.

#### DerivationCert

A `DerivationCert` is the seller's signed delivery: "I, holder of `seller_pubkey`, performed operation X over inputs `input_addresses`, producing output `output_address`, in fulfillment of spec `task_spec_address`."

Fields:
- `cert_id` — UUID
- `task_spec_address` — back-reference to the spec (content address)
- `input_addresses` — list of content addresses for the inputs actually consumed
- `output_address` — content address for the produced output
- `operation_description` — structured dict (`operation`, `inputs_described`, `outputs_described`)
- `subcontract_cert_addresses` — content addresses of child certs (empty for leaf certs)
- `seller_pubkey` — signer
- `signature` — detached Ed25519 signature
- `timestamp` — UTC; when the work was attested
- `hcs_receipt` — Hedera HCS audit anchor (detached; populated post-signing)

**Subcontract references are content addresses, never UUIDs.** The protocol's audit invariant only holds if every cross-reference resolves by hash. UUIDs are mutable identifiers; content addresses are not. Tampering with a child cert breaks the parent's address resolution without invalidating the parent's signature — the verifier discovers the chain break at the link-resolution step, exactly where you want to discover it.

#### The cert chain

```
TaskSpec (sha256:abc…)
  ↓ signed by buyer + seller; escrowed on Base (USDC) with hashlock on expected final cert
  ↓ referenced by ↓
DerivationCert (compliance, sha256:def…)
  ↓ output_address →
    BeneficialOwnershipExtraction (sha256:ghi…)
  ↓ subcontract_cert_addresses → DerivationCert (sanctions, sha256:jkl…)
                                   ↓ output_address →
                                     SanctionsScreenResult (sha256:mno…)
```

Every arrow is a hash reference. Every node is signed. Every node is anchored.

### 2.2 The Two-Ledger Settlement

#### Base Sepolia — Settlement layer (this submission)

The buyer creates a `HashlockEscrow` Solidity contract instance on Base Sepolia, funded with the agreed-upon **USDC** amount via Circle's `transferWithAuthorization` (EIP-3009). The contract — deployed live at [`0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3`](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3) — has exactly one release condition:

```solidity
require(sha256(certPayload) == e.hashlock, "cert mismatch");
e.released = true;
require(token.transfer(e.seller, e.amount), "transfer failed");
```

The deliberate minimalism of this verifier is itself a security property: ~100 lines of Solidity total, **one** verification check, no oracles, no time-dependent branches, no external calls beyond the standard ERC-20 USDC transfer, no re-entrancy attack surface (the `released` flag is set before transfer). Auditable in an afternoon, not a week. The hashlock pre-commitment means the buyer locks in the expected cryptographic outcome at escrow funding; the seller cannot retroactively renegotiate.

When the seller's final cert is submitted on-chain, the escrow verifies the hash and releases the USDC. No oracle. No off-chain settlement. No human in the loop. **Coinbase x402 + USDC + EIP-3009** make this 10 lines of verification logic instead of a custom token contract — *that's why Base + x402 was uniquely possible for this protocol*.

#### XRPL — Sibling settlement adapter

The same protocol primitives drive the sibling implementation [AgentLevy-XRPL-UOR](https://github.com/maurathat/AgentLevy-XRPL-UOR) on XRPL WASM Devnet, where settlement uses **XLS-100 SmartEscrow** funded with **RLUSD**. The XRPL adapter's WASM `FinishFunction` is the same release rule expressed in ~10 lines of WASM instead of Solidity. UOR-ADDR-1's chain-binding adapter pattern means the buyer agent, compliance agent, and cert chain all stay chain-agnostic — only the settlement-layer module differs between the two implementations. **One protocol, two live chains.**

#### Hedera HCS — Audit anchor

Independently, every signed `DerivationCert` has its content address submitted to a Hedera Consensus Service (HCS) topic ([`0.0.8856047`](https://hashscan.io/testnet/topic/0.0.8856047) on testnet). HCS provides:

- An **authoritative consensus timestamp** (when did this cert exist, witnessed by Hedera consensus?)
- A **monotonic sequence number** within the topic (stable ordering across all certs anchored under this protocol)
- A **publicly queryable Mirror Node REST API** — anyone can re-verify with a single HTTP GET

The anchor is **detached** from the cert's canonical bytes. Anchoring happens *after* signing, so the cert's content address is unchanged by the anchor (and the signature remains valid). The `hcs_receipt` field stores `topic_id`, `sequence_number`, `transaction_id`, `consensus_timestamp` — enough for any third party to re-verify against Hedera Mirror Node without our cooperation.

### 2.3 Why two ledgers

| Property | What it provides |
|---|---|
| **Independent witnesses** | If the settlement chain (Base or XRPL) has a reorganization or HCS goes down, the other ledger still has the proof. Two attesters; not just one. |
| **Settlement decoupled from audit** | The settlement chain says *the money moved*; Hedera says *the cert existed at exactly this moment, witnessed by separate consensus*. Audit one without trusting the other. |
| **Two governance models** | Base validators / XRPL Foundation governs the settlement chain; Hedera Council (Fortune 500-heavy: Google, IBM, LG, Boeing, Standard Bank, etc.) governs the audit chain. Regulatory acceptance varies by jurisdiction; having both means you don't have to bet. |
| **Cross-chain redundancy** | If Base reorgs, the timeline lives on Hedera. If Hedera ever Council-restructures, the money is on Base. Neither bet is total. |
| **Each chain plays its strength** | HCS is built for high-throughput ordering (~$0.0001/msg); Base + USDC + EIP-3009 (or XRPL XLS-100 + RLUSD in the sibling) is built for cheap, fast, conditional settlement. |

This is the structural property: **two independent ledgers, two independent governance models, two independent verification paths.** The audit story doesn't depend on either chain alone.

### 2.4 Subcontracting + auditing: AWS Lambda + KIRO MCP

Two pieces of the live submission deserve their own subsections because they prove out parts of the protocol the standards alone don't specify: **how a sub-agent participates in a cert chain**, and **how a human auditor verifies one**.

#### 2.4.1 AWS Lambda + Bedrock — sanctions screening as a subcontracted agent

The compliance agent doesn't do sanctions screening itself; it **subcontracts** to a third agent. In the live demo, that third agent runs as an **AWS Lambda function** (Python 3.13, arm64, 512 MB) behind an API Gateway HTTPS endpoint, invoking **Bedrock — Claude Haiku 4.5** via the `global.anthropic.claude-haiku-4-5-20251001-v1:0` global cross-region inference profile. The handler enforces tool-use to return a Pydantic-validated `SanctionsScreenResult`, signs it with its own Ed25519 keypair, and returns a fully-formed `DerivationCert` whose content address goes back into the parent cert's `subcontract_cert_addresses` list.

This is the protocol's **subcontract** primitive working across vendor boundaries: the parent compliance cert's chain of trust extends to a sub-agent run on AWS infrastructure, signed with a different keypair, anchored to the same Hedera HCS topic. A verifier auditing the parent cert can recursively walk into the sub-cert and re-verify everything from public keys + the Mirror Node REST API. **Why Lambda + Bedrock specifically:** Lambda's stateless model fits the "agent does one focused thing, returns" pattern (no idle compute cost, scales to zero, scales infinitely under load); Bedrock's global cross-region inference profile auto-routes Claude calls across all available AWS regions with zero ops on our side. SAM (`template.yaml`, 92 lines) deploys the whole thing — Lambda + API Gateway + IAM role + permissions — in one shot.

#### 2.4.2 KIRO IDE + MCP — verifiable human audit

A regulator or counterparty doesn't trust our verification UI; they want to verify themselves. AgentLevy ships an **MCP server** (Model Context Protocol, Python SDK, stdio transport) that runs locally and exposes 5 verification tools to any MCP-compatible client — including AWS's **KIRO IDE**:

| Tool | What it does |
|---|---|
| `verify_cert` | Recompute the content address; verify the signature against `seller_pubkey`. |
| `verify_hedera_anchor` | HTTP GET against Mirror Node REST; confirm the message body and consensus timestamp match the cert's `hcs_receipt`. |
| `verify_base_escrow` | RPC against Base Sepolia; confirm the escrow's `hashlock` matches the cert's content address and that release succeeded. |
| `audit_cert_chain` | Walk a cert chain recursively, calling the three verifiers above on every node. |
| `emit_audit_cert` | Sign and emit an audit-summary `DerivationCert` (the audit becomes another link in the chain — *recursively verifiable*). |

The auditor installs the MCP server in `~/.kiro/settings/mcp.json`, reloads KIRO, and the IDE-agent gains those 5 tools natively. **The audit becomes another cert.** Whoever later audits *the audit* gets the same recursive guarantees. KIRO's first-class MCP support meant we could plug verification into a regulator's actual workflow with **zero IDE-side code** — install via JSON config, reload, done.

### 2.5 Future: dNFT + SmartEscrow integration pattern (XRPL-specific, Phase 3)

XRPL natively supports two primitives that, when composed with AgentLevy's cert chain, unlock a class of use cases no other chain can offer as cleanly today:

- **XLS-20 dynamic NFTs (dNFTs)** — NFTs whose metadata can be updated post-mint by the issuer.
- **XLS-100 SmartEscrow** — conditional-release escrow whose `FinishFunction` can reference NFT state.

Together with AgentLevy's `DerivationCert` chain, you get **three composable layers** governing one workflow:

| Layer | Role | Question it answers |
|---|---|---|
| **AgentLevy cert chain** | The verifiable history | *Prove how we got here.* |
| **XLS-20 dNFT** | A single canonical onchain reference to evolving state | *What is the current state?* |
| **XLS-100 SmartEscrow** | Conditional fund release tied to that state | *Automate the consequence.* |

The cert chain underpins the dNFT (the dNFT's state transitions are backed by signed certs); the dNFT expresses state as a single onchain reference (regulators get one object to read); SmartEscrow releases funds when the state hits a target (programmable, automated). **Best of both worlds: a single regulator-friendly object plus a fully verifiable history.**

This pattern is feasible-but-expensive on Ethereum (1000+ LoC of custom Solidity contracts + audits), feasible on Solana / Sui / Base (similar custom-contract burden), and **uniquely cheap on XRPL** because dNFTs and SmartEscrow are native primitives — AgentLevy layers the cert chain on top without writing or auditing thousands of lines of contract code.

Phase 3 productizes this pattern. The markets it unlocks are catalogued in §6.11; the most economically novel of these is **AI model pay-per-inference with cryptographic enforcement** (§6.11.1).

---

## 3. UOR Alignment: Why This Protocol Doesn't Define Its Own Addressing

A subtle but load-bearing detail: AgentLevy doesn't define its own content-addressing scheme. It uses the **UOR Foundation's** canonical addressing layer, byte-for-byte.

### 3.1 What UOR provides

UOR (Universal Object Reference) is a Foundation-backed content-addressing standard with three components:

- **PRISM** — a Q(31), 256-bit ring algebra implementation under MIT license. Vendored at `vendor/prism.py`. The algebraic substrate for UOR addresses.
- **JCS-RFC8785 + NFC canonicalization** — the agreed-upon discipline for what bytes get hashed before address derivation.
- **UOR-Passport address format** — `sha256:<64hex>`. The publicly-resolvable envelope.

Together these define an address that is:

1. **Algebraically structured** — the same content has *one* canonical address but *many* equivalent representations (hex, Braille glyph, ring element, base32). All algebraically the same address. Useful for visual rendering, for cross-tool composition, for sub-canonicalization within other schemes.
2. **Standards-track** — UOR Foundation has a Sandbox → Incubating → Graduated lifecycle. UOR-ADDR-1 is the community proposal we're co-contributing to.
3. **Cross-domain composable** — the same primitive is used by UOR Identity (for entity identity), UOR Certificate (for generic signed attestations), UNS (for human-readable name resolution), Hologram SDK (for module certificates already in production), and AgentLevy (for work-integrity certs).

### 3.2 Why this matters for the pitch

Three pitch claims that are only credible *because of UOR alignment*:

- **"Byte-identical to canonical reference."** Without UOR, this is just "compatible-ish." With UOR, it's empirical: we've live cross-checked our content addresses against `mcp.uor.foundation/encode_address` for the same canonical bytes. They produce the same SHA-256, byte-for-byte. (See [docs/UOR_PASSPORT_VERIFIED.md](../docs/UOR_PASSPORT_VERIFIED.md).)
- **"Verifiable from public keys alone."** Only works if the addresses being verified resolve against an open, publicly-defined format. UOR is what makes "alone" true; without it, a verifier needs vendor cooperation to interpret addresses.
- **"Protocol-author moat."** VTEAI is the settlement spec we authored; UOR-ADDR-1 is the addressing spec we co-contribute to. Future implementers will use specs we shaped.

### 3.3 vs every alternative

| Alternative addressing | What it lacks vs UOR |
|---|---|
| **Vendor-internal IDs** (any KYC vendor's database keys) | Not publicly resolvable. Requires vendor cooperation to interpret. Outlive the vendor? No. |
| **IPFS CIDs** (multihash) | No algebraic structure. No Foundation-backed governance lifecycle. Great for storage, less suited for verifiable references. |
| **Ethereum keccak256 hashes** | Solidity-native; doesn't compose cleanly with non-Ethereum chains without translation layers. |
| **W3C DID Methods** | Identity, not content. Composes with UOR (DID identifies the agent; UOR address identifies what the agent did) but doesn't replace it. |
| **Coinbase Commerce / x402 internal IDs** | Vendor-bound. Don't survive Coinbase's involvement. |
| **Virtuals Protocol (Base contract addresses + tokenIDs)** | Chain-bound to Base. UOR is chain-neutral. |

---

## 4. The Verification Model

The key claim — "verifiable from public keys alone, across two independent ledgers" — needs to be unpacked. What can a verifier holding only public keys + a cert chain actually re-check?

A verifier with `(buyer_pubkey, compliance_pubkey, sanctions_pubkey, the 5 certs)` can independently confirm:

1. **Every signature is valid.** Ed25519 verify against canonical bytes (excluding the signature field). Standard cryptography library; no specialized hardware required.
2. **Every content address resolves.** Recompute SHA-256 over JCS-RFC8785 + NFC canonical bytes; match against the reference. The reference implementation is open-source; the canonicalization rules are RFC-published.
3. **Every back-reference is consistent.** `task_spec_address` on the cert resolves to the actual TaskSpec; `input_addresses` resolve to the actual inputs the spec declared; `subcontract_cert_addresses` resolve to actual child certs.
4. **Every cert was witnessed by Hedera.** A single HTTP GET to Hedera Mirror Node REST returns the message body that was anchored, the consensus timestamp, the sequence number. Compare against the cert's `hcs_receipt`; verify match.
5. **The escrow released against the final cert hash.** Base Sepolia public transaction history (via [BaseScan](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3)) shows the deployed `HashlockEscrow` contract was funded with hashlock X and released to the seller after submission of the cert payload that hashes to X. Public, auditable, no API key required. (For the XRPL sibling impl, the same auditability holds via XRPL's public transaction history.)

Math, not trust. The verification doesn't depend on the buyer's vendor still existing, the compliance agent still being active, the sanctions agent still being reachable, or the seller's company still being in business. The audit verifies in 2046 the same way it verifies today.

---

## 5. Competitive Landscape (Deep Dive)

The competitive landscape table on the pitch deck is necessarily compressed. Here's the longer version, by category.

### 5.1 Payment rails for agent commerce

#### Coinbase x402

**What it is:** A specification for re-activating HTTP status code 402 ("Payment Required") for agent-to-agent micropayments. Agent A makes an HTTP request to Agent B's endpoint; B responds with 402 + payment details (USDC on Base); A pays; A retries the original request with payment proof attached; B serves the response.

**What it solves:** Frictionless per-request settlement for agents. Removes the "bill me at the end of the month" billing model and replaces it with cryptographic per-call settlement.

**What it doesn't solve:** Verification of what was actually returned. x402 confirms *that the payment moved*, not *that the response matched the agreed-upon work*. There's no concept of a signed attestation of work, no audit trail beyond the payment transaction.

**Composition not competition:** AgentLevy and x402 are complementary. x402 could call AgentLevy as its verifier — Agent A pays via x402, Agent B returns a `DerivationCert`, A re-verifies the cert independently before accepting the response.

#### Coinbase Commerce escrow

**What it is:** Coinbase's hosted escrow product for crypto commerce. Funds held by Coinbase pending fulfillment; released on dispute resolution.

**What it solves:** Crypto-native conditional release. Better than wire transfers + traditional escrow agents.

**What it doesn't solve:** **Custodial.** Coinbase IS the trust anchor. The whole point of AgentLevy's two-ledger non-custodial settlement is removing the trust anchor — replacing "Coinbase will release the funds when conditions are met" with "the math will release the funds when the cert hash matches."

For a hackathon judge / regulator / counterparty's risk officer, "non-custodial + math-verifiable" is a meaningfully different posture than "Coinbase-custodial + dispute-resolved-by-Coinbase."

#### x402 + DID-based agent platforms (general pattern)

Increasingly common stack: agent identity via DIDs, payment via x402-style rails, arbitration via the platform's dispute layer. Solves identity + payment well; doesn't address verifiable work-integrity.

### 5.2 Agent commerce protocols

#### Virtuals Protocol (ACP — Agent Commerce Protocol)

**What it is:** A platform on Base for tokenized AI agents. Each agent has a tradeable token; revenue from agent usage flows to token holders. ACP defines agent-to-agent transaction primitives — negotiation envelopes, payment rails, result delivery — with platform-managed attestation for sensitive computation.

**What it solves:** A tightly-integrated agent marketplace with economic incentives for agent creators. Discovery + payment + delivery in one stack.

**What it doesn't solve (vs AgentLevy):**
- **Platform-bound to Base + Virtuals tokens.** AgentLevy is chain-neutral; the same protocol runs on Base today (this submission) and on XRPL today (sibling impl), and via UOR-ADDR-1 adapters on any other chain.
- **Marketplace primitive vs settlement primitive.** ACP is great for "agents discover + transact with each other in a token economy"; AgentLevy is for "this work was performed, here's the math, anyone can verify forever."
- **Platform-managed attestation vs cryptographic-cert chains.** Centralized attestation requires trusting the platform operator and their attestation service. A cert chain anchored on two independent public ledgers requires trusting math + open consensus, with no operator in the loop.

ACP and AgentLevy address adjacent problems; an enterprise might use both — Virtuals for discovery and economic incentives, AgentLevy for the audit trail their regulator demands.

### 5.3 Identity + credential platforms

#### W3C DIDs, Civic, Worldcoin, Moca AIR Kit

**What they solve:** Cryptographic identity for agents (and humans). DID resolves to a public key; Civic adds KYC verification; Worldcoin adds proof-of-personhood; Moca packages these for AI-agent contexts.

**What they don't solve:** *What did this identified agent actually do?* Identity tells you the counterparty; it doesn't certify their work.

**Composition with AgentLevy:** Agent pubkeys in our cert chain can resolve to UOR Identity profiles, W3C DIDs, or any other identity layer. The protocol is identity-method-agnostic — it cares that there's *a* public key, not which registry that key was issued under.

### 5.4 Agent-platform SDKs

#### Anthropic agent SDK, OpenAI agent platform, Hedera AgentKit, Fetch.ai, Olas Network, Google AP2

**What they solve:** Identity + discovery + tooling within their walled garden. Excellent developer experience for agents that live entirely within the platform.

**What they don't solve:** Cross-vendor verification. Long-horizon auditability. The platform's logs are vendor-trusted; the platform's identity attestations are platform-bound.

**Composition with AgentLevy:** Each platform's agent SDK can produce VTEAI-compliant TaskSpecs and DerivationCerts. The platform handles agent invocation; AgentLevy handles cross-vendor audit-trail integrity.

### 5.5 Web3 oracles

#### Chainlink, Pyth, RedStone

**What they solve:** Bring external data onchain in a verifiable way (price feeds, weather, sports outcomes).

**What they don't solve:** Trust model is "trusted decentralized oracle network." For settlement of agent work, AgentLevy needs no oracle — the cert chain IS the oracle. The DerivationCert *is* the verifiable claim about what happened.

### 5.6 Legacy compliance + escrow vendors

#### LexisNexis Risk Solutions, Refinitiv (LSEG), Thomson Reuters

**What they solve:** Mature, regulator-accepted compliance workflows. Vendor-trusted audit. Established for decades.

**What they don't solve:** Their audit architecture predates the cryptographic primitives that make non-custodial verification possible. They sell "trust our database for 30 years"; we offer "trust the math for 30 years." Different posture, different defensibility under adversarial conditions.

#### Coinbase Commerce + custodial crypto-escrow players

Already addressed above (5.1). Custodial → AgentLevy non-custodial.

### 5.7 Permissioned blockchain platforms

#### Hyperledger Fabric, R3 Corda

**What they solve:** Multi-party transaction systems with controlled access; mature in financial-services use cases.

**What they don't solve:** Permissioned-blockchain trust models still require trust in the consortium operating the chain. AgentLevy's two-ledger anchoring on public chains (Base + Hedera in this submission; XRPL + Hedera in the sibling impl) inherits the trust models of public consensus — much broader, much harder to subvert.

---

## 6. Customer Use Cases

The wedge market is **KYC compliance** (the demo target). The protocol generalizes naturally to several adjacent markets, in roughly this order of expansion:

### 6.1 Mid-market regional banks (KYC + AML compliance)

**Pain:** KYC verification is high-volume, regulator-scrutinized, and currently locked into one or two vendors per bank. Switching vendors is multi-year. Audit response to regulator inquiries means digging through vendor portal exports, hoping the original vendor's account is still active.

**AgentLevy fit:** Banks can keep their existing KYC workflow vendors but require those vendors to emit AgentLevy-compatible certs. The bank holds the cert chain; the regulator can re-verify against Base + Hedera (or XRPL + Hedera, depending on the chain adapter) independently, without the vendor's API.

**Procurement reality:** Mid-market regional banks ($X–X B AUM) have enough volume to feel the pain and enough autonomy to pilot a new approach without a 24-month procurement cycle. Bigger banks are harder to land and slower to move.

### 6.2 KYC compliance vendors (channel/whitelabel partners)

**Pain:** Compliance vendors compete on data quality and customer service. Cryptographic auditability is a feature their customers (banks, payment processors) increasingly ask for, but building it from scratch is years of engineering.

**AgentLevy fit:** Vendor licenses the AgentLevy reference implementation (or the Kessai productized version) as a backend. Their existing UI + workflow stays; cert generation + anchoring becomes a backend feature. Vendor sells "the same compliance work you're getting today, plus cryptographic auditability your regulator will love."

**Channel economics:** Whitelabel + revenue share, faster time-to-revenue than enterprise direct sales.

### 6.3 M&A escrow + transaction support

**Pain:** M&A escrow currently locks funds with a trusted escrow agent for the deal-closing window. Audit horizons stretch 5–10+ years (rep-and-warranties claims, regulatory hold periods). Multi-party verification is core (buyer, seller, both sides' counsel, escrow agent, sometimes regulators), and cross-jurisdictional acceptance is a hard problem.

**AgentLevy fit:**
- **Decades-long audit horizons** → two-ledger anchoring is *especially* valuable. Single-chain bets feel risky over that timeframe to deal counsel.
- **Multi-party verification** → each party can independently verify on whichever chain they trust most, without going through the deal coordinator.
- **Cross-jurisdictional acceptance** → the two-ledger pattern (settlement on Base or XRPL + audit on Hedera Council-governed HCS) pre-empts the question of which regulator trusts which chain. Multiple settlement-chain options means a bank can pick the chain whose governance their regulator already accepts.
- **Willingness to pay** → escrow fees on a $500M deal are millions; paying for "audit-trail-that-outlives-the-deal-team" is trivially justified.

**Year-2 wedge.** Higher-value than KYC; longer sales cycle.

### 6.4 Title companies + property closings

**Pain:** Title insurance has the longest audit horizon of any commercial use case — title claims can pay out 30+ years after a closing, on policies issued before today's vendors and registries even existed. Pain points compound:

- **Title chain integrity** — the proof that the property has clean ownership history (every prior conveyance, every lien, every encumbrance). Currently reconstructed by humans reading recorder-of-deeds records county-by-county.
- **Closing escrow** — funds locked until conditions met (very similar mechanics to M&A escrow). Currently held by the title company in trust.
- **Multi-party verification** — buyer, seller, lender, title insurer, county recorder, sometimes state regulator. Each currently maintains its own copy with no shared verifiable record.
- **Cross-state friction** — every county has its own recorder system, often paper-or-PDF-based. National title insurers spend enormous resources reconciling.

**AgentLevy fit (especially strong):**

- **Title chain naturally maps to cert chain.** Each conveyance is a signed cert referencing the prior owner's cert by content address. The "proof of clean title" becomes hash-chain verification — same primitive as the cert chain we ship for KYC.
- **30-year audit horizon → two-ledger anchoring is essential.** Single-chain bets feel risky; two-ledger redundancy across Base + Hedera (or XRPL + Hedera) — different governance models, different consensus mechanisms — is exactly the property title insurers need.
- **Smart escrow for closing funds.** Base `HashlockEscrow` (or XRPL XLS-100 SmartEscrow) fits "release funds when title transfer is recorded" naturally — the cert hash IS the recording.
- **Cross-state verification without per-county integration.** A cryptographically-verifiable title chain bypasses the need to integrate with each county recorder's database. The chain itself IS the proof; the recorder becomes one anchor among several.

**Willingness to pay:** title insurance premiums are 0.5–1.0% of property value; on a $500K home, $2,500–$5,000 per closing. National title insurers (First American, Fidelity National, Stewart) have billions in annual revenue and active R&D budgets for chain-of-title automation. **Year-2/3 pilot target alongside M&A.**

### 6.5 Healthcare records (EHR audit + clinical AI inference)

**Pain:** US healthcare runs on a handful of dominant EHR platforms — Epic (~40%+ of US patient records), Cerner (now Oracle Health), Allscripts, athenahealth. HIPAA mandates audit trails for record access, but the audit is vendor-trusted: "Epic's logs say Dr. Smith viewed this chart at 2pm." Cross-institution sharing requires building trust hierarchies between vendors, which is fragile and slow. The 21st Century Cures Act's interoperability mandate makes this worse — more cross-vendor data flows, same vendor-trusted audit model.

Layer on top: clinical AI agents (decision support, prior authorization, claims processing, scan analysis, documentation drafting). Hospitals increasingly need to answer "what AI agent did what to this patient's record, on which inputs, when?" — and the answer needs to satisfy regulators, plaintiffs' attorneys, and joint commission auditors.

**AgentLevy fit (HIPAA-compliant by construction):**

- **PHI never goes onchain.** Only the **content address** of the access event (hash of canonical metadata) + the agent's signature + the consensus timestamp anchor on chain. The PHI itself stays inside the EHR's compliant infrastructure. The cert is a verifiable claim *about* the access, not the PHI.
- **Cross-EHR audit trails without trust between vendors.** Epic and Cerner can independently verify each other's cert chains via Hedera Mirror Node + Base JSON-RPC (or XRPL JSON-RPC). No bilateral trust agreement needed.
- **Clinical AI inference provenance.** When an agent flags a scan, suggests a diagnosis, or auto-completes a clinical note, the `DerivationCert` records what model + version + inputs + output. Court-admissible cryptographic provenance for AI-driven clinical decisions.
- **Patient-controlled access.** Patient pubkey can be required as a co-signer on certain cert types (e.g., third-party data exports), giving patients verifiable control over their record's downstream uses. Aligns with Cures Act intent.

**Procurement reality:** Epic doesn't pilot with startups easily; the wedge is **smaller hospital systems and digital-health vendors** that integrate with Epic via APIs and need an audit story for their AI features. Once those wedge customers prove the pattern, larger systems and Epic itself become reachable.

### 6.6 Legal documents + e-discovery (NetDocuments, iManage, Relativity, etc.)

**Pain:** Law firms run on document management systems (DMS) — NetDocuments, iManage Work, Relativity (litigation), Clio (smaller firms). Critical needs:

- **Chain-of-custody for litigation hold.** When opposing counsel produces a document, the producing firm needs to prove it hasn't been tampered with since collection. Current model: vendor-trusted DMS + sworn affidavit.
- **E-discovery defensibility.** Forensically-sound audit trails for every document operation (read, edit, share, redact, export). Must survive challenges from opposing counsel and judicial scrutiny.
- **Privilege determination + conflict checks.** Multi-party signing, privileged communications, ethical-wall enforcement.
- **Cross-firm document exchange.** Counsel-to-counsel, counsel-to-court, counsel-to-regulator. Each transition currently requires trust in the sender or a trusted intermediary (e.g., e-discovery vendor).
- **AI in legal practice.** Contract review, due diligence, legal research, brief drafting — all increasingly AI-driven. Same provenance question as healthcare AI: what AI agent did what, to which document, when, with what inputs.

**AgentLevy fit:**

- **Cert chain IS the chain of custody.** Every document operation produces a signed `DerivationCert`. Tampering breaks the chain at the address-resolution step, not the signature step — the chain break is mathematically detectable, not testimonially asserted.
- **Court-admissible cryptographic evidence.** Federal Rules of Evidence 901 + 902(13) (the "self-authenticating digital records" amendment) explicitly contemplate hash-based authenticity proofs. AgentLevy's two-ledger anchoring exceeds the FRE bar.
- **Cross-firm verification without trusted intermediary.** Opposing counsel can verify document authenticity directly against the cert chain — no e-discovery vendor in the middle, no chain-of-custody affidavits.
- **Multi-party signing maps directly to TaskSpec dual-signature pattern.** Existing legal workflows port without re-engineering.
- **AI provenance for legal AI.** Same `DerivationCert` shape as healthcare AI; new operation types (`legal.contract_review`, `legal.due_diligence`, `legal.brief_draft`).

**Channel partners:** the existing DMS vendors (NetDocuments, iManage) are natural channel partners — same whitelabel/backend pattern as KYC compliance vendors. They get to sell "cryptographically-verifiable audit trail" to their existing law-firm customers without building it themselves.

### 6.7 International compliance teams

**Pain:** EU eIDAS, Singapore MAS, and several other regulatory regimes already accept cryptographic-evidence formats. Compliance teams operating cross-border are looking for vendor-neutral attestation formats they can submit to multiple regulators without per-jurisdiction translation.

**AgentLevy fit:** Standards-aligned (VTEAI + UOR-ADDR-1 are deliberately chain-neutral and jurisdiction-neutral), token-free, open-source. A compliance team can submit the cert chain + a verification script to any regulator that accepts cryptographic evidence.

### 6.8 Crypto-native escrow (Year 1+)

Crypto-escrow players already use single-chain escrow primitives. Two-ledger anchoring is an upgrade story — better audit, no new trust assumptions on top of what they already accept.

### 6.9 AI governance + inference provenance (Year 3+)

**Pain:** Enterprise AI deployments increasingly need to answer "show me, cryptographically, what model + version + prompt + inputs produced this output." Current logging stacks don't provide cryptographic guarantees; they're vendor-trusted.

**AgentLevy fit:** The same `DerivationCert` shape used for KYC works for AI inference attestation. Agent (the model) signs a cert: "I am model M, version V, on prompt P, with inputs I, I produced output O." The cert is anchored on both ledgers; the audit trail is mathematical.

This is the territory where AgentLevy stops being a KYC-specific protocol and becomes the substrate for **all** verifiable AI work — the wedge becomes the platform.

### 6.10 Insurance + claims adjudication

**Pain:** Insurance claims and adjudication often involve multi-party signed documents passed between insurer, adjuster, claimant, and regulator. Cryptographic audit-trail is a natural fit.

**AgentLevy fit:** Same protocol; new operation types (`insurance.claim_adjudication`, `insurance.payout_calculation`).

### 6.11 dNFT-enabled markets (Phase 3 expansion, XRPL-specific)

The use cases above (§6.1–6.10) all run on AgentLevy's core cert chain + two-ledger settlement. Layering XRPL's dNFT + SmartEscrow primitives on top (architecture pattern in §2.5) unlocks a distinct class of markets where the workflow's *state* — not just its history — needs to live onchain in a way that automates economic consequences.

The flagship of this class is AI model pay-per-inference with cryptographic enforcement.

#### 6.11.1 AI model pay-per-inference with cryptographic enforcement

**The market gap:** AI model providers today face two unsolved problems simultaneously:

1. **Usage tracking with provenance.** Customers want to verify they're paying for what they actually consumed, including knowing *which model version* served each call. Providers want to prevent unauthorized usage. Today this is solved with API keys + vendor-trusted billing systems.
2. **Royalty enforcement when models are licensed downstream.** When a foundation-model maker licenses their model to a downstream provider (e.g., an enterprise software vendor embeds Claude or Llama into their product), royalty calculation depends on the vendor's self-reported usage — vendor-trusted, frequently disputed, slow to settle.

Neither problem has a satisfying solution. Both are blocked by the same gap: **no cryptographic proof of "this model produced this output for this customer at this time."**

**The AgentLevy + dNFT + SmartEscrow solution:**

- **Model licensed as an XLS-20 dNFT.** The dNFT represents the license; metadata fields track usage counters, royalty rates, license-tier permissions.
- **Each inference produces a `DerivationCert`.** The cert binds: model identifier + version + prompt content address + input content addresses + output content address + agent (model deployment) public key + timestamp. Anchored on Hedera HCS.
- **Cert submission updates the dNFT's usage counter** via the issuer's update authority. The on-chain counter is a real-time, cryptographically-backed record of consumption.
- **SmartEscrow releases per-inference payment automatically** as the counter increments. Royalty splits to model creators happen at the same transaction; no monthly reconciliation, no disputes, no intermediary.

**What this enables that doesn't exist today:**

- **True pay-per-inference at machine speed.** Settlement happens in the same transaction window as the inference itself; not "true up at month-end."
- **Cryptographic audit of every inference, forever.** Customer asks "what model produced this output?" — recompute the cert hash, query Hedera Mirror Node, get the consensus timestamp. No vendor logs needed.
- **Royalty enforcement without trust.** Model creators see exactly how many inferences ran on their model, in real time, on a public ledger. Payment is automatic. Disputes don't exist because there's nothing to dispute — the math is the source of truth.
- **Model versioning provenance.** Every cert binds the *exact model version* that ran. When a model gets updated, the dNFT's `current_version` field updates; old certs remain valid against the version they were signed under. Solves the "we silently changed the model and your evals broke" problem.
- **Transferable / sub-licensable model rights.** The dNFT is transferable; sub-licensing becomes a dNFT split or a child-dNFT mint. Cleaner than today's contract-based licensing.

**Markets this opens:**

| Market segment | What changes |
|---|---|
| **Foundation model providers** (OpenAI, Anthropic, Google, Meta, Mistral, etc.) | Direct cryptographic billing to enterprises; royalty enforcement when models are embedded downstream |
| **AI model marketplaces** (Hugging Face, Replicate, Together AI, etc.) | Per-inference settlement at the marketplace layer; auditable provenance for every model run |
| **Enterprise AI integrators** (vendors embedding LLMs into their software) | Cryptographic licensing terms; model-creator royalties auto-paid; no monthly reconciliation labor |
| **Regulatory sandboxes for AI** (EU AI Act, BIS supervision, NIST AI RMF) | "Show me cryptographically what model produced this output" becomes a 1-line query; regulator doesn't need to trust the operator's logs |
| **Open-source model commercialization** | Open-weight model creators can monetize commercial deployments via on-chain royalties without giving up open licensing |
| **Model-routing services** (compound AI systems that pick which model to call) | Cert chain proves which underlying model served each subroutine; routing decisions become auditable |

**Defensibility:** the combination requires (a) a cert protocol that produces standards-aligned content addresses, (b) a chain with native dNFT update + SmartEscrow primitives (or the Solidity equivalent), and (c) a verifiable audit anchor across an independent ledger. AgentLevy provides (a); XRPL provides (b) natively for the Phase 3 dNFT-licensed flagship use cases (Base provides equivalent settlement via the deployed Solidity `HashlockEscrow` for the standard cert chain); Hedera HCS provides (c). **Coinbase x402 + Virtuals ACP + traditional API-key billing each have one of these; none have all three.**

This use case alone could justify Phase 3 prioritization. The total addressable market is the full size of the AI inference economy — projected at hundreds of billions of dollars by the late 2020s, currently mostly billed via vendor-trusted systems with weak provenance.

#### 6.11.2 Other dNFT-enabled use cases

- **Portable KYC attestations** — a verified KYC as a dNFT travels with the customer across institutions; new bank verifies the cert chain once.
- **Tranched M&A escrow** — each due-diligence milestone is a dNFT state transition; SmartEscrow releases tranches automatically as state advances.
- **Title NFTs** — property title as a dNFT; each conveyance updates state; Smart Escrow holds closing funds conditional on `NEW_OWNER` transition. National title insurers' chain-of-title automation budgets fit here.
- **Patient consent NFTs** — patient mints consent dNFT for a specific PHI use; provider's escrow holds payment until consent_used + work_completed; revocable. HIPAA-friendly because the NFT is consent metadata, not PHI.
- **Carbon credit verification** — each verified offset as a dNFT; cert chain provides audit; Smart Escrow holds purchase funds conditional on `VERIFIED` state. Solves voluntary carbon market's double-counting problem.
- **SLA-enforced subscriptions** — subscription as a dNFT; performance metrics update state; Smart Escrow releases monthly payment if `COMPLIANT`; auto-refunds on breach.
- **Supply chain provenance** — each handoff as a dNFT state transition; certs document each leg; payment to each supply-chain party releases as their stage completes.

All of these share the same architectural pattern (§2.4) and benefit from the same XRPL-specific cost advantage versus implementing on Ethereum / Solana / Sui / Base.

---

## 7. Risk Model

The two scariest failure modes in agent-driven onchain commerce are exactly the two we engineered against.

### 7.1 Smart-contract risk → minimal verifier surface

Most onchain escrow contracts run thousands of lines of Solidity, with arbitrary call patterns and re-entrancy attack surface. AgentLevy's `HashlockEscrow` contract on Base Sepolia is **~100 lines of Solidity** with a single conditional release rule:

```solidity
require(sha256(certPayload) == e.hashlock, "cert mismatch");
e.released = true;
require(token.transfer(e.seller, e.amount), "transfer failed");
```

- **One verification check** — sha256 of the submitted cert payload must match the hashlock committed at escrow creation. That's the entire release condition.
- Deterministic by construction — no oracles, no time-dependent branches, no external calls beyond the standard ERC-20 USDC transfer.
- The `released` flag is set before the transfer call → no re-entrancy attack surface.
- Auditable in a single afternoon, not a week of formal verification.
- Hashlock pre-commitment — the buyer locks in the expected cryptographic outcome at escrow funding; the seller cannot retroactively renegotiate.
- **EIP-3009 USDC native** — no custom token contract; reuses Circle's audited USDC implementation. One less surface to audit.

The XRPL sibling implementation expresses the same release rule in ~10 lines of WASM via XLS-100 SmartEscrow's `FinishFunction`, with RLUSD as the asset — same security property, different verifier substrate.

**Honest acknowledgment:** the Solidity `HashlockEscrow` is custom (deployed live to Base Sepolia for this submission); no production audit history yet. The XRPL sibling's WASM `FinishFunction` is also new (XLS-100 activated Feb 2026). Mainnet deployments on either chain will go through a top-tier security firm before any production funds are at risk.

### 7.2 LLM negotiation risk → bounded, schema-locked, cache-replayable

LLMs are non-deterministic, prompt-injectable, and prone to over-spending tokens on unbounded negotiations. We constrain every layer:

- **4-turn hard cap** on buyer ↔ compliance negotiation. Beyond turn 4, the protocol exits gracefully with a signed "negotiation failed" cert (itself a valid audit artifact). No infinite loops, no runaway token bills.
- **Schema-validated outputs only** — every LLM call returns a Pydantic-validated structured output via Anthropic tool use. Free-form text isn't accepted into the cert chain.
- **Temperature = 0** by default. Determinism wins for KYC; the cache layer assumes reproducibility.
- **Fixture cache for stage demos** — `LLM_CACHE_MODE=cache` replays recorded responses byte-identically. The demo cannot fail because the API hiccupped.
- **Wrong-keypair rejection at sign time** — `cert.sign(keypair)` raises if the keypair's public key doesn't match the `seller_pubkey` on the cert. Prevents an LLM-driven mistake from cross-signing as the wrong party.
- **Tamper detection on every field** — modifying the cert post-sign invalidates the signature; modifying a referenced cert breaks the chain at the address-resolution step. Test coverage proves this for every model field.

**Honest acknowledgment:** LLMs can still fabricate data *within the schema*. The cert chain proves the work happened, not that the inputs were correctly interpreted. Quality of the underlying LLM, prompt engineering, and input documents are upstream concerns.

### 7.3 Cryptographic risk + post-quantum migration

Today's stack uses Ed25519 (signing) + SHA-256 (addressing). Neither is post-quantum-safe. The architecture has a **documented migration path to CRYSTALS-Dilithium-3** (FIPS 204 ML-DSA-65) — which UOR Foundation's deeper agent-identity layer already uses. The cert envelope's algorithm field makes the migration purely additive: no breaking change to the surrounding format. SHA-256 addressing survives quantum break independently of the signature algorithm.

### 7.4 Standards-track risk

VTEAI is a published draft; UOR-ADDR-1 is a community proposal. Neither is formally ratified yet. **Mitigation:** AgentLevy works regardless of formal ratification — the reference implementation is real, deployable today. Ratification is upside, not gating. Standards-author position remains a moat even pre-ratification because we're shaping the spec.

### 7.5 Chain-bet risk

**Settlement-chain bet:** Base + USDC + EIP-3009 is the primary settlement path in this submission (live deployment on Base Sepolia). The XRPL sibling impl shows XLS-100 + RLUSD as a second supported adapter. **Mitigation:** UOR-ADDR-1 chain-binding adapter pattern — Hedera EVM, Solana, Sui, and any other chain supporting a hashlock-conditional release can be added without changing the protocol layer.

**Hedera bet:** HCS is mature and enterprise-adopted (Hedera Council includes Google, IBM, Boeing, LG, Standard Bank, etc.). **Mitigation:** the HCS anchor is additive, not gating. Settlement on Base (or XRPL) works without HCS; HCS is the second witness, not the first.

---

## 8. Roadmap

### 8.1 Standards (the moat we're authoring)

- **VTEAI ERC** — currently a published draft (CC0, April 2026). Path to formal ratification with broader implementer adoption — engaging with the Ethereum standards community + cross-chain working groups.
- **UOR-ADDR-1** — currently a community proposal under the UOR Foundation. AgentLevy is its first reference implementation; we're contributing to maturation.
- **UOR Foundation Sandbox → Incubating graduation** — track-graduating AgentLevy within the Foundation's project lifecycle. Brings governance + interop guarantees.

### 8.2 Multi-chain via UOR-ADDR-1 adapters

**Base ships first** in this hackathon submission with a live `HashlockEscrow` Solidity contract on Base Sepolia + USDC + EIP-3009. **XRPL is the second live adapter** in the sibling implementation. UOR-ADDR-1's chain-binding adapter pattern means **any chain that supports a hashlock-conditional release can be added without changing the protocol layer**: Hedera EVM, Solana, Sui, and beyond — each gets an adapter; agents stay chain-agnostic. *One protocol, two live chains today, more adapters tomorrow.*

### 8.3 Verifiable agent memory + AI inference provenance

The cert chain we ship for KYC is the same primitive used for **verifiable agent memory**. Every cert is a content-addressed, signed, anchored record of "this agent did this work on these inputs at this consensus-witnessed time." Stack many of these and you get an agent's complete, mathematically-verifiable history — the foundation for:

- **Long-horizon agent reputation** — not vendor-trusted scores, but a public-key-verifiable track record. An agent's past certs are its résumé.
- **AI inference provenance** — for enterprise AI governance: "show me, cryptographically, what model + version + prompt + inputs produced this output." Same `DerivationCert` shape; new operation types.
- **Memoization with audit** — when an agent re-uses a prior result instead of recomputing, the prior cert IS the citation. Cache hits become cryptographically auditable.
- **Cross-agent memory sharing** — an agent referencing another agent's prior work cites by content address, not by API. The reference resolves whether the original agent still exists or not. Composes naturally with MemWal-style memory protocols.

This is the territory where AgentLevy stops being KYC-specific and becomes the substrate for **all** verifiable agent work — the wedge becomes the platform.

### 8.4 Phase 3: dNFT + SmartEscrow integration (XRPL-specific)

Layering XRPL's native XLS-20 dNFTs and XLS-100 SmartEscrow on top of AgentLevy's cert chain — see architecture pattern in §2.5 and market catalog in §6.11. Phase 3 productizes this combination, with **AI model pay-per-inference with cryptographic enforcement** (§6.11.1) as the flagship use case.

The TAM for AI model licensing alone is the full size of the AI inference economy — projected at hundreds of billions of dollars by the late 2020s, currently mostly billed via vendor-trusted systems with weak provenance. AgentLevy + dNFT + SmartEscrow is the first protocol stack that solves usage tracking, royalty enforcement, and provenance simultaneously, with no trusted intermediary.

Adjacent markets the same pattern unlocks: portable KYC attestations, tranched M&A escrow, title NFTs, patient-controlled consent NFTs, carbon credit verification, SLA-enforced subscriptions, supply chain provenance.

### 8.5 Phase 4: AgentCore Memory + UOR cert chain composition

AWS Bedrock AgentCore (released 2025) provides production primitives for AI agents: a managed runtime, persistent memory (short-term, long-term, semantic, episodic, procedural), agent identity, tool gateways, browser automation, and code interpretation. It composes naturally with UOR cert chains in a way that strengthens both.

**The two operate at different layers:**

| Concern | AgentCore Memory | UOR Cert Chain |
|---|---|---|
| **What it stores** | Agent's *internal state* for decision-making | Agent's *external claims about work it did* |
| **Mutability** | Mutable — agent updates over time | Immutable — every cert is permanent |
| **Trust model** | Vendor-trusted (AWS holds the data) | Math-verifiable (signed, content-addressed) |
| **Survival** | Lives as long as the AWS account | Outlives the agent, the vendor, the cloud |
| **Cross-vendor portability** | AWS-bound | Any UOR-aware tool resolves it |

**AgentCore Memory is intra-agent state. UOR cert chains are inter-agent, inter-vendor, inter-time state.** They solve different problems, and the composition is genuinely powerful:

```
[AgentCore Memory] ←→ [Agent reasons over time]
                              ↓
                          [Decision]
                              ↓
                  [UOR-signed DerivationCert]
                              ↓
                    [Hedera HCS audit anchor]
                              ↓
       [Public audit trail outlives the agent's runtime]
```

For regulated agent commerce — KYC, M&A, healthcare, AI inference provenance — this composition is the right architecture. AgentCore alone gives you a smart agent that's vendor-locked for audit. UOR alone gives you an audit trail but no working-memory primitives. Together: smart + verifiable + portable.

**Reference implementation roadmap.** This project's hackathon submission already includes a **stateless** sanctions agent on AWS Lambda + Bedrock (see `aws/sanctions_agent/`). Phase 4 upgrades the sanctions agent into a stateful AgentCore-hosted variant — for example, a cross-day fraud-pattern detector that learns from prior screenings via AgentCore Long-Term Memory and emits a UOR-signed cert at every decision boundary. The handler shape, request format, and orchestrator integration stay identical between the stateless and AgentCore variants; only the runtime changes.

**Pitch line earned by Phase 4**: *"AgentCore makes the agent capable. UOR cert chains make its work verifiable. AgentLevy is the reference implementation of how these compose for regulated agent commerce."*

### 8.6 Phase 5: KIRO as the human-auditor frontend

AWS KIRO (Amazon's AI-native IDE, released 2025) is positioned as a developer environment with autonomous coding agents. The natural composition with AgentLevy is **not** as a production-agent runtime — that's what AgentCore is for — but as the **human-auditor frontend** for cert chains.

**The audit story.** A regulator, internal auditor, or counterparty's due-diligence team installs an **AgentLevy MCP server** (Phase 5 deliverable) in KIRO. The MCP server exposes the protocol's verification primitives as tools the IDE's agent can call. The auditor types `"audit cert sha256:eb22…4667"` and KIRO walks them through:

1. Resolve content_address → fetch canonical bytes → recompute SHA-256 → confirm match
2. Verify Ed25519 signatures against the seller_pubkey claimed on the cert
3. Walk `subcontract_cert_addresses` to expand the full chain (parent → sanctions cert → screened owner names)
4. Query Hedera Mirror Node REST → confirm consensus timestamps + sequence numbers
5. Read the deployed Base escrow contract → confirm hashlock pre-commitment + release events
6. Emit an audit-summary `DerivationCert` *signed by the auditor's keypair* — the audit itself becomes a verifiable artifact in the cert chain

**The audit becomes another link in the cert chain. Everything composes.**

| Layer | AgentCore | KIRO |
|---|---|---|
| Runs where | Production runtime (managed, AWS-cloud) | Developer/auditor IDE (local, on a human's laptop) |
| Who uses it | Autonomous agents doing work | Human auditors reviewing work |
| Produces | DerivationCert for the work performed | DerivationCert for the audit performed |
| Trust model | Vendor-trusted (AWS) | Operator-trusted (the auditor's own machine) |

The full Phase 4+5 stack: **AgentCore makes agents capable. UOR cert chains make their work verifiable. KIRO + AgentLevy MCP makes the verification accessible to humans.** Three layers, one composable verification story.

### 8.7 Enterprise pilots (the wedge)

- Mid-market regional banks (KYC + AML)
- KYC compliance vendors (channel/whitelabel)
- International compliance teams (EU eIDAS, Singapore MAS)
- M&A escrow + transaction support (Year 2)
- AI governance + inference provenance (Year 3+)

### 8.8 Productization → Kessai

The open-source reference protocol is AgentLevy. The commercial layer is **Kessai** — visualizer UI for cert chains, enterprise SDKs (Python + TypeScript), regulatory-evidence packs, channel licensing for compliance vendors.

The protocol stays open. The standards stay free. The product is what makes verifiable settlement turnkey for enterprises.

---

## 9. References

### 9.1 Standards we author / co-author

- [VTEAI ERC draft](VTEAI-DRAFT.md) — Verified Task Escrow + Attestation Interface (CC0, April 2026)
- [UOR-ADDR-1 community proposal](UOR-ADDR-PROPOSAL.md) — Universal Object Reference Address (community track, April 2026)

### 9.2 UOR Foundation

- UOR Foundation: https://uor.foundation
- UOR MCP cross-validation endpoint (used to verify byte-identical claim): `mcp.uor.foundation/encode_address`
- PRISM (vendored at `vendor/prism.py`, MIT): https://github.com/UOR-Foundation/prism
- Sibling projects: UOR Identity, UOR Certificate, UNS, Hologram SDK

### 9.3 Chain layers

- XRPL: https://xrpl.org
- XLS-100 SmartEscrow: https://xls.xrpl.org/xls/XLS-0100-smart-escrows.html
- XRPL WASM Devnet: https://wasm.devnet.rippletest.net
- Hedera Consensus Service: https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service
- This project's HCS audit topic: https://hashscan.io/testnet/topic/0.0.8856047
- Hiero Python SDK (pure-Python): https://github.com/hiero-ledger/hiero-sdk-python

### 9.4 Cryptography

- Ed25519: RFC 8032
- SHA-256: FIPS 180-4
- JCS (JSON Canonicalization Scheme): RFC 8785
- Unicode Normalization Form C (NFC): UAX #15
- Forward path: CRYSTALS-Dilithium-3 / FIPS 204 ML-DSA-65 (post-quantum)

### 9.5 Source code + documentation

- Repository: https://github.com/maurathat/AgentLevy-XRPL-UOR
- License: Apache 2.0 (project), MIT (vendored PRISM)
- Demo deck: [`pitch/agentlevy-demo-deck.md`](agentlevy-demo-deck.md)
- Funding deck: [`pitch/kessai-funding-deck.md`](kessai-funding-deck.md)
- One-pager: [`pitch/kessai-onepager.md`](kessai-onepager.md)
- Brand assets: https://github.com/maurathat/kessai-pitch-assets

### 9.6 Contact

- Author: Maura Clark · `maurathat`
- GitHub: https://github.com/maurathat
- Project demo website: *(forthcoming, Vercel-hosted)*

---

*Whitepaper v1.0 — May 2026. License: Apache 2.0. Cite as "AgentLevy Whitepaper v1.0" with link to canonical version in the project repository.*
