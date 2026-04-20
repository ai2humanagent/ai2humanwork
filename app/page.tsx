"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatSettlementBudget } from "./lib/assetLabels.js";
import styles from "./landing.module.css";

const copy = {
  nav: {
    app: "Open Tasks"
  },
  hero: {
    eyebrow: "BNB Chain Agent Fallback Infra",
    titleA: "Agents hit reality.",
    titleB: "ai2human closes the loop.",
    lead:
      "The planner runs wallet, market, and trade prechecks first. If campaign growth, merchant onboarding, compliance, or real-world execution still blocks the task, ai2human dispatches a human operator, collects structured proof, verifies completion, and settles on BNB Chain.",
    ctaPrimary: "Open Live Demo",
    ctaSecondary: "Open Task Board",
    ctaTertiary: "Open Submission Proof"
  },
  meta: ["human fallback infra", "planner precheck", "bnb chain settlement"],
  section: {
    stackTitle: "Planner + Fallback Stack",
    stackDesc:
      "Wallet, market, and trade prechecks happen before fallback. Dispatch, proof, verification, and settlement stay inside one auditable loop.",
    stackItems: [
      {
        name: "precheck",
        label: "Planner Precheck",
        desc: "The planner queries wallet, market, and trade routes before deciding whether to stay autonomous."
      },
      {
        name: "dispatch",
        label: "Human Dispatch",
        desc: "Only after the precheck fails does the dispatcher route the blocked task to a local operator."
      },
      {
        name: "proof",
        label: "Proof Bundle",
        desc: "Capture structured evidence: photos, timestamps, signed receipts, and operator notes."
      },
      {
        name: "settlement",
        label: "BNB Chain Settlement",
        desc: "Payment follows verification. When configured, settlement writes a real BNB Chain transaction hash."
      }
    ],
    liveTitle: "Submission Walkthrough",
    liveDesc:
      "One blocked AI task flows through planner precheck, human fallback, proof, verification, and BNB Chain settlement.",
    loopTitle: "The Loop: Precheck → Human fallback → Proof → Verify → Settle",
    loopDesc:
      "The agent handles what it can. Human fallback is the last-resort execution layer when onchain agents hit real-world constraints or compliance gates.",
    loopBoards: {
      intake: "Blocked Task",
      console: "Proof Review",
      proof: "Proof + Settlement"
    },
    caseTitle: "Best-Fit Scenarios",
    caseDesc:
      "Campaign growth, merchant ops, and compliance gates that agents cannot finish alone: identity-bound posts, merchant checks, screenshots, signatures, and proof-based verification.",
    entryTitle: "Three Roles, One Closed Loop",
    entryDesc: "Buyer, operator, and reviewer stay inside the same auditable flow.",
    entries: [
      { title: "Task Buyer", desc: "Post a blocked agent step and define the proof required for settlement." },
      { title: "Reviewer", desc: "Approve proof packages and release payment only after verification." },
      { title: "Operator Pool", desc: "Dispatch local humans for signatures, pickups, audits, and on-site proof." }
    ],
    entryKickers: {
      hire: "task source",
      publish: "verification",
      human: "execution"
    },
    entryPanels: {
      hireTitle: "Post one blocked step with a proof rule",
      hireDesc: "Define the real-world action, the evidence bundle, and the condition that must clear before payment is released.",
      publishTitle: "Review proof and release payment",
      publishDesc: "The reviewer sees the proof package, verifies completion, and only then clears settlement.",
      humanTitle: "Dispatch an operator for reality-bound work",
      humanDesc: "Operators handle store visits, signed receipts, identity checks, and handoffs that agents cannot do alone."
    }
  },
  footer: {
    tag: "ai2human — Human fallback infrastructure for AI agents",
    links: ["Live Demo", "Submission Proof", "Reviewer Console"]
  }
} as const;

function repeat<T>(items: T[], times: number): T[] {
  return Array.from({ length: times }).flatMap(() => items);
}

