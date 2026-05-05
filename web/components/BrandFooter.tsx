export function BrandFooter() {
  return (
    <footer className="border-t border-washi/15 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-semibold text-lg">AgentLevy</span>
            <span className="font-kanji text-washi/60">· 決済</span>
          </div>
          <p className="mt-3 text-washi/60 max-w-xs">
            Verifiable agent commerce on Base + Hedera. Reference implementation
            of VTEAI + UOR-ADDR-1 standards. Apache 2.0.
          </p>
        </div>
        <div>
          <div className="eyebrow">Standards</div>
          <ul className="mt-3 space-y-2 text-washi/80">
            <li>
              <a className="hover:text-karakurenai" href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/VTEAI-DRAFT.md">
                VTEAI ERC draft
              </a>
            </li>
            <li>
              <a className="hover:text-karakurenai" href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/UOR-ADDR-PROPOSAL.md">
                UOR-ADDR-1 proposal
              </a>
            </li>
            <li>
              <a className="hover:text-karakurenai" href="https://github.com/maurathat/AgentLevy-Base-UOR/blob/main/pitch/WHITEPAPER.md">
                AgentLevy whitepaper
              </a>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">Live anchors</div>
          <ul className="mt-3 space-y-2 text-washi/80">
            <li>
              <a className="hover:text-karakurenai" href="https://hashscan.io/testnet/topic/0.0.8856047" target="_blank" rel="noreferrer">
                Hedera HCS topic 0.0.8856047 ↗
              </a>
            </li>
            <li>
              <a className="hover:text-karakurenai" href="https://sepolia.basescan.org/address/0x5A23958AD961AC31C71C7FB725084Ede34FD6ef3" target="_blank" rel="noreferrer">
                Base escrow contract ↗
              </a>
            </li>
            <li>
              <a className="hover:text-karakurenai" href="https://github.com/maurathat/AgentLevy-Base-UOR" target="_blank" rel="noreferrer">
                Source code ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-6 border-t border-washi/15 text-xs text-washi/50 flex justify-between">
        <span>EasyA Consensus 2026 · Track 2 · x402 on Base for Agents</span>
        <span className="font-kanji">決済</span>
      </div>
    </footer>
  );
}
