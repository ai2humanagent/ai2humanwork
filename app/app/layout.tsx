import type { ReactNode } from "react";
import AppChrome from "./AppChrome";

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return <AppChrome>{children}</AppChrome>;
}
