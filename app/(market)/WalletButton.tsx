"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import styles from "./market.module.css";

function shortAddress(address?: string) {
  if (!address) return "Wallet Connected";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Prioritize external wallet (MetaMask etc.) over Privy embedded wallet
  const walletAddress =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address ||
    undefined;

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  if (!ready) {
    return (
      <button type="button" className={styles.walletButton} disabled>
        Connect Wallet
      </button>
    );
  }

  if (authenticated) {
    return (
      <div ref={wrapperRef} className={styles.walletDropdownWrap}>
        <button
          type="button"
          className={styles.walletButton}
          onClick={() => setOpen((prev) => !prev)}
        >
          {shortAddress(walletAddress)}
        </button>
        {open && (
          <div className={styles.walletDropdown}>
            <Link
              href="/app/profile"
              className={styles.walletDropdownItem}
              onClick={() => setOpen(false)}
            >
              Profile
            </Link>
            <button
              type="button"
              className={`${styles.walletDropdownItem} ${styles.walletDropdownDanger}`}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button type="button" className={styles.walletButton} onClick={() => login()}>
      Connect Wallet
    </button>
  );
}
