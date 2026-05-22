'use client';

import Link from 'next/link';
import MarketChrome from '@/components/MarketChrome';
import { useLanguage } from '@/components/LanguageProvider';
import { operators, tasks } from '@/lib/data';
import styles from '@/app/market.module.css';

export default function OperatorsPage() {
  const { language, t } = useLanguage();

  return (
    <MarketChrome
      active="operators"
      title={t.operators.title}
      subtitle={t.operators.subtitle}
      rightAction={<Link href="/tasks/new" className={styles.primaryButton}>{t.shared.postFallbackTask}</Link>}
    >
      <section className={styles.surface}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.cardEyebrow}>{t.operators.searchEyebrow}</div>
            <h3>{t.operators.searchTitle}</h3>
          </div>
        </div>
        <div className={styles.filterBox}>
          <div className={styles.filterGrid}>
            {t.operators.filters.map((label, index) => (
              <div key={label} className={styles.field}>
                <label>{label}</label>
                <input className={styles.input} placeholder={t.operators.placeholders[index]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.categoryGrid}>
        {t.operators.categories.map(([icon, title, text]) => (
          <article key={title} className={styles.categoryCard}>
            <div className={styles.categoryIcon}>{icon}</div>
            <h3>{title}</h3>
            <div className={styles.panelSubtext}>{text}</div>
          </article>
        ))}
      </section>

      <section className={styles.operatorGrid}>
        {operators.map((operator, index) => {
          const linkedTask = tasks[index] ?? tasks[0];
          return (
            <article key={operator.id} className={styles.operatorCard}>
              <div className={styles.operatorIdentity}>
                <div className={styles.operatorAvatar} style={{ background: operator.avatarColor }}>{operator.name[0]}</div>
                <div>
                  <div className={styles.operatorMetaStrong}>
                    <h3>{operator.name}</h3>
                    {operator.verified ? <span className={styles.verifiedDot} /> : null}
                  </div>
                  <div className={styles.panelSubtext}>{language === 'zh' ? operator.headlineZh : operator.headline}</div>
                  <div className={styles.operatorLocation}>{operator.city}, {language === 'zh' ? operator.countryZh : operator.country}</div>
                </div>
              </div>

              <div className={styles.badgeRow}>
                <span className={`${styles.statusBadge} ${styles.statusDone}`}>{t.statuses.available}</span>
                {operator.remote ? <span className={styles.tag}>{t.statuses.remoteOk}</span> : null}
                <span className={styles.tag}>{operator.views} {t.statuses.views}</span>
              </div>

              <div className={styles.tagRow}>
                <span className={styles.tag}>{operator.rate}</span>
                <span className={styles.tag}>{operator.reliability} {t.statuses.reliability}</span>
                <span className={styles.tag}>{operator.lastSeen}</span>
              </div>

              <p className={styles.copy}>{language === 'zh' ? operator.noteZh : operator.note}</p>

              <div className={styles.operatorTags}>
                {(language === 'zh' ? operator.specialtiesZh : operator.specialties).map((specialty) => <span key={specialty} className={styles.tag}>{specialty}</span>)}
              </div>

              <div className={styles.actionRow}>
                <Link href={`/tasks/${linkedTask.id}`} className={styles.tableAction}>{t.shared.viewLinkedTask}</Link>
                <Link href="/demo" className={styles.smallButton}>{t.shared.openLoop}</Link>
              </div>
            </article>
          );
        })}
      </section>
    </MarketChrome>
  );
}
