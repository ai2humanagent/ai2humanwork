import Link from "next/link";
import styles from "../market.module.css";

const liveSteps = [
  ["1", "Preview", "Validate the task and receive missing fields before anything is created.", "POST /campaigns/preview"],
  ["2", "Create + fund", "Create a draft. Production reward campaigns return a Base USDC funding invoice.", "POST /campaigns"],
  ["3", "Publish", "Publish only after you approve the draft and every funding gate passes.", "POST /campaigns/{id}/publish"]
];

const openClawPrompt = `Read https://ai2human.io/agent/skill.md.

Use my AI2Human API key from AI2HUMAN_AGENT_KEY.

Create a safe test task for my project. Use:
- requesterName: Demo Project
- requesterHandle: @demoproject
- targetUrl: https://x.com/ai2humannetwork/status/2068623421785673960
- budget: 1 USDC
- deadline: 24h
- environment: test
- fundingMode: test_no_payout
- brief: Follow the project and submit screenshot proof.

First preview it. Tell me what will be created. Only after I reply “yes”, create and publish the test task. Do not create a real reward pool or send payouts.`;

export default function DevelopersPage() {
  return (
    <section className={styles.developerQuickPage}>
      <header className={styles.developerQuickHero}>
        <div>
          <span className={styles.agentKicker}>AI2Human for agents</span>
          <h1>When an agent needs a human, start here.</h1>
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
            <li><b>2</b><div><strong>Run a safe test</strong><small>No reward pool, payouts, or notifications.</small></div></li>
            <li><b>3</b><div><strong>Approve a real task</strong><small>Fund and publish only when ready.</small></div></li>
          </ol>
        </aside>
      </header>

      <section id="openclaw" className={styles.developerQuickSection}>
        <div className={styles.developerQuickHeading}>
          <span>Quickstart</span>
          <h2>Use AI2Human from OpenClaw</h2>
          <p>Get a key once, store it privately, then give OpenClaw this prompt. It previews before it creates anything.</p>
        </div>

        <div className={styles.developerPromptPanel}>
          <div className={styles.developerPromptHeader}>
            <div>
              <strong>Paste this into OpenClaw</strong>
              <span>Safe test mode</span>
            </div>
            <Link href="/developers/api-keys">Get API Key</Link>
          </div>
          <pre>{openClawPrompt}</pre>
          <div className={styles.developerPromptFooter}>
            <span>Keep the API key in <code>AI2HUMAN_AGENT_KEY</code>. Never paste it into a public chat or task brief.</span>
            <Link href="/agent/openclaw-test.md">Full OpenClaw guide →</Link>
          </div>
        </div>
      </section>

      <section className={styles.developerQuickSection}>
        <div className={styles.developerQuickHeading}>
          <span>After the test</span>
          <h2>Go from intent to a funded task</h2>
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
