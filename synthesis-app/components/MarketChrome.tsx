'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';
import styles from '@/app/market.module.css';

export default function MarketChrome({
  active,
  title,
  subtitle,
  children,
  rightAction
}: {
  active: 'overview' | 'demo' | 'tasks' | 'createTask' | 'operators';
  title: string;
  subtitle: string;
  children: ReactNode;
  rightAction?: ReactNode;
}) {
  const { t } = useLanguage();

  const nav = [
    { href: '/', label: t.nav.overview, key: 'overview' },
    { href: '/demo', label: t.nav.demo, key: 'demo' },
    { href: '/tasks', label: t.nav.tasks, key: 'tasks' },
    { href: '/tasks/new', label: t.nav.createTask, key: 'createTask' },
    { href: '/operators', label: t.nav.operators, key: 'operators' }
  ] as const;

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarBrand}>
          <Image src="/brand/ai2human-dual-arrow-256.png" alt="ai2human" width={28} height={28} />
          <div>
            <strong>ai2human</strong>
            <span>{t.brandSubtitle}</span>
          </div>
        </Link>

        <nav className={styles.sideNav}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.key === active ? styles.sideNavActive : styles.sideNavLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarNote}>
          <div className={styles.sidebarLabel}>{t.sidebarNoteLabel}</div>
          <p>{t.sidebarNoteText}</p>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.searchShell}>
            <span className={styles.searchIcon}>⌕</span>
            <input className={styles.searchInput} placeholder={t.shared.searchPlaceholder} />
          </div>
          <div className={styles.topbarActions}>
            <LanguageSwitcher />
            {rightAction}
            <button className={styles.walletButton}>{t.shared.continuePrivy}</button>
          </div>
        </header>

        <section className={styles.pageIntro}>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
