"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

type NavItem = {
  href: string;
  label: string;
  short: string;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/app/humans",
    label: "Humans",
    short: "Talent pool",
    match: (pathname) => pathname.startsWith("/app/humans")
  },
  {
    href: "/app/services",
    label: "Services",
    short: "Execution menu",
    match: (pathname) => pathname.startsWith("/app/services")
  },
  {
    href: "/app/orders",
    label: "Orders",
    short: "Task loop",
    match: (pathname) => pathname.startsWith("/app/orders")
  },
  {
    href: "/app/profile",
    label: "Profile",
    short: "Operator identity",
    match: (pathname) => pathname.startsWith("/app/profile")
  }
];

const routeMeta = [
  {
    match: (pathname: string) => pathname.startsWith("/app/humans/"),
    eyebrow: "Operator profile",
    title: "Dispatch-ready talent profile",
    description: "Review proof capability, location coverage, and service inventory before routing a fallback task."
  },
  {
    match: (pathname: string) => pathname.startsWith("/app/humans"),
    eyebrow: "Human marketplace",
    title: "Browse people who can close the last mile",
    description: "Find human operators by trust, location, skills, and execution history."
  },
  {
    match: (pathname: string) => pathname.startsWith("/app/services"),
    eyebrow: "Service board",
    title: "Book packaged human capabilities",
    description: "Use fixed or hourly services when an agent needs structured real-world execution."
  },
  {
    match: (pathname: string) => pathname.startsWith("/app/orders"),
    eyebrow: "Dispatch console",
    title: "Run the shortest loop end-to-end",
    description: "Post tasks, notify talent, collect evidence, verify completion, and settle payment."
  },
  {
    match: (pathname: string) => pathname.startsWith("/app/profile"),
    eyebrow: "Identity",
    title: "Manage your operator profile and listings",
    description: "Connect a wallet, publish your profile, and expose services to the marketplace."
  }
];

function getMeta(pathname: string) {
  return (
    routeMeta.find((item) => item.match(pathname)) || {
      eyebrow: "ai2human app",
      title: "Human + AI execution market",
      description: "A modern operator console for human fallback, evidence, and settlement."
    }
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = getMeta(pathname);

  return (
    <div className={styles.shell}>
      <div className={styles.grid}>
        <aside className={styles.sidebar}>
          <div className={styles.brandBlock}>
            <Link href="/app/humans" className={styles.brandLink}>
              <Image
                className={styles.logo}
                src="/brand/ai2human-dual-arrow-256.png"
                alt="ai2human"
                width={40}
                height={40}
              />
              <div>
                <p className={styles.brandName}>ai2human</p>
                <p className={styles.brandTag}>two-way labor market</p>
              </div>
            </Link>
            <div className={styles.brandBadge}>Public beta</div>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                >
                  <div>
                    <span className={styles.navLabel}>{item.label}</span>
                    <span className={styles.navHint}>{item.short}</span>
                  </div>
                  <span className={styles.navArrow}>↗</span>
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarCard}>
            <p className={styles.sidebarKicker}>Core loop</p>
            <h2>Task → AI → Human fallback → Verify → Settle</h2>
            <p>
              The app should feel like an execution desk, not a demo gallery. Every screen is now
              organized around routing, proof, and payment.
            </p>
            <div className={styles.stackDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.routeMeta}>
              <p className={styles.routeEyebrow}>{meta.eyebrow}</p>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>

            <div className={styles.topActions}>
              <Link href="/" className={styles.secondaryLink}>
                Landing
              </Link>
              <Link href="/livedemo" className={styles.secondaryLink}>
                Live demo
              </Link>
              <Link href="/app/profile" className={styles.primaryLink}>
                Sign in
              </Link>
            </div>
          </header>

          <main className={styles.content}>{children}</main>
        </div>
      </div>

      <nav className={styles.mobileNav}>
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} className={`${styles.mobileItem} ${active ? styles.mobileItemActive : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
