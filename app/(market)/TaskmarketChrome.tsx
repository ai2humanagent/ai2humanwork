"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import WalletButton from "./WalletButton";
import styles from "./market.module.css";

/* SVG icon components for sidebar nav */
function IconBrowse() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function IconCreate() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5.5v5M5.5 8h5" />
    </svg>
  );
}

function IconAgents() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12V6l6-4 6 4v6a1 1 0 01-1 1H3a1 1 0 01-1-1z" />
      <path d="M6 13V9h4v4" />
    </svg>
  );
}

function IconRankings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13V8M8 13V3M12 13V6" />
    </svg>
  );
}

function IconProtocol() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12M2 8h12" />
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

const secondaryNav = [
  { href: "/agents", label: "Agent Directory", icon: IconAgents },
  { href: "/agent-dashboard", label: "Agent Dashboard", icon: IconDashboard },
  { href: "/leaderboard", label: "Rankings", icon: IconRankings },
  { href: "/protocol", label: "Protocol", icon: IconProtocol }
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
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [sidebarOpen]);

  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        {/* Mobile overlay */}
        <div
          className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOverlayShow : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarTop}>
            <Link href="/" className={styles.brand} onClick={() => setSidebarOpen(false)}>
              <img className={styles.brandMark} src="/icon.png" alt="" />
              <span>AI2Human</span>
            </Link>

            <nav className={styles.navGroup}>
              <div className={styles.navLabel}>Tasks</div>
              <Link
                href="/tasks"
                className={`${styles.navLink} ${pathname === "/tasks" ? styles.navLinkActive : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={styles.navIcon}><IconBrowse /></span>
                <span>Browse Tasks</span>
              </Link>
              <span className={`${styles.navLink} ${styles.navLinkDisabled}`}>
                <span className={styles.navIcon}><IconCreate /></span>
                <span>Create Task</span>
              </span>
            </nav>

            <nav className={styles.navGroup}>
              {secondaryNav.map((item) => (
                <span key={item.href} className={`${styles.navLink} ${styles.navLinkDisabled}`}>
                  <span className={styles.navIcon}><item.icon /></span>
                  <span>{item.label}</span>
                </span>
              ))}
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <button type="button" className={styles.themeToggle}>
              <span className={styles.themeDot} />
            </button>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button
                type="button"
                className={styles.menuButton}
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                <span className={styles.mobileMenuIcon}>
                  <span /><span /><span />
                </span>
              </button>
              <div className={styles.searchWrap}>
                <svg className={styles.searchIcon} width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  className={styles.searchInput}
                  placeholder="Search tasks..."
                  defaultValue=""
                  onChange={(e) => {
                    const q = e.target.value;
                    if (q.length > 1) {
                      router.push(`/tasks?q=${encodeURIComponent(q)}`);
                    }
                  }}
                />
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
