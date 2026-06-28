import Link from "next/link";
import styles from "../../market.module.css";

const protectedCalls = [
  ["Preview campaign", "POST /api/agent/campaigns/preview", "x-agent-api-key"],
  ["Create draft", "POST /api/agent/campaigns", "x-agent-api-key"],
  ["Funding status", "GET /api/agent/campaigns/{id}/funding", "x-agent-api-key"],
  ["Publish campaign", "POST /api/agent/campaigns/{id}/publish", "x-agent-api-key + confirmation"],
  ["B20 preview", "POST /api/agent/b20/preview", "no broadcast"]
];

const requestFields = [
  "Project name",
  "X handle",
  "Expected campaign volume",
  "Reward budget range",
  "Agent platform",
  "Webhook needs"
];

export default function ApiKeysPage() {
  return (
    <div className={styles.devPortal}>
      <aside className={styles.devRail} aria-label="API key navigation">
        <span>Credentials</span>
        <a href="#request">Request access</a>
        <a href="#usage">Usage</a>
        <a href="#protected">Protected calls</a>
        <Link href="/developers">Developer docs</Link>
        <Link href="/agent/skill-console">Skill console</Link>
      </aside>

      <main className={styles.devMain}>
        <section className={styles.devHero}>
          <div className={styles.devHeroCopy}>
            <div className={styles.devEyebrow}>
              <span className={styles.devLiveDot} />
              API keys
            </div>
            <h1>Project-scoped credentials for agent-created campaigns.</h1>
            <p>
              AI2Human keys identify the project behind an agent request. They protect preview, draft creation,
              funding repair, and publish actions while keeping the human proof loop auditable.
            </p>
            <div className={styles.devHeroActions}>
              <a href="https://x.com/ai2humannetwork" target="_blank" rel="noopener noreferrer" className={styles.devPrimaryAction}>
                Request access
              </a>
              <Link href="/agent/skill-console" className={styles.devSecondaryAction}>Open console</Link>
            </div>
          </div>

          <div className={styles.devCredentialCard}>
            <div className={styles.devCredentialTop}>
              <span>Credential status</span>
              <strong>Closed beta</strong>
            </div>
            <div className={styles.devKeyPreview}>
              <span>a2h_live_</span>
              <i>************************</i>
            </div>
            <p>
              Keys are issued manually while we tune campaign safety, funding gates, and agent publish controls.
            </p>
          </div>
        </section>

        <section id="request" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>Request access</span>
            <h2>Send enough context for us to approve a real key.</h2>
          </div>
          <div className={styles.devRequestGrid}>
            {requestFields.map((field) => (
              <div key={field} className={styles.devRequestField}>{field}</div>
            ))}
          </div>
        </section>

        <section id="usage" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>OpenClaw usage</span>
            <h2>Keep the key as an agent secret.</h2>
          </div>
          <div className={styles.devCodePanel}>
            <div className={styles.devCodeHeader}>
              <span>prompt</span>
              <strong>short enough for operators</strong>
            </div>
            <pre>{`Read https://ai2human.io/agent/skill.md

Help me create a reward campaign for my project.
Ask what info you need.
Use my AI2HUMAN_AGENT_KEY for preview.
Do not publish without my confirmation.`}</pre>
          </div>
        </section>

        <section id="protected" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>Protected calls</span>
            <h2>Auth boundaries are explicit.</h2>
          </div>
          <div className={styles.devEndpointTable}>
            {protectedCalls.map(([name, path, auth]) => (
              <div key={path} className={styles.devEndpointRow}>
                <strong>{name}</strong>
                <code>{path}</code>
                <span>{auth}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
