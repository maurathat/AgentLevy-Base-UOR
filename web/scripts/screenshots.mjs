// Captures full-page screenshots of all 4 routes for the README.
// Run with: node scripts/screenshots.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.SITE_URL || "https://web-nwcqzzvas-maurathats-projects.vercel.app";
const OUT = "../docs/screenshots";

const PAGES = [
  { route: "/", file: "01-landing.png" },
  { route: "/demo", file: "02-demo.png" },
  { route: "/architecture", file: "03-architecture.png" },
  { route: "/audit", file: "04-audit.png" },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // retina
});
const page = await ctx.newPage();

for (const p of PAGES) {
  const url = BASE + p.route;
  const out = join(OUT, p.file);
  process.stdout.write(`▸ ${url} → ${out} ... `);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800); // let any animations settle
  await page.screenshot({ path: out, fullPage: true });
  console.log("✓");
}

await browser.close();
console.log("All screenshots captured.");
