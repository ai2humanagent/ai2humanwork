'use client';

import Link from 'next/link';
import MarketChrome from '@/components/MarketChrome';
import { useLanguage } from '@/components/LanguageProvider';
import { tasks } from '@/lib/data';
import styles from '@/app/market.module.css';

export default function TasksPage() {
  const { language, t } = useLanguage();

  return (
    <MarketChrome
      active="tasks"
      title={t.tasks.title}
      subtitle={t.tasks.subtitle}
      rightAction={<Link href="/tasks/new" className={styles.primaryButton}>{t.shared.createTask}</Link>}
    >
      <section className={styles.surface}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.cardEyebrow}>{t.tasks.filterEyebrow}</div>
            <h3>{t.tasks.filterTitle}</h3>
            <div className={styles.panelSubtext}>{t.tasks.filterText}</div>
          </div>
        </div>

        <div className={styles.filterBox}>
          <div className={styles.filterGrid}>
            <div className={styles.field}>
              <label>{t.tasks.filters[0]}</label>
              <select className={styles.select} defaultValue={t.tasks.allModes}><option>{t.tasks.allModes}</option><option>claim</option><option>bounty</option></select>
            </div>
            <div className={styles.field}>
              <label>{t.tasks.filters[1]}</label>
              <select className={styles.select} defaultValue={t.tasks.allStatus}><option>{t.tasks.allStatus}</option><option>{t.statuses.taskStatusOperatorAssigned}</option><option>{t.statuses.taskStatusPendingVerification}</option></select>
            </div>
            <div className={styles.field}>
              <label>{t.tasks.filters[2]}</label>
              <input className={styles.input} placeholder="50 USDC" />
            </div>
            <div className={styles.field}>
              <label>{t.tasks.filters[3]}</label>
              <input className={styles.input} placeholder="4 hours" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.taskGrid}>
        {tasks.map((task) => (
          <article key={task.id} className={styles.taskCard}>
            <div className={styles.taskTopline}>
              <div className={styles.badgeRow}>
                <span className={`${styles.statusBadge} ${styles.statusPending}`}>{task.mode}</span>
                <span className={`${styles.statusBadge} ${task.status.includes('verification') ? styles.statusActive : task.status.includes('assigned') ? styles.statusPending : styles.statusDone}`}>
                  {language === 'zh' ? task.statusZh : task.status}
                </span>
              </div>
              <span className={styles.taskMetaLine}>{language === 'zh' ? task.locationZh : task.location}</span>
            </div>

            <h3>{language === 'zh' ? task.titleZh : task.title}</h3>
            <p className={styles.copy}>{language === 'zh' ? task.summaryZh : task.summary}</p>

            <div className={styles.taskReward}>{task.reward}</div>
            <div className={styles.taskMetaLine}>Expires {task.expiresAt}</div>

            <div className={styles.tagRow}>
              {(language === 'zh' ? task.tagsZh : task.tags).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
            </div>

            <div className={styles.actionRow}>
              <Link href={`/tasks/${task.id}`} className={styles.tableAction}>{t.shared.openTask}</Link>
              <Link href="/demo" className={styles.smallButton}>{t.shared.watchLoop}</Link>
            </div>
          </article>
        ))}
      </section>
    </MarketChrome>
  );
}
