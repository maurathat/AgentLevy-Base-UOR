import Link from "next/link";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import demoState from "@/lib/royaltai-demo-state.json";

export const metadata = {
  title: "RoyaltAI — per-inference royalty enforcement on XRPL mainnet",
  description:
    "AGI House Internet of Agents Build Day finalist. Live RoyaltAI demo on XRPL mainnet with RLUSD: 10 agent inferences, 90% cache hit rate, royalties flowing automatically. Built on UOR-ADDR-1, the content-addressing standard officially adopted by the UOR Foundation.",
};

// ── Demo data extracted from the live AGI House Build Day session ────────────
const STATE = demoState as unknown as DemoState;

type DemoState = {
  ts: string;
  currency: string;
  actors: Record<string, Actor>;
  certs: Cert[];
  events: Event[];
  metrics: Metrics;
  standards: Record<string, Standard | string>;
};

type Actor = {
  address: string;
  label: string;
  nft_id?: string;
  metadata_uri?: string;
  pubkey_hex?: string;
  balance_rlusd?: string;
  balance_xrp?: string;
};

type Cert = {
  request_uor: string;
  cert_uor: string;
  output_address: string;
  model: string;
  hit_count: number;
  settlement: { primary_txid: string; royalty_txid: string | null };
  hcs: { topic_id: string; sequence_number: number; consensus_timestamp: string };
};

type Event = {
  seq: number;
  ts: string;
  kind: string;
  actor: string | null;
  payload: Record<string, unknown>;
};

type Metrics = {
  total_inferences: number;
  cache_misses: number;
  cache_hits: number;
  cache_hit_rate: number;
  total_rlusd_volume: string;
  total_royalty_paid: string;
  anthropic_calls_made: number;
  anthropic_calls_saved_by_cache: number;
  full_price_rlusd: string;
  hit_price_rlusd: string;
};

