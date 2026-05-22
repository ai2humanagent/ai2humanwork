'use client';

import { useEffect, useMemo, useState } from 'react';
import { TaskRecord, Operator } from '@/lib/data';
import { useLanguage } from '@/components/LanguageProvider';
import styles from '@/app/market.module.css';

export default function AutoDemoPanel({ task, operator }: { task: TaskRecord; operator: Operator }) {
  const { language } = useLanguage();
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(true);
  }, [task.id]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % task.timeline.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isPlaying, task.timeline.length]);

  const steps = task.timeline.map((item) => ({
    title: language === 'zh' ? item.labelZh : item.label,
    detail: language === 'zh' ? item.detailZh : item.detail,
    state: item.state
  }));

  const snapshot = useMemo(() => {
    const zh = {
      task_created: {
        title: '任务已进入系统',
        body: 'Agent 已经定义奖励、时间窗口和证据要求，系统把它写入 fallback queue。',
        side: '此时评委能看到：这是一个被现实世界卡住的任务，不是泛市场里的随机 bounty。',
        cue: '这里可以直接讲：我们不是在做一个普通任务平台，而是在做 Agent 卡住以后的人类兜底层。'
      },
      operator_assigned: {
        title: '系统已派发真人',
        body: `${operator.name} 已被指派，任务从“阻塞”变成“可执行”。`,
        side: '这里最重要的是：AI 没有退出系统，而是把卡住的步骤交给人类层继续完成。',
        cue: '这里可以讲：Agent 没有掉线，而是把现实世界步骤交给了系统内的人类执行层。'
      },
      proof_uploaded: {
        title: '证据包正在返回',
        body: '门头照片、货架照片、时间戳和库存说明正在组合成结构化 proof bundle。',
        side: '这里强调的是“结构化证据”，而不是随手发几张图。',
        cue: '这里可以讲：我们要的不是一句“完成了”，而是可验证、可审计的结构化证据。'
      },
      verification: {
        title: '系统正在验证',
        body: '系统正在检查时间窗口、证据完整性以及是否满足任务规则。',
        side: '这一层让结果可审计，而不是“相信执行者说已经完成了”。',
        cue: '这里可以讲：trust 不是口头声明，而是验证规则和证据包共同产生的结果。'
      },
      settlement: {
        title: '结算等待闸门打开',
        body: '只有验证通过，支付才会释放。失败则回到复核或补交证据。',
        side: '这就是 verify-to-settle：证明通过以后才结算。',
        cue: '这里可以讲：payment 不是预付，而是 verification 通过后的条件释放。'
      }
    };

    const en = {
      task_created: {
        title: 'Task enters the system',
        body: 'The agent has defined reward, deadline, and proof requirements. The request is now in the fallback queue.',
        side: 'What judges should notice: this is not a generic bounty. It is a blocked agent task with clear execution terms.',
        cue: 'Say this: we are not building a generic task board. We are building a human fallback layer for blocked agent work.'
      },
      operator_assigned: {
        title: 'A human is dispatched',
        body: `${operator.name} is assigned, so the workflow moves from blocked to executable.`,
        side: 'The important point is that the AI does not leave the system — it hands the blocked step to a human layer.',
        cue: 'Say this: the agent does not drop out of the workflow; it hands the real-world step to a human layer inside the system.'
      },
      proof_uploaded: {
        title: 'Proof bundle is being returned',
        body: 'Storefront photos, shelf proof, timestamp notes, and inventory observations are being assembled into a structured package.',
        side: 'The emphasis here is structured evidence, not an unstructured message that says “done”.',
        cue: 'Say this: the output is not a message that says done — it is a proof bundle the system can inspect.'
      },
      verification: {
        title: 'Verification is running',
        body: 'The system checks timing, completeness, and whether the evidence satisfies the task rule.',
        side: 'This is the trust layer: the result becomes auditable instead of relying on claims.',
        cue: 'Say this: trust comes from verification rules applied to evidence, not from trusting the operator by default.'
      },
      settlement: {
        title: 'Settlement waits behind the gate',
        body: 'Payment only clears after verification passes. If the bundle fails, the task returns for rework.',
        side: 'This is the core idea of verify-to-settle.',
        cue: 'Say this: payment is conditional. Verification clears first, then settlement follows.'
      }
    };

    const key = task.timeline[stepIndex]?.label.toLowerCase().replace(/\s+/g, '_') || 'task_created';
    const source = language === 'zh' ? zh : en;
    return source[key as keyof typeof source] ?? source.task_created;
  }, [language, operator.name, stepIndex, task.timeline]);

  const progress = ((stepIndex + 1) / steps.length) * 100;
  const highlightedProofCount = stepIndex === 0 ? 0 : stepIndex === 1 ? 1 : stepIndex === 2 ? 2 : task.proof.length;
  const proofLabel = language === 'zh' ? `${highlightedProofCount}/${task.proofZh.length} 项证据就绪` : `${highlightedProofCount}/${task.proof.length} proof items ready`;
  const gateLabel = stepIndex >= task.timeline.length - 1
    ? (language === 'zh' ? '结算闸门已解锁' : 'Settlement gate unlocked')
    : (language === 'zh' ? '等待验证闸门' : 'Waiting for verification gate');

  const ledger = language === 'zh'
    ? [
        ['任务模式', task.mode],
        ['执行者', operator.name],
        ['当前动作', task.activeActionZh],
        ['结算状态', gateLabel]
      ]
    : [
        ['Task mode', task.mode],
        ['Operator', operator.name],
        ['Active action', task.activeAction],
        ['Settlement status', gateLabel]
      ];

  return (
    <section className={styles.autoDemoShell}>
      <div className={styles.autoDemoHeader}>
        <div>
          <div className={styles.cardEyebrow}>{language === 'zh' ? '自动演示' : 'Auto walkthrough'}</div>
          <h3>{language === 'zh' ? '不需要点击，自动播放完整闭环' : 'No clicks required — the loop plays itself'}</h3>
          <p className={styles.panelSubtext}>
            {language === 'zh'
              ? '我们用一个自动推进的演示，把“Agent 被卡住 -> 人类接手 -> 上传证据 -> 验证 -> 结算”讲清楚。'
              : 'This autoplay panel walks judges through the exact story: blocked agent -> human fallback -> proof -> verify -> settle.'}
          </p>
        </div>
        <div className={styles.autoHeaderActions}>
          <button type="button" className={styles.autoControlButton} onClick={() => setStepIndex((current) => (current === 0 ? steps.length - 1 : current - 1))}>
            {language === 'zh' ? '上一步' : 'Prev'}
          </button>
          <button type="button" className={styles.autoControlButton} onClick={() => setIsPlaying((v) => !v)}>
            {isPlaying ? (language === 'zh' ? '暂停' : 'Pause') : (language === 'zh' ? '继续' : 'Play')}
          </button>
          <button type="button" className={styles.autoControlButton} onClick={() => setStepIndex((current) => (current + 1) % steps.length)}>
            {language === 'zh' ? '下一步' : 'Next'}
          </button>
          <button type="button" className={styles.autoControlButton} onClick={() => { setStepIndex(0); setIsPlaying(true); }}>
            {language === 'zh' ? '重播' : 'Replay'}
          </button>
          <div className={styles.autoLiveChip}>{isPlaying ? (language === 'zh' ? '自动运行中' : 'Auto-running') : (language === 'zh' ? '已暂停' : 'Paused')}</div>
        </div>
      </div>

      <div className={styles.autoProgressTrack}>
        <div className={styles.autoProgressBar} style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.autoDemoGrid}>
        <div className={styles.autoRail}>
          {steps.map((step, index) => {
            const active = index === stepIndex;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => { setStepIndex(index); setIsPlaying(false); }}
                className={active ? styles.autoRailItemActive : styles.autoRailItem}
              >
                <div className={styles.autoStepIndex}>{index + 1}</div>
                <div>
                  <strong>{step.title}</strong>
                  <div className={styles.panelSubtext}>{step.detail}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className={styles.autoSnapshotColumn}>
          <article className={styles.autoSnapshotCard}>
            <div className={styles.cardEyebrow}>{language === 'zh' ? '当前画面' : 'Current frame'}</div>
            <div className={styles.autoSnapshotTopline}>
              <div className={styles.autoStepCounter}>{language === 'zh' ? `步骤 ${stepIndex + 1} / ${steps.length}` : `Step ${stepIndex + 1} / ${steps.length}`}</div>
              <span className={styles.tag}>{proofLabel}</span>
            </div>
            <h3>{snapshot.title}</h3>
            <p className={styles.copy}>{snapshot.body}</p>
            <div className={styles.autoSnapshotMeta}>
              <span className={styles.tag}>{task.reward}</span>
              <span className={styles.tag}>{task.deadline}</span>
              <span className={styles.tag}>{language === 'zh' ? task.locationZh : task.location}</span>
            </div>
          </article>

          <div className={styles.autoInsightGrid}>
            <article className={styles.autoSnapshotCard}>
              <div className={styles.cardEyebrow}>{language === 'zh' ? '评委应该看到什么' : 'What judges should notice'}</div>
              <p className={styles.copy}>{snapshot.side}</p>
              <div className={styles.proofList}>
                {(language === 'zh' ? task.proofZh : task.proof).map((item, index) => (
                  <div key={item} className={index < highlightedProofCount ? styles.proofItemActive : styles.proofItem}>{item}</div>
                ))}
              </div>
            </article>

            <article className={styles.autoSnapshotCard}>
              <div className={styles.cardEyebrow}>{language === 'zh' ? '系统账本' : 'System ledger'}</div>
              <div className={styles.autoLedgerGrid}>
                {ledger.map(([label, value]) => (
                  <div key={label} className={styles.autoLedgerItem}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className={styles.autoCueCard}>
            <div className={styles.cardEyebrow}>{language === 'zh' ? '录屏提示词' : 'Voiceover cue'}</div>
            <h4>{language === 'zh' ? '可以直接这样讲' : 'You can literally say this'}</h4>
            <p className={styles.copy}>{snapshot.cue}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
