import { BrandHeader } from "@/components/BrandHeader";
import { BrandFooter } from "@/components/BrandFooter";

export const metadata = {
  title: "Demo deck · AgentLevy",
  description:
    "Consensus EasyA hackathon demo deck. Open in Canva for the live presentation, or download as PDF.",
};

export default function DeckPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ruri text-washi">
      <BrandHeader />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <div className="eyebrow">Demo deck · Consensus EasyA · Miami 2026</div>
        <h1 className="mt-4 font-display font-semibold text-4xl md:text-5xl leading-tight">
          The presentation,
          <br />
          <span className="text-karakurenai">in two formats.</span>
        </h1>
        <p className="mt-6 max-w-3xl text-washi/80 leading-relaxed">
          The Canva link is the live, interactive version — best for presenting
          on stage. The PDF below is the offline fallback (works without
          internet, embedded right on this page).
        </p>
      </section>

      {/* Action buttons */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://canva.link/7ryvxqciltivzga"
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl bg-karakurenai/95 hover:bg-karakurenai px-7 py-6 transition-colors"
          >
            <div className="text-washi/70 text-xs uppercase tracking-wider">
              Best for presenting
            </div>
            <div className="mt-2 font-display font-semibold text-2xl text-washi">
              Open in Canva →
            </div>
            <div className="mt-1 text-washi/85 text-sm">
              Live, interactive, full-screen presentation mode.
            </div>
          </a>
          <a
            href="/agentlevy-demo-deck.pdf"
            download="agentlevy-demo-deck.pdf"
            className="group rounded-xl bg-washi/10 hover:bg-washi/15 px-7 py-6 transition-colors border border-washi/20"
          >
            <div className="text-washi/70 text-xs uppercase tracking-wider">
              Offline fallback
            </div>
            <div className="mt-2 font-display font-semibold text-2xl text-washi">
              Download PDF ↓
            </div>
            <div className="mt-1 text-washi/85 text-sm">
              ~1 MB · 13 slides · works without internet.
            </div>
          </a>
        </div>
      </section>

      {/* Embedded PDF */}
      <section className="mx-auto max-w-6xl px-6 pb-16 flex-1">
        <div className="rounded-xl overflow-hidden border border-washi/15 bg-paper">
          <iframe
            src="/agentlevy-demo-deck.pdf#toolbar=1&navpanes=0&scrollbar=1"
            title="AgentLevy demo deck"
            className="w-full bg-paper"
            style={{ height: "calc(100vh - 240px)", minHeight: "600px" }}
          />
        </div>
        <p className="mt-3 text-xs text-washi/55 text-center">
          PDF preview · if it doesn&apos;t render in your browser, click{" "}
          <a
            href="/agentlevy-demo-deck.pdf"
            target="_blank"
            rel="noreferrer"
            className="text-karakurenai hover:underline"
          >
            here to open in a new tab
          </a>
          .
        </p>
      </section>

      <BrandFooter />
    </div>
  );
}
