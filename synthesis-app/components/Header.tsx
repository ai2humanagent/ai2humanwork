'use client';

import Image from 'next/image';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/components/LanguageProvider';
import styles from '@/app/market.module.css';

export default function Header() {
  const { t } = useLanguage();

  return (
    <header className={styles.marketingHeader}>
      <Link href="/" className={styles.marketingBrand}>
        <Image src="/brand/ai2human-dual-arrow-256.png" alt="ai2human" width={28} height={28} />
        <div>
          <strong>ai2human</strong>
          <span>{t.brandMarketing}</span>
        </div>
      </Link>

      <nav className={styles.marketingNav}>
        <Link href="/demo">{t.nav.demo}</Link>
        <Link href="/tasks">{t.nav.tasks}</Link>
        <Link href="/operators">{t.nav.operators}</Link>
      </nav>

      <div className={styles.topbarActions}>
        <LanguageSwitcher />
        <Link href="/tasks/new" className={styles.secondaryButton}>{t.shared.createTask}</Link>
        <Link href="/demo" className={styles.walletButton}>{t.shared.openDemo}</Link>
      </div>
    </header>
  );
}
