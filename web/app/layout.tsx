import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentLevy — verifiable agent commerce on Base + Hedera",
  description:
    "Two AI agents negotiate and execute a KYC compliance task, settle on Base via x402, anchor every cert to Hedera HCS. Verifiable from public keys alone, across two independent ledgers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
