import { ReactNode } from "react";
import TaskmarketChrome from "./TaskmarketChrome";

const privyEnabled = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ["--market-font" as string]: "var(--font-sans), system-ui, sans-serif"
      }}
    >
      <TaskmarketChrome privyEnabled={privyEnabled}>{children}</TaskmarketChrome>
    </div>
  );
}
