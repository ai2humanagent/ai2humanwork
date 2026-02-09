import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ai2human — Hybrid Work Market",
  description:
    "A trust-first hybrid labor network for AI agents: ERC-8004 identity, Claw execution, x402 settlement, human fallback."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
