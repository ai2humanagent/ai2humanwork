"use client";

import { ReactNode, useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { xLayer } from "viem/chains";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const privyClientId =
  process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID ||
  process.env.NEXT_PUBLIC_PRIVY_APP_CLIENT_ID;

function SessionSync() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (!ready || !authenticated) return;
      try {
        const accessToken = await getAccessToken();
        if (!accessToken || cancelled) return;
        await fetch("/api/auth/privy/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, walletAddress })
        });
      } catch {
        // Keep the UI usable even if local session sync fails.
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken, walletAddress]);

  return null;
}

export default function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!privyAppId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        defaultChain: xLayer,
        supportedChains: [xLayer],
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          accentColor: "#f08c49",
          showWalletLoginFirst: true,
          logo: "/brand/ai2human-dual-arrow-256.png"
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users"
          }
        }
      }}
    >
      <SessionSync />
      {children}
    </PrivyProvider>
  );
}
