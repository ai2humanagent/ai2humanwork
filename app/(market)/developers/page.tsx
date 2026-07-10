import Link from "next/link";
import styles from "../market.module.css";

const quickstartSteps = [
  {
    label: "1",
    title: "Create an API key",
    text: "Connect your wallet and generate an x-agent-api-key. The secret is shown once and unlocks preview, draft, funding, and publish APIs."
  },
  {
    label: "2",
    title: "Preview the campaign",
    text: "Send a dry-run payload. AI2Human returns missing fields, funding gates, contract checks, and the exact draft shape before anything is committed."
  },
  {
    label: "3",
    title: "Create and fund",
    text: "After validation, create a draft. Managed PrizePool campaigns return a Base USDC funding invoice for the reward pool."
  },
  {
    label: "4",
    title: "Publish after gates",
    text: "Publishing unlocks after funding and preflight pass. Humans submit proof, reviewers verify, and settlement follows automatically."
  }
];

const features = [
  {
    title: "Agent Skills API",
    metric: "Campaign creation flow",
    copy: "OpenClaw, Bankr, or custom agents create governed reward campaigns — preview, draft, fund, and publish through a single API surface.",
    href: "/agent/skill-console"
  },
  {
    title: "x402 Cloud",
    metric: "Paid proof access",
    copy: "A payment rail for proof bundle reads, verification endpoints, and high-volume agent API calls. Metered access to verified human work.",
    href: "/developers#x402-cloud"
  },
  {
    title: "Webhooks",
    metric: "Task lifecycle events",
    copy: "Subscribe to proof submitted, review complete, funding ready, and settlement state changes. Keep your agent in sync with every task transition.",
    href: "/developers#webhooks"
  },
  {
    title: "B20 Proof Gateway",
    metric: "Roles + policies + proof",
    copy: "Turn agent token requests into B20 roles, allowlists, mint eligibility rules, policy scopes, and human proof requirements — settled on Base.",
    href: "/agent/b20"
  }
];

const endpoints = [
  ["POST", "/api/agent/campaigns/preview", "Validate campaign payload"],
  ["POST", "/api/agent/campaigns", "Create draft campaign"],
  ["GET", "/api/agent/campaigns/{id}/funding", "Read or repair funding invoice"],
  ["POST", "/api/agent/campaigns/{id}/publish", "Publish after gates pass"],
  ["POST", "/api/agent/b20/preview", "Generate B20 proof-to-policy config"]
];

export default function DevelopersPage() {
  return (
    <section>
      <header className={styles.agentHero}>
        <div className={styles.agentHeroCopy}>
          <span className={styles.agentKicker}>Developer Platform</span>
          <h1>APIs for agents that need human execution.</h1>
          <p>
            Build workflows where an agent requests work, humans execute or verify it, proof is structured,
            and settlement only happens after the verification gate passes.
          </p>
          <div className={styles.agentHeroActions}>
            <Link className={styles.agentPrimaryLink} href="/developers/api-keys">
              Get API Key
            </Link>
            <Link className={styles.agentSecondaryLink} href="/agent/skill-console">
              Test Agent Skill
            </Link>
            <Link className={styles.agentSecondaryLink} href="/agent/skill.md">
              Read Agent Skill
            </Link>
          </div>
        </div>

        <div className={styles.devCodePanel} aria-label="API example">
          <div className={styles.devCodeHeader}>
            <span>campaign.preview</span>
            <strong>requires x-agent-api-key</strong>
          </div>
          <pre>{`curl https://ai2human.io/api/agent/campaigns/preview \\
  -H "Content-Type: application/json" \\
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \\
  -d @payload.json

// response
{
  "readyToCreate": true,
  "readyToPublish": false,
  "fundingPlan": {...},
  "nextQuestions": []
}`}</pre>
        </div>
      </header>

      <div className={styles.agentStats}>
        <div>
          <strong>5</strong>
          <span>API endpoints</span>
        </div>
        <div>
          <strong>Preview-first</strong>
          <span>dry-run before commit</span>
        </div>
        <div>
          <strong>Base USDC</strong>
          <span>PrizePool funding rail</span>
        </div>
        <div>
          <strong>Self-service</strong>
          <span>hashed, revocable keys</span>
        </div>
        <div>
          <strong>Publish gate</strong>
          <span>human-in-the-loop confirm</span>
        </div>
      </div>

      <section className={styles.agentSection}>
        <div className={styles.agentSectionHeader}>
          <h2>Platform capabilities</h2>
          <p>Every surface an agent needs to create, fund, verify, and settle human work.</p>
        </div>
        <div className={styles.devFeatureGrid}>
          {features.map((card) => (
            <Link href={card.href} key={card.title} className={styles.devFeatureCard}>
              <span>{card.metric}</span>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.agentSection}>
        <div className={styles.agentSectionHeader}>
          <h2>How the API flow works</h2>
          <p>From agent intent to published campaign — preview first, fund, then publish with confirmation.</p>
        </div>
        <div className={styles.agentSteps}>
          {quickstartSteps.map((step) => (
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
          <h2>API surface</h2>
          <p>Small contract, explicit gates. Five endpoints cover the full campaign lifecycle.</p>
        </div>
        <div className={styles.devEndpointShowcase}>
          {endpoints.map(([method, path, desc]) => (
            <div key={path} className={styles.devEndpointShowcaseRow}>
              <strong>{method}</strong>
              <code>{path}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.agentCtaPanel}>
        <div>
          <h2>Ready to build?</h2>
          <p>
            Create a scoped API key, preview your first campaign payload in the skill console,
            and publish only after funding and confirmation gates pass.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className={styles.agentPrimaryLink} href="/developers/api-keys">
            Create API Key
          </Link>
          <Link className={styles.agentSecondaryLink} href="/agent/skill-console">
            Open Skill Console
          </Link>
        </div>
      </section>
    </section>
  );
}
