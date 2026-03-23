"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import WalletButton from "./WalletButton";
import styles from "./market.module.css";

const primaryNav = [
  { href: "/tasks", label: "Browse Tasks" },
  { href: "/tasks/new", label: "Create Task" }
];

const secondaryNav = [
  { href: "/agents", label: "Agent Directory" },
  { href: "/leaderboard", label: "Rankings" },
  { href: "/protocol", label: "Protocol" }
];

function isActive(pathname: string, href: string) {
  if (href === "/tasks") return pathname === "/tasks";
  if (href === "/tasks/new") return pathname === "/tasks/new";
  return pathname.startsWith(href);
}

export default function TaskmarketChrome({
  children,
  privyEnabled
}: {
  children: ReactNode;
  privyEnabled: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark} />
              <span>Taskmarket</span>
            </Link>

            <nav className={styles.navGroup}>
              <div className={styles.navLabel}>Tasks</div>
              {primaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
                >
                  <span className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <nav className={styles.navGroup}>
              {secondaryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
                >
                  <span className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <button type="button" className={styles.themeToggle}>
              <span className={styles.themeDot} />
              <span>Dark mode</span>
            </button>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <div className={styles.menuButton} />
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon} />
                <input className={styles.searchInput} placeholder="Search tasks..." readOnly />
              </div>
            </div>

            {privyEnabled ? (
              <WalletButton />
            ) : (
              <button type="button" className={styles.walletButton} disabled>
                Connect Wallet
              </button>
            )}
          </header>

          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
