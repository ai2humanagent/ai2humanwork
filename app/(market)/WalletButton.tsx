"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "./market.module.css";

function shortAddress(address?: string) {
  if (!address) return "Wallet Connected";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress =
    wallets.find((wallet) => wallet.walletClientType === "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  if (!ready) {
    return (
      <button type="button" className={styles.walletButton} disabled>
        Connect Wallet
      </button>
    );
  }

  if (authenticated) {
    return (
      <button type="button" className={styles.walletButton} onClick={() => logout()}>
        {shortAddress(walletAddress)}
      </button>
    );
  }

  return (
    <button type="button" className={styles.walletButton} onClick={() => login()}>
      Connect Wallet
    </button>
  );
}
