import Link from "next/link";
import styles from "../market.module.css";

const developerSurfaces = [
  {
    id: "agent-skills",
    title: "Agent Skills",
    copy: "Let agents create AI2Human campaign previews, draft reward flows, and route human proof work through a controlled API surface.",
    href: "/agent/skill-console",
    cta: "Open skill console"
  },
  {
    id: "llm-gateway",
    title: "LLM Gateway",
    copy: "A planned gateway for agent requests that need human execution, proof collection, or verification before settlement.",
    href: "/developers/api-keys",
    cta: "Request access"
  },
  {
    id: "x402-cloud",
    title: "x402 Cloud",
    copy: "Paid API access for proof bundles, verification records, and future agent-to-network calls using x402 payment rails.",
    href: "/developers/api-keys",
    cta: "View key flow"
  },
  {
    id: "webhooks",
    title: "Webhooks",
    copy: "Receive task lifecycle events: draft created, funding ready, proof submitted, verification complete, and settlement updated.",
    href: "/developers/api-keys",
    cta: "See auth model"
  },
  {
    id: "partnership",
    title: "Partnership",
    copy: "For launchpads, agent teams, communities, and token projects that need proof-gated campaigns or verification workflows.",
    href: "https://x.com/ai2humannetwork",
    cta: "Contact us"
  },
  {
    id: "b20",
    title: "B20 Proof Gateway",
    copy: "Generate role, policy, allowlist, mint eligibility, and proof requirements for Base B20 token workflows.",
    href: "/agent/b20",
    cta: "Open B20 demo"
  }
];

export default function DevelopersPage() {
  return (
    <div className={styles.developerPage}>
      <section className={styles.developerHero}>
        <div>
          <span className={styles.agentKicker}>Developers</span>
          <h1>Build agents that can request human execution, proof, and settlement.</h1>
          <p>
            AI2Human exposes the network as developer surfaces: API keys, agent skills, proof workflows,
            webhooks, x402-ready access, and B20 proof-to-policy tooling.
          </p>
          <div className={styles.agentHeroActions}>
            <Link className={styles.agentPrimaryLink} href="/developers/api-keys">Get API access</Link>
            <Link className={styles.agentSecondaryLink} href="/agent/skill-console">Test Agent Skills</Link>
          </div>
        </div>
        <div className={styles.developerTerminal}>
          <div className={styles.developerTerminalTop}>
            <span />
            <span />
            <span />
          </div>
          <code>{`POST /api/agent/campaigns/preview
x-agent-api-key: a2h_live_...

agent request
  -> human execution
  -> structured proof
  -> verify
  -> settle`}</code>
        </div>
      </section>

      <section className={styles.developerGrid} aria-label="Developer surfaces">
        {developerSurfaces.map((surface) => (
          <Link id={surface.id} key={surface.id} href={surface.href} className={styles.developerCard}>
            <h2>{surface.title}</h2>
            <p>{surface.copy}</p>
            <span>{surface.cta}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
