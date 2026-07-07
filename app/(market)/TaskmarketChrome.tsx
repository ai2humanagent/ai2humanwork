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

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="8" r="3" />
      <path d="M8.5 8H14M11 8v2M13 8v2" />
    </svg>
  );
}

function IconForAgents() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12V4l5-2 5 2v8l-5 2-5-2z" />
      <path d="M8 2v12M3 4l5 3 5-3" />
      <path d="M5.5 10.5h5" />
    </svg>
  );
}

const navSections = [
  {
    label: "Operate",
    helper: "For users and human executors",
    items: [
      { href: "/tasks", label: "Browse Tasks", icon: IconBrowse, exact: true },
      { href: "/tasks/new", label: "Create Task", icon: IconCreate },
      { href: "/app/profile", label: "My Profile", icon: IconDashboard }
    ]
  },
  {
    label: "Agents",
    helper: "For agent builders and ASPs",
    items: [
      { href: "/for-agents", label: "Agent Gateway", icon: IconForAgents },
      { href: "/agent/skill-console", label: "Skill Console", icon: IconKey },
      { href: "/agents", label: "Agent Directory", icon: IconAgents },
      { href: "/agent-dashboard", label: "Agent Dashboard", icon: IconDashboard }
    ]
  },
  {
    label: "Developers",
    helper: "API, x402, docs",
    items: [
      { href: "/developers/api-keys", label: "API Keys", icon: IconKey },
      { href: "/developers", label: "Developer Docs", icon: IconProtocol },
      { href: "/agent/b20", label: "B20 Gateway", icon: IconCreate }
    ]
  },
  {
    label: "Network",
    helper: "Public protocol surface",
    items: [
      { href: "/protocol", label: "Protocol", icon: IconProtocol },
      { href: "/leaderboard", label: "Rankings", icon: IconRankings }
    ]
  }
];

const developerNav = [
  { href: "/developers/api-keys", label: "API Keys", desc: "Issue credentials for agent calls" },
  { href: "/developers#llm-gateway", label: "LLM Gateway", desc: "Route agent requests through AI2Human" },
  { href: "/developers#x402-cloud", label: "x402 Cloud", desc: "Paid access for proof bundles" },
  { href: "/developers#webhooks", label: "Webhooks", desc: "Receive task and settlement events" },
  { href: "/developers#partnership", label: "Partnership", desc: "Integrate campaigns or proof flows" },
  { href: "/agent/skill-console", label: "Agent Skills", desc: "Test campaign and B20 skills" },
  { href: "/developers", label: "Docs", desc: "Developer overview and API map" }
];

function isActive(pathname: string, href: string) {
  if (href === "/tasks") return pathname === "/tasks";
  if (href === "/tasks/new") return pathname === "/tasks/new";
  if (href === "/developers") return pathname === "/developers";
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
              <span>
                AI2Human
                <small>Network</small>
              </span>
            </Link>

            {navSections.map((section) => (
              <nav key={section.label} className={styles.navGroup} aria-label={section.label}>
                <div className={styles.navLabel}>
                  <span>{section.label}</span>
                  <small>{section.helper}</small>
                </div>
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navLink} ${isActive(pathname, item.href) ? styles.navLinkActive : ""}`}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={styles.navIcon}><item.icon /></span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            ))}
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

            <div className={styles.topbarRight}>
              <details className={styles.developerMenu}>
                <summary className={styles.developerMenuButton}>
                  <span>Developers</span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <div className={styles.developerDropdown}>
                  {developerNav.map((item) => (
                    <Link key={item.href} href={item.href} className={styles.developerDropdownItem}>
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </details>

              {privyEnabled ? (
                <WalletButton />
              ) : (
                <button type="button" className={styles.walletButton} disabled>
                  Connect Wallet
                </button>
              )}
            </div>
          </header>

          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
