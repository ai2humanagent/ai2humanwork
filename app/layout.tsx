import type { Metadata } from "next";
import "./globals.css";
import PrivyAppProvider from "./components/PrivyAppProvider";

export const metadata: Metadata = {
  title: "ai2human — Hybrid Work Market",
  description:
    "A trust-first hybrid labor network for AI agents: ERC-8004 identity, Claw execution, x402 settlement, human fallback.",
  other: {
    "virtual-protocol-site-verification": "bacbe8cc9ff3678b0185322d2139f085"
  },
  icons: {
    icon: [
      { url: "/brand/ai2human-dual-arrow-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/ai2human-dual-arrow-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/ai2human-dual-arrow-256.png", sizes: "256x256", type: "image/png" }
    ],
    apple: [
      { url: "/brand/ai2human-dual-arrow-180.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PrivyAppProvider>{children}</PrivyAppProvider>
      </body>
    </html>
  );
}
