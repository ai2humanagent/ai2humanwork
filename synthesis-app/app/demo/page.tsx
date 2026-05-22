'use client';

import { useState } from 'react';
import Link from 'next/link';
import AutoDemoPanel from '@/components/AutoDemoPanel';
import MarketChrome from '@/components/MarketChrome';
import { useLanguage } from '@/components/LanguageProvider';
import { operators, tasks } from '@/lib/data';
import styles from '@/app/market.module.css';

export default function DemoPage() {
  const { language, t } = useLanguage();
  const [taskIndex, setTaskIndex] = useState(0);
  const task = tasks[taskIndex];
  const operator = operators.find((item) => item.id === task.operatorId) ?? operators[0];

  const judgeBullets = language === 'zh'
    ? [
        '看到 Agent 为什么会在现实世界步骤上被卡住。',
        '看到人类执行者如何在系统内接手任务。',
        '看到结构化证据是如何被上传和验证的。',
        '看到结算不是自动先打款，而是被验证闸门控制。'
      ]
    : [
        'See exactly why the agent becomes blocked at a real-world step.',
        'See how a human operator takes over without leaving the system.',
        'See how structured proof is uploaded and checked.',
        'See that settlement is gated by verification, not released blindly.'
      ];

  const summaryStats = language === 'zh'
    ? [
        ['当前样例', language === 'zh' ? task.titleZh : task.title],
        ['执行者', `${operator.name} · ${operator.city}`],
        ['证据要求', `${task.proofZh.length} 项`],
        ['结算方式', '验证通过后释放']
      ]
    : [
        ['Current scenario', task.title],
        ['Operator', `${operator.name} · ${operator.city}`],
        ['Proof bundle', `${task.proof.length} items`],
        ['Settlement', 'Released after verification']
      ];

  return (
    <MarketChrome
      active="demo"
      title={t.demo.title}
      subtitle={t.demo.subtitle}
      rightAction={<Link href={`/tasks/${task.id}`} className={styles.secondaryButton}>{t.shared.openLiveTask}</Link>}
    >
      <section className={styles.demoHeroGrid}>
        <article className={styles.surface}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.eyebrow}>{language === 'zh' ? '评审视角' : 'Judge framing'}</div>
              <h2>{language === 'zh' ? '这页要像一个会自动讲故事的系统' : 'This page should feel like a self-explaining system'}</h2>
            </div>
          </div>
          <div className={styles.judgeList}>
            {judgeBullets.map((item) => (
              <div key={item} className={styles.requirementItem}>{item}</div>
            ))}
          </div>
          <div className={styles.heroActions}>
            <Link href="/tasks/new" className={styles.primaryButton}>{t.shared.createTask}</Link>
            <Link href="/operators" className={styles.secondaryButton}>{t.shared.reviewOperatorPool}</Link>
          </div>
        </article>

        <article className={styles.surface}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.eyebrow}>{language === 'zh' ? '切换演示场景' : 'Switch live scenario'}</div>
              <h2>{language === 'zh' ? '让评委看到这不是单一 case' : 'Show judges this is not a one-off case'}</h2>
            </div>
          </div>
          <div className={styles.demoScenarioDeck}>
            {tasks.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTaskIndex(index)}
                className={index === taskIndex ? styles.demoScenarioCardActive : styles.demoScenarioCard}
              >
                <div className={styles.heroScenarioTopline}>
                  <span className={styles.cardEyebrow}>{item.mode}</span>
                  <span className={styles.tag}>{item.reward}</span>
                </div>
                <strong>{language === 'zh' ? item.titleZh : item.title}</strong>
                <p className={styles.panelSubtext}>{language === 'zh' ? item.summaryZh : item.summary}</p>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.demoSummaryStrip}>
        {summaryStats.map(([label, value]) => (
          <article key={label} className={styles.demoSummaryCard}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <AutoDemoPanel task={task} operator={operator} />

      <section className={styles.surfaceSplitWide}>
        <article className={styles.surface}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.eyebrow}>{language === 'zh' ? '证据规则' : 'Proof requirements'}</div>
              <h2>{language === 'zh' ? '评委能直接看到要提交什么' : 'Judges can see exactly what must be returned'}</h2>
            </div>
          </div>
          <div className={styles.proofList}>
            {(language === 'zh' ? task.proofZh : task.proof).map((item) => (
              <div key={item} className={styles.proofItem}>{item}</div>
            ))}
          </div>
        </article>

        <article className={styles.surface}>
          <div className={styles.panelHeader}>
            <div>
              <div className={styles.eyebrow}>{language === 'zh' ? '结算规则' : 'Settlement rule'}</div>
              <h2>{language === 'zh' ? '这不是先付款再相信' : 'This is not pay-first-and-trust'}</h2>
            </div>
          </div>
          <div className={styles.proofList}>
            <div className={styles.proofItem}>
              <strong>{language === 'zh' ? '验证规则' : 'Verification rule'}</strong><br />
              {language === 'zh' ? task.verificationRuleZh : task.verificationRule}
            </div>
            <div className={styles.proofItem}>
              <strong>{language === 'zh' ? '结算规则' : 'Settlement rule'}</strong><br />
              {language === 'zh' ? task.settlementZh : task.settlement}
            </div>
          </div>
        </article>
      </section>
    </MarketChrome>
  );
}
