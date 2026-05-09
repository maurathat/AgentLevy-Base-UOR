# EasyA Consensus 2026 — Submission Checklist

**Deadline: Thursday, May 7, 2026**
**Track: 2 — x402 on Base for Agents** (with stretch on agentic AWS)

Live status of every requirement below. If anything fails, you will not be eligible for a prize.

---

## 📋 Submission requirements

| # | Requirement | Status | File / Link |
|---|---|---|---|
| 1 | Built using a relevant blockchain (Base + x402 + Hedera) | ✅ DONE | [HashlockEscrow on Base Sepolia](https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3) + HCS topic 0.0.8856047 |
| 2 | Open source (and remains open source) | ✅ DONE | [Apache 2.0 license](../LICENSE), public repo |
| 3 | Short summary (<150 chars) | ✅ DONE | `SUBMISSION.md` line 13 (114 chars) |
| 4 | Full description (problem + tech to solve) | ✅ DONE | `SUBMISSION.md` "Full description" section |
| 5 | Technical description (SDKs + what made sponsor tech uniquely possible) | ✅ DONE | `SUBMISSION.md` "Technical description" section |
| 6 | **Canva slide deck link** (team / problem / solution slides) — REQUIRED | ⚠️ TODO | Need to upload `pitch/agentlevy-demo-deck.pptx` → Canva → publish public link |
| 7 | README — must include all of (a)–(d) below | ⚠️ PARTIAL | `README.md` has (b) and (c); need (a) and (d) |
| 7a | Demo video (linked from README) | ⚠️ TODO | **You will make this** — link goes in README |
| 7b | Screenshots of UI | ✅ DONE | 6 screenshots already embedded in README |
| 7c | Description of blockchain interaction | ✅ DONE | "How the blockchain interaction works" section |
| 7d | Loom video with audio (project explanation + repo walkthrough + demo) | ⚠️ TODO | **You will make this** — link goes in README |

---

## 🎤 Presentation format (if selected as finalist)

You get **3 minutes** to present + **1 minute** Q&A. Going over time = points deducted. Strict 6-segment structure:

| Segment | Time | What to cover | Slide(s) |
|---|---|---|---|
| **1. Team intro** | 30 s | Solo intro: name, background/experience, why you're qualified | Slide 1 (Team) |
| **2. Problem** | 30 s | The agent commerce identity-vs-work-integrity gap | Slides 2–3 (Title + The gap) |
| **3. Solution + grand vision** | 30 s | What AgentLevy is + how big this gets (full agent economy) | Slides 4–5 (Why we built + What we built) |
| **4. Demo** | 30 s | The KYC flow + live deployed artifacts | Slides 6–7 (KYC demo + Cert chain) |
| **5. Blockchain integration** | 30 s | Base + x402 + USDC + Hedera + how each was uniquely possible | Slide 8 (Two-ledger settlement) |
| **6. Roadmap** | 30 s | What ships next + commercial layer | Slides 12–13 (Roadmap + What this becomes) |

**Slides 9 (verification math), 10 (risk), 11 (standards) → cover during Q&A or skip if time-pressed.**

→ See `pitch/TALK-TRACK.md` for the rewritten 3-minute script.

---

## ✅ Done & shipped

