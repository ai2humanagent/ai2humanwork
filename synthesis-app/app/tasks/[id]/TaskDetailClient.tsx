'use client';

import Link from 'next/link';
import MarketChrome from '@/components/MarketChrome';
import { useLanguage } from '@/components/LanguageProvider';
import { getOperator, getTask } from '@/lib/data';
import styles from '@/app/market.module.css';

export default function TaskDetailClient({ id }: { id: string }) {
  const { language, t } = useLanguage();
  const task = getTask(id);
  if (!task) return null;

  const operator = getOperator(task.operatorId);
  if (!operator) return null;

  const localizedState = (state: 'done' | 'active' | 'pending') => {
    if (state === 'done') return t.statuses.stateDone;
    if (state === 'active') return t.statuses.stateActive;
    return t.statuses.statePending;
  };

  return (
    <MarketChrome
      active="tasks"
      title={t.taskDetail.title}
      subtitle={t.taskDetail.subtitle}
      rightAction={<Link href="/tasks/new" className={styles.primaryButton}>{t.shared.postSimilarTask}</Link>}
    >
      <section className={styles.surface}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.cardEyebrow}>{t.taskDetail.eyebrow}</div>
            <h2>{language === 'zh' ? task.titleZh : task.title}</h2>
            <div className={styles.panelSubtext}>Created {task.createdAt} · expires {task.expiresAt}</div>
          </div>
          <div className={styles.badgeRow}>
            <span className={`${styles.statusBadge} ${styles.statusPending}`}>{task.mode}</span>
            <span className={`${styles.statusBadge} ${task.status.includes('verification') ? styles.statusActive : task.status.includes('assigned') ? styles.statusPending : styles.statusDone}`}>
              {language === 'zh' ? task.statusZh : task.status}
            </span>
          </div>
        </div>

        <p className={styles.copy}>{language === 'zh' ? task.descriptionZh : task.description}</p>

        <div className={styles.metricStrip}>
          <div className={styles.metricCard}><span className={styles.metricValue}>{task.reward}</span><span className={styles.metricLabel}>{t.taskDetail.metrics[0]}</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{task.deadline}</span><span className={styles.metricLabel}>{t.taskDetail.metrics[1]}</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{task.fee}</span><span className={styles.metricLabel}>{t.taskDetail.metrics[2]}</span></div>
          <div className={styles.metricCard}><span className={styles.metricValue}>{language === 'zh' ? task.locationZh : task.location}</span><span className={styles.metricLabel}>{t.taskDetail.metrics[3]}</span></div>
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.descriptionEyebrow}</div>
          <h3>{t.taskDetail.descriptionTitle}</h3>
          <p className={styles.copy}>{language === 'zh' ? task.blockerZh : task.blocker}</p>
          <div className={styles.tagRow}>
            {(language === 'zh' ? task.tagsZh : task.tags).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
          </div>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.assignedEyebrow}</div>
          <h3>{operator.name}</h3>
          <p className={styles.copy}>{operator.city}, {language === 'zh' ? operator.countryZh : operator.country} · {language === 'zh' ? operator.headlineZh : operator.headline}</p>
          <div className={styles.tagRow}>
            <span className={styles.tag}>{operator.rate}</span>
            <span className={styles.tag}>{operator.reliability} {t.statuses.reliability}</span>
            <span className={styles.tag}>{operator.lastSeen}</span>
          </div>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.requirementsEyebrow}</div>
          <h3>{t.taskDetail.requirementsTitle}</h3>
          <div className={styles.requirementsList}>
            {(language === 'zh' ? task.requirementsZh : task.requirements).map((item) => (
              <div key={item} className={styles.requirementItem}>{item}</div>
            ))}
          </div>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.proofEyebrow}</div>
          <h3>{t.taskDetail.proofTitle}</h3>
          <div className={styles.proofList}>
            {(language === 'zh' ? task.proofZh : task.proof).map((item) => (
              <div key={item} className={styles.proofItem}>{item}</div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.verificationEyebrow}</div>
          <h3>{t.taskDetail.verificationTitle}</h3>
          <div className={styles.proofList}>
            <div className={styles.proofItem}><strong>{t.taskDetail.verificationRule}</strong><br />{language === 'zh' ? task.verificationRuleZh : task.verificationRule}</div>
            <div className={styles.proofItem}><strong>{t.taskDetail.settlementRule}</strong><br />{language === 'zh' ? task.settlementZh : task.settlement}</div>
          </div>
        </article>

        <article className={styles.detailPanel}>
          <div className={styles.cardEyebrow}>{t.taskDetail.actionsEyebrow}</div>
          <h3>{t.taskDetail.actionsTitle}</h3>
          <div className={styles.actionBlock}>
            <div className={styles.panelSubtext}>{t.taskDetail.actionsText}</div>
            <div className={styles.codeLine}>{language === 'zh' ? task.activeActionZh : task.activeAction}</div>
          </div>
        </article>
      </section>

      <section className={styles.timelineCard}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.cardEyebrow}>{t.taskDetail.historyEyebrow}</div>
            <h3>{t.taskDetail.historyTitle}</h3>
          </div>
        </div>
        <div className={styles.timelineList}>
          {task.timeline.map((item) => (
            <div key={item.label} className={styles.timelineItem}>
              <div className={styles.timelineHead}>
                <strong>{language === 'zh' ? item.labelZh : item.label}</strong>
                <span className={`${styles.statusBadge} ${item.state === 'done' ? styles.statusDone : item.state === 'active' ? styles.statusActive : styles.statusPending}`}>{localizedState(item.state)}</span>
              </div>
              <div className={styles.copy}>{language === 'zh' ? item.detailZh : item.detail}</div>
            </div>
          ))}
        </div>
      </section>
    </MarketChrome>
  );
}
