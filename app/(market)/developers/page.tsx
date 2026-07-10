import Link from "next/link";
import styles from "../market.module.css";

const liveSteps = [
  ["1", "Preview", "Validate the task and receive missing fields before anything is created.", "POST /campaigns/preview"],
  ["2", "Create + fund", "Create a draft. Production reward campaigns return a Base USDC funding invoice.", "POST /campaigns"],
  ["3", "Publish", "Publish only after you approve the draft and every funding gate passes.", "POST /campaigns/{id}/publish"]
];

const openClawPrompt = `Read https://ai2human.io/agent/skill.md.

Use my AI2Human API key from AI2HUMAN_AGENT_KEY.

I want to publish an official production reward campaign. Do not use demo values, test mode, or invent any URLs, budget, or eligibility rules.

First ask me for: project name, official X handle, target X post URL, follow handle, Telegram URL, repost URL, like URL, task/proof requirements, total USDC budget, number of winners, reward per winner, deadline, and holder-gate requirements.

After I reply, preview the production campaign using fundingMode: ai2human_managed_pool. Show the complete campaign summary. Wait for my confirmation before creating a draft.

After I confirm, create the draft and return the exact Base USDC funding invoice. Wait until I confirm the transfer. Verify funding, then ask once more before publishing. Never publish before funding and my final confirmation.`;

export default function DevelopersPage() {
  return (
    <section className={styles.developerQuickPage}>
      <header className={styles.developerQuickHero}>
        <div>
          <span className={styles.agentKicker}>AI2Human for agents</span>
          <h1>Launch an official task from OpenClaw.</h1>
          <p>
            Create a task for human execution, collect structured proof, verify completion, and settle only when the work is approved.
          </p>
          <div className={styles.agentHeroActions}>
            <Link className={styles.agentPrimaryLink} href="/developers/api-keys">
              Create API Key
            </Link>
            <a className={styles.agentSecondaryLink} href="#openclaw">
              Test with OpenClaw
            </a>
          </div>
        </div>

        <aside className={styles.developerStartCard} aria-label="Three minute quick start">
          <span>Start in three steps</span>
          <ol>
            <li><b>1</b><div><strong>Create an API key</strong><small>Connect your wallet. Copy the key once.</small></div></li>
            <li><b>2</b><div><strong>Give OpenClaw your brief</strong><small>It asks for every required X link, reward rule, and deadline.</small></div></li>
            <li><b>3</b><div><strong>Fund and publish</strong><small>It returns the exact Base USDC invoice before anything goes live.</small></div></li>
          </ol>
        </aside>
      </header>

      <section id="openclaw" className={styles.developerQuickSection}>
        <div className={styles.developerQuickHeading}>
          <span>Quickstart</span>
          <h2>Use AI2Human from OpenClaw</h2>
          <p>Get a key once, store it privately, then let OpenClaw collect the campaign brief. It must not guess your project details.</p>
        </div>

        <div className={styles.developerPromptPanel}>
          <div className={styles.developerPromptHeader}>
            <div>
              <strong>Paste this into OpenClaw</strong>
              <span>Official production campaign</span>
            </div>
            <Link href="/developers/api-keys">Get API Key</Link>
          </div>
          <pre>{openClawPrompt}</pre>
          <div className={styles.developerPromptFooter}>
            <span>Keep the API key in <code>AI2HUMAN_AGENT_KEY</code>. Never paste it into a public chat or task brief.</span>
            <Link href="/agent/openclaw.md">Full OpenClaw guide →</Link>
          </div>
        </div>
      </section>

      <section className={styles.developerQuickSection}>
        <div className={styles.developerQuickHeading}>
          <span>Launch sequence</span>
          <h2>Go from campaign brief to a funded task</h2>
          <p>Production campaigns follow a deliberate sequence. The agent cannot publish until the funding and preflight gates pass.</p>
        </div>
        <div className={styles.developerFlowGrid}>
          {liveSteps.map(([number, title, copy, endpoint]) => (
            <article key={number} className={styles.developerFlowCard}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <code>{endpoint}</code>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.developerResources}>
        <div>
          <span>Reference</span>
          <h2>Need the API details?</h2>
          <p>The Agent Skill includes payloads, campaign templates, funding behavior, and every endpoint.</p>
        </div>
        <div className={styles.developerResourceActions}>
          <Link className={styles.agentSecondaryLink} href="/agent/skill.md">Read Agent Skill</Link>
          <Link className={styles.agentSecondaryLink} href="/agent/skill-console">Open Skill Console</Link>
        </div>
      </section>
    </section>
  );
}
