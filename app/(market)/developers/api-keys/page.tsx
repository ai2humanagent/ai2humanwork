import Link from "next/link";
import styles from "../../market.module.css";

const keySteps = [
  {
    title: "1. Request a developer key",
    copy: "Contact AI2Human with your project name, use case, X handle, callback needs, and expected campaign volume."
  },
  {
    title: "2. Store it as an agent secret",
    copy: "Use AI2HUMAN_AGENT_KEY in OpenClaw, Bankr, custom agents, or your backend. Never expose it in a browser client."
  },
  {
    title: "3. Preview before creation",
    copy: "Agents should call preview first, show missing inputs, and wait for explicit confirmation before creating or publishing."
  }
];

export default function ApiKeysPage() {
  return (
    <div className={styles.developerPage}>
      <section className={styles.developerHero}>
        <div>
          <span className={styles.agentKicker}>API Keys</span>
          <h1>One credential for agent-created campaigns and proof workflows.</h1>
          <p>
            AI2Human agent APIs are protected by project keys. This keeps campaign creation, funding,
            publishing, and future webhook actions tied to a real project or agent operator.
          </p>
          <div className={styles.agentHeroActions}>
            <a className={styles.agentPrimaryLink} href="https://x.com/ai2humannetwork" target="_blank" rel="noopener noreferrer">
              Request a key
            </a>
            <Link className={styles.agentSecondaryLink} href="/agent/skill-console">Open test console</Link>
          </div>
        </div>
        <div className={styles.developerTerminal}>
          <div className={styles.developerTerminalTop}>
            <span />
            <span />
            <span />
          </div>
          <code>{`curl https://ai2human.io/api/agent/campaigns/preview \\
  -H "Content-Type: application/json" \\
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \\
  -d @payload.json`}</code>
        </div>
      </section>

      <section className={styles.developerGrid} aria-label="API key setup">
        {keySteps.map((step) => (
          <div key={step.title} className={styles.developerCard}>
            <h2>{step.title}</h2>
            <p>{step.copy}</p>
          </div>
        ))}
      </section>

      <section className={styles.developerPanel}>
        <div>
          <span className={styles.agentKicker}>OpenClaw prompt</span>
          <h2>Use this when testing with an agent.</h2>
          <p>
            Keep the prompt short. The skill should ask for missing project fields, then call preview with your key.
          </p>
        </div>
        <pre>{`Read https://ai2human.io/agent/skill.md

Help me create a reward campaign for my project.
Ask what info you need.
Use my AI2HUMAN_AGENT_KEY for preview.
Do not publish without my confirmation.`}</pre>
      </section>

      <section className={styles.developerPanel}>
        <div>
          <span className={styles.agentKicker}>Protected actions</span>
          <h2>What requires a key?</h2>
        </div>
        <div className={styles.developerAuthList}>
          <span>Preview campaign</span><strong>x-agent-api-key</strong>
          <span>Create draft</span><strong>x-agent-api-key</strong>
          <span>Check / repair funding</span><strong>x-agent-api-key</strong>
          <span>Contract preflight</span><strong>x-agent-api-key</strong>
          <span>Publish campaign</span><strong>x-agent-api-key + explicit confirmation</strong>
          <span>B20 preview</span><strong>No private key required; no broadcast</strong>
        </div>
      </section>
    </div>
  );
}
