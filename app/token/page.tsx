import type { Metadata } from "next";
import TokenPageClient from "./TokenPageClient";

export const metadata: Metadata = {
  title: "$A2H · Token",
  description:
    "$A2H on Base — live DexScreener chart, liquidity, market data, and official ai2human token links."
};

export default function TokenPage() {
  return <TokenPageClient />;
}
