import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="eyebrow">Architecture</div>
        <h1 className="mt-4 font-display font-semibold text-4xl md:text-5xl leading-tight">
          The protocol underneath
          <span className="block text-karakurenai">three layers, two ledgers, one verification model.</span>
        </h1>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {ARCH_LAYERS.map((l) => (
          <div key={l.id} className="border border-washi/15 p-6">
            <div className="font-display text-3xl font-semibold text-karakurenai">{l.id}</div>
            <div className="font-display text-2xl font-semibold mt-1">{l.name}</div>
            <div className="eyebrow mt-2 text-washi/60">{l.tag}</div>
            <p className="mt-4 text-washi/80 text-sm leading-relaxed">{l.body}</p>
            <ul className="mt-4 space-y-1 text-xs text-washi/65 font-mono">
              {l.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-ruri eyebrow">Why two ledgers</div>
          <h2 className="mt-4 font-display font-semibold text-3xl md:text-4xl text-sumi">
            Two independent witnesses. Two independent governance models.
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="font-display text-2xl font-semibold text-ruri">Settlement on Base</div>
              <p className="mt-3 text-sumi/85 text-sm">
                Smart-contract escrow holds USDC against a sha256 hashlock on
                the expected final cert. Submission of the matching cert
                payload triggers release.{" "}
                <span className="font-medium">No oracle. No off-chain settlement.</span>
              </p>
              <ul className="mt-4 space-y-1 text-xs font-mono text-sumi/70">
                <li>· XLS-100-style hashlock escrow</li>
                <li>· USDC (EIP-3009 transferWithAuthorization)</li>
                <li>· ~10 LoC of Solidity verification</li>
                <li>· Composable with x402 payment flows</li>
              </ul>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-ruri">Audit anchor on Hedera</div>
              <p className="mt-3 text-sumi/85 text-sm">
                Every cert&apos;s content address publishes to a Hedera
                Consensus Service topic. Authoritative consensus timestamp +
                sequence number, on a chain independent of Base.{" "}
                <span className="font-medium">Mirror Node REST is public.</span>
              </p>
              <ul className="mt-4 space-y-1 text-xs font-mono text-sumi/70">
                <li>· HCS topic 0.0.8856047 (testnet)</li>
                <li>· Mirror Node REST verification</li>
                <li>· Independent governance from XRPL Foundation</li>
                <li>· Hedera Council membership ≠ Base validators</li>
              </ul>
            </div>
          </div>
          <p className="mt-10 text-sumi/85 max-w-3xl text-sm">
            <strong>Settlement says</strong> the money moved.
            <br />
            <strong>The audit anchor says</strong> the cert existed at this
            exact moment, witnessed by independent consensus.
            <br />
            Together: <em>verifiable from public keys alone, across two
            independent ledgers, no trusted intermediary.</em>
          </p>
        </div>
      </section>

      {/* AgentCore + UOR composition (Phase 4) */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="eyebrow text-karakurenai">Phase 4 · AgentCore + UOR composition</div>
        <h2 className="mt-4 font-display font-semibold text-3xl md:text-4xl leading-tight">
          AgentCore makes the agent capable.
          <br />
          <span className="text-karakurenai">UOR cert chains make its work verifiable.</span>
        </h2>
        <p className="mt-6 max-w-3xl text-washi/80 leading-relaxed">
          AWS Bedrock AgentCore Memory gives an agent persistent state across
          invocations — vendor-trusted, AWS-cloud-bound, mutable. The UOR cert
          chain gives every decision public-key-verifiable provenance —
          immutable, vendor-independent, anchored on Hedera. They operate at
          different layers and compose naturally:
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-washi/15 p-6">
            <div className="eyebrow text-washi/60">Intra-agent state</div>
            <div className="font-display text-xl font-semibold mt-2">AgentCore Memory</div>
            <ul className="mt-4 text-sm space-y-1.5 text-washi/80">
              <li>· Mutable: agent updates over time</li>
              <li>· Vendor-trusted (AWS holds the data)</li>
              <li>· Bound to the agent&apos;s runtime</li>
              <li>· Lives as long as the AWS account</li>
            </ul>
          </div>
          <div className="border border-karakurenai/40 p-6">
            <div className="eyebrow text-karakurenai">Inter-agent, inter-vendor, inter-time</div>
            <div className="font-display text-xl font-semibold mt-2">UOR cert chain</div>
            <ul className="mt-4 text-sm space-y-1.5 text-washi/80">
              <li>· Immutable: every cert is permanent</li>
              <li>· Math-verifiable (signed, content-addressed)</li>
              <li>· Anchored on Hedera HCS for tamper-evidence</li>
              <li>· Outlives the agent, the vendor, the cloud</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 max-w-3xl text-washi/70 text-sm leading-relaxed">
          This project ships a stateless sanctions agent on{" "}
          <span className="text-karakurenai font-medium">
            AWS Lambda + Bedrock
          </span>{" "}
          today (see <span className="font-mono text-xs">aws/sanctions_agent/</span>).
          Phase 4 upgrades it to a stateful AgentCore-hosted variant — the
          handler shape and orchestrator integration stay identical; only the
          runtime changes. Phase 5 adds an{" "}
          <span className="text-karakurenai font-medium">AgentLevy MCP server</span>{" "}
          for KIRO so human auditors can walk through cert chains in their IDE
          and emit signed audit-summary certs.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="eyebrow">Read the deep-dive</div>
        <h2 className="mt-4 font-display font-semibold text-3xl">Whitepaper + standards drafts</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <DocCard
            title="AgentLevy Whitepaper"
            tag="~5,000 words · v1.0"
            href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/WHITEPAPER.md"
            body="Architecture deep-dive, competitive landscape (Coinbase x402, Virtuals ACP, registries), customer use cases (banks, M&A, title, healthcare, legal), risk model, roadmap incl. Phase 3 dNFT integration."
          />
          <DocCard
            title="VTEAI ERC draft"
            tag="we authored · CC0 · April 2026"
            href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/VTEAI-DRAFT.md"
            body="Verified Task Escrow + Attestation Interface — the chain-neutral settlement spec. Standardizes the onchain interface; intentionally content-addressing-method-neutral."
          />
          <DocCard
            title="UOR-ADDR-1 proposal"
            tag="we co-contribute · April 2026"
            href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/UOR-ADDR-PROPOSAL.md"
            body="Universal Object Reference Address — JCS-RFC8785 + NFC canonicalization, sha256:hex envelope, PRISM ring algebra. AgentLevy's content addressing is byte-identical to UOR Foundation's reference."
          />
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}

const ARCH_LAYERS = [
  {
    id: "1",
    name: "Cert chain",
    tag: "UOR-Passport · chain-neutral",
    body: "TaskSpec and DerivationCert with content addresses byte-identical to UOR Foundation's canonical reference. Detached Ed25519 signatures. Subcontract chain content-addressed all the way down — tampering breaks the chain at the address-resolution step, not the signature step.",
    bullets: [
      "agentlevy/primitives/canonical.py",
      "agentlevy/primitives/signing.py",
      "agentlevy/primitives/cert.py",
      "agentlevy/primitives/task_spec.py",
      "JCS-RFC8785 + NFC canonicalization",
    ],
  },
  {
    id: "2",
    name: "Settlement",
    tag: "Base + USDC + x402",
    body: "Hashlock-based escrow contract on Base Sepolia. The cert hash IS the release condition. Buyer commits at escrow creation; seller submits the matching cert payload to release funds. Composable with x402 payment flows for in-band agent payments.",
    bullets: [
      "contracts/HashlockEscrow.sol",
      "agentlevy/base_layer/escrow.py",
      "USDC EIP-3009 / Permit2",
      "~10 LoC of WASM/Solidity verification",
      "Live: 0x5A23958A...",
    ],
  },
  {
    id: "3",
    name: "Audit anchor",
    tag: "Hedera HCS · independent witness",
    body: "Every signed cert publishes its content address to a Hedera Consensus Service topic. Authoritative consensus timestamp and monotonic sequence number on a public ledger that's independent of Base — different governance, different validators, different trust model. Mirror Node REST verification.",
    bullets: [
      "agentlevy/hedera_layer/anchor.py",
      "Live: topic 0.0.8856047",
      "Mirror Node REST → byte-match check",
      "Detached from cert canonical bytes",
    ],
  },
];

function DocCard({
  title,
  tag,
  href,
  body,
}: {
  title: string;
  tag: string;
  href: string;
  body: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block border border-washi/15 hover:border-karakurenai/60 p-6 transition-colors group"
    >
      <div className="text-karakurenai eyebrow">{tag}</div>
      <div className="mt-3 font-display text-xl font-semibold">{title}</div>
      <p className="mt-3 text-washi/75 text-sm leading-relaxed">{body}</p>
      <div className="mt-4 text-sm text-washi/80 group-hover:text-karakurenai transition-colors">
        Read on GitHub ↗
      </div>
    </a>
  );
}
