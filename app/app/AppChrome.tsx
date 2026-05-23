"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import styles from "./app-shell.module.css";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { wallets } = useWallets();
  const [unreadCount, setUnreadCount] = useState(0);

  const wallet = wallets[0]?.address?.toLowerCase();

  useEffect(() => {
    if (!wallet) return;

    let cancelled = false;

    async function loadUnread() {
      try {
        const res = await fetch(`/api/notifications?wallet=${wallet}`, {
          cache: "no-store"
        });
        if (cancelled || !res.ok) return;
        const data = await res.json();
        const notifications: Array<{ read: boolean }> = data.notifications || [];
        const unread = notifications.filter((n) => !n.read).length;
        if (!cancelled) setUnreadCount(unread);
      } catch {}
    }

    loadUnread();
    return () => {
      cancelled = true;
    };
  }, [wallet, pathname]);

  // Re-fetch badge when tab becomes visible again (e.g. after marking read on another tab/page)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && wallet) {
        fetch(`/api/notifications?wallet=${wallet}`, { cache: "no-store" })
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            const notifications: Array<{ read: boolean }> = data?.notifications || [];
            setUnreadCount(notifications.filter((n) => !n.read).length);
          })
          .catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [wallet]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className={styles.shell}>
      <div className={styles.grid}>
        <aside className={styles.sidebar}>
          <Link href="/" className={styles.brandRow}>
            <Image
              className={styles.logo}
              src="/icon.png"
              alt="ai2human"
              width={28}
              height={28}
            />
            <span className={styles.brandName}>ai2human</span>
          </Link>

          <nav className={styles.nav}>
            <Link
              href="/app/profile"
              className={`${styles.navItem} ${pathname.startsWith("/app/profile") ? styles.navItemActive : ""}`}
            >
              Profile
            </Link>
            <Link
              href="/app/notifications"
              className={`${styles.navItem} ${pathname.startsWith("/app/notifications") ? styles.navItemActive : ""}`}
            >
              Assigned Tasks
              {unreadCount > 0 && (
                <span className={styles.notifBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </Link>
          </nav>

          <div className={styles.sidebarBottom}>
            <Link href="/" className={styles.navItem}>Landing</Link>
          </div>
        </aside>

        <div className={styles.main}>
          <main className={styles.content}>{children}</main>
        </div>
      </div>

      <nav className={styles.mobileNav}>
        <Link
          href="/app/profile"
          className={`${styles.mobileItem} ${pathname.startsWith("/app/profile") ? styles.mobileItemActive : ""}`}
        >
          Profile
        </Link>
        <Link
          href="/app/notifications"
          className={`${styles.mobileItem} ${pathname.startsWith("/app/notifications") ? styles.mobileItemActive : ""}`}
        >
          Assigned Tasks
          {unreadCount > 0 && (
            <span className={styles.notifBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
          )}
        </Link>
      </nav>
    </div>
  );
}
