import Link from "next/link";

export function BrandHeader() {
  return (
    <header className="border-b border-washi/15">
      <nav className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tracking-tight">
            AgentLevy
          </span>
          <span className="font-kanji text-washi/60 text-base">·  決済</span>
        </Link>
        <div className="flex items-center gap-7 text-sm text-washi/80">
          <Link href="/demo" className="hover:text-karakurenai transition-colors">
            Demo
          </Link>
          <Link href="/architecture" className="hover:text-karakurenai transition-colors">
            Architecture
          </Link>
          <Link href="/audit" className="hover:text-karakurenai transition-colors">
            Audit
          </Link>
          <a
            href="https://github.com/maurathat/AgentLevy-Base-UOR"
            target="_blank"
            rel="noreferrer"
            className="hover:text-karakurenai transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}
