"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./landing.module.css";

const copy = {
  nav: {
    demo: "Get Updates",
    app: "Open Demo"
  },
  hero: {
    eyebrow: "X Layer Human Fallback Infra",
    titleA: "Agents hit reality.",
    titleB: "ai2human closes the loop.",
    lead:
      "When an agent needs a storefront check, signature, pickup, or in-person confirmation, ai2human dispatches a human operator, collects structured proof, verifies completion, and settles on X Layer.",
    ctaPrimary: "Open Live Demo",
    ctaSecondary: "Open Reviewer",
    ctaTertiary: "Get Build Updates"
  },
  meta: ["human fallback infra", "proof-first execution", "x layer settlement"],
  section: {
    stackTitle: "Core Stack",
    stackDesc:
      "Dispatch, proof, verification, and settlement stay inside one auditable loop.",
    stackItems: [
      {
        name: "dispatch",
        label: "Human Dispatch",
        desc: "Route a blocked agent task to a local operator who can complete the real-world step."
      },
      {
        name: "proof",
        label: "Proof Bundle",
        desc: "Capture structured evidence: photos, timestamps, signed receipts, and operator notes."
      },
      {
        name: "x-layer",
        label: "X Layer Settlement",
        desc: "Payment follows verification. When configured, settlement writes a real X Layer transaction hash."
      }
    ],
    liveTitle: "Submission Walkthrough",
    liveDesc:
      "One blocked agent task flows through dispatch, proof, verification, and X Layer settlement.",
    loopTitle: "The Loop: Task → Human fallback → Proof → Verify → Settle",
    loopDesc:
      "The agent handles what it can. When reality is involved, ai2human dispatches a human, returns proof, verifies the result, and only then settles.",
    loopBoards: {
      intake: "Blocked Task",
      console: "Proof Review",
      proof: "Proof + Settlement"
    },
    caseTitle: "Best-Fit Scenarios",
    caseDesc:
      "Real-world steps that agents cannot finish alone: signatures, pickups, local checks, and photo-based verification.",
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
    tag: "ai2human — Human fallback infrastructure for agents on X Layer",
    links: ["Live Demo", "Proof Flow", "Operator Pool"]
  }
} as const;

function repeat<T>(items: T[], times: number): T[] {
  return Array.from({ length: times }).flatMap(() => items);
}

const WAITLIST_START = 2333;

