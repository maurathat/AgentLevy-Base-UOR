"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";
import { DEMO } from "@/lib/demo-data";

type Phase = {
  id: number;
  title: string;
  eyebrow: string;
  durationMs: number;
};

const PHASES: Phase[] = [
  { id: 1, title: "Inputs hashed", eyebrow: "Phase 1", durationMs: 600 },
  { id: 2, title: "TaskSpec drafted + dual-signed", eyebrow: "Phase 2", durationMs: 900 },
  { id: 3, title: "Compliance agent extracts ownership", eyebrow: "Phase 3 · Live LLM", durationMs: 1500 },
  { id: 4, title: "Sanctions agent screens names", eyebrow: "Phase 4 · Live LLM", durationMs: 1500 },
  { id: 5, title: "Sanctions cert signed + anchored to Hedera", eyebrow: "Phase 5 · Live HCS", durationMs: 1300 },
  { id: 6, title: "Final cert signed + anchored to Hedera", eyebrow: "Phase 6 · Live HCS", durationMs: 1300 },
  { id: 7, title: "Buyer escrows USDC on Base", eyebrow: "Phase 7 · Base settlement", durationMs: 900 },
  { id: 8, title: "Cert hash matches → escrow releases", eyebrow: "Phase 8 · Settlement", durationMs: 1000 },
  { id: 9, title: "Audit trail verified from public keys alone", eyebrow: "Phase 9 · Done", durationMs: 800 },
];

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const startDemo = async () => {
    setRunning(true);
    setCompletedPhases([]);
    setActivePhase(null);

    for (const p of PHASES) {
      setActivePhase(p.id);
      await new Promise((r) => setTimeout(r, p.durationMs));
      setCompletedPhases((prev) => [...prev, p.id]);
    }
    setActivePhase(null);
  };

  const reset = () => {
    setRunning(false);
    setCompletedPhases([]);
    setActivePhase(null);
  };

  const allDone = completedPhases.length === PHASES.length;

  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="eyebrow">Live demo · replays a real on-chain run</div>
        <h1 className="mt-4 font-display font-semibold text-4xl md:text-5xl leading-tight">
          Three agents. One KYC task.
          <br />
          <span className="text-karakurenai">Five signed artifacts. Two ledgers.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-washi/80 leading-relaxed">
          Click <strong>Run demo</strong>. The walkthrough below replays the
          output of a real run we executed on May 5, 2026 — every cert, every
          signature, every Hedera consensus timestamp, and every Base
          transaction below is verifiable on-chain. The deployed contract,
          HCS topic, and source repo are linked at the bottom.
        </p>

        <div className="mt-10 flex gap-4 items-center">
          <button
            onClick={running ? reset : startDemo}
            disabled={running && !allDone}
            className="px-7 py-3 bg-karakurenai hover:bg-karakurenai-deep transition-colors font-semibold rounded-sm disabled:opacity-60"
          >
            {!running ? "▶ Run demo" : allDone ? "↻ Reset" : "Running…"}
          </button>
          <span className="text-washi/60 text-sm">
            {!running && "Ready"}
            {running && !allDone && `${completedPhases.length} / ${PHASES.length} phases complete`}
            {allDone && "✓ Demo complete — scroll to audit trail"}
          </span>
        </div>
      </section>

      {/* Phase timeline */}
      <section className="mx-auto max-w-6xl px-6 pb-16 space-y-4">
        {PHASES.map((p) => {
          const isActive = activePhase === p.id;
          const isDone = completedPhases.includes(p.id);
          const isPending = !isActive && !isDone;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: isPending ? 0.35 : 1,
                y: 0,
              }}
              transition={{ duration: 0.4 }}
              className={`border p-6 transition-colors ${
                isActive
                  ? "border-karakurenai/80 bg-karakurenai/5"
                  : isDone
                    ? "border-washi/30"
                    : "border-washi/10"
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="eyebrow text-karakurenai">{p.eyebrow}</div>
                  <div className="mt-2 font-display text-xl font-semibold">{p.title}</div>
                </div>
                <span className="text-2xl">
                  {isActive ? <Spinner /> : isDone ? "✓" : "○"}
                </span>
              </div>

              <AnimatePresence>
                {(isActive || isDone) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <PhaseDetail phase={p.id} done={isDone} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </section>

      {/* Final audit trail */}
      <AnimatePresence>
        {allDone && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-paper text-sumi"
          >
            <div className="mx-auto max-w-6xl px-6 py-20">
              <div className="text-ruri eyebrow">The audit trail</div>
              <h2 className="mt-4 font-display font-semibold text-3xl md:text-4xl text-sumi leading-tight">
                Verifiable from public keys alone.
                <br />
                <span className="text-karakurenai">Click anything to verify yourself.</span>
              </h2>
              <p className="mt-6 max-w-3xl text-sumi/80">
                A verifier holding the three public keys + the cert chain can
                independently re-check every signature, every content address,
                every cross-reference, every consensus timestamp, and the
                on-chain settlement event. None of these links go through us.
              </p>

              <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChainCard
                  title="Hedera HCS audit anchor"
                  network="Hedera Testnet · Live"
                  primaryHref={`${DEMO.hcsExplorer}/topic/${DEMO.hcsTopic}`}
                  primaryLabel={`Topic ${DEMO.hcsTopic} ↗`}
                  rows={[
                    {
                      label: `Sanctions cert · seq #${DEMO.sanctionsCert.hcsSequence}`,
                      value: shorten(DEMO.sanctionsCert.contentAddress),
                      href: `${DEMO.hcsExplorer}/topic/${DEMO.hcsTopic}/message/${DEMO.sanctionsCert.hcsSequence}`,
                    },
                    {
                      label: `Final cert · seq #${DEMO.finalCert.hcsSequence}`,
                      value: shorten(DEMO.finalCert.contentAddress),
                      href: `${DEMO.hcsExplorer}/topic/${DEMO.hcsTopic}/message/${DEMO.finalCert.hcsSequence}`,
                    },
                  ]}
                />
                <ChainCard
                  title="Base settlement"
                  network={`${DEMO.baseChain} · Live deployed`}
                  primaryHref={`${DEMO.baseExplorer}/address/${DEMO.escrowContract}`}
                  primaryLabel={`Escrow contract ↗`}
                  rows={[
                    {
                      label: "USDC contract",
                      value: shorten(DEMO.usdcContract, 8),
                      href: `${DEMO.baseExplorer}/address/${DEMO.usdcContract}`,
                    },
                    {
                      label: "Buyer wallet",
                      value: shorten(DEMO.buyer, 8),
                      href: `${DEMO.baseExplorer}/address/${DEMO.buyer}`,
                    },
                    {
                      label: "Compliance wallet",
                      value: shorten(DEMO.compliance, 8),
                      href: `${DEMO.baseExplorer}/address/${DEMO.compliance}`,
                    },
                  ]}
                />
              </div>

              <p className="mt-12 text-sumi/70 text-sm max-w-3xl">
                Source code:{" "}
                <a
                  href="https://github.com/maurathat/AgentLevy-Base-UOR"
                  className="text-ruri hover:text-karakurenai"
                  target="_blank"
                  rel="noreferrer"
                >
                  github.com/maurathat/AgentLevy-Base-UOR
                </a>{" "}
                · whitepaper:{" "}
                <a
                  href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/WHITEPAPER.md"
                  className="text-ruri hover:text-karakurenai"
                  target="_blank"
                  rel="noreferrer"
                >
                  pitch/WHITEPAPER.md
                </a>
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <BrandFooter />
    </div>
  );
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      className="inline-block w-5 h-5 border-2 border-karakurenai border-t-transparent rounded-full"
    />
  );
}

