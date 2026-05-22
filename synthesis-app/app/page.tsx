'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useLanguage } from '@/components/LanguageProvider';
import { operators, tasks } from '@/lib/data';
import styles from './market.module.css';

export default function LandingPage() {
  const { language, t } = useLanguage();
  const [heroTaskIndex, setHeroTaskIndex] = useState(0);
  const [heroStepIndex, setHeroStepIndex] = useState(0);
  const heroTask = tasks[heroTaskIndex];
  const heroOperator = operators.find((operator) => operator.id === heroTask.operatorId) ?? operators[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroTaskIndex((current) => (current + 1) % tasks.length);
    }, 5800);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setHeroStepIndex(0);
  }, [heroTaskIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroStepIndex((current) => (current + 1) % heroTask.timeline.length);
    }, 1900);
    return () => window.clearInterval(timer);
  }, [heroTask.timeline.length, heroTaskIndex]);

  const heroStep = heroTask.timeline[heroStepIndex];
  const heroStepProgress = ((heroStepIndex + 1) / heroTask.timeline.length) * 100;
  const highlightedProofCount = Math.min(heroTask.proof.length, Math.max(1, heroStepIndex));

  const submissionCards = language === 'zh'
    ? [
        {
          eyebrow: '问题',
          title: 'Agent 一碰到现实世界就容易掉线',
          text: '验证码、签字、到场核验、取件、线下确认，这些都是纯软件 Agent 很容易被卡住的地方。'
        },
        {
          eyebrow: '方案',
          title: '把人类兜底变成系统内原语',
          text: '不是把任务丢出系统，而是在系统内部派发真人、回传证据、验证结果并触发结算。'
        },
        {
          eyebrow: '价值',
          title: 'Proof-first, verify-first, settle-last',
          text: '先有结构化证据，再做结果验证，最后才释放支付，整个闭环对评委和用户都可解释。'
        }
      ]
    : [
        {
          eyebrow: 'Problem',
          title: 'Agents break when they hit reality',
          text: 'CAPTCHAs, signatures, pickups, in-person verification, and local checks are the steps where software-only agents still fail.'
        },
        {
          eyebrow: 'Solution',
          title: 'Turn human fallback into a first-class primitive',
          text: 'Keep the work inside one system: dispatch a human, return proof, verify the result, and only then settle payment.'
        },
        {
          eyebrow: 'Why it matters',
          title: 'Proof-first, verify-first, settle-last',
          text: 'The loop is easy to explain to judges and useful in production: evidence first, verification second, settlement last.'
        }
      ];

  const infraCards = language === 'zh'
    ? [
        ['任务层', 'Agent 定义被卡住的步骤、奖励、截止时间和证据要求。'],
        ['执行层', '系统把现实世界步骤派发给合适的人类执行者。'],
        ['证据层', '照片、视频、时间戳和备注被打包成结构化 proof bundle。'],
        ['验证与结算层', '系统按规则验证，验证通过后才触发付款。']
      ]
    : [
        ['Task layer', 'The agent defines the blocked step, reward, deadline, and proof requirements.'],
        ['Execution layer', 'The system routes the real-world step to the right human operator.'],
        ['Proof layer', 'Photos, timestamps, notes, and media are assembled into a structured bundle.'],
        ['Verification + settlement', 'The system checks the bundle against the rule and only then releases payment.']
      ];

  const trackCards = language === 'zh'
    ? [
        ['主赛道', 'Agents that cooperate', '我们把人类兜底做成了智能体工作流中的协作原语，而不是系统外的人工补丁。'],
        ['副赛道', 'Agents that trust', '任务结果与结构化证据绑定，验证过程可解释，最终结果可复查。'],
        ['副赛道', 'Agents that pay', '支付不是先打再说，而是在验证通过后才释放。']
      ]
    : [
        ['Primary', 'Agents that cooperate', 'We turn human fallback into a cooperation primitive inside the agent workflow, not an off-platform manual patch.'],
        ['Secondary', 'Agents that trust', 'Results are tied to structured proof, and the verification path is visible and auditable.'],
        ['Secondary', 'Agents that pay', 'Payment does not happen first — it is released only after verification passes.']
      ];

  const heroStats = language === 'zh'
    ? [
        ['1', '被卡住的 Agent 任务'],
        ['1', '已接手的人类执行者'],
        [String(heroTask.proof.length), '所需证据项'],
        ['Verify → Settle', '结算闸门']
      ]
    : [
        ['1', 'Blocked agent task'],
        ['1', 'Human fallback operator'],
        [String(heroTask.proof.length), 'Required proof items'],
        ['Verify → Settle', 'Settlement gate']
      ];

  const heroJudgeNotes = language === 'zh'
    ? [
        '评委要先看到“为什么 Agent 会被卡住”。',
        '然后看到人类接手并没有让系统断裂。',
        '最后看到证据、验证和结算是同一条流水线。'
      ]
    : [
        'Judges should first see why the agent is blocked.',
        'Then they should see the human take over without breaking the system.',
        'Finally they should see proof, verification, and settlement in one line.'
      ];

  const heroLiveBadge = language === 'zh' ? `自动演示 · ${heroStep.labelZh}` : `Auto demo · ${heroStep.label}`;

  const heroBlockers = language === 'zh'
    ? [
        ['验证码墙', '需要真人完成被反爬卡住的步骤。'],
        ['签字交接', '需要见证、签收或真人确认。'],
        ['到场核验', '需要拍照、时间戳和现场状态。'],
        ['本地取件', '需要真实位置的取件和回传。']
      ]
    : [
        ['CAPTCHA walls', 'A real person must finish the anti-bot step.'],
        ['Signature handoffs', 'The transfer needs a witness or signed receipt.'],
        ['On-site verification', 'Photo proof, timestamps, and local state still need a human.'],
        ['Local pickups', 'A real location requires a real-world pickup and return.']
      ];

  const heroScenarioLabel = language === 'zh' ? '实时场景' : 'Live scenarios';
  const heroBlockerLabel = language === 'zh' ? '为什么需要人类兜底' : 'Why fallback exists';

  const heroScenarioSummaries = useMemo(() => tasks.map((task, index) => ({
    id: task.id,
    active: index === heroTaskIndex,
    title: language === 'zh' ? task.titleZh : task.title,
    summary: language === 'zh' ? task.summaryZh : task.summary,
    location: language === 'zh' ? task.locationZh : task.location,
    proofCount: language === 'zh' ? `${task.proofZh.length} 项证据` : `${task.proof.length} proof items`,
    reward: task.reward
  })), [heroTaskIndex, language]);

  const heroProofTitle = language === 'zh' ? '任务控制台' : 'Task control board';
  const heroProofSubtitle = language === 'zh'
    ? '首屏应该像一个还在运行的系统，而不是一张静态产品海报。'
    : 'The first screen should feel like a live system, not a static product poster.';

  return (
    <main className={styles.marketingShell}>
      <div className={styles.marketingFrame}>
        <Header />

        <section className={styles.marketingHeroReboot}>
          <div className={styles.heroEditorialPanel}>
            <div className={styles.heroAmbientGlow} />
            <div className={styles.heroMesh} />
            <div className={styles.heroVideoStage}>
              <video
                className={styles.heroVideo}
                src="/media/ai2human.mp4"
                poster="/media/ai2human-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
              <div className={styles.heroVideoShade} />
              <div className={styles.heroVideoBadge}>
                {language === 'zh' ? '产品演示片段' : 'Product clip'}
              </div>
            </div>
            <div className={styles.heroIntroStack}>
              <div className={styles.heroEyebrowRow}>
                <div className={styles.kicker}>{t.overview.kicker}</div>
                <div className={styles.heroLiveBadge}>{heroLiveBadge}</div>
              </div>

              <h1 className={styles.heroTitleStrong}>
                {t.overview.title} <span className={styles.heroAccent}>{t.overview.accent}</span>
              </h1>
              <p className={styles.leadLarge}>{t.overview.lead}</p>

              <div className={styles.heroActions}>
                <Link href="/demo" className={styles.primaryButton}>{t.shared.watchLoop}</Link>
                <Link href="/tasks" className={styles.secondaryButton}>{t.shared.browseTasks}</Link>
              </div>

              <div className={styles.heroMetaPills}>
                {t.overview.chips.map((chip) => (
                  <span key={chip} className={styles.tag}>{chip}</span>
                ))}
              </div>

              <div className={styles.heroProofSnippet}>
                <div className={styles.cardEyebrow}>{language === 'zh' ? '为什么这屏要成立' : 'Why this screen works'}</div>
                <div className={styles.heroProofSnippetText}>
                  {language === 'zh'
                    ? '先让评委一眼明白：Agent 被现实世界卡住了，而系统已经把真人兜底、证据、验证和结算串成一条线。'
                    : 'Make judges understand one thing immediately: the agent is blocked by reality, and the system already turns human fallback, proof, verification, and settlement into one line.'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.heroMissionBoard}>
            <div className={styles.heroMissionHeader}>
              <div>
                <div className={styles.cardEyebrow}>{heroProofTitle}</div>
                <h3>{language === 'zh' ? heroTask.titleZh : heroTask.title}</h3>
                <p className={styles.copy}>{heroProofSubtitle}</p>
              </div>
              <div className={styles.heroMissionHeaderSide}>
                <div className={styles.autoLiveChip}>{language === 'zh' ? '自动切换中' : 'Auto-cycling'}</div>
                <div className={styles.autoStepCounter}>{language === 'zh' ? `步骤 ${heroStepIndex + 1} / ${heroTask.timeline.length}` : `Step ${heroStepIndex + 1} / ${heroTask.timeline.length}`}</div>
              </div>
            </div>

            <div className={styles.heroMissionProgress}>
              <div className={styles.heroMissionProgressBar} style={{ width: `${heroStepProgress}%` }} />
            </div>

            <div className={styles.heroStatsGrid}>
              {heroStats.map(([value, label]) => (
                <div key={label} className={styles.heroStatCard}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className={styles.heroMissionGrid}>
              <article className={styles.heroMissionPrimary}>
                <div className={styles.heroMissionTopline}>
                  <span className={`${styles.statusBadge} ${styles.statusPending}`}>{heroTask.mode}</span>
                  <span className={styles.tag}>{language === 'zh' ? heroTask.statusZh : heroTask.status}</span>
                  <span className={styles.tag}>{heroTask.reward}</span>
                  <span className={styles.tag}>{language === 'zh' ? heroTask.locationZh : heroTask.location}</span>
                </div>
                <h3>{language === 'zh' ? heroStep.labelZh : heroStep.label}</h3>
                <p className={styles.copy}>{language === 'zh' ? heroStep.detailZh : heroStep.detail}</p>
                <div className={styles.heroTimelinePreview}>
                  {heroTask.timeline.map((item, index) => {
                    const active = index === heroStepIndex;
                    return (
                      <div key={item.label} className={active ? styles.heroTimelineRowActive : styles.heroTimelineRow}>
                        <span className={styles.heroTimelineIndex}>{index + 1}</span>
                        <div>
                          <strong>{language === 'zh' ? item.labelZh : item.label}</strong>
                          <div className={styles.panelSubtext}>{language === 'zh' ? item.detailZh : item.detail}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.heroMissionCard}>
                <div className={styles.cardEyebrow}>{language === 'zh' ? '执行者层' : 'Operator layer'}</div>
                <div className={styles.heroOperatorCard}>
                  <div className={styles.operatorAvatar} style={{ background: heroOperator.avatarColor }}>{heroOperator.name[0]}</div>
                  <div>
                    <div className={styles.operatorMetaStrong}>
                      <h4>{heroOperator.name}</h4>
                      {heroOperator.verified ? <span className={styles.verifiedDot} /> : null}
                    </div>
                    <div className={styles.operatorLocation}>{heroOperator.city}, {language === 'zh' ? heroOperator.countryZh : heroOperator.country}</div>
                    <div className={styles.panelSubtext}>{language === 'zh' ? heroOperator.headlineZh : heroOperator.headline}</div>
                  </div>
                </div>
                <div className={styles.tagRow}>
                  <span className={styles.tag}>{heroOperator.rate}</span>
                  <span className={styles.tag}>{heroOperator.reliability} {t.statuses.reliability}</span>
                  <span className={styles.tag}>{heroOperator.lastSeen}</span>
                </div>
              </article>

              <article className={styles.heroMissionCard}>
                <div className={styles.cardEyebrow}>{language === 'zh' ? '证据包' : 'Proof bundle'}</div>
                <div className={styles.proofList}>
                  {(language === 'zh' ? heroTask.proofZh : heroTask.proof).map((item, index) => (
                    <div key={item} className={index < highlightedProofCount ? styles.proofItemActive : styles.proofItem}>{item}</div>
                  ))}
                </div>
              </article>

              <article className={styles.heroMissionCard}>
                <div className={styles.cardEyebrow}>{language === 'zh' ? '评委应该感受到什么' : 'What judges should feel'}</div>
                <div className={styles.judgeListCompact}>
                  {heroJudgeNotes.map((item) => (
                    <div key={item} className={styles.requirementItem}>{item}</div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <div className={styles.sectionStack}>
          <section className={styles.surfaceSplitWide}>
            <article className={styles.surface}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>{heroBlockerLabel}</div>
                  <h2>{language === 'zh' ? '哪些现实世界步骤会让 Agent 掉线' : 'Which real-world steps still break agents'}</h2>
                </div>
              </div>
              <div className={styles.heroBlockerGrid}>
                {heroBlockers.map(([title, detail]) => (
                  <div key={title} className={styles.heroBlockerItem}>
                    <strong>{title}</strong>
                    <p className={styles.panelSubtext}>{detail}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className={styles.surface}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>{heroScenarioLabel}</div>
                  <h2>{language === 'zh' ? '切换场景，看到这不是单一 case' : 'Switch scenarios and prove this is not a one-off case'}</h2>
                </div>
                <span className={styles.heroSwitcherHint}>{language === 'zh' ? '自动轮播中' : 'Auto cycle'}</span>
              </div>

              <div className={styles.heroScenarioList}>
                {heroScenarioSummaries.map((task, index) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setHeroTaskIndex(index)}
                    className={task.active ? styles.heroScenarioRowActive : styles.heroScenarioRow}
                  >
                    <div>
                      <div className={styles.heroScenarioRowTitle}>{task.title}</div>
                      <div className={styles.heroScenarioRowSummary}>{task.summary}</div>
                    </div>
                    <div className={styles.heroScenarioRowMeta}>
                      <span>{task.reward}</span>
                      <span>{task.proofCount}</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </section>
          <section className={styles.submissionGrid}>
            {submissionCards.map((card) => (
              <article key={card.title} className={styles.submissionCard}>
                <div className={styles.cardEyebrow}>{card.eyebrow}</div>
                <h3>{card.title}</h3>
                <p className={styles.copy}>{card.text}</p>
              </article>
            ))}
          </section>

          <section className={styles.surface}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>{t.overview.coreEyebrow}</div>
                <h2>{t.overview.coreTitle}</h2>
                <div className={styles.panelSubtext}>{t.overview.coreText}</div>
              </div>
            </div>
            <div className={styles.metricStripFive}>
              {t.overview.loopItems.map(([value, label]) => (
                <div key={value} className={styles.metricCard}>
                  <span className={styles.metricValue}>{value}</span>
                  <span className={styles.metricLabel}>{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.surfaceSplitWide}>
            <article className={styles.surface}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>{language === 'zh' ? '为什么它像一个 submission page' : 'Why this reads like a submission'}</div>
                  <h2>{language === 'zh' ? '我们在展示一个清晰原语，而不是一个大而散的市场' : 'We are showing one clear primitive, not a sprawling marketplace'}</h2>
                </div>
              </div>
              <div className={styles.judgeList}>
                {(language === 'zh'
                  ? [
                      '评委能一眼理解：任务为什么被卡住。',
                      '评委能一眼看到：真人接管以后系统没有断裂。',
                      '评委能一眼看到：证据、验证和结算是串起来的。',
                      '评委不会误解我们是在做一个普通外包平台。'
                    ]
                  : [
                      'Judges can immediately see why the task is blocked.',
                      'Judges can immediately see that the workflow stays inside one system after a human takes over.',
                      'Judges can immediately see how proof, verification, and settlement connect.',
                      'Judges do not mistake this for a generic freelancer marketplace.'
                    ]).map((item) => (
                  <div key={item} className={styles.requirementItem}>{item}</div>
                ))}
              </div>
            </article>

            <article className={styles.surface}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.eyebrow}>{language === 'zh' ? '系统架构' : 'System architecture'}</div>
                  <h2>{language === 'zh' ? '四层就能讲清楚' : 'Four layers tell the whole story'}</h2>
                </div>
              </div>
              <div className={styles.architectureGrid}>
                {infraCards.map(([title, text]) => (
                  <div key={title} className={styles.architectureCard}>
                    <strong>{title}</strong>
                    <p className={styles.copy}>{text}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.surface}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>{language === 'zh' ? '赛道对应' : 'Track fit'}</div>
                <h2>{language === 'zh' ? '为什么这个项目和 Synthesis 很贴' : 'Why this maps tightly to Synthesis'}</h2>
              </div>
            </div>
            <div className={styles.submissionGrid}>
              {trackCards.map(([eyebrow, title, text]) => (
                <article key={title} className={styles.submissionCard}>
                  <div className={styles.cardEyebrow}>{eyebrow}</div>
                  <h3>{title}</h3>
                  <p className={styles.copy}>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>{t.overview.scenariosEyebrow}</div>
                <h2>{t.overview.scenariosTitle}</h2>
              </div>
              <Link href="/tasks" className={styles.inlineButton}>{t.shared.openTask}</Link>
            </div>
            <div className={styles.taskGrid}>
              {tasks.map((task) => (
                <article key={task.id} className={styles.taskCard}>
                  <div className={styles.badgeRow}>
                    <span className={`${styles.statusBadge} ${styles.statusPending}`}>{task.mode}</span>
                    <span className={styles.tag}>{language === 'zh' ? task.statusZh : task.status}</span>
                  </div>
                  <h3>{language === 'zh' ? task.titleZh : task.title}</h3>
                  <p className={styles.copy}>{language === 'zh' ? task.summaryZh : task.summary}</p>
                  <div className={styles.taskReward}>{task.reward}</div>
                  <div className={styles.taskMetaLine}>{task.deadline} · {language === 'zh' ? task.locationZh : task.location}</div>
                  <div className={styles.tagRow}>
                    {(language === 'zh' ? task.tagsZh : task.tags).map((tag) => <span key={tag} className={styles.tag}>{tag}</span>)}
                  </div>
                  <Link href={`/tasks/${task.id}`} className={styles.tableAction}>{t.shared.openTask}</Link>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.surface}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.eyebrow}>{t.overview.operatorEyebrow}</div>
                <h2>{t.overview.operatorTitle}</h2>
              </div>
              <Link href="/operators" className={styles.inlineButton}>{t.shared.browseOperators}</Link>
            </div>
            <div className={styles.operatorGrid}>
              {operators.map((operator) => (
                <article key={operator.id} className={styles.operatorCard}>
                  <div className={styles.operatorIdentity}>
                    <div className={styles.operatorAvatar} style={{ background: operator.avatarColor }}>{operator.name[0]}</div>
                    <div>
                      <div className={styles.operatorMetaStrong}>
                        <h3>{operator.name}</h3>
                        {operator.verified ? <span className={styles.verifiedDot} /> : null}
                      </div>
                      <div className={styles.operatorLocation}>{operator.city}, {language === 'zh' ? operator.countryZh : operator.country}</div>
                      <div className={styles.panelSubtext}>{language === 'zh' ? operator.headlineZh : operator.headline}</div>
                    </div>
                  </div>
                  <div className={styles.tagRow}>
                    <span className={styles.tag}>{operator.rate}</span>
                    <span className={styles.tag}>{operator.reliability} {t.statuses.reliability}</span>
                    <span className={styles.tag}>{operator.lastSeen}</span>
                  </div>
                </article>
              ))}
            </div>
            <div className={styles.footerNote}>{t.overview.footer}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
