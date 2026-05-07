# AgentLevy — Talk Track (EasyA 3-minute format)

**For: Consensus EasyA hackathon, Track 2 (x402 on Base for Agents).**

EasyA finalist format: **3 minutes presentation + 1 minute Q&A**. Going over time deducts points. Strict 6-segment structure, 30 seconds each.

Three versions in this doc:

1. **3-minute pitch** — strict 30-second segments per EasyA rubric
2. **30-second elevator** — for hallway / booth / non-finalist conversations
3. **Q&A prep** — 8 likely judge questions with ready answers

---

## 3-minute finalist pitch (strict 30-second segments)

> **⏱ Practice with a timer. Each segment must hit 30s ± 5s. Going long = points off.**

### Segment 1 — Team intro · 0:00–0:30 (30 seconds)

**[On Slide 1 — Team]**

> *"Hi judges. I'm **Maura Clark** — independent technologist, **Universal Object Reference Foundation member**, previously at Ribbon Communications and Ciena. Solo builder of AgentLevy. One thing to flag upfront: I built this AI agent commerce protocol **with** AI agents — pair-programmed end-to-end with Claude. Eating our own dog food at every layer of the stack. The two open standards underneath the demo — **VTEAI** and **UOR-ADDR-1** — I authored those. AgentLevy is the first reference implementation of both."*

### Segment 2 — Problem · 0:30–1:00 (30 seconds)

**[Click to Slide 2/3 — Title + The gap]**

> *"Agent commerce in 2026 has a problem. When two AI agents transact across vendors — Anthropic talks to OpenAI talks to a self-hosted agent — there is **no way to cryptographically prove what either agent actually did**. Today's stack gives you vendor logs, DID identity, KYC'd marketplaces. All of that tells you **who** the agent is. None of it tells you **what** the agent did. **Identity is not work-integrity** — and regulators are starting to require cryptographic evidence, not vendor-trusted databases."*

### Segment 3 — Solution + grand vision · 1:00–1:30 (30 seconds)

**[Click to Slide 4/5 — Why we built + What we built]**

> *"AgentLevy closes that gap. Two AI agents negotiate and execute a real KYC compliance task, sign each step with **content-addressed derivation certificates**, settle on Base via a **hashlock USDC escrow**, and anchor every cert to **Hedera Consensus Service**. The result is a public-key-verifiable audit trail across two independent ledgers. **Grand vision:** this is the missing settlement layer for the entire agent economy — every agent-to-agent transaction, in every regulated industry, becomes mathematically auditable instead of vendor-trusted. KYC is just the beachhead."*

### Segment 4 — Demo · 1:30–2:00 (30 seconds)

**[Click to Slide 6/7 — KYC demo + Cert chain anatomy. If possible, also have BaseScan link open in browser.]**

> *"Here's what's live today. Buyer agent drafts a TaskSpec, signs it, **escrows USDC on Base** — our HashlockEscrow contract is deployed at this address. [**point to BaseScan link**] Compliance agent runs the work, **subcontracts sanctions screening to a third agent on AWS Lambda + Bedrock**, assembles a final cert. Cert hash submitted to the Base contract — `sha256` matches the hashlock — **USDC releases**. Hedera Mirror Node anchors every cert hash with consensus timestamps. **All of this runs end-to-end on testnet today. No oracles. No off-chain settlement.**"*

### Segment 5 — Blockchain integration · 2:00–2:30 (30 seconds)

**[Click to Slide 8 — Two-ledger settlement]**

> *"Why **Base** specifically: USDC's `transferWithAuthorization` and EIP-3009 let us do settlement-conditional-on-cryptographic-evidence in **10 lines of Solidity verification** — no custom token contract needed. **Coinbase x402** integration is in the repo. Why **Hedera**: HCS provides authoritative consensus timestamps at $0.0001 per message; the Mirror Node REST API is publicly queryable so judges can verify with `curl`, no SDK needed. **Two ledgers, two governance models, two independent verification paths**. If Base reorgs, the audit lives on Hedera. If Hedera changes, the money is on Base. Neither bet is total."*

### Segment 6 — Roadmap · 2:30–3:00 (30 seconds)

**[Click to Slide 12/13 — Roadmap + What this becomes]**

> *"What ships next: **AWS Bedrock AgentCore Memory** upgrade for stateful agents — memoization with audit. **Phase 3** layers XLS-20 dNFTs on top of the cert chain — flagship use case is **AI model pay-per-inference with cryptographic enforcement**, TAM is the full AI inference economy. Commercial layer is **Kessai** — enterprise SaaS for KYC + AML + M&A escrow, channel-licensed to compliance vendors. **Standards stay open. Protocol stays open. The product is what makes verifiable agent commerce turnkey for enterprises.** Thanks."*

**[STOP. Do not continue. Wait for Q&A.]**

---

## ⏱ Pacing guide

| Segment | Time | Cumulative | Slide(s) |
|---|---|---|---|
| Team | 0:30 | 0:30 | 1 |
| Problem | 0:30 | 1:00 | 2–3 |
| Solution | 0:30 | 1:30 | 4–5 |
| Demo | 0:30 | 2:00 | 6–7 |
| Blockchain | 0:30 | 2:30 | 8 |
| Roadmap | 0:30 | 3:00 | 12–13 |

**Total: 3:00 minutes.** Slides 9 (verification math), 10 (risk), 11 (standards) are reserved for Q&A — only show if asked.

---

## 30-second elevator (for booth / hallway / non-finalist)

