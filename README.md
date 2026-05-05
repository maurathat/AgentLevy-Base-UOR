# AgentLevy-Base-UOR

> **EasyA Consensus 2026 Hackathon — Track 2: x402 on Base for Agents.** Two AI agents negotiate and execute a verifiable KYC compliance task, pay each other via **x402 on Base**, settle through a smart-contract escrow on cert-hash match, and anchor every cert to **Hedera HCS** for tamper-evident timestamping. Content addresses are **byte-identical to UOR Foundation's canonical reference**. Verifiable from public keys alone, across two independent ledgers.

This is a **sibling implementation** to [AgentLevy-XRPL-UOR](https://github.com/maurathat/AgentLevy-XRPL-UOR) — same protocol primitives, different settlement chain. Demonstrates the chain-neutrality of the underlying VTEAI standard via UOR-ADDR-1 chain-binding adapters.

| Layer | This repo | Sibling (AgentLevy-XRPL-UOR) |
|---|---|---|
| **Settlement** | Base + x402 + Solidity escrow + USDC | XRPL XLS-100 SmartEscrow + RLUSD |
| **Audit anchor** | Hedera HCS (testnet) | Hedera HCS (testnet) |
| **Content addressing** | UOR-Passport (sha256:hex) | UOR-Passport (sha256:hex) |
| **Cert primitives** | Identical | Identical |
| **LLM stack** | Identical (Anthropic + cache) | Identical |
| **Standards** | VTEAI ERC + UOR-ADDR-1 | VTEAI ERC + UOR-ADDR-1 |

The cert primitives, LLM stack, Hedera anchor, brand assets, and standards drafts port verbatim. Only the settlement layer differs.

---

## What's here

```
AgentLevy-Base-UOR/
├── README.md                  # this file
├── CANONICAL_FORM.md          # JCS-RFC8785 + NFC discipline
├── LICENSE                    # Apache 2.0
├── .env.example               # template (Base + Hedera + LLM creds)
├── requirements.txt           # Python deps (core protocol)
├── vendor/
│   └── prism.py               # UOR Foundation PRISM (MIT, vendored)
├── agentlevy/
│   ├── primitives/            # canonical, fingerprint, signing, task_spec, cert
│   ├── llm/                   # client + cache + schemas + prompts
│   ├── hedera_layer/          # HCS audit anchor (mock + live)
│   ├── base_layer/            # Base + x402 settlement (Phase 2.8)
│   ├── prism_layer/           # PRISM Q(31) wrapper
│   ├── agents/                # buyer, compliance, sanctions (Phase 2.5)
│   └── protocol/              # bounded-turn negotiation (Phase 2.6)
├── contracts/                 # Solidity escrow contract
├── web/                       # Node sub-project (Coinbase SDKs)
│   └── src/                   # @coinbase/cdp-sdk + @coinbase/onchainkit
├── scripts/
│   ├── setup_hcs_topic.py     # Hedera topic creator (one-shot)
│   └── ...
├── tests/                     # 128 tests, all chain-neutral
├── docs/                      # UOR Foundation overview, byte-identical proof
├── pitch/                     # demo deck, whitepaper, VTEAI + UOR-ADDR-1 drafts
├── Kessai/                    # brand kit
└── fixtures/                  # cached LLM responses for deterministic demo
```

## Architecture

**Three layers, two chains, one protocol:**

1. **Cert chain** (chain-neutral, Python) — `TaskSpec` + `DerivationCert` with UOR-Passport content addresses. Same primitives as the XRPL sibling repo.
2. **Settlement on Base** (TypeScript/Node, `web/`) — Coinbase x402 SDK handles agent-to-agent payments in USDC; a minimal Solidity escrow contract holds funds with a hashlock on the expected final-cert content address; releases when the hash matches.
3. **Audit anchor on Hedera** (Python, `agentlevy/hedera_layer/`) — every signed cert's content address is published to a Hedera Consensus Service topic for tamper-evident timestamping. Independent witness; survives any single-chain failure.

A verifier holding `(buyer_pubkey, seller_pubkey, sanctions_pubkey, the cert chain)` can independently re-check every signature, every content address, every cross-reference, every consensus timestamp, and the Base settlement event — across two independent ledgers, with no trusted intermediary.

## Demo flow

1. **Buyer agent** drafts a TaskSpec for `kyc.beneficial_ownership_verify`, signs it, deposits USDC into the Base escrow contract with a hashlock on the expected final cert hash.
2. **Compliance agent** accepts the spec, reads the (synthetic) corporate disclosure, extracts beneficial owners via Anthropic structured-output, **subcontracts** sanctions screening to a third agent.
3. **Sanctions agent** screens names against a synthetic sanctions list, signs a `DerivationCert` with `SanctionsScreenResult` as output. Receives x402 micropayment from compliance agent.
4. **Compliance agent** assembles a parent `DerivationCert` referencing the sanctions cert by content address, signs it. Anchors to Hedera HCS topic.
5. **Final cert hash** submitted to the Base escrow contract → matches the hashlock → releases USDC to compliance agent.
6. Audit trail = the cert chain + the HCS receipts + the Base transaction history. Verifiable from public keys alone, forever.

## Setup

**Requires:** Python ≥ 3.10, Node ≥ 18.

```bash
# Python core (cert primitives + LLM + Hedera)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Node web/ subproject (Coinbase Base + x402 SDKs)
cd web
npm install
cd ..

# Environment
cp .env.example .env
# Fill in the credentials per .env.example comments — at minimum:
# - ANTHROPIC_API_KEY
# - CDP_API_KEY_NAME + CDP_API_KEY_PRIVATE_KEY (from portal.cdp.coinbase.com)
# - BASE_BUYER_PRIVATE_KEY + BASE_COMPLIANCE_PRIVATE_KEY + BASE_SANCTIONS_PRIVATE_KEY
# - HEDERA_OPERATOR_ID + HEDERA_OPERATOR_PRIVATE_KEY (from portal.hedera.com)
# - HEDERA_HCS_TOPIC_ID (run scripts/setup_hcs_topic.py to create one)

# Run tests (128 pass; 2 live integration tests skipped by default)
python -m pytest tests/

# Set up the Hedera HCS audit topic (one-shot)
python scripts/setup_hcs_topic.py

# Deploy the Base escrow contract (one-shot, Phase 2.8)
# cd web && npm run deploy:escrow
```

## Standards alignment

- **VTEAI** (Verified Task Escrow + Attestation Interface) — ERC draft, CC0, April 2026. **Authored by this project.** [pitch/VTEAI-DRAFT.md](pitch/VTEAI-DRAFT.md).
- **UOR-ADDR-1** (Universal Object Reference Address) — community proposal, April 2026. **Co-contributed by this project.** [pitch/UOR-ADDR-PROPOSAL.md](pitch/UOR-ADDR-PROPOSAL.md).
- **PRISM** — UOR Foundation's reference implementation, vendored at [`vendor/prism.py`](vendor/prism.py) (MIT).

Content addresses are **byte-identical** to UOR Foundation's canonical reference. Verified live via `mcp.uor.foundation/encode_address`. See [docs/UOR_PASSPORT_VERIFIED.md](docs/UOR_PASSPORT_VERIFIED.md).

## Pitch material

- **[Whitepaper](pitch/WHITEPAPER.md)** — 5,000-word deep-dive: architecture, competitive landscape (Coinbase x402, Virtuals ACP, etc.), customer use cases (banks, M&A, title, healthcare, legal docs, AI inference), risk model, roadmap.
- **[Demo deck](pitch/agentlevy-demo-deck.md)** — 12-slide hackathon deck.
- **[VTEAI ERC draft](pitch/VTEAI-DRAFT.md)** + **[UOR-ADDR-1 proposal](pitch/UOR-ADDR-PROPOSAL.md)** — the standards.

## License

Apache 2.0 — see [LICENSE](LICENSE). Vendored PRISM (`vendor/prism.py`) retains its upstream MIT license; see [vendor/LICENSE-prism](vendor/LICENSE-prism).

## References

- Coinbase x402 spec: https://x402.org
- Coinbase Developer Platform: https://portal.cdp.coinbase.com
- Base: https://base.org
- Base Sepolia testnet: https://sepolia.basescan.org
- Hedera Consensus Service: https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service
- Hashscan (this project's HCS topic, when configured): https://hashscan.io/testnet/topic/0.0.8856047
- UOR Foundation: https://uor.foundation
- PRISM: https://github.com/UOR-Foundation/prism
- Sibling repo (XRPL-side): https://github.com/maurathat/AgentLevy-XRPL-UOR
