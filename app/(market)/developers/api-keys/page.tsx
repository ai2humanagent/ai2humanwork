import Link from "next/link";
import styles from "../../market.module.css";
import ApiKeyRequestClient from "./ApiKeyRequestClient";

const protectedCalls = [
  ["Preview campaign", "POST /api/agent/campaigns/preview", "x-agent-api-key"],
  ["Create draft", "POST /api/agent/campaigns", "x-agent-api-key"],
  ["Funding status", "GET /api/agent/campaigns/{id}/funding", "x-agent-api-key"],
  ["Publish campaign", "POST /api/agent/campaigns/{id}/publish", "x-agent-api-key + confirmation"],
  ["B20 preview", "POST /api/agent/b20/preview", "no broadcast"]
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
            <h1>Apply for a scoped AI2Human Agent API key.</h1>
            <p>
              API keys are issued to real projects, not anonymous traffic. Tell us what your agent will create,
              which proof flows it needs, and how rewards will be funded.
            </p>
            <div className={styles.devHeroActions}>
              <a href="#request" className={styles.devPrimaryAction}>Start request</a>
              <Link href="/agent/skill-console" className={styles.devSecondaryAction}>Open console</Link>
            </div>
          </div>

          <div className={styles.devCredentialCard}>
            <div className={styles.devCredentialTop}>
              <span>Credential model</span>
              <strong>Manual review</strong>
            </div>
            <div className={styles.devKeyPreview}>
              <span>a2h_live_</span>
              <i>project_scoped_secret</i>
            </div>
            <p>
              A key can preview campaigns, create drafts, inspect funding, and publish only after the required
              confirmation gates pass.
            </p>
          </div>
        </section>

        <ApiKeyRequestClient />

        <section id="usage" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>OpenClaw usage</span>
            <h2>Give the agent a key, but keep publish approval human-gated.</h2>
          </div>
          <div className={styles.devCodePanel}>
            <div className={styles.devCodeHeader}>
              <span>operator prompt</span>
              <strong>safe default</strong>
            </div>
            <pre>{`Read https://ai2human.io/agent/skill.md

Help me create a reward campaign for my project.
Ask for missing campaign details.
Use my AI2HUMAN_AGENT_KEY for preview and draft creation.
Do not publish without my explicit confirmation.`}</pre>
          </div>
        </section>

        <section id="protected" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>Protected calls</span>
            <h2>Credentials unlock creation, not uncontrolled publishing.</h2>
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