export default function HomePage() {
  const [entrance, setEntrance] = useState<"hire" | "publish" | "human">("hire");

  const t = copy;

  const taskFeed = useMemo(() => {
    const tasks = [
      {
        title: "Reply under the launch thread with a localized CTA",
        meta: `X campaign · ${formatSettlementBudget("0.01")} · 2h`,
        badge: "blocked",
        tags: ["reply", "proof", "verify"]
      },
      {
        title: "Quote-post the campaign update with your market take",
        meta: `X campaign · ${formatSettlementBudget("0.02")} · 6h`,
        badge: "needs human",
        tags: ["quote", "growth", "proof"]
      },
      {
        title: "Repost the launch thread and keep it live for review",
        meta: `X campaign · ${formatSettlementBudget("0.01")} · 12h`,
        badge: "review",
        tags: ["repost", "timeline", "review"]
      },
      {
        title: "Capture a merchant onboarding proof screenshot and summary",
        meta: `Merchant ops · ${formatSettlementBudget("10")} · 2h`,
        badge: "settled",
        tags: ["merchant", "proof", "settle"]
      },
      {
        title: "Publish a standalone campaign recap post with CTA",
        meta: `Community growth · ${formatSettlementBudget("0.03")} · 4h`,
        badge: "needs human",
        tags: ["post", "cta", "verify"]
      }
    ];

    return repeat(tasks, 6);
  }, []);

  const humanFeed = useMemo(() => {
    const humans = [
      {
        title: "Shanghai · bilingual X reply / proof capture",
        meta: `${formatSettlementBudget("0.02")} · ready in 2 hours`,
        badge: "available",
        tags: ["photo", "proof", "fast"]
      },
      {
        title: "Hong Kong · campaign quote-post / thread support",
        meta: `${formatSettlementBudget("0.03")} · same day`,
        badge: "available",
        tags: ["receipt", "verify", "proof"]
      },
      {
        title: "Singapore · merchant onboarding check / screenshot proof",
        meta: `${formatSettlementBudget("8")} · same day`,
        badge: "available",
        tags: ["pickup", "delivery", "proof"]
      },
      {
        title: "Dubai · growth recap / localized CTA",
        meta: `${formatSettlementBudget("0.03")} · high priority`,
        badge: "available",
        tags: ["verify", "photo", "proof"]
      },
      {
        title: "Seoul · merchant confirmation / follow-up proof",
        meta: `${formatSettlementBudget("12")} · video ok`,
        badge: "available",
        tags: ["sign", "proof", "urgent"]
      }
    ];

    return repeat(humans, 6);
  }, []);

  const agentFeed = useMemo(() => {
    const agents = [
      {
        title: "Review queue · campaign reply task",
        meta: "waiting for proof package",
        tags: ["verify", "proof", "approve"]
      },
      {
        title: "Payment release gate · growth task",
        meta: "verified before settle",
        tags: ["settle", "review", "bnb"]
      },
      {
        title: "Dispute check · missing screenshot",
        meta: "re-review proof bundle",
        tags: ["proof", "review", "retry"]
      },
      {
        title: "Settlement ledger · latest tx hash",
        meta: "linked to an onchain explorer",
        tags: ["ledger", "tx", "proof"]
      },
      {
        title: "Operator payout check · ready",
        meta: "release after verification pass",
        tags: ["review", "proof", "settle"]
      }
    ];
    return [...agents, ...agents];
  }, []);

  const intakeFeed = useMemo(() => {
    const feed = taskFeed.slice(0, 14).map((item, index) => ({
      ...item,
      seed: index % 2 === 0 ? "a" : "b"
    }));
    // Duplicate so our vertical scroll animation can loop smoothly.
    return [...feed, ...feed];
  }, [taskFeed]);

  const consoleLines = useMemo(() => {
    return [
      "[task] campaign reply mission posted with proof requirements",
      "[precheck] wallet, market, and trade routes queried before escalation",
      "[planner] identity-bound post still required, escalating to dispatcher",
      "[dispatch] routing to operator in Shanghai as last-resort fallback",
      "[proof] evidence uploaded: live post url + screenshot + summary",
      "[verify] reviewer approved the bundle",
      "[settle] payment released on BNB Chain after verification",
      "[ledger] tx hash attached to settlement record"
    ];
  }, []);

  const ledgerLines = useMemo(() => {
    const rows = [
      { label: "task", value: "T-18F2" },
      { label: "payee", value: "Growth Operator" },
      { label: "amount", value: formatSettlementBudget("12.00") },
      { label: "method", value: "bnb_erc20" },
      { label: "status", value: "paid" }
    ];
    return [...rows, ...rows];
  }, []);

  const caseCards = useMemo(() => {
    return [
      {
        title: "Campaign Reply Execution",
        desc: "The planner cannot clear an identity-bound social action onchain, so ai2human dispatches a human operator for the post and proof.",
        tags: ["growth", "proof", "verify"]
      },
      {
        title: "Merchant Proof Collection",
        desc: "A human captures merchant evidence, onboarding confirmation, and timestamp before payment clears.",
        tags: ["merchant", "human", "timestamp"]
      },
      {
        title: "Planner + Settlement",
        desc: "Wallet, market, and trade prechecks decide the route before proof artifacts are settled on BNB Chain.",
        tags: ["precheck", "bnb", "settle"]
      }
    ];
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden />
          <span>ai2human</span>
        </div>

        <nav className={styles.navLinks} aria-label="Primary">
          <Link href="/tasks">Tasks</Link>
          <Link href="/submission">Submission</Link>
          <Link href="/livedemo">Live Demo</Link>
          <Link href="/reviewer">Reviewer</Link>
        </nav>

        <div className={styles.navActions}>
          <Link className={styles.navAppLink} href="/tasks">
            {t.nav.app}
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              {t.hero.eyebrow}
            </div>
            <h1 className={styles.title}>
              {t.hero.titleA}
              <br />
              <span className={styles.titleAccent}>{t.hero.titleB}</span>
            </h1>
            <p className={styles.lead}>{t.hero.lead}</p>

            <div className={styles.heroActions}>
              <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/livedemo">
                {t.hero.ctaPrimary}
              </Link>
              <Link className={`${styles.button} ${styles.buttonGhost}`} href="/tasks">
                {t.hero.ctaSecondary}
              </Link>
              <Link className={styles.button} href="/submission">
                {t.hero.ctaTertiary}
              </Link>
            </div>

            <div className={styles.heroMeta}>
              {t.meta.map((item) => (
                <span key={item} className={styles.metaChip}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.orb} aria-hidden />
            <div className={styles.marketWidget}>
              <div className={styles.widgetInner}>
                <div className={styles.widgetTop}>
                  <span className={styles.widgetTitle}>LIVE FALLBACK LOOP</span>
                </div>

                <div className={styles.marketCols}>
                  <div className={styles.marketCol}>
                    <div className={styles.marketColHead}>
                      <span>{"Tasks"}</span>
                      <span className={`${styles.badge} ${styles.badgeAI}`}>
                        {"dispatching"}
                      </span>
                    </div>
                    <div className={styles.scroller}>
                      <div className={styles.scrollerTrack}>
                        {taskFeed.map((card, idx) => (
                          <div className={styles.miniCard} key={`t-${idx}`}>
                            <div className={`${styles.miniAvatar} ${styles.seedA}`} aria-hidden />
                            <div className={styles.miniMain}>
                              <p className={styles.miniTitle}>{card.title}</p>
                              <p className={styles.miniMeta}>{card.meta}</p>
                              <div className={styles.cardTags}>
                                {card.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={`${idx}-${tag}`}
                                    className={`${styles.tag} ${tag === "proof" ? styles.tagAlt : ""}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.marketCol}>
                    <div className={styles.marketColHead}>
                      <span>{"Humans"}</span>
                      <span className={`${styles.badge} ${styles.badgeHuman}`}>
                        {"on-call"}
                      </span>
                    </div>
                    <div className={styles.scroller}>
                      <div className={styles.scrollerTrackAlt}>
                        {humanFeed.map((card, idx) => (
                          <div className={styles.miniCard} key={`h-${idx}`}>
                            <div className={`${styles.miniAvatar} ${styles.seedB}`} aria-hidden />
                            <div className={styles.miniMain}>
                              <p className={styles.miniTitle}>{card.title}</p>
                              <p className={styles.miniMeta}>{card.meta}</p>
                              <div className={styles.cardTags}>
                                {card.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={`${idx}-${tag}`}
                                    className={`${styles.tag} ${tag === "proof" ? styles.tagAlt : ""}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.stackSection}`}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>{t.section.stackTitle}</h2>
              <p className={styles.sectionDesc}>{t.section.stackDesc}</p>
            </div>
          </div>

          <div className={styles.stackGrid}>
            {t.section.stackItems.map((item) => (
              <div key={item.name} className={styles.stackCard}>
                <div className={styles.stackIcon} aria-hidden>
                  <span>{item.name}</span>
                </div>
                <div>
                  <h3 className={styles.stackLabel}>{item.label}</h3>
                  <p className={styles.stackDesc}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="live" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>{t.section.liveTitle}</h2>
              <p className={styles.sectionDesc}>{t.section.liveDesc}</p>
            </div>
          </div>

          <div className={styles.liveStats}>
            <div className={styles.stat}>
              <p>{"Primary rail"}</p>
              <strong>BNB Chain</strong>
            </div>
            <div className={styles.stat}>
              <p>{"Historical proof"}</p>
              <strong>1 X Layer tx</strong>
            </div>
            <div className={styles.stat}>
              <p>{"Bonus proof layer"}</p>
              <strong>x402-ready</strong>
            </div>
          </div>

          <div className={styles.liveActions}>
            <a className={styles.button} href="#loop">
              {"See loop →"}
            </a>
            <Link className={styles.button} href="/submission">
              {"Open proof →"}
            </Link>
          </div>
        </section>

        <section id="loop" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>{t.section.loopTitle}</h2>
              <p className={styles.sectionDesc}>{t.section.loopDesc}</p>
            </div>
          </div>

          <div className={styles.loopGrid}>
            <div className={styles.board}>
              <div className={styles.boardHead}>
                <span className={styles.boardKicker}>{t.section.loopBoards.intake}</span>
                <span className={`${styles.badge} ${styles.badgeAI}`}>
                  {"task stream"}
                </span>
              </div>
              <div className={styles.intakeScroller} aria-hidden>
                <div className={styles.intakeTrack}>
                  {intakeFeed.map((card, idx) => (
                    <div className={styles.intakeRow} key={`in-${idx}`}>
                      <div
                        className={`${styles.intakeDot} ${card.seed === "a" ? styles.seedA : styles.seedB}`}
                        aria-hidden
                      />
                      <div className={styles.intakeMain}>
                        <p className={styles.intakeTitle}>{card.title}</p>
                        <p className={styles.intakeMeta}>{card.meta}</p>
                      </div>
                      <span className={styles.intakeTag}>{card.tags[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.board}>
              <div className={styles.boardHead}>
                <span className={styles.boardKicker}>{t.section.loopBoards.console}</span>
                <span className={`${styles.badge} ${styles.badgeAI}`}>verify</span>
              </div>
              <div className={styles.terminal}>
                <div className={styles.terminalTop}>
                  <span className={styles.terminalLight} aria-hidden />
                  <span className={styles.terminalLight} aria-hidden />
                  <span className={styles.terminalLight} aria-hidden />
                  <span className={styles.terminalTitle}>agent.run()</span>
                  <span className={styles.caret} aria-hidden />
                </div>
                <div className={styles.terminalBody} aria-hidden>
                  {consoleLines.map((line, idx) => (
                    <div className={styles.consoleLine} key={`l-${idx}`}>
                      <span className={styles.consolePrompt}>&gt;</span>
                      <span className={styles.consoleText}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.board}>
              <div className={styles.boardHead}>
                <span className={styles.boardKicker}>{t.section.loopBoards.proof}</span>
                <span className={`${styles.badge} ${styles.badgeHuman}`}>
                  {"replayable"}
                </span>
              </div>
              <div className={styles.proofStack}>
                <div className={styles.stamp}>
                  <span>{"evidence uploaded"}</span>
                  <strong>photos + timestamp</strong>
                </div>
                <div className={styles.stampAlt}>
                  <span>{"verified"}</span>
                  <strong>reviewer</strong>
                </div>
                <div className={styles.stampPay}>
                  <span>{"settled"}</span>
                  <strong>bnb_erc20</strong>
                </div>
              </div>
              <div className={styles.ledger} aria-hidden>
                <div className={styles.ledgerHead}>
                  <span>{"ledger"}</span>
                  <span className={styles.pill}>{"audit"}</span>
                </div>
                <div className={styles.ledgerBody}>
                  {ledgerLines.map((row, idx) => (
                    <div className={styles.ledgerRow} key={`p-${idx}`}>
                      <span>{row.label}</span>
                      <span className={styles.ledgerValue}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.caseBlock}>
            <div className={styles.caseHead}>
              <div>
                <h3 className={styles.caseTitle}>{t.section.caseTitle}</h3>
                <p className={styles.caseDesc}>{t.section.caseDesc}</p>
              </div>
            </div>
            <div className={styles.caseGrid}>
              {caseCards.map((card) => (
                <div className={styles.caseCard} key={card.title}>
                  <div className={styles.caseTop}>
                    <h4>{card.title}</h4>
                    <span className={styles.casePulse} aria-hidden />
                  </div>
                  <p>{card.desc}</p>
                  <div className={styles.caseFlow} aria-hidden>
                    {card.tags.map((tag, idx) => (
                      <div key={tag} className={styles.flowNode}>
                        <span className={styles.flowDot} />
                        <span className={styles.flowLabel}>{tag}</span>
                        {idx < card.tags.length - 1 && <span className={styles.flowLine} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="entrances" className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>{t.section.entryTitle}</h2>
              <p className={styles.sectionDesc}>{t.section.entryDesc}</p>
            </div>
          </div>

          <div className={styles.entranceGrid}>
            <div className={styles.entranceChooser}>
              <button
                className={`${styles.entranceCard} ${entrance === "hire" ? styles.entranceActive : ""}`}
                onClick={() => setEntrance("hire")}
              >
                <div className={styles.entranceTop}>
                  <span className={styles.entranceKicker}>{t.section.entryKickers.hire}</span>
                  <span className={`${styles.badge} ${styles.badgeAI}`}>{"work"}</span>
                </div>
                <h3 className={styles.entryTitle}>{t.section.entries[0].title}</h3>
                <p className={styles.entryDesc}>{t.section.entries[0].desc}</p>
              </button>

              <button
                className={`${styles.entranceCard} ${entrance === "publish" ? styles.entranceActive : ""}`}
                onClick={() => setEntrance("publish")}
              >
                <div className={styles.entranceTop}>
                  <span className={styles.entranceKicker}>{t.section.entryKickers.publish}</span>
                  <span className={`${styles.badge} ${styles.badgeAI}`}>agent</span>
                </div>
                <h3 className={styles.entryTitle}>{t.section.entries[1].title}</h3>
                <p className={styles.entryDesc}>{t.section.entries[1].desc}</p>
              </button>

              <button
                className={`${styles.entranceCard} ${entrance === "human" ? styles.entranceActive : ""}`}
                onClick={() => setEntrance("human")}
              >
                <div className={styles.entranceTop}>
                  <span className={styles.entranceKicker}>{t.section.entryKickers.human}</span>
                  <span className={`${styles.badge} ${styles.badgeHuman}`}>{"field ops"}</span>
                </div>
                <h3 className={styles.entryTitle}>{t.section.entries[2].title}</h3>
                <p className={styles.entryDesc}>{t.section.entries[2].desc}</p>
              </button>
            </div>

            <div className={styles.entrancePreview}>
              <div className={styles.previewHead}>
                <div>
                  <p className={styles.previewEyebrow}>
                    {entrance === "hire"
                      ? "Task buyer"
                      : entrance === "publish"
                        ? "Reviewer"
                        : "Operator pool"}
                  </p>
                  <h3 className={styles.previewTitle}>
                    {entrance === "hire"
                      ? t.section.entryPanels.hireTitle
                      : entrance === "publish"
                        ? t.section.entryPanels.publishTitle
                        : t.section.entryPanels.humanTitle}
                  </h3>
                  <p className={styles.previewDesc}>
                    {entrance === "hire"
                      ? t.section.entryPanels.hireDesc
                      : entrance === "publish"
                        ? t.section.entryPanels.publishDesc
                        : t.section.entryPanels.humanDesc}
                  </p>
                </div>
                <div className={styles.previewActions}>
                  {entrance === "hire" && (
                    <>
                      <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/livedemo">
                        {"Open live demo"}
                      </Link>
                      <a className={styles.button} href="#loop">
                        {"See loop"}
                      </a>
                    </>
                  )}
                  {entrance === "publish" && (
                    <>
                      <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/reviewer">
                        {"Open reviewer"}
                      </Link>
                      <a className={styles.button} href="#loop">
                        {"See proof"}
                      </a>
                    </>
                  )}
                  {entrance === "human" && (
                    <>
                      <button className={`${styles.button} ${styles.buttonPrimary}`} disabled>
                        {"Operator onboarding"}
                      </button>
                      <a className={styles.button} href="#loop">
                        {"See proof"}
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.previewWindow} aria-hidden>
                <div className={styles.previewTop}>
                  <span className={styles.widgetTitle}>
                    {entrance === "hire"
                      ? "Blocked tasks"
                      : entrance === "publish"
                        ? "Review queue"
                        : "Operators on-call"}
                  </span>
                  <span className={styles.pill}>{"live"}</span>
                </div>

                <div className={styles.previewScroll}>
                  <div className={styles.previewTrack}>
                    {(() => {
                      const base =
                        entrance === "hire"
                          ? taskFeed.slice(0, 10)
                          : entrance === "publish"
                            ? agentFeed.slice(0, 10)
                            : humanFeed.slice(0, 10);
                      const items = [...base, ...base];
                      return items.map((item, idx) => (
                        <div className={styles.previewRow} key={`pv-${entrance}-${idx}`}>
                          <div
                            className={`${styles.previewAvatar} ${
                              entrance === "human" ? styles.seedB : styles.seedA
                            }`}
                            aria-hidden
                          />
                          <div className={styles.previewMain}>
                            <p className={styles.previewRowTitle}>{item.title}</p>
                            <p className={styles.previewRowMeta}>{item.meta}</p>
                            <div className={styles.previewTags}>
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={`${idx}-${tag}`}
                                  className={`${styles.tag} ${tag === "proof" ? styles.tagAlt : ""}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerLeft}>
              <div className={styles.footerBrand}>
                <div className={styles.brandMark} aria-hidden />
                <div>
                  <strong>ai2human</strong>
                  <p>{t.footer.tag}</p>
                </div>
              </div>
              <div className={styles.footerMeta}>
                <span>{"Human fallback infra"}</span>
                <span>{"Proof → verify → settle"}</span>
                <span>{"BNB Chain settlement"}</span>
              </div>
            </div>
            <div className={styles.footerCols}>
              <div>
                <p className={styles.footerTitle}>{"Product"}</p>
                <div className={styles.footerLinks}>
                  <Link href="/livedemo">{t.footer.links[0]}</Link>
                  <Link href="/submission">{t.footer.links[1]}</Link>
                  <a href="#loop">{"Loop"}</a>
                </div>
              </div>
              <div>
                <p className={styles.footerTitle}>{"Entrances"}</p>
                <div className={styles.footerLinks}>
                  <Link href="/reviewer">{t.footer.links[2]}</Link>
                  <Link href="/tasks">{"Task board"}</Link>
                  <Link href="/app/profile">{"Operator profile"}</Link>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>

    </div>
  );
}
