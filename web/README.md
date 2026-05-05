# AgentLevy-Base-UOR — Web / Node sub-project

Handles all Base + x402 settlement using Coinbase's official SDKs:
- **@coinbase/cdp-sdk** — wallet creation, transaction signing, smart contract calls on Base
- **@coinbase/onchainkit** — React component library (used if/when we ship a browser UI)

The Python `agentlevy/` package (cert primitives, LLM stack, Hedera HCS audit anchor) calls into this via HTTP or subprocess for Base settlement steps. See `web/src/` for the entrypoints.

## Setup

```bash
cd web
npm install
# Run the x402 settlement service locally:
npm run dev
```
