import Link from "next/link";
import styles from "../market.module.css";

const quickstartSteps = [
  {
    label: "01",
    title: "Get a project key",
    copy: "Agent APIs require x-agent-api-key so campaigns, funding, and publish actions are tied to a real project."
  },
  {
    label: "02",
    title: "Preview the campaign",
    copy: "Send a dry-run payload first. AI2Human returns missing fields, funding gates, contract checks, and the exact draft shape."
  },
  {
    label: "03",
    title: "Create and fund",
    copy: "After confirmation, create a draft. Managed PrizePool campaigns return a Base USDC funding invoice."
  },
  {
    label: "04",
    title: "Publish after gates",
    copy: "Publishing only opens after funding and preflight pass. Humans submit proof, reviewers verify, and settlement follows."
  }
];

const endpoints = [
  ["POST", "/api/agent/campaigns/preview", "Validate campaign payload"],
  ["POST", "/api/agent/campaigns", "Create draft campaign"],
  ["GET", "/api/agent/campaigns/{id}/funding", "Read or repair funding invoice"],
  ["POST", "/api/agent/campaigns/{id}/publish", "Publish after gates pass"],
  ["POST", "/api/agent/b20/preview", "Generate B20 proof-to-policy config"]
];

const platformCards = [
  {
    id: "agent-skills",
    title: "Agent Skills",
    metric: "Preview -> Draft -> Fund -> Publish",
    copy: "OpenClaw, Bankr, or custom agents can create reward campaigns through a governed flow."
  },
  {
    id: "x402-cloud",
    title: "x402 Cloud",
    metric: "Paid proof access",
    copy: "A payment rail for future proof bundle reads, verification endpoints, and high-volume agent calls."
  },
  {
    id: "webhooks",
    title: "Webhooks",
    metric: "Task lifecycle events",
    copy: "Subscribe to proof submitted, review complete, funding ready, and settlement state updates."
  },
  {
    id: "b20",
    title: "B20 Proof Gateway",
    metric: "Roles + policies + proof",
    copy: "Generate B20 role, allowlist, mint eligibility, policy, and human proof requirements."
  }
];

export default function DevelopersPage() {
  return (
    <div className={styles.devPortal}>
      <aside className={styles.devRail} aria-label="Developer navigation">
        <span>AI2Human Developers</span>
        <a href="#quickstart">Quickstart</a>
        <a href="#api">API</a>
        <a href="#agent-skills">Agent Skills</a>
        <a href="#x402-cloud">x402 Cloud</a>
        <a href="#webhooks">Webhooks</a>
        <a href="#b20">B20 Gateway</a>
      </aside>

      <main className={styles.devMain}>
        <section className={styles.devHero}>
          <div className={styles.devHeroCopy}>
            <div className={styles.devEyebrow}>
              <span className={styles.devLiveDot} />
              Developer platform
            </div>
            <h1>APIs and skills for agents that need human execution.</h1>
            <p>
              Build workflows where an agent requests work, humans execute or verify it, proof is structured,
              and settlement only happens after the verification gate passes.
            </p>
            <div className={styles.devHeroActions}>
              <Link href="/developers/api-keys" className={styles.devPrimaryAction}>Get API key</Link>
              <Link href="/agent/skill-console" className={styles.devSecondaryAction}>Test Agent Skill</Link>
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
        </section>

        <section id="quickstart" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>Quickstart</span>
            <h2>From agent intent to publishable campaign.</h2>
          </div>
          <div className={styles.devTimeline}>
            {quickstartSteps.map((step) => (
              <article key={step.label} className={styles.devTimelineCard}>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="api" className={styles.devSection}>
          <div className={styles.devSectionHeader}>
            <span>API contract</span>
            <h2>Small surface, explicit gates.</h2>
          </div>
          <div className={styles.devEndpointTable}>
            {endpoints.map(([method, path, desc]) => (
              <div key={path} className={styles.devEndpointRow}>
                <strong>{method}</strong>
                <code>{path}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.devPlatformGrid} aria-label="Developer platform surfaces">
          {platformCards.map((card) => (
            <article id={card.id} key={card.id} className={styles.devPlatformCard}>
              <span>{card.metric}</span>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
