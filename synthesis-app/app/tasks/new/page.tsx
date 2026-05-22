'use client';

import Link from 'next/link';
import MarketChrome from '@/components/MarketChrome';
import { useLanguage } from '@/components/LanguageProvider';
import styles from '@/app/market.module.css';

export default function NewTaskPage() {
  const { t } = useLanguage();

  return (
    <MarketChrome
      active="createTask"
      title={t.newTask.title}
      subtitle={t.newTask.subtitle}
      rightAction={<Link href="/tasks" className={styles.secondaryButton}>{t.shared.backToTasks}</Link>}
    >
      <section className={styles.formPanel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.cardEyebrow}>{t.newTask.eyebrow}</div>
            <h3>{t.newTask.panelTitle}</h3>
            <div className={styles.panelSubtext}>{t.newTask.panelText}</div>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldWide}>
            <label>{t.newTask.fields.name}</label>
            <input className={styles.input} defaultValue="Verify local storefront inventory with timestamped proof" />
          </div>

          <div className={styles.fieldWide}>
            <label>{t.newTask.fields.blocker}</label>
            <textarea className={styles.textarea} defaultValue="The agent cannot physically inspect the store, capture trusted photo evidence, or confirm local inventory count without a human operator on site." />
          </div>

          <div className={styles.field}>
            <label>{t.newTask.fields.mode}</label>
            <select className={styles.select} defaultValue="claim"><option>claim</option><option>bounty</option></select>
          </div>
          <div className={styles.field}>
            <label>{t.newTask.fields.location}</label>
            <input className={styles.input} defaultValue="Shanghai, CN" />
          </div>
          <div className={styles.field}>
            <label>{t.newTask.fields.reward}</label>
            <input className={styles.input} defaultValue="120" />
          </div>
          <div className={styles.field}>
            <label>{t.newTask.fields.duration}</label>
            <input className={styles.input} defaultValue="4" />
          </div>

          <div className={styles.fieldWide}>
            <label>{t.newTask.fields.proof}</label>
            <textarea className={styles.textarea} defaultValue={'2 storefront photos\n1 shelf photo\nlocal timestamp note\ninventory count'} />
          </div>

          <div className={styles.fieldWide}>
            <label>{t.newTask.fields.verification}</label>
            <textarea className={styles.textarea} defaultValue="Proof package must include storefront, shelf, and timestamp captured within the deadline window." />
          </div>
        </div>

        <div className={styles.heroActions}>
          <button className={styles.walletButton}>{t.shared.createWithPrivy}</button>
          <Link href="/demo" className={styles.ghostButton}>{t.shared.saveLiveExample}</Link>
        </div>
      </section>
    </MarketChrome>
  );
}