- [x] Live website (https://agentlevy-maurathats-projects.vercel.app)
- [x] Base Sepolia HashlockEscrow contract deployed + verified
- [x] AWS Lambda + Bedrock sanctions agent live
- [x] Hedera HCS audit topic + multiple anchored sequences
- [x] KIRO MCP server with 5 verification tools (verified live in IDE)
- [x] Demo deck — markdown + PDF + PPTX (13 slides, team first)
- [x] Whitepaper (Base-primary)
- [x] VTEAI ERC draft + UOR-ADDR-1 community proposal (we authored)
- [x] Self-security-audit (0 HIGH, 2 MEDIUM, 4 LOW; report in `pitch/SECURITY-AUDIT.md`)
- [x] 128 tests passing across primitives + LLM + Hedera + cert
- [x] README with screenshots + blockchain-interaction explanation
- [x] SUBMISSION.md with summary + full + technical description
- [x] Logo files downloaded locally for Canva
- [x] Talk track v1 (5-min) — being revised to 3-min EasyA format
- [x] Sibling repo (AgentLevy-XRPL-UOR) made public

---

## ⚠️ Still to do (in order)

### Tonight (Wednesday, May 6)
1. **Convert PPTX → Canva** — upload `pitch/agentlevy-demo-deck.pptx` to Canva, style/tweak, publish a public/share link
2. **Record demo video** — screen capture of the orchestrator running end-to-end (Python CLI showing TaskSpec → cert chain → escrow release → Hedera anchor)
3. **Record Loom audio walkthrough** — 5–10 min: project overview + repo structure + live demo + how each requirement (1–7) is satisfied
4. **Update README** with the demo video link + Loom link
5. **Update SUBMISSION.md** with the Canva URL + demo video URL + Loom URL
6. **Practice the 3-minute pitch** — time yourself; over-time costs points

### Thursday (May 7) — Demo Day
1. Final commit + push (everything in `main`)
2. Submit on the EasyA submission form
3. Be at the booth ready to present if selected as finalist

---

## 📝 Personal info to fill in (for Slide 1 — Team)

EasyA wants you to introduce: *"which employer/university you're from, which year, what you're majoring in, etc."*

Currently slide 1 just says "Maura Clark — founder, AgentLevy / Kessai." For finalist presentation, **fill in**:

- [ ] University / current employer
- [ ] Graduation year (if student)
- [ ] Major / role
- [ ] Prior experience that's relevant (engineering, finance, compliance, AI, etc.)
- [ ] Why you specifically can ship this protocol

If you're not a student / no formal employer, swap to: *"founder + builder, X years building Y, previously did Z"* — relevant credibility, not credentials per se.

---

## 🎥 Demo video — what to capture

Aim for **2–3 minutes**, screen capture with optional voiceover. Cover:

1. **Open the website** (homepage) — 10 s
2. **Run the orchestrator from terminal** — 60–90 s
   - `python -m agentlevy.agents.orchestrator`
   - Show TaskSpec being signed by buyer + compliance agent
   - Show compliance agent calling AWS Lambda for sanctions
   - Show DerivationCert with subcontract reference
   - Show Hedera anchor receipt
   - Show Base escrow release (or MOCK_BASE_SETTLEMENT mode)
3. **Show KIRO IDE verifying a cert** — 30 s
   - Open KIRO, run `verify_hedera_anchor` on an anchored cert
   - Show the JSON response with `ok: true`
4. **Quick tour of website's `/demo` page** — 30 s
   - Click through the animated 9-phase walkthrough

**Save as MP4, upload to YouTube / Vimeo / Loom (any platform that gives a public URL). Link from README at the very top.**

---

## 🎙️ Loom audio walkthrough — what to cover

Aim for **5–10 minutes**, conversational, showing your screen:

1. **Who you are + what AgentLevy is** — 30 s
2. **The problem in one sentence** — 30 s
3. **Open the GitHub repo** — walk through the structure — 1 min
   - `agentlevy/` (Python core)
   - `aws/sanctions_agent/` (Lambda)
   - `contracts/` (Solidity)
   - `web/` (Next.js website)
   - `pitch/` (whitepaper, deck, audit)
4. **Open the live website** — show landing + architecture + demo + audit pages — 1 min
5. **Run the demo end-to-end** (same as demo video) — 2 min
6. **Show KIRO MCP integration live** — 1 min
7. **Walk through how each requirement (1–7) is satisfied** — 1 min
   - Point to: deployed contract, Hedera topic, repo, Apache license, deck, screenshots, demo video
8. **Closing — what's next, how to reach you** — 30 s

**Upload to Loom. Public URL goes in README + SUBMISSION.md.**

---

## 🏆 Judging criteria → how AgentLevy scores

EasyA grades on five questions. Here's where AgentLevy is strong and where to lean during the pitch.

| Criterion | The judge's question | AgentLevy's answer | Lean into during pitch |
|---|---|---|---|
| **Execution** | Usable now? Smooth UX? Well-designed? | Live website (Vercel), live contract (BaseScan), live HCS topic (HashScan), KIRO MCP verified live with 6 screenshots, 128 passing tests, self-audit clean | Show the LIVE site + LIVE BaseScan link during pitch |
| **Usefulness** | Practical? Real demand? Implementable? | KYC compliance is a $30B+ industry pain point; banks already require this; Kessai commercial layer has channel partners identified (NetDocuments, iManage, Relativity, Clio) | Land the "regulators are starting to require cryptographic evidence" line |
| **Learning** | Did you push boundaries? | Authored TWO open standards from scratch (VTEAI ERC + UOR-ADDR-1); first implementation byte-identical to UOR Foundation reference; cross-chain (Base + Hedera + AWS + KIRO) integration in 1 week | Mention "we authored these standards — they didn't exist" |
| **Use of blockchain** | Used effectively? Understands unique benefits/limitations? | Two-ledger composition (settlement on Base, audit on Hedera) is the *blockchain answer* to the problem — couldn't be solved with a centralized DB. Hashlock pattern uses Base + USDC EIP-3009 specifically because of x402's offline-signed authorization | Slide 8 + the "math, not trust" line |
| **Deployment** | Deployed on testnet/mainnet? | ✅ **Yes — Base Sepolia + Hedera testnet + AWS Lambda live endpoint, all reachable today** | Open BaseScan link live on stage |

---

## 🚨 Final pre-submit gate (run before clicking "Submit")

- [ ] Repository is **public** on GitHub
- [ ] License file is in repo root
- [ ] README starts with: live site link + demo video link + Loom link + screenshots
- [ ] SUBMISSION.md has Canva slides URL + demo video URL + Loom URL
- [ ] All `git push` complete; `main` is up to date
- [ ] PPTX deck on Canva is set to "Anyone with link can view" (public)
- [ ] Demo video URL works in incognito (not behind auth)
- [ ] Loom URL works in incognito
- [ ] Live site loads (HTTP 200) at https://agentlevy-maurathats-projects.vercel.app
- [ ] BaseScan + Hedera HashScan links in README work

---

*Checklist v1 · 2026-05-06*