function shorten(s: string, n = 16): string {
  if (s.length <= n + 4) return s;
  return s.slice(0, n / 2 + 4) + "…" + s.slice(-(n / 2));
}

function ChainCard({
  title,
  network,
  primaryHref,
  primaryLabel,
  rows,
}: {
  title: string;
  network: string;
  primaryHref: string;
  primaryLabel: string;
  rows: { label: string; value: string; href: string }[];
}) {
  return (
    <div className="border border-sumi/15 p-6">
      <div className="text-karakurenai eyebrow">{network}</div>
      <h3 className="mt-3 font-display text-xl font-semibold text-sumi">{title}</h3>
      <a
        href={primaryHref}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-ruri hover:text-karakurenai font-mono text-sm"
      >
        {primaryLabel}
      </a>
      <div className="mt-5 space-y-2 text-sm">
        {rows.map((r) => (
          <a
            key={r.label}
            href={r.href}
            target="_blank"
            rel="noreferrer"
            className="flex justify-between items-baseline border-t border-sumi/10 pt-2 hover:text-karakurenai transition-colors"
          >
            <span className="text-sumi/70">{r.label}</span>
            <span className="font-mono text-sumi/90 text-xs">{r.value} ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function PhaseDetail({ phase, done }: { phase: number; done: boolean }) {
  switch (phase) {
    case 1:
      return (
        <KeyValGrid
          rows={[
            ["Disclosure document", DEMO.disclosureAddress],
            ["Sanctions list snapshot", DEMO.sanctionsListAddress],
            ["List version", DEMO.sanctionsListVersion],
          ]}
        />
      );
    case 2:
      return (
        <KeyValGrid
          rows={[
            ["task_type", DEMO.taskSpec.taskType],
            ["price", `${DEMO.taskSpec.priceUsdcBaseUnits / 1e6} ${DEMO.taskSpec.currency}`],
            ["chain", DEMO.taskSpec.chain],
            ["spec content_address", DEMO.taskSpec.contentAddress],
            ["both signatures valid", DEMO.taskSpec.bothSigned ? "✓" : "✗"],
          ]}
        />
      );
    case 3:
      return (
        <div>
          <div className="text-washi/70 text-sm mb-3">
            Anthropic claude-sonnet-4-5 · schema-locked output → BeneficialOwnershipExtraction
          </div>
          <div className="font-display text-lg mb-2 text-washi">
            {DEMO.ownership.subjectEntity}
          </div>
          <div className="space-y-1 font-mono text-sm">
            {DEMO.ownership.owners.map((o) => (
              <div key={o.name} className="flex justify-between">
                <span>{o.name}</span>
                <span className="text-washi/70">
                  {o.percentage}% · {o.role}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-mono text-washi/60">
            output_address: {DEMO.ownership.outputAddress}
          </div>
        </div>
      );
    case 4:
      return (
        <div>
          <div className="text-washi/70 text-sm mb-3">
            Sanctions agent · LLM-driven screen against{" "}
            <span className="text-karakurenai font-mono">{DEMO.sanctionsListVersion}</span>
          </div>
          <div className="space-y-1 font-mono text-sm">
            {DEMO.sanctionsScreen.hits.map((h) => (
              <div
                key={h.name}
                className={`flex justify-between ${
                  h.severity !== "clear" ? "text-karakurenai" : "text-washi/80"
                }`}
              >
                <span>
                  {h.severity === "clear" ? "✓" : "⚠"} {h.name}
                </span>
                <span>
                  {h.severity}
                  {h.matchedTo ? ` · ${h.matchedTo}` : ""}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-mono text-washi/60">
            output_address: {DEMO.sanctionsScreen.outputAddress}
          </div>
        </div>
      );
    case 5:
      return (
        <KeyValGrid
          rows={[
            ["operation", DEMO.sanctionsCert.operation],
            ["signer pubkey", DEMO.sanctionsCert.signerPubkey],
            ["cert content_address", DEMO.sanctionsCert.contentAddress],
            ["HCS topic", DEMO.sanctionsCert.hcsTopic],
            [
              "HCS sequence",
              `#${DEMO.sanctionsCert.hcsSequence} · ${DEMO.sanctionsCert.hcsNetwork} ✓`,
            ],
          ]}
          link={{
            label: "View on HashScan ↗",
            href: `${DEMO.hcsExplorer}/topic/${DEMO.hcsTopic}/message/${DEMO.sanctionsCert.hcsSequence}`,
          }}
        />
      );
    case 6:
      return (
        <KeyValGrid
          rows={[
            ["operation", DEMO.finalCert.operation],
            ["signer pubkey", DEMO.finalCert.signerPubkey],
            ["subcontract refs", `${DEMO.finalCert.subcontractCount} → sanctions cert`],
            ["cert content_address", DEMO.finalCert.contentAddress],
            ["HCS sequence", `#${DEMO.finalCert.hcsSequence} · testnet ✓`],
            ["canonical bytes", `${DEMO.finalCert.canonicalBytesLen} bytes`],
          ]}
          link={{
            label: "View on HashScan ↗",
            href: `${DEMO.hcsExplorer}/topic/${DEMO.hcsTopic}/message/${DEMO.finalCert.hcsSequence}`,
          }}
        />
      );
    case 7:
      return (
        <KeyValGrid
          rows={[
            ["hashlock target", DEMO.finalCert.contentAddress],
            ["live escrow contract", DEMO.escrowContract],
            ["amount", `${DEMO.taskSpec.priceUsdcBaseUnits / 1e6} USDC`],
            ["chain", DEMO.baseChain],
            ["escrow id", DEMO.settlement.escrowId],
          ]}
          link={{
            label: "View contract on Basescan ↗",
            href: `${DEMO.baseExplorer}/address/${DEMO.escrowContract}`,
          }}
        />
      );
    case 8:
      return (
        <div>
          <div className="font-mono text-sm mb-3 text-washi/80">
            require(sha256(certPayload) == hashlock, &quot;cert mismatch&quot;);
          </div>
          <KeyValGrid
            rows={[
              ["sha256(payload)", DEMO.finalCert.contentAddress],
              ["hashlock target", DEMO.finalCert.contentAddress],
              ["match check", DEMO.settlement.hashlockMatchesPayload ? "✓ TRUE" : "✗"],
              ["contract would release", DEMO.settlement.contractWouldRelease ? "✓" : "✗"],
            ]}
          />
          <div className="mt-3 text-xs text-washi/60 italic">
            {DEMO.settlement.note}
          </div>
        </div>
      );
    case 9:
      return (
        <div className="text-washi/80 text-sm leading-relaxed">
          Every signature, every content address, every back-reference, every
          consensus timestamp, and the on-chain settlement event are
          independently re-checkable from the public keys + the cert chain.
          Scroll down to verify on HashScan and Basescan yourself.
        </div>
      );
    default:
      return null;
  }
}

function KeyValGrid({
  rows,
  link,
}: {
  rows: [string, string][];
  link?: { label: string; href: string };
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <div className="text-washi/60">{k}</div>
            <div className="font-mono text-washi/90 break-all">{v}</div>
          </div>
        ))}
      </div>
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-karakurenai hover:underline text-sm"
        >
          {link.label}
        </a>
      )}
    </div>
  );
}