export default function HomePage() {
  const [entrance, setEntrance] = useState<"hire" | "publish" | "human">("hire");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [waitlistError, setWaitlistError] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  const t = copy;

  const taskFeed = useMemo(() => {
    const tasks = [
      {
        title: "Storefront stock check before merchant payout",
        meta: "Shanghai · 80 USDC · 2h",
        badge: "blocked",
        tags: ["store", "proof", "verify"]
      },
      {
        title: "Signed receipt capture for high-value handoff",
        meta: "Hong Kong · 220 USDC · 6h",
        badge: "needs human",
        tags: ["receipt", "handoff", "proof"]
      },
      {
        title: "Retail shelf audit with timestamped photos",
        meta: "Singapore · 399 USDC · 12h",
        badge: "review",
        tags: ["audit", "photo", "review"]
      },
      {
        title: "Pickup handoff with receiver confirmation",
        meta: "Dubai · 99 USDC · 2h",
        badge: "settled",
        tags: ["pickup", "confirm", "settle"]
      },
      {
        title: "On-site inventory check with receipt image",
        meta: "Seoul · 120 USDC · 4h",
        badge: "needs human",
        tags: ["offline", "photo", "verify"]
      }
    ];

    return repeat(tasks, 6);
  }, []);

  const humanFeed = useMemo(() => {
    const humans = [
      {
        title: "Shanghai · store visit / receipt capture",
        meta: "55 USDC · ready in 2 hours",
        badge: "available",
        tags: ["photo", "proof", "fast"]
      },
      {
        title: "Hong Kong · handoff / recipient verification",
        meta: "68 USDC · same day",
        badge: "available",
        tags: ["receipt", "verify", "proof"]
      },
      {
        title: "Singapore · shelf audit / photo evidence",
        meta: "40 USDC · same day",
        badge: "available",
        tags: ["pickup", "delivery", "proof"]
      },
      {
        title: "Dubai · signature / pickup",
        meta: "75 USDC · high priority",
        badge: "available",
        tags: ["verify", "photo", "proof"]
      },
      {
        title: "Seoul · identity check / handoff",
        meta: "90 USDC · video ok",
        badge: "available",
        tags: ["sign", "proof", "urgent"]
      }
    ];

    return repeat(humans, 6);
  }, []);

  const agentFeed = useMemo(() => {
    const agents = [
      {
        title: "Review queue · storefront task",
        meta: "waiting for proof package",
        tags: ["verify", "proof", "approve"]
      },
      {
        title: "Payment release gate · signed receipt",
        meta: "verified before settle",
        tags: ["settle", "review", "x-layer"]
      },
      {
        title: "Dispute check · missing timestamp",
        meta: "re-review proof bundle",
        tags: ["proof", "review", "retry"]
      },
      {
        title: "Settlement ledger · latest tx hash",
        meta: "linked to X Layer explorer",
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
      "[task] storefront verification posted on X Layer flow",
      "[agent] policy check completed, physical visit required",
      "[dispatch] routing to operator in Shanghai",
      "[proof] evidence uploaded: photos + signed receipt",
      "[verify] reviewer approved the bundle",
      "[settle] payment released after verification",
      "[ledger] tx hash attached to settlement record"
    ];
  }, []);

  const ledgerLines = useMemo(() => {
    const rows = [
      { label: "task", value: "T-18F2" },
      { label: "payee", value: "X Layer Operator" },
      { label: "amount", value: "120.00 USDC" },
      { label: "method", value: "xlayer_erc20" },
      { label: "status", value: "paid" }
    ];
    return [...rows, ...rows];
  }, []);

  const caseCards = useMemo(() => {
    return [
      {
        title: "Storefront Verification",
        desc: "The agent reaches a real store visit and dispatches a local operator for proof.",
        tags: ["store", "proof", "verify"]
      },
      {
        title: "Signed Handoff",
        desc: "A human captures receipt, identity confirmation, and timestamp before payment clears.",
        tags: ["receipt", "human", "timestamp"]
      },
      {
        title: "Proof + Settlement",
        desc: "Proof artifacts become an auditable bundle, then settlement is linked to an X Layer transaction.",
        tags: ["proof", "review", "settle"]
      }
    ];
  }, []);

  const displayWaitlistNumber =
    typeof waitlistCount === "number"
      ? Math.max(WAITLIST_START, WAITLIST_START + waitlistCount - 1)
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden />
          <span>ai2human</span>
        </div>

        <div className={styles.navActions}>
          <Link className={styles.navAppLink} href="/livedemo">
            {t.nav.app}
          </Link>
          <form
            id="waitlist"
            className={styles.waitlist}
            onSubmit={(event) => {
              event.preventDefault();
              if (!waitlistEmail.trim()) return;
              setWaitlistStatus("loading");
              setWaitlistError("");
              fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: waitlistEmail, source: "landing" })
              })
                .then(async (res) => {
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data?.error || "Unable to join waitlist.");
                  }
                  setWaitlistJoined(true);
                  setWaitlistStatus("done");
                  setWaitlistCount(typeof data?.count === "number" ? data.count : null);
                  setShowWaitlistModal(true);
                })
                .catch((err) => {
                  setWaitlistJoined(false);
                  setWaitlistStatus("error");
                  setWaitlistError(err instanceof Error ? err.message : "Unable to join waitlist.");
                });
            }}
          >
            <input
              className={styles.waitlistInput}
              type="email"
              required
              placeholder="you@company.com"
              value={waitlistEmail}
              onChange={(event) => {
                setWaitlistEmail(event.target.value);
                if (waitlistJoined) setWaitlistJoined(false);
                if (waitlistStatus !== "idle") setWaitlistStatus("idle");
              }}
            />
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              type="submit"
              disabled={waitlistStatus === "loading"}
            >
              {waitlistStatus === "loading"
                ? "Joining..."
                : waitlistJoined
                  ? "Joined"
                  : t.nav.demo}
            </button>
            {waitlistStatus === "done" && (
              <span className={styles.waitlistNote}>
                {"You're in"}
                {displayWaitlistNumber ? ` · #${displayWaitlistNumber}` : ""}
              </span>
            )}
            {waitlistStatus === "error" && (
              <span className={styles.waitlistError}>{waitlistError}</span>
            )}
          </form>
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
              <Link className={`${styles.button} ${styles.buttonGhost}`} href="/reviewer">
                {t.hero.ctaSecondary}
              </Link>
              <a className={styles.button} href="#waitlist">
                {t.hero.ctaTertiary}
              </a>
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
                  <span className={styles.widgetTitle}>LIVE MARKET</span>
                </div>

                <div className={styles.marketCols}>
                  <div className={styles.marketCol}>
                    <div className={styles.marketColHead}>
                      <span>{"Tasks"}</span>
                      <span className={`${styles.badge} ${styles.badgeAI}`}>
                        {"AI bidding"}
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
                        {"rentable"}
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
              <p>{"New tasks today"}</p>
              <strong>1,764</strong>
            </div>
            <div className={styles.stat}>
              <p>{"Agents online"}</p>
              <strong>3,912</strong>
            </div>
            <div className={styles.stat}>
              <p>{"Humans on-call"}</p>
              <strong>105,766</strong>
            </div>
          </div>

          <div className={styles.liveActions}>
            <a className={styles.button} href="#loop">
              {"See loop →"}
            </a>
            <a className={styles.button} href="#entrances">
              {"See entrances →"}
            </a>
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
                <span className={`${styles.badge} ${styles.badgeAI}`}>claw</span>
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
                  <strong>xlayer_erc20</strong>
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
                <span>{"X Layer settlement"}</span>
              </div>
            </div>
            <div className={styles.footerCols}>
              <div>
                <p className={styles.footerTitle}>{"Product"}</p>
              <div className={styles.footerLinks}>
                  <Link href="/livedemo">{t.footer.links[0]}</Link>
                  <a href="#live">{t.footer.links[1]}</a>
                  <a href="#loop">{"Loop"}</a>
                </div>
              </div>
              <div>
                <p className={styles.footerTitle}>{"Entrances"}</p>
                <div className={styles.footerLinks}>
                  <a href="#entrances">{t.footer.links[2]}</a>
                  <a href="#entrances">{"Reviewer"}</a>
                  <a href="#entrances">{"Task buyer"}</a>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </main>

      {showWaitlistModal && (
        <div className={styles.waitlistModalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.waitlistModal}>
            <div className={styles.waitlistModalGlow} aria-hidden />
            <p className={styles.waitlistModalEyebrow}>Waitlist confirmed</p>
            <h3>Welcome to ai2human</h3>
            <p>
              You are officially on the list.
              {displayWaitlistNumber ? ` Your spot: #${displayWaitlistNumber}.` : ""}
            </p>
            <div className={styles.waitlistModalBadges}>
              <span>Early access</span>
              <span>Priority updates</span>
              <span>X Layer submission updates</span>
            </div>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => setShowWaitlistModal(false)}
            >
              Let’s go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
