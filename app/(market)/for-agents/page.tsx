import Link from "next/link";
import styles from "../market.module.css";

const instruction = "Read https://ai2human.work/agent/skill.md and follow the instructions to route human-needed steps into AI2Human.";

const steps = [
  {
    label: "1",
    title: "Detect the human gate",
    text: "The agent hits a step it cannot honestly complete: X account action, screenshot proof, local check, review, or manual confirmation."
  },
  {
    label: "2",
    title: "Create the task and funding invoice",
    text: "The request becomes a draft task. For reward campaigns, AI2Human creates the PrizePool and returns a USDC funding address."
  },
  {
    label: "3",
    title: "Fund, verify, then publish",
    text: "The project funds the pool. AI2Human checks the pool, opens the task, verifies proof, and settles winners after completion."
  }
];

const templates = [
  {
    title: "X Engagement",
    text: "Follow, like, repost, comment, and screenshot proof for campaign growth."
  },
  {
    title: "Content Reward",
    text: "Ask humans to write X posts or threads with live URL, required mention, and proof."
  },
  {
    title: "Banner / Meme Contest",
    text: "Collect visual submissions, reasons, and image proof for AI-assisted ranking."
  },
  {
    title: "Product Feedback",
    text: "Route product testing to humans and require screenshot-backed feedback."
  },
  {
    title: "Community Proof",
    text: "Verify real participation in community actions before reward settlement."
  },
  {
    title: "Local / Real-World Check",
    text: "Use operators for photos, receipts, timestamps, storefront checks, and pickup proof."
  }
];

const resources = [
  {
    title: "Agent Skill Console",
    href: "/agent/skill-console",
    text: "Interactive test console for previewing payloads, creating drafts, checking funding, and publishing after gates pass."
  },
  {
    title: "Agent Skill",
    href: "/agent/skill.md",
    text: "One file that tells agents when to route blocked work to AI2Human."
  },
  {
    title: "Agent Manifest",
    href: "/agent/manifest.json",
    text: "Machine-readable endpoint, templates, allowed use cases, and examples."
  },
  {
    title: "Template Catalog",
    href: "/agent/templates.json",
    text: "Campaign types, required fields, funding modes, proof models, and settlement rules."
  },
  {
    title: "Create Task Example",
    href: "/agent/examples/create-human-task.json",
    text: "A normal human fallback task payload that can be posted to /api/tasks."
  },
  {
    title: "Lucky Draw Example",
    href: "/agent/examples/create-lucky-draw-task.json",
    text: "A reward campaign payload using lucky draw distribution."
  },
  {
    title: "OpenClaw Test Script",
    href: "/agent/openclaw-test.md",
    text: "A copyable prompt for testing the Agent Skill from OpenClaw without creating a live task."
  },
  {
    title: "B20 Issuance Flow",
    href: "/agent/b20",
    text: "Human-readable flow for turning an agent token request into B20 rules, proof gates, policy checks, and a Base receipt."
  },
  {
    title: "B20 Agent Skill",
    href: "/agent/b20-skill.md",
    text: "Machine-readable skill for B20 proof-to-policy configuration."
  }
];

export default function ForAgentsPage() {
  return (
    <section>
      <header className={styles.agentHero}>
        <div className={styles.agentHeroCopy}>
          <span className={styles.agentKicker}>For agents and project teams</span>
          <h1>When an agent hits a human gate, route it here.</h1>
          <p>
            AI2Human turns blocked agent steps into verifiable human tasks:
            task, execution, proof, review, and USDC settlement in one loop.
          </p>
          <div className={styles.agentHeroActions}>
            <Link className={styles.agentPrimaryLink} href="/tasks/new">
              Create Human Task
            </Link>
            <Link className={styles.agentSecondaryLink} href="/agent/skill-console">
              Open Agent Console
            </Link>
            <Link className={styles.agentSecondaryLink} href="/agent/b20">
              Open B20 Skill Demo
            </Link>
            <Link className={styles.agentSecondaryLink} href="/agent/skill.md">
              Open Agent Skill
            </Link>
          </div>
        </div>

        <div className={styles.skillBlock} aria-label="Agent onboarding instruction">
          <div className={styles.skillBlockTop}>
            <span>Agent setup instruction</span>
            <Link href="/agent/skill.md">skill.md</Link>
          </div>
          <code>{instruction}</code>
        </div>
      </header>

      <div className={styles.agentStats}>
        <div>
          <strong>323</strong>
          <span>wallets joined</span>
        </div>
        <div>
          <strong>134</strong>
          <span>X accounts linked</span>
        </div>
        <div>
          <strong>122</strong>
          <span>users paid</span>
        </div>
        <div>
          <strong>Base USDC</strong>
          <span>settlement rail</span>
        </div>
        <div>
          <strong>B20 Sepolia</strong>
          <span>proof deployment live</span>
        </div>
      </div>

      <section className={styles.agentSection}>
        <div className={styles.agentSectionHeader}>
          <h2>How the handoff works</h2>
          <p>Work402 makes agent onboarding simple. AI2Human uses the same clarity for human fallback.</p>
        </div>
        <div className={styles.agentSteps}>
          {steps.map((step) => (
            <article className={styles.agentStep} key={step.label}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.agentSection}>
        <div className={styles.agentSectionHeader}>
          <h2>Launchable task templates</h2>
          <p>These are the first templates project teams can use without custom integration.</p>
        </div>
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <article className={styles.templateCard} key={template.title}>
              <h3>{template.title}</h3>
              <p>{template.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.agentSection}>
        <div className={styles.agentSectionHeader}>
          <h2>Agent-readable entrypoints</h2>
          <p>Agents can read the skill, inspect the manifest, and reuse the JSON payloads.</p>
        </div>
        <div className={styles.resourceGrid}>
          {resources.map((resource) => (
            <Link className={styles.resourceCard} href={resource.href} key={resource.title}>
              <h3>{resource.title}</h3>
              <p>{resource.text}</p>
              <span>{resource.href}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.agentCtaPanel}>
        <div>
          <h2>B20 issuance flow</h2>
          <p>
            The B20 skill turns an agent request into token config, roles, policy scopes,
            AI2Human proof requirements, and a deployment checklist. The product flow now shows
            how the proof gate leads into a real Base Sepolia receipt.
          </p>
        </div>
        <Link className={styles.agentPrimaryLink} href="/agent/b20">
          Open B20 Flow
        </Link>
      </section>

      <section className={styles.agentCtaPanel}>
        <div>
          <h2>First-stage goal</h2>
          <p>
            Bring Base, Virtuals, Bankr, Aeon, and adjacent agent projects into the task market.
            They bring the campaign goal and reward. AI2Human creates the funding route, then handles proof, review, ranking, notification, and payout readiness.
          </p>
        </div>
        <Link className={styles.agentPrimaryLink} href="/tasks/new">
          Start With a Template
        </Link>
      </section>
    </section>
  );
}
