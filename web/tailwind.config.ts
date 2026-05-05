import type { Config } from "tailwindcss";

/**
 * Kessai brand kit V1.0 — color tokens + typography.
 * Mirrors agentlevy/scripts/make_braille_visuals.py constants.
 *
 * Pairing rule (from brand kit): Ruri and Karakurenai do not touch
 * directly except inside the sealed hanko. Around them, Cream (on
 * indigo) or Paper (on white) is the breathing surface.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ruri: { DEFAULT: "#283A8C", deep: "#1B2864" },
        karakurenai: { DEFAULT: "#B0223A", deep: "#8A1A2E" },
        paper: "#F6F7FA",
        hakuji: { DEFAULT: "#F6F7FA", deep: "#ECEFF5" },
        washi: "#F4EFE4",
        sumi: "#1A1714",
        gin: "#9BA0A0",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["DM Sans", "Helvetica Neue", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "monospace"],
        kanji: ["Noto Serif JP", "Hiragino Mincho ProN", "serif"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
    },
  },
  plugins: [],
};
export default config;
