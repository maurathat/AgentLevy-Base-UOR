# Sanctions agent on AWS Lambda + Bedrock

Part of [AgentLevy-Base-UOR](https://github.com/maurathat/AgentLevy-Base-UOR) — EasyA Consensus 2026 Hackathon.

The sanctions screening agent runs on **AWS Lambda**, calls **Bedrock Claude** for the LLM screen, and returns a structured result the orchestrator wraps in a signed UOR-Passport `DerivationCert` and anchors to Hedera HCS.

This Lambda does **only** the LLM call + structured output. It does NOT:

- Sign certs (orchestrator does that — keeps the cert chain authority + private keys in one place)
- Anchor to Hedera (orchestrator does that)
- Hold any keys

This split makes the Lambda **stateless, key-free, and infinitely scalable**. Track-aligned with both EasyA Track 2 (Base + x402) and the agentic AWS track (Lambda + Bedrock; AgentCore-ready in Phase 4).

## Stack

| Component | Service |
|---|---|
| Compute | AWS Lambda (Python 3.13, arm64) |
| HTTPS endpoint | API Gateway HTTP API |
| LLM | Bedrock — Anthropic Claude 3.5 Sonnet (inference profile) |
| Logs | CloudWatch (auto) |
| IaC | AWS SAM (`template.yaml`) |

## Prereqs

- AWS account with Bedrock model access enabled for **Anthropic Claude** in the deployment region (one-time, ~30 sec via Bedrock Console → Model access)
- AWS CLI + SAM CLI installed (`brew install awscli aws-sam-cli`)
- Local credentials: `aws configure` with admin or sufficient IAM permissions

## Deploy

```bash
cd aws/sanctions_agent
sam build
sam deploy --guided
```

`sam deploy --guided` walks you through:
- Stack name (suggest: `agentlevy-sanctions-agent`)
- Region (suggest: `us-east-1` — best Bedrock model availability)
- Confirm IAM role creation: yes
- Save settings to `samconfig.toml`: yes (subsequent deploys can skip --guided)

After deploy, look at the **Outputs** section. Copy `SanctionsAgentUrl` into the project root `.env`:

```
AWS_SANCTIONS_AGENT_URL=https://abcd1234.execute-api.us-east-1.amazonaws.com/screen
```

The orchestrator picks this up automatically and calls AWS for the sanctions screening step.

## Test the endpoint manually

```bash
curl -X POST "$AWS_SANCTIONS_AGENT_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "names": ["ALICE WONG", "ROBERT QUINN", "MARIA SCHMIDT"],
    "sanctions_list_version": "OFAC-SDN-2026-04-15"
  }' | jq .
```

Expected response:

```json
{
  "sanctions_list_version": "OFAC-SDN-2026-04-15",
  "screened_at": "2026-05-05T19:00:00.000000+00:00",
  "hits": [
    {"name_screened": "ALICE WONG", "severity": "clear", ...},
    {"name_screened": "ROBERT QUINN", "severity": "exact_match", "matched_sanctions_entry": "ROBERT QUINN (OFAC SDN) ..."},
    {"name_screened": "MARIA SCHMIDT", "severity": "clear", ...}
  ],
  "model": "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "agent_runtime": "aws-lambda-bedrock",
  "request_id": "..."
}
```

## Architecture (and why we split it this way)

```
   [Buyer agent (orchestrator)]
       │
       │  TaskSpec, signs
       ▼
   [Compliance agent (orchestrator)]
       │
       │  HTTPS POST {names, list_version}
       ▼
   ╭─────────────────────────────────╮
   │  AWS API Gateway (HTTPS)        │
   ╰─────────────────────────────────╯
                │
                ▼
   ╭─────────────────────────────────╮
   │  AWS Lambda (Python 3.13)       │
   │   ↓                             │
   │  Bedrock InvokeModel ──→ Claude │
   │   ↓                             │
   │  Returns SanctionsScreenResult  │
   ╰─────────────────────────────────╯
                │
                │  JSON
                ▼
   [Compliance agent]
       │
       │  Wraps in DerivationCert, signs with seller_pubkey,
       │  anchors content_address to Hedera HCS topic 0.0.8856047
       ▼
   [Cert chain → final cert → Base escrow contract]
```

## AgentCore Memory roadmap (Phase 4)

This Lambda is **AgentCore-ready**: when we add a stateful sanctions agent that learns over time (e.g., a cross-day fraud-pattern detector), we swap the Bedrock InvokeModel call for a Bedrock AgentCore Runtime invocation — same handler shape, same input/output schema. The handler, request format, and orchestrator integration all stay identical.

The composition with UOR cert chains:

- **AgentCore Memory** = make the agent capable of reasoning over time (intra-agent state, AWS-native)
- **UOR cert chain** = make every decision cryptographically auditable (inter-agent, inter-vendor, public-key-verifiable, anchored on Hedera)

The two compose: an agent that reasons via AgentCore primitives AND emits UOR-signed certs at decision boundaries — so the audit trail outlives the agent's runtime. See the project [whitepaper §6.11 / §8.4](../../pitch/WHITEPAPER.md) for the Phase 4 architectural pattern.

## CloudWatch logs

```bash
sam logs --stack-name agentlevy-sanctions-agent --tail
```

Or:
```bash
aws logs tail /aws/lambda/agentlevy-sanctions-agent --follow
```

## Costs

Free tier covers everything we'll do for the hackathon:

- Lambda: 1M requests/month + 400k GB-seconds/month free
- API Gateway HTTP API: 1M requests/month free
- Bedrock: pay-per-token (Claude 3.5 Sonnet ≈ $3/M input, $15/M output) — typical screen call costs <$0.001
- CloudWatch Logs: 5 GB/month free

## Apache 2.0
