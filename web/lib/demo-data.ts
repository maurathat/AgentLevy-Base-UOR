/**
 * Captured output from a real end-to-end orchestrator run on May 5, 2026.
 *
 * Every value here came from a live call to:
 *   - Anthropic (claude-sonnet-4-5) — owner extraction + sanctions screen
 *   - Hedera Consensus Service testnet — actual HCS submissions on topic 0.0.8856047
 *   - The deployed escrow contract on Base Sepolia
 *
 * The replay-mode demo animates these results in sequence; the on-chain
 * links below resolve to the real artifacts on HashScan / Basescan.
 */

export const DEMO = {
  // Wallets (live testnet, fundable)
  buyer: "0xc350dB775244b8805263D77586171A666BEaf9e4",
  compliance: "0x8Ea73477F27161E7D292e178566Ab38e98F8324c",
  sanctions: "0x768776CEccC60d99A6f043dA9835a189c630b010",

  // Live deployed contract
  escrowContract: "0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3",
  usdcContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  baseChain: "Base Sepolia",
  baseExplorer: "https://sepolia.basescan.org",

  // Hedera HCS audit topic — live on testnet
  hcsTopic: "0.0.8856047",
  hcsExplorer: "https://hashscan.io/testnet",

  // Inputs (synthetic, hash-anchored)
  disclosureAddress:
    "sha256:a70ea0223157b311ad5e61ac556714363150346ce54ed7ce3bd4fca8d535c80e",
  sanctionsListAddress:
    "sha256:0d180f76d7648e892332c268377db8507af66089c3f0f44f2b634fad45ab4da6",
  sanctionsListVersion: "OFAC-SDN-2026-04-15",

  // Phase 2 — TaskSpec (live signatures over canonical bytes)
  taskSpec: {
    contentAddress:
      "sha256:9c90b79fb086294f0b2c483e80f2513be8fac205c5ea2c0c9809c05e4293928c",
    taskType: "kyc.beneficial_ownership_verify",
    priceUsdcBaseUnits: 500_000,
    currency: "USDC",
    chain: "base",
    buyerPubkey: "9630cb…3724b8",
    sellerPubkey: "d25151…79084c",
    bothSigned: true,
  },

  // Phase 3 — Compliance LLM extracted (LIVE Anthropic call result)
  ownership: {
    subjectEntity: "ACME HOLDINGS LIMITED",
    outputAddress:
      "sha256:b9d671af3a795e2409be1dd6cdaac9e672546cf13c77bb6fe20752285670f5ba",
    owners: [
      { name: "ALICE WONG", percentage: 51.0, role: "Director" },
      { name: "ROBERT QUINN", percentage: 30.0, role: "Trustee" },
      { name: "MARIA SCHMIDT", percentage: 19.0, role: "Officer" },
    ],
  },

  // Phase 4 — Sanctions LLM screened (LIVE Anthropic call result)
  sanctionsScreen: {
    outputAddress:
      "sha256:6f4ef80ccae5f3b7488cf6cf12c46e44d57fa12d8b247e998dde82f7da3be2e8",
    hits: [
      { name: "ALICE WONG", severity: "clear", matchedTo: null },
      {
        name: "ROBERT QUINN",
        severity: "exact_match",
        matchedTo: "ROBERT QUINN (OFAC SDN) — Synthetic test entry",
      },
      { name: "MARIA SCHMIDT", severity: "clear", matchedTo: null },
    ],
  },

  // Phase 5 — Sanctions agent's signed cert (LIVE on Hedera)
  sanctionsCert: {
    contentAddress:
      "sha256:f310f03342b1cde13217884aecbc8b2b4828735572e22ed1ae68222df63d883e",
    signerPubkey: "7e7b82…14781d",
    operation: "kyc.sanctions_screen",
    hcsSequence: 1,
    hcsTopic: "0.0.8856047",
    hcsNetwork: "testnet",
  },

  // Phase 6 — Compliance agent's parent cert (LIVE on Hedera)
  finalCert: {
    contentAddress:
      "sha256:eb22931717fea26f078b1b934c7c39ac7070de4c56c8a088594ed926951b4667",
    signerPubkey: "d25151…79084c",
    operation: "kyc.beneficial_ownership_extract",
    subcontractCount: 1,
    hcsSequence: 2,
    hcsTopic: "0.0.8856047",
    hcsNetwork: "testnet",
    canonicalBytesLen: 788,
  },

  // Phase 7-8 — Settlement (escrow contract is live, deployed; see address above)
  settlement: {
    escrowId:
      "0x7b612f6f46538af2f959d8d49a5ee21a0a77e2d10e3eb306ef3e2c91aed64a28",
    hashlockMatchesPayload: true, // sha256(payload) == hashlock target
    contractWouldRelease: true,
    note: "The deployed contract verifies sha256(payload) == hashlock; payload bytes match exactly. Live USDC settlement is one env flag flip away.",
  },
};

export type DemoData = typeof DEMO;
