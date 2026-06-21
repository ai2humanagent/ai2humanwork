"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./whitepaper.module.css";
import { content } from "./WhitepaperContent";

type Language = "en" | "zh";

export default function WhitepaperPage() {
  const [lang, setLang] = useState<Language>("en");
  const t = content[lang];

  const sidebarIds = [
    { id: "intro", label: t.sections.intro.label },
    { id: "problem", label: t.sections.problem.label },
    { id: "solution", label: t.sections.solution.label },
    { id: "architecture", label: t.sections.architecture.label },
    { id: "agents", label: t.sections.agents.label },
    { id: "settlement", label: t.sections.settlement.label },
    { id: "users", label: t.sections.users.label },
    { id: "marketplace", label: t.sections.marketplace.label },
    { id: "liveproduct", label: t.sections.liveproduct.label },
    { id: "moat", label: t.sections.moat.label },
    { id: "jury", label: t.sections.jury.label },
    { id: "identity", label: t.sections.identity.label },
    { id: "roadmap", label: t.sections.roadmap.label },
    { id: "tokenomics", label: t.sections.tokenomics.label },
    { id: "milestones", label: t.sections.milestones.label },
    { id: "closing", label: t.sections.closing.label },
    { id: "links", label: t.sections.links.label },
  ];

  const s = t.sections;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandMark} />
            <span>AI2Human</span>
          </Link>
        </div>
        <div className={styles.navRight}>
          <div className={styles.langSwitch}>
            <button
              className={`${styles.langBtn} ${lang === "en" ? styles.langBtnActive : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
            <span className={styles.langDivider}>|</span>
            <button
              className={`${styles.langBtn} ${lang === "zh" ? styles.langBtnActive : ""}`}
              onClick={() => setLang("zh")}
            >
              中文
            </button>
          </div>
          <Link href="/" className={styles.navLink}>{t.nav.home}</Link>
          <Link href="/whitepaper" className={styles.navLinkActive}>{t.nav.paper}</Link>
          {/* <a href="https://github.com/ai2humanagent/ai2humanwork" target="_blank" rel="noopener noreferrer" className={styles.navLink}>{t.nav.github}</a> */}
          <a href="https://x.com/ai2humannetwork" target="_blank" rel="noopener noreferrer" className={styles.navLink}>{t.nav.contact}</a>
        </div>
      </nav>

      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarContent}>
            <div className={styles.sidebarLabel}>On this page</div>
            <ul className={styles.sidebarList}>
              {sidebarIds.map((item) => (
                <li key={item.id} className={styles.sidebarItem}>
                  <a href={`#${item.id}`} className={styles.sidebarLink}>
                    {lang === "zh" ? item.label : item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.hero}>
            <div className={styles.heroMeta}>
              <span className={styles.heroEyebrow}>{t.hero.eyebrow}</span>
              <span className={styles.heroDot}>·</span>
              <span className={styles.heroUpdated}>{t.hero.updated}</span>
            </div>
            <h1 className={styles.heroTitle}>{t.hero.title}</h1>
            <p className={styles.heroSubtitle}>{t.hero.subtitle}</p>
          </header>

          {/* Introduction */}
          <section id="intro" className={styles.section}>
            <div className={styles.sectionLabel}>{s.intro.label}</div>
            <h2 className={styles.sectionTitle}>{s.intro.title}</h2>
            <div className={styles.sectionContent}>
              {s.intro.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>
          </section>

          {/* The Problem */}
          <section id="problem" className={styles.section}>
            <div className={styles.sectionLabel}>{s.problem.label}</div>
            <h2 className={styles.sectionTitle}>{s.problem.title}</h2>
            <div className={styles.sectionContent}>
              {s.problem.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>
            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>{s.problem.highlight.label}</div>
              <div className={styles.highlightContent}>{s.problem.highlight.content}</div>
            </div>
          </section>

          {/* Our Solution */}
          <section id="solution" className={styles.section}>
            <div className={styles.sectionLabel}>{s.solution.label}</div>
            <h2 className={styles.sectionTitle}>{s.solution.title}</h2>
            <div className={styles.sectionContent}>
              {s.solution.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>

            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>{s.solution.coreLoop.label}</div>
              <div className={styles.highlightContent}>{s.solution.coreLoop.content}</div>
            </div>

            <div className={styles.howItWorksGrid}>
              {s.solution.phases.map((phase, i) => (
                <div key={i} className={styles.howItWorksItem}>
                  <div className={styles.hiwName}>{phase.name}</div>
                  <h3 className={styles.hiwTitle}>{phase.title}</h3>
                  <p className={styles.hiwContent}>{phase.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Architecture */}
          <section id="architecture" className={styles.section}>
            <div className={styles.sectionLabel}>{s.architecture.label}</div>
            <h2 className={styles.sectionTitle}>{s.architecture.title}</h2>
            <div className={styles.sectionContent}>
              {s.architecture.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.architecture.layers.map((layer, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{layer.name}</div>
                  <div className={styles.tokenDesc}>{layer.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Multi-Agent System */}
          <section id="agents" className={styles.section}>
            <div className={styles.sectionLabel}>{s.agents.label}</div>
            <h2 className={styles.sectionTitle}>{s.agents.title}</h2>
            <div className={styles.sectionContent}>
              {s.agents.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.agents.roles.map((role, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{role.name}</div>
                  <div className={styles.tokenDesc}>{role.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Settlement */}
          <section id="settlement" className={styles.section}>
            <div className={styles.sectionLabel}>{s.settlement.label}</div>
            <h2 className={styles.sectionTitle}>{s.settlement.title}</h2>
            <div className={styles.sectionContent}>
              {s.settlement.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.settlement.rails.map((rail, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{rail.name}</div>
                  <div className={styles.tokenDesc}>{rail.desc}</div>
                </div>
              ))}
            </div>

            <div className={styles.highlight} style={{ marginTop: '24px' }}>
              <div className={styles.highlightLabel}>{s.settlement.liveProof.label}</div>
              <div className={styles.highlightContent}>{s.settlement.liveProof.content}</div>
            </div>
          </section>

          {/* Target Users */}
          <section id="users" className={styles.section}>
            <div className={styles.sectionLabel}>{s.users.label}</div>
            <h2 className={styles.sectionTitle}>{s.users.title}</h2>
            <div className={styles.sectionContent}>
              {s.users.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.users.personas.map((persona, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{persona.name}</div>
                  <div className={styles.tokenDesc}>{persona.desc}</div>
                </div>
              ))}
            </div>

            <div className={styles.highlight} style={{ marginTop: '24px' }}>
              <div className={styles.highlightLabel}>FLYWHEEL</div>
              <div className={styles.highlightContent}>{s.users.flywheel}</div>
            </div>
          </section>

          {/* Marketplace */}
          <section id="marketplace" className={styles.section}>
            <div className={styles.sectionLabel}>{s.marketplace.label}</div>
            <h2 className={styles.sectionTitle}>{s.marketplace.title}</h2>
            <div className={styles.sectionContent}>
              {s.marketplace.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.marketplace.roles.map((role, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{role.name}</div>
                  <div className={styles.tokenDesc}>{role.desc}</div>
                </div>
              ))}
            </div>

            <h3 className={styles.subSectionTitle}>{s.marketplace.taskTypes.title}</h3>
            <div className={styles.tokenGrid}>
              {s.marketplace.taskTypes.items.map((item, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{item.name}</div>
                  <div className={styles.tokenDesc}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Product */}
          <section id="liveproduct" className={styles.section}>
            <div className={styles.sectionLabel}>{s.liveproduct.label}</div>
            <h2 className={styles.sectionTitle}>{s.liveproduct.title}</h2>
            <div className={styles.sectionContent}>
              {s.liveproduct.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.liveproduct.features.map((feature, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{feature.name}</div>
                  <div className={styles.tokenDesc}>{feature.desc}</div>
                  {feature.link && (
                    <a href={feature.link.href} target="_blank" rel="noopener noreferrer" className={styles.linkItem} style={{ marginTop: '12px', display: 'inline-block' }}>
                      {feature.link.label} →
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <a href={s.liveproduct.cta.href} className={styles.ctaButton}>
                {s.liveproduct.cta.label}
              </a>
            </div>
          </section>

          {/* Competitive Moat */}
          <section id="moat" className={styles.section}>
            <div className={styles.sectionLabel}>{s.moat.label}</div>
            <h2 className={styles.sectionTitle}>{s.moat.title}</h2>
            <div className={styles.sectionContent}>
              {s.moat.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.moat.advantages.map((adv, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{adv.name}</div>
                  <div className={styles.tokenDesc}>{adv.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Jury System */}
          <section id="jury" className={styles.section}>
            <div className={styles.sectionLabel}>{s.jury.label}</div>
            <h2 className={styles.sectionTitle}>{s.jury.title}</h2>
            <div className={styles.sectionContent}>
              {s.jury.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{p}</p>
              ))}
            </div>

            <h3 className={styles.subSectionTitle}>Workflow</h3>
            <div className={styles.tokenGrid}>
              {s.jury.workflow.map((step, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{step.step}</div>
                  <div className={styles.tokenDesc}>{step.desc}</div>
                </div>
              ))}
            </div>

            <h3 className={styles.subSectionTitle}>{s.jury.jurorRequirements.title}</h3>
            <div className={styles.tokenGrid}>
              {s.jury.jurorRequirements.items.map((item, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{item.name}</div>
                  <div className={styles.tokenDesc}>{item.desc}</div>
                </div>
              ))}
            </div>

            <h3 className={styles.subSectionTitle}>{s.jury.slashConditions.title}</h3>
            <div className={styles.tokenGrid}>
              {s.jury.slashConditions.items.map((item, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{item.name}</div>
                  <div className={styles.tokenDesc}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div className={styles.highlight} style={{ marginTop: '24px' }}>
              <div className={styles.highlightLabel}>{s.jury.rewards.title}</div>
              <div className={styles.highlightContent}>{s.jury.rewards.content}</div>
            </div>
          </section>

          {/* Identity */}
          <section id="identity" className={styles.section}>
            <div className={styles.sectionLabel}>{s.identity.label}</div>
            <h2 className={styles.sectionTitle}>{s.identity.title}</h2>
            <div className={styles.sectionContent}>
              {s.identity.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className={styles.section}>
            <div className={styles.sectionLabel}>{s.roadmap.label}</div>
            <h2 className={styles.sectionTitle}>{s.roadmap.title}</h2>
            <div className={styles.roadmapGrid}>
              {s.roadmap.phases.map((phase, i) => (
                <div key={i} className={styles.roadmapItem}>
                  <div className={styles.roadmapPeriod}>{phase.period}</div>
                  <h3 className={styles.roadmapTitle}>{phase.title}</h3>
                  <p className={styles.roadmapDesc}>{phase.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tokenomics */}
          <section id="tokenomics" className={styles.section}>
            <div className={styles.sectionLabel}>{s.tokenomics.label}</div>
            <h2 className={styles.sectionTitle}>{s.tokenomics.title}</h2>
            <div className={styles.sectionContent}>
              {s.tokenomics.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>

            <div className={styles.tokenGrid}>
              {s.tokenomics.utilities.map((util, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{util.name}</div>
                  <div className={styles.tokenDesc}>{util.desc}</div>
                </div>
              ))}
            </div>

            <div className={styles.tokenStat} style={{ marginTop: '32px' }}>
              <div className={styles.tokenStatValue}>{s.tokenomics.totalSupply}</div>
              <div className={styles.tokenStatLabel}>{s.tokenomics.supplyLabel}</div>
            </div>
          </section>

          {/* Milestones */}
          <section id="milestones" className={styles.section}>
            <div className={styles.sectionLabel}>{s.milestones.label}</div>
            <h2 className={styles.sectionTitle}>{s.milestones.title}</h2>
            <div className={styles.tokenGrid}>
              {s.milestones.items.map((item, i) => (
                <div key={i} className={styles.tokenCard}>
                  <div className={styles.tokenLabel}>{item.date}</div>
                  <div className={styles.tokenDesc}>{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Closing */}
          <section id="closing" className={styles.section}>
            <div className={styles.sectionLabel}>{s.closing.label}</div>
            <h2 className={styles.sectionTitle}>{s.closing.title}</h2>
            <div className={styles.sectionContent}>
              {s.closing.content.map((p, i) => (
                <p key={i} className={styles.paragraph}>{lang === "zh" ? p : p}</p>
              ))}
            </div>
            <div className={styles.highlight}>
              <div className={styles.highlightLabel}>{s.closing.rule.label}</div>
              <div className={styles.highlightContent}>{s.closing.rule.content}</div>
            </div>
          </section>

          {/* Links */}
          <section id="links" className={styles.section}>
            <div className={styles.sectionLabel}>{s.links.label}</div>
            <h2 className={styles.sectionTitle}>{s.links.title}</h2>
            <div className={styles.linksList}>
              {s.links.items.map((item, i) => (
                <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className={styles.linkItem}>
                  {item.label}
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
