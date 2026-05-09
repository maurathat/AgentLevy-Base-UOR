import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="eyebrow">EasyA Consensus 2026 · Track 2 · x402 on Base</div>
        <h1 className="mt-6 font-display font-semibold text-5xl md:text-7xl leading-tight tracking-tight">
          Verifiable agent commerce
          <span className="block text-karakurenai">across two independent ledgers.</span>
        </h1>
        <p className="mt-8 max-w-3xl text-lg text-washi/80 leading-relaxed">
          Two AI agents negotiate and execute a KYC compliance task. They settle
          on <span className="text-karakurenai font-medium">Base</span> via x402.
          Every cert is anchored to{" "}
          <span className="text-karakurenai font-medium">Hedera HCS</span> for
          tamper-evident timestamping. Content addresses are byte-identical to
          UOR Foundation&apos;s canonical reference. The audit trail verifies
          from public keys alone — forever, across two independent ledgers, with
          no trusted intermediary.
        </p>
        <div className="mt-12 flex gap-4 flex-wrap">
          <Link
            href="/demo"
            className="px-7 py-3 bg-karakurenai hover:bg-karakurenai-deep transition-colors font-body font-semibold text-washi rounded-sm"
          >
            Run the demo →
          </Link>
          <a
            href="https://github.com/maurathat/verifiable-agent-settlement-standards"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3 border border-washi/30 hover:border-karakurenai hover:text-karakurenai transition-colors font-body font-semibold rounded-sm"
          >
            GitHub ↗
          </a>
        </div>

        {/* Live verifiable evidence */}
        <div className="mt-20 hairline" />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              eyebrow: "Live · Hedera Testnet",
              label: "HCS audit topic",
              value: "0.0.8856047",
              href: "https://hashscan.io/testnet/topic/0.0.8856047",
            },
            {
              eyebrow: "Live · Base Sepolia",
              label: "Escrow contract",
              value: "0x5A23958A…6ef3",
              href: "https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3",
            },
            {
              eyebrow: "Verified ✓ May 3, 2026",
              label: "Byte-identical to UOR Passport",
              value: "mcp.uor.foundation",
              href: "https://github.com/maurathat/verifiable-agent-settlement-standards/blob/main/EDGE.md#3-byte-identical-to-uor-foundation-canonical-reference",
            },
          ].map((card) => (
            <a
              key={card.label}
              href={card.href}
              target="_blank"
              rel="noreferrer"
              className="block border border-washi/15 hover:border-karakurenai/60 transition-colors p-6 group"
            >
              <div className="eyebrow text-karakurenai">{card.eyebrow}</div>
              <div className="mt-4 text-washi/70 text-sm">{card.label}</div>
              <div className="mt-1 font-mono text-base group-hover:text-karakurenai transition-colors">
                {card.value} ↗
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* The gap */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">The gap</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Today&apos;s stack tells you <em>who</em> you&apos;re transacting with.
            <br />
            <span className="text-karakurenai">None of it tells you what was actually done.</span>
          </h2>
          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-sumi/85">
            Vendor logs, DID registries, agent-platform credentials — all solve
            identity. None of them solve <em>work-integrity</em>. The audit
            collapses the moment the vendor goes away, the registry de-lists, or
            a counterparty disputes the log. <strong>Identity ≠ work-integrity.</strong>
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-sumi/85">
            AgentLevy makes the <strong>work itself</strong> cryptographically
            verifiable — no trusted third party at the verify step.
          </p>
        </div>
      </section>

      {/* The architecture */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="eyebrow">The architecture</div>
        <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
          Three layers. Two ledgers.
          <br />
          <span className="text-karakurenai">One protocol.</span>
        </h2>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <ArchCard
            num="1"
            name="Cert chain"
            tag="UOR-Passport"
            answer="Prove how we got here."
            body="TaskSpec + DerivationCert with content addresses byte-identical to UOR Foundation's reference. Signatures detached. Subcontract chain is content-addressed all the way down."
          />
          <ArchCard
            num="2"
            name="Settlement"
            tag="Base + x402 + USDC"
            answer="Move the money."
            body="Solidity hashlock escrow on Base Sepolia, denominated in USDC. The cert hash IS the release condition. Agent-to-agent payments via x402."
          />
          <ArchCard
            num="3"
            name="Audit anchor"
            tag="Hedera HCS"
            answer="Witness the moment."
            body="Every signed cert publishes its content address to a Hedera Consensus Service topic. Authoritative consensus timestamp, on a chain independent of Base. Public Mirror Node REST verification."
          />
        </div>

        <p className="mt-12 text-washi/70 max-w-3xl">
          A verifier holding the three public keys + the cert chain can
          independently re-check every signature, every content address, every
          cross-reference, every consensus timestamp, and the on-chain
          settlement event. Across two independent ledgers, with no trusted
          intermediary.
        </p>
      </section>

      {/* Standards */}
      <section className="bg-washi text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">Standards alignment</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Foundation-backed standard,
            <br />
            <span className="text-karakurenai">not a startup spec.</span>
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-sumi/85">
            AgentLevy is the first reference implementation of two standards we
            authored — the settlement spec (<strong>VTEAI</strong>) and the
            content-addressing spec (<strong>UOR-ADDR-1</strong>) — plus the UOR
            Foundation&apos;s vendored PRISM ring algebra (MIT). Same primitives
            ship in UOR Identity, UOR Certificate, UNS, and the Hologram SDK.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <StandardCard
              tag="ERC draft · CC0 · April 2026"
              title="VTEAI"
              subtitle="Verified Task Escrow + Attestation Interface"
              href="https://github.com/maurathat/verifiable-agent-settlement-standards/blob/main/VTEAI-DRAFT.md"
              authored
            />
            <StandardCard
              tag="Community proposal · April 2026"
              title="UOR-ADDR-1"
              subtitle="Universal Object Reference Address"
              href="https://github.com/maurathat/verifiable-agent-settlement-standards/blob/main/UOR-ADDR-PROPOSAL.md"
              authored
            />
            <StandardCard
              tag="UOR Foundation · MIT · Vendored"
              title="PRISM"
              subtitle="Algebraic content-addressed coordinate system"
              href="https://github.com/UOR-Foundation/prism"
            />
          </div>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}

function ArchCard({
  num,
  name,
  tag,
  answer,
  body,
}: {
  num: string;
  name: string;
  tag: string;
  answer: string;
  body: string;
}) {
  return (
    <div className="border border-washi/15 p-6 hover:border-karakurenai/60 transition-colors">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl font-semibold text-karakurenai">{num}</span>
        <span className="font-display text-2xl font-semibold">{name}</span>
      </div>
      <div className="eyebrow mt-2 text-washi/60">{tag}</div>
      <div className="mt-6 font-display italic text-lg text-washi">{answer}</div>
      <p className="mt-3 text-washi/75 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function StandardCard({
  tag,
  title,
  subtitle,
  href,
  authored = false,
}: {
  tag: string;
  title: string;
  subtitle: string;
  href: string;
  authored?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block border border-sumi/15 p-6 hover:border-karakurenai/60 transition-colors group bg-paper"
    >
      <div className="text-ruri eyebrow">{tag}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-2xl font-semibold text-sumi">{title}</span>
        {authored && (
          <span className="font-mono text-xs text-karakurenai">we authored</span>
        )}
      </div>
      <p className="mt-2 text-sumi/70 text-sm">{subtitle}</p>
      <div className="mt-4 text-sm text-ruri group-hover:text-karakurenai transition-colors">
        Read the draft ↗
      </div>
    </a>
  );
}
