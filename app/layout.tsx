import type { Metadata } from "next";
import { Sora, Playfair_Display } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"]
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: "TrustNet AI — Hybrid Work Market",
  description:
    "A trust-first hybrid labor network for AI agents: ERC-8004 identity, Claw execution, x402 settlement, human fallback."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hans" className={`${sora.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
