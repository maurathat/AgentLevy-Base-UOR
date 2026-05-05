# AgentLevy MCP server (Phase 5)

A Model Context Protocol server that exposes AgentLevy's verification primitives as tools the IDE-agent in [KIRO](https://kiro.dev), Claude Desktop, or any MCP host can call.

This is the **human-auditor frontend** for cert chains. A regulator, internal auditor, or counterparty's due-diligence team installs this MCP server and asks their IDE-agent to walk through verification:

> "Audit cert `sha256:eb22931717fea26f078b1b934c7c39ac7070de4c56c8a088594ed926951b4667` against Hedera topic `0.0.8856047`."

The IDE-agent calls `verify_cert` + `verify_hedera_anchor` + `audit_cert_chain` step by step and produces a structured audit report. Optionally calls `emit_audit_cert` to sign the audit itself as a UOR-Passport-addressed `DerivationCert` — the audit becomes another link in the cert chain.

## Tools exposed

| Tool | What it does |
|---|---|
| `verify_cert` | Recompute sha256 over canonical bytes, validate Ed25519 signature against seller_pubkey. Returns structured verdict with sub-checks. |
| `verify_hedera_anchor` | Query Hedera Mirror Node REST. Confirm the message body at the given (topic, sequence) decodes to the expected content_address. |
| `audit_cert_chain` | Composite: runs verify_cert + verify_hedera_anchor on a cert. Returns a structured audit-summary with per-step results. |
| `emit_audit_cert` | Build and sign an audit-summary DerivationCert that attests to the audit just performed. Uses the auditor's own keypair seed (passed per-call). The audit cert is itself a UOR-Passport-addressed, signable artifact — the audit becomes recursive. |

## Install in KIRO

After installing KIRO ([kiro.dev](https://kiro.dev)) and signing in with AWS Builder ID:

1. **Open KIRO settings** → MCP servers → "Add server"
2. **Or edit `~/.kiro/mcp.json`** directly:

```json
{
  "mcpServers": {
    "agentlevy": {
      "command": "/Users/mauraclark/AgentLevy-Base-UOR/.venv/bin/python",
      "args": ["-m", "agentlevy.mcp_server.server"],
      "cwd": "/Users/mauraclark/AgentLevy-Base-UOR",
      "env": {
        "PYTHONPATH": "/Users/mauraclark/AgentLevy-Base-UOR",
        "HEDERA_MIRROR_NODE_URL": "https://testnet.mirrornode.hedera.com"
      }
    }
  }
}
```

3. **Reload KIRO**. The IDE-agent now has access to AgentLevy verification tools.

## Try it in KIRO

Open the KIRO chat panel and ask:

```
Use verify_hedera_anchor to confirm content address
sha256:f310f03342b1cde13217884aecbc8b2b4828735572e22ed1ae68222df63d883e
was anchored on Hedera topic 0.0.8856047 at sequence 1.
```

The IDE-agent will call the MCP tool, hit Hedera Mirror Node REST, and report back with the consensus timestamp + match status.

For a full chain audit, supply the cert JSON (e.g. from a fixture file or an HTTP fetch) and ask:

```
Run audit_cert_chain against this cert.
[paste cert JSON]
```

## Standalone testing (without KIRO)

The server speaks MCP over stdio. To test directly:

```bash
cd /Users/mauraclark/AgentLevy-Base-UOR
source .venv/bin/activate
python -m agentlevy.mcp_server.server
```

This starts the server in the foreground; type MCP protocol JSON to it. For interactive testing, use the [MCP Inspector](https://modelcontextprotocol.io/legacy/tools/inspector):

```bash
npx @modelcontextprotocol/inspector python -m agentlevy.mcp_server.server
```

## Discipline

- The server holds **no signing keys for the AgentLevy protocol's parties** (buyer, compliance, sanctions). It only verifies.
- The `emit_audit_cert` tool signs an *audit-summary* cert with the auditor's own keypair seed, supplied per-call. The seed is **not stored** by the MCP server.
- The server is **read-only against the live ledgers** (Hedera Mirror Node, eventually Base RPC). It never submits transactions.

## Architectural fit

```
[Production agents]              [Cert chain]              [Human auditor]
                                                                  │
[AWS Lambda + Bedrock]    →    [TaskSpec, certs,           [KIRO IDE]
[Local agents]                  Hedera anchors,                   │
[AgentCore Runtime (Phase 4)]   Base escrow]              [AgentLevy MCP]
                                                                  │
                                                          [audit_cert_chain]
                                                          [emit_audit_cert]
                                                                  │
                                                          [signed audit cert]
                                                                  │
                                                          [Hedera HCS anchor]
                                                          (recursive audit)
```

The **audit becomes another link in the cert chain** — every audit is itself verifiable, anchored, and discoverable by future auditors. Recursive verifiability.

See the project [whitepaper §8.6](../../pitch/WHITEPAPER.md) for the Phase 5 architectural pattern.

## Apache 2.0