> *"AgentLevy is a verifiable agent-commerce protocol. Two AI agents do a real KYC compliance task — beneficial-ownership extraction plus subcontracted sanctions screening — settle on Base via a hashlock USDC escrow, and anchor every cert to Hedera. The whole chain is auditable from public keys alone, across two independent ledgers, with no trusted intermediary. We authored the two standards underneath — VTEAI and UOR-ADDR-1 — and every content address is byte-identical to UOR Foundation's canonical reference. Working code, deployed on Base Sepolia today, audited live in KIRO IDE."*

---

## Q&A prep — likely judge questions (1 minute total)

You get **1 minute** for Q&A. That's typically 1 question, maybe 2 short ones. Land the strongest answers first.

> **"Why two ledgers? Isn't Base enough?"**
> *"Each chain plays its strength. Base is built for cheap, fast, conditional settlement — USDC, EIP-3009, ten lines of Solidity verification. Hedera HCS is built for high-throughput consensus ordering at $0.0001 per message. Combining them = independent witnesses + independent governance. If Base reorgs, the audit lives on Hedera. If Hedera changes, the money's on Base. Neither bet is total."*

> **"Couldn't you do this entirely in Solidity?"**
> *"You could, but you'd be re-implementing the entire JCS-RFC8785 + NFC canonicalization stack on-chain — easily 1,000+ lines. Our HashlockEscrow is 100 lines because we keep cryptographic verification on-chain to one sha256-equality check, and put canonicalization off-chain in Python. Minimal verifier surface, auditable in an afternoon."*

> **"What stops the LLM from fabricating data inside the schema?"**
> *"Honest answer — nothing inside the cert layer. The cert chain proves the work was performed and the inputs the agent saw were the inputs the agent attested to. Semantic correctness — did the agent interpret correctly — is a separate problem solved by output schemas, low temperature, fixture replay. Identity ≠ work-integrity ≠ semantic correctness. We solve the middle one — and that's the one nobody else solves."*

> **"How is this different from x402?"**
> *"x402 solves the payment rail — HTTP 402 with USDC settlement. AgentLevy uses x402 patterns and EIP-3009 in our HashlockEscrow contract. x402 doesn't address cert chains, multi-agent subcontracting, or audit anchoring. We're building **on top** of x402, not competing with it. This is what an x402 demo *with verifiable work* looks like."*

> **"Why authoring your own standards instead of using existing ones?"**
> *"Because nothing existed. There's no standard for verified-work settlement — VTEAI fills that. Content-addressing standards are chain-bound — UOR-ADDR-1 fixes that. Both are CC0 / community proposals — explicitly not for monetization. The standards-author position IS the moat: anyone who later wants verified agent commerce will be implementing specs we wrote."*

> **"What's the path to mainnet?"**
> *"Three things. One: professional smart-contract audit with a top-tier firm — we self-audited (zero high-severity findings, full report in `pitch/SECURITY-AUDIT.md`), but we won't put real funds at risk without paid audit. Two: secure key management — replace .env with HSM/KMS. Three: dual-chain pilots with a design-partner enterprise customer. Months, not weeks."*

> **"How do regulators actually consume this?"**
> *"They don't need to. The whole point: regulator gets `(public keys, the cert chain)` and a public Mirror Node URL — they re-verify everything from `curl` against Hedera and a JSON-RPC call against Base Sepolia. **No API, no SDK, no relationship with us required.** That's why this works for compliance — it's auditable in 2046 the same way it's auditable today."*

> **"Is this a feature or a company?"**
> *"AgentLevy is the open protocol — Apache 2.0, Foundation-track. **Kessai** is the company — enterprise SaaS on top, regulated-industry GTM, channel partners. Standards stay open; productization is what enterprises pay for. Same shape as Kubernetes/Red Hat or Postgres/EnterpriseDB."*

---

## Speaker notes

- **Pace:** ~140 wpm spoken English. The 3-min pitch is ~600 words ≈ exactly 4:30 read-cold. **You must speak at ~135 wpm + cut filler to hit 3:00.** Practice with a timer. Twice.
- **Where to slow down:** Segment 1 (Team — judges form a first impression), Segment 4 (Demo — credibility moment).
- **Where to speed up:** Segment 5 (Blockchain — high information density, judges already know what x402 is).
- **What to point at:** when you say "deployed at this address" in Segment 4, **point at the BaseScan link on the slide**. Concrete on-chain references = credibility.
- **The closer line:** *"Standards stay open. Protocol stays open. The product is what makes verifiable agent commerce turnkey for enterprises."* — Land it. Don't trail off.
- **If your computer dies:** the 30-second elevator covers all 6 segments. Pivot to it. Better to deliver something than nothing.
- **If you finish early:** that's OK — better to be at 2:50 than 3:10. Don't pad. Stand silent for 10s and wait for Q&A.

---

## ⚠️ THINGS TO FILL IN BEFORE PRESENTING

1. **Segment 1 — your background.** Replace the bracketed placeholder with one strong sentence. Examples:
   - *"I'm a finance engineer — ten years building risk systems on Wall Street, now solo on this."*
   - *"I'm a CS senior at NYU studying applied cryptography; this is my Senior Design Project."*
   - *"I'm a product founder; previously shipped X at Y; this is what I'm working on full-time now."*
2. **Practice run timed:** Get to ≤3:00 reliably. Twice.
3. **Open BaseScan in a browser tab BEFORE presenting** so you can flip to it during Segment 4 if asked.

---

*Talk track v2 (3-min EasyA format) · 2026-05-06 · Edit freely. Speak naturally — these are notes, not a script.*