type Standard = {
  name: string;
  long_name: string;
  status: string;
  repo?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const shortAddr = (a?: string) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
const shortTxId = (t?: string | null) =>
  t ? `${t.slice(0, 8)}…${t.slice(-4)}` : "—";
const xrplTxUrl = (txid: string) => `https://livenet.xrpl.org/transactions/${txid}`;
const xrplAcctUrl = (addr: string) => `https://livenet.xrpl.org/accounts/${addr}`;
const xrplNftUrl = (nft: string) => `https://livenet.xrpl.org/nft/${nft}`;
const hcsTopicUrl = (topic: string, seq: number) =>
  `https://hashscan.io/testnet/topic/${topic}/message/${seq}`;

// Show only payment/royalty/cache_hit events in the table
const showableEvents = STATE.events.filter((e) =>
  ["payment_validated", "royalty_dispatched", "cache_hit"].includes(e.kind),
);

export default function RoyaltAIPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      {/* HERO ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="eyebrow text-karakurenai">
          AGI House · Internet of Agents Build Day · May 2026 · Finalist
        </div>
        <h1 className="mt-6 font-display font-semibold text-5xl md:text-7xl leading-tight tracking-tight">
          RoyaltAI
          <span className="block text-karakurenai">
            per-inference royalty enforcement, on chain.
          </span>
        </h1>
        <p className="mt-8 max-w-3xl text-lg text-washi/85 leading-relaxed">
          Every AI model minted as a dNFT. Every inference produces a signed,
          content-addressed cert. Royalties flow to model creators in the same
          atomic transaction. No platform can underreport. No vendor witness
          needed in court. <strong>Per-call cryptographic settlement</strong> for
          the agent economy — built on the open{" "}
          <span className="text-karakurenai font-medium">UOR-ADDR-1</span>{" "}
          standard, officially adopted by the UOR Foundation.
        </p>
        <div className="mt-12 flex gap-4 flex-wrap">
          <a
            href="https://www.loom.com/share/fb8499e5300b41c18072d36dc66af30a"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3 bg-karakurenai hover:bg-karakurenai-deep transition-colors font-body font-semibold text-washi rounded-sm"
          >
            Watch the AGI House demo →
          </a>
          <a
            href="https://royaltai-8bkohz3.gamma.site/"
            target="_blank"
            rel="noreferrer"
            className="px-7 py-3 border border-washi/30 hover:border-karakurenai hover:text-karakurenai transition-colors font-body font-semibold rounded-sm"
          >
            View the deck ↗
          </a>
        </div>
      </section>

      {/* LOOM EMBED ──────────────────────────────────────────────────────── */}
      <section className="bg-ruri-deep">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="eyebrow text-karakurenai">The build · 8 min</div>
          <h2 className="mt-4 font-display font-semibold text-3xl md:text-4xl leading-tight">
            Live demo — two agents, one model, real money on XRPL Mainnet.
          </h2>
          <div className="mt-10 aspect-video w-full rounded-sm overflow-hidden border border-washi/15">
            <iframe
              src="https://www.loom.com/embed/fb8499e5300b41c18072d36dc66af30a"
              allowFullScreen
              className="w-full h-full"
              title="RoyaltAI · AGI House Internet of Agents Build Day demo"
            />
          </div>
        </div>
      </section>

      {/* THE MECHANIC ─────────────────────────────────────────────────────── */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">How it works</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Three steps. One atomic transaction.
            <br />
            <span className="text-karakurenai">
              No trust required at any layer.
            </span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "Agent A pays $0.01 RLUSD",
                body: "Agent A escrows payment to the server's XRPL wallet on mainnet. The transaction is conditioned on a hashlock — the server must produce a cert whose SHA-256 matches the precondition before the funds release.",
              },
              {
                step: "2",
                title: "Server runs inference, signs cert, splits royalty",
                body: "Claude Haiku 4.5 produces the output. The server signs a DerivationCert (Ed25519), anchors its content address to Hedera HCS, and atomically routes 50% of the payment to the model owner's wallet — all in one settlement.",
              },
              {
                step: "3",
                title: "Agent B asks the same question — cache hit",
                body: "Agent B pays $0.001 (10× less). The server returns the existing cert (already verified). The model creator still earns a royalty on every cache hit. Anthropic's API was not called — pure margin for the server, persistent revenue for the creator.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="border border-sumi/15 p-6 hover:border-karakurenai/60 transition-colors"
              >
                <div className="font-display text-5xl text-karakurenai/60">
                  {s.step}
                </div>
                <div className="mt-4 font-display text-xl font-semibold">
                  {s.title}
                </div>
                <p className="mt-3 text-sumi/85 leading-relaxed text-sm">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE METRICS ─────────────────────────────────────────────────────── */}
      <section className="bg-ruri">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="eyebrow text-karakurenai">
            AGI House run · {new Date(STATE.ts).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Live numbers from the demo.
            <br />
            <span className="text-karakurenai">
              Every cert independently verifiable.
            </span>
          </h2>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Total inferences",
                value: STATE.metrics.total_inferences.toString(),
                sub: `${STATE.metrics.cache_misses} miss · ${STATE.metrics.cache_hits} hits`,
              },
              {
                label: "Cache hit rate",
                value: `${(STATE.metrics.cache_hit_rate * 100).toFixed(0)}%`,
                sub: `${STATE.metrics.anthropic_calls_saved_by_cache} Anthropic calls saved`,
              },
              {
                label: "Total RLUSD volume",
                value: `$${STATE.metrics.total_rlusd_volume}`,
                sub: "Settled on XRPL Mainnet",
              },
              {
                label: "Royalty paid to creator",
                value: `$${STATE.metrics.total_royalty_paid}`,
                sub: `${((parseFloat(STATE.metrics.total_royalty_paid) / parseFloat(STATE.metrics.total_rlusd_volume)) * 100).toFixed(0)}% of volume`,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="border border-washi/15 p-6 hover:border-karakurenai/60 transition-colors"
              >
                <div className="text-washi/60 text-xs uppercase tracking-eyebrow">
                  {m.label}
                </div>
                <div className="mt-3 font-display text-4xl font-semibold">
                  {m.value}
                </div>
                <div className="mt-2 text-washi/70 text-sm font-mono">
                  {m.sub}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 max-w-3xl text-washi/80 leading-relaxed">
            <strong>The economic insight:</strong> Anthropic earns royalty on
            every cache hit. The model creator earns persistent revenue from
            re-served inferences. The server keeps the cache-savings margin.
            Pay-per-call settlement turns each model into a productive asset
            instead of a depreciating one-time API integration.
          </p>
        </div>
      </section>

      {/* THE DNFT ────────────────────────────────────────────────────────── */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">On-chain identity</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            The model is a dNFT.
            <br />
            <span className="text-karakurenai">Transferable. Programmable. Auditable.</span>
          </h2>

          <div className="mt-10 border border-sumi/15 p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="text-ruri eyebrow">XLS-20 dNFT · XRPL Mainnet</div>
              <div className="mt-4 font-display text-2xl font-semibold">
                RoyaltAI Demo LLM NFT — Claude Haiku 4.5
              </div>
              <p className="mt-4 text-sumi/85 text-sm leading-relaxed">
                On-chain identity for the inference model served by RoyaltAI.
                Royalty payments for every pay-per-call inference route to the
                holder of this NFT. The dNFT is the model&apos;s commercial
                identity — transferable, licensable, programmatically updatable
                with usage and revenue.
              </p>
            </div>
            <div className="font-mono text-xs space-y-3">
              <div>
                <div className="text-sumi/60 uppercase tracking-eyebrow text-[10px]">
                  NFTokenID
                </div>
                <div className="mt-1 break-all">
                  {STATE.actors.model_owner.nft_id}
                </div>
              </div>
              <div>
                <div className="text-sumi/60 uppercase tracking-eyebrow text-[10px]">
                  Owner wallet
                </div>
                <a
                  href={xrplAcctUrl(STATE.actors.model_owner.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all hover:text-karakurenai"
                >
                  {STATE.actors.model_owner.address} ↗
                </a>
              </div>
              <div>
                <div className="text-sumi/60 uppercase tracking-eyebrow text-[10px]">
                  Royalty split
                </div>
                <div className="mt-1">
                  50% server · 50% model owner
                </div>
              </div>
              <a
                href={xrplNftUrl(STATE.actors.model_owner.nft_id!)}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 px-5 py-2 border border-ruri text-ruri hover:bg-ruri hover:text-washi transition-colors font-body text-sm font-semibold"
              >
                Verify dNFT on XRPL Livenet ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSACTION TABLE ──────────────────────────────────────────────── */}
      <section className="bg-ruri">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="eyebrow text-karakurenai">Verifiable evidence</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Every transaction. Live on chain.
            <br />
            <span className="text-karakurenai">
              Click any txID to verify on the XRPL explorer.
            </span>
          </h2>

          <div className="mt-12 overflow-x-auto border border-washi/15">
            <table className="w-full font-mono text-xs">
              <thead className="bg-ruri-deep">
                <tr className="text-washi/70 uppercase tracking-eyebrow">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Event</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">From</th>
                  <th className="px-4 py-3 text-left">→ To</th>
                  <th className="px-4 py-3 text-left">XRPL TxID</th>
                </tr>
              </thead>
              <tbody>
                {showableEvents.map((e) => {
                  const isCacheHit = e.kind === "cache_hit";
                  const txid = (e.payload.txid as string) || "";
                  const amount = (e.payload.amount as string) || "—";
                  const dest = (e.payload.destination as string) || "";
                  const kindLabel: Record<string, string> = {
                    payment_validated: "Payment",
                    royalty_dispatched: "Royalty → owner",
                    cache_hit: "Cache hit",
                  };
                  const kindColor: Record<string, string> = {
                    payment_validated: "text-washi",
                    royalty_dispatched: "text-karakurenai",
                    cache_hit: "text-washi/50",
                  };
                  return (
                    <tr
                      key={e.seq}
                      className="border-t border-washi/10 hover:bg-ruri-deep/50"
                    >
                      <td className="px-4 py-3 text-washi/50">{e.seq}</td>
                      <td className={`px-4 py-3 ${kindColor[e.kind]}`}>
                        {kindLabel[e.kind]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isCacheHit ? "—" : `$${amount}`}
                      </td>
                      <td className="px-4 py-3 text-washi/70">
                        {e.actor ? (
                          <a
                            href={xrplAcctUrl(e.actor)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-karakurenai"
                          >
                            {shortAddr(e.actor)}
                          </a>
                        ) : (
                          "system"
                        )}
                      </td>
                      <td className="px-4 py-3 text-washi/70">
                        {dest ? (
                          <a
                            href={xrplAcctUrl(dest)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-karakurenai"
                          >
                            {shortAddr(dest)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {txid ? (
                          <a
                            href={xrplTxUrl(txid)}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-karakurenai"
                          >
                            {shortTxId(txid)} ↗
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-washi/60 text-sm">
            Showing {showableEvents.length} transactions from a total of{" "}
            {STATE.events.length} demo events. Cache hits cost the same as
            payments but reuse the existing signed cert.
          </p>
        </div>
      </section>

      {/* THREE WITNESSES ─────────────────────────────────────────────────── */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">Three independent witnesses</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            No single vendor needs to be online
            <br />
            <span className="text-karakurenai">
              for any of this to verify.
            </span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tag: "Settlement",
                title: "XRPL Mainnet",
                body: "Real RLUSD payments. Atomic split between server and model owner. Every transaction independently verifiable on the XRPL Livenet explorer.",
                href: xrplAcctUrl(STATE.actors.server.address),
                label: "View server wallet ↗",
              },
              {
                tag: "Audit anchor",
                title: "Hedera HCS",
                body: `Tamper-evident timestamp for every cert. Anchored to topic ${STATE.certs[0]?.hcs.topic_id} on Hedera Consensus Service. Cryptographic proof of when the cert was produced.`,
                href: `https://hashscan.io/testnet/topic/${STATE.certs[0]?.hcs.topic_id}`,
                label: "View HCS topic ↗",
              },
              {
                tag: "Standards signature",
                title: "UOR Foundation MCP",
                body: "ED25519 signature confirming the content address byte-identically matches the canonical UOR-ADDR-1 algorithm. Foundation-adopted standard, not vendor-trusted.",
                href: "https://mcp.uor.foundation/mcp",
                label: "Foundation MCP ↗",
              },
            ].map((w) => (
              <a
                key={w.title}
                href={w.href}
                target="_blank"
                rel="noreferrer"
                className="block border border-sumi/15 hover:border-karakurenai/60 transition-colors p-6 group"
              >
                <div className="text-ruri eyebrow">{w.tag}</div>
                <div className="mt-4 font-display text-xl font-semibold">
                  {w.title}
                </div>
                <p className="mt-3 text-sumi/85 leading-relaxed text-sm">
                  {w.body}
                </p>
                <div className="mt-5 text-karakurenai font-mono text-xs group-hover:underline">
                  {w.label}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* STANDARDS STACK ─────────────────────────────────────────────────── */}
      <section className="bg-ruri">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="eyebrow text-karakurenai">Standards alignment</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Three open standards.
            <br />
            <span className="text-karakurenai">
              All public. All composable.
            </span>
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tag: "ERC draft · CC0 · April 2026",
                title: "VTEAI",
                subtitle: "Verified Task Escrow + Attestation Interface",
                body: "Settlement spec. Authored by Maura Clark. Chain-neutral state machine for verified-work settlement.",
                href: "https://github.com/maurathat/verifiable-agent-settlement-standards/blob/main/VTEAI-DRAFT.md",
              },
              {
                tag: "UOR Foundation · adopted · May 2026",
                title: "UOR-ADDR-1",
                subtitle: "Universal Object Reference Address",
                body: "Content addressing standard. Authored by Maura Clark, officially adopted by the UOR Foundation. Foundation-maintained Rust reference impl.",
                href: "https://github.com/UOR-Foundation/uor-addr-1",
              },
              {
                tag: "UOR Foundation · MIT",
                title: "Prism framework",
                subtitle: "Algebraic content-addressed coordinate system",
                body: "Substrate. UOR Foundation arc42 + C4 architectural specification. Canonical Rust implementation: uor-foundation-sdk on crates.io.",
                href: "https://github.com/UOR-Foundation/UOR-Framework/wiki",
              },
            ].map((s) => (
              <a
                key={s.title}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="block border border-washi/15 hover:border-karakurenai/60 transition-colors p-6 group"
              >
                <div className="eyebrow text-karakurenai text-[10px]">
                  {s.tag}
                </div>
                <div className="mt-4 font-display text-2xl font-semibold">
                  {s.title}
                </div>
                <div className="mt-1 text-washi/70 text-sm">{s.subtitle}</div>
                <p className="mt-4 text-washi/85 leading-relaxed text-sm">
                  {s.body}
                </p>
                <div className="mt-5 text-karakurenai font-mono text-xs group-hover:underline">
                  View on GitHub ↗
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-paper text-sumi">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-ruri eyebrow">Get in touch</div>
          <h2 className="mt-6 font-display font-semibold text-4xl md:text-5xl leading-tight">
            Building an inference platform?
            <br />
            <span className="text-karakurenai">
              Let&apos;s integrate RoyaltAI.
            </span>
          </h2>
          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-sumi/85">
            We&apos;re raising a seed round to ship RoyaltAI v0 + three
            inference-platform pilots in 12 months. If you&apos;re running an
            inference platform, fine-tuning models commercially, or backing
            agent-economy infrastructure, reach out.
          </p>
          <div className="mt-10 flex gap-4 flex-wrap">
            <a
              href="https://royaltai-8bkohz3.gamma.site/"
              target="_blank"
              rel="noreferrer"
              className="px-7 py-3 bg-ruri text-washi hover:bg-ruri-deep transition-colors font-body font-semibold rounded-sm"
            >
              View the pitch deck ↗
            </a>
            <Link
              href="/architecture"
              className="px-7 py-3 border border-sumi/30 hover:border-karakurenai hover:text-karakurenai transition-colors font-body font-semibold rounded-sm"
            >
              Read the architecture
            </Link>
            <a
              href="https://github.com/maurathat/AgentLevy-XRPL-UOR"
              target="_blank"
              rel="noreferrer"
              className="px-7 py-3 border border-sumi/30 hover:border-karakurenai hover:text-karakurenai transition-colors font-body font-semibold rounded-sm"
            >
              XRPL source code ↗
            </a>
          </div>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
