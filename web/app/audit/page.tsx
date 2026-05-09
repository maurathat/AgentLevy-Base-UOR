import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export default function AuditPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="eyebrow">Phase 5 · Audit infrastructure</div>
        <h1 className="mt-4 font-display font-semibold text-4xl md:text-5xl leading-tight">
          AgentLevy in your IDE.
          <br />
          <span className="text-karakurenai">The audit becomes a cert too.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-washi/80 leading-relaxed">
          The same primitives that make agent commerce verifiable also make
          the audit verifiable. Install the AgentLevy MCP server in{" "}
          <a
            href="https://kiro.dev"
            target="_blank"
            rel="noreferrer"
            className="text-karakurenai hover:underline"
          >
            KIRO
          </a>{" "}
          (or any MCP host like Claude Desktop), and the IDE-agent gains
          tools to walk through cert chains step-by-step — verify
          signatures, query Hedera Mirror Node, read the deployed Base
          contract, and emit a signed audit-summary cert that anchors back
          to Hedera. The audit becomes another link in the chain.{" "}
          <strong>Recursive verifiability.</strong>
        </p>
      </section>

      {/* Tools grid */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="eyebrow">5 MCP tools, available to any IDE-agent</div>
        <h2 className="mt-3 font-display font-semibold text-2xl md:text-3xl">
          What the IDE-agent can call
        </h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {TOOLS.map((t) => (
            <div key={t.name} className="border border-washi/15 p-5 hover:border-karakurenai/60 transition-colors">
              <div className="font-mono text-karakurenai text-sm">{t.name}</div>
              <p className="mt-2 text-washi/85 text-sm leading-relaxed">{t.description}</p>
              {t.live && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono bg-karakurenai/15 text-karakurenai rounded-sm border border-karakurenai/30">
                    <span className="w-1.5 h-1.5 bg-karakurenai rounded-full animate-pulse" />
                    {t.live}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Try it section (dark — install in KIRO) */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-ruri eyebrow">Try it in KIRO</div>
          <h2 className="mt-4 font-display font-semibold text-3xl md:text-4xl">
            One config file. One prompt.
            <br />
            <span className="text-karakurenai">A real audit, in your IDE.</span>
          </h2>

          <ol className="mt-10 space-y-8 max-w-3xl">
            <li>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold text-karakurenai">1.</span>
                <span className="font-display text-xl font-semibold text-sumi">Install KIRO</span>
              </div>
              <p className="mt-2 text-sumi/75 text-sm pl-9">
                Download from{" "}
                <a className="text-ruri hover:text-karakurenai" href="https://kiro.dev" target="_blank" rel="noreferrer">
                  kiro.dev
                </a>{" "}
                · sign in with AWS Builder ID (free).
              </p>
            </li>
            <li>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold text-karakurenai">2.</span>
                <span className="font-display text-xl font-semibold text-sumi">Configure the MCP server</span>
              </div>
              <p className="mt-2 text-sumi/75 text-sm pl-9">
                Paste the contents of{" "}
                <a
                  className="font-mono text-ruri hover:text-karakurenai"
                  href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/agentlevy/mcp_server/kiro-mcp-config.json"
                  target="_blank"
                  rel="noreferrer"
                >
                  kiro-mcp-config.json
                </a>{" "}
                into <span className="font-mono">~/.kiro/mcp.json</span> (or the MCP server settings UI). Reload KIRO.
              </p>
            </li>
            <li>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold text-karakurenai">3.</span>
                <span className="font-display text-xl font-semibold text-sumi">Ask the IDE-agent to audit a cert</span>
              </div>
              <p className="mt-2 text-sumi/75 text-sm pl-9">In KIRO chat panel:</p>
              <pre className="mt-3 ml-9 p-4 bg-sumi text-washi text-sm font-mono rounded-sm overflow-x-auto whitespace-pre-wrap">
{`Use audit_cert_chain on the cert at
agentlevy/mcp_server/sample_cert.json.

Then verify_hedera_anchor for content_address
sha256:f310f03342b1cde13217884aecbc8b2b4828735572e22ed1ae68222df63d883e
on topic 0.0.8856047 sequence 1.

Then verify_base_escrow contract is deployed and
matches our project's escrow.`}
              </pre>
              <p className="mt-3 text-sumi/75 text-sm pl-9">
                The IDE-agent calls our tools in sequence, gets real responses
                from Hedera Mirror Node + Base RPC, and prints a structured
                audit walkthrough.
              </p>
            </li>
            <li>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-2xl font-semibold text-karakurenai">4.</span>
                <span className="font-display text-xl font-semibold text-sumi">Optionally: emit the audit cert</span>
              </div>
              <p className="mt-2 text-sumi/75 text-sm pl-9">
                The agent can call <span className="font-mono text-ruri">emit_audit_cert</span>{" "}
                with your auditor keypair seed (passed per-call, never stored)
                to produce a signed audit-summary <span className="font-mono">DerivationCert</span>.
                That audit cert can itself be anchored on Hedera HCS — making
                the audit recursively verifiable.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Composition diagram */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="eyebrow">The composition</div>
        <h2 className="mt-3 font-display font-semibold text-3xl md:text-4xl">
          Three runtimes. One cert chain.
        </h2>
        <p className="mt-6 max-w-3xl text-washi/80">
          Each layer is a different AWS / web / IDE primitive. They share
          one underlying truth: the cert chain.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {LAYERS.map((l) => (
            <div key={l.title} className="border border-washi/15 p-5">
              <div className="eyebrow text-karakurenai">{l.runtime}</div>
              <div className="font-display text-xl font-semibold mt-2">{l.title}</div>
              <p className="mt-3 text-washi/75 text-sm leading-relaxed">{l.body}</p>
              <ul className="mt-4 space-y-1 text-xs font-mono text-washi/65">
                {l.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}

const TOOLS = [
  {
    name: "verify_cert(content_address, cert_json)",
    description:
      "Recompute SHA-256 over canonical bytes (JCS-RFC8785 + NFC), confirm it matches the claimed content_address, validate the Ed25519 signature against seller_pubkey. Returns structured verdict with sub-checks.",
    live: "Pure-math · always works",
  },
  {
    name: "verify_hedera_anchor(addr, topic, seq)",
    description:
      "Query Hedera Mirror Node REST API. Confirm the message body at the given (topic, sequence) decodes to the expected content_address. Returns consensus_timestamp + match status.",
    live: "Live: Hedera testnet REST",
  },
  {
    name: "verify_base_escrow(escrow_id, expected_address)",
    description:
      "Read the deployed HashlockEscrow contract on Base Sepolia. Confirm the on-chain hashlock matches the expected cert content_address. Returns escrow state (OPEN | RELEASED | REFUNDED). Read-only.",
    live: "Live: Base Sepolia RPC",
  },
  {
    name: "audit_cert_chain(cert_json, ...)",
    description:
      "Composite: verify_cert + verify_hedera_anchor on a single cert. Returns a structured audit-summary with per-step results. Building block for full-chain audits.",
    live: "Composite",
  },
  {
    name: "emit_audit_cert(audited_address, results, auditor_seed)",
    description:
      "Build and sign an audit-summary DerivationCert. The auditor's keypair seed is supplied per-call and never stored. The audit cert can be anchored on Hedera HCS — making the audit itself recursively verifiable.",
    live: "Recursive · the audit becomes a cert",
  },
];

const LAYERS = [
  {
    runtime: "Production — AWS",
    title: "Sanctions agent",
    body: "Stateless agent on AWS Lambda + Bedrock (Claude). Deployed live at us-east-1. Receives names, returns a structured screen result. The orchestrator wraps the result in a signed cert and anchors to Hedera.",
    bullets: [
      "AWS Lambda (Python 3.13, arm64)",
      "API Gateway HTTP API",
      "Bedrock InvokeModel",
      "Phase 4: AgentCore Runtime",
    ],
  },
  {
    runtime: "Web — Vercel",
    title: "Demo + landing",
    body: "This site. Live, public, deployed on Vercel. Animates the cert chain forming, real on-chain verification links to HashScan + Basescan. No magic — every claim is independently re-checkable.",
    bullets: [
      "Next.js 15 + React 19",
      "Tailwind + Kessai brand kit",
      "framer-motion animations",
      "Built statically; CDN-cached",
    ],
  },
  {
    runtime: "Auditor — KIRO IDE",
    title: "MCP server (this page)",
    body: "Five MCP tools in your IDE for human auditors. Verify signatures + Hedera anchors + Base escrow state, then emit a signed audit cert. The audit becomes another link in the chain.",
    bullets: [
      "MCP protocol (stdio)",
      "Compatible with KIRO + Claude Desktop",
      "5 verification tools",
      "Phase 5: live on hackathon submission",
    ],
  },
];
