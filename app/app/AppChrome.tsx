"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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
      </nav>
    </div>
  );
}
