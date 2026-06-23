"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./b20Skill.module.css";

const sampleRequest = {
  intent:
    "Create a B20 token for a verified RWA community. Max supply 1,000,000. Only verified members can mint. Admin can freeze risky addresses. Require AI2Human proof before role assignment.",
  requesterName: "Example RWA Community",
  requesterHandle: "@example",
  token: {
    variant: "ASSET",
    name: "Verified RWA Community",
    symbol: "VRWA",
    decimals: 18,
    maxSupply: "1000000",
    initialAdmin: "0x1111111111111111111111111111111111111111",
    contractURI: "ipfs://REQUESTER_METADATA_URI",
    useCase: "rwa-community"
  },
  roles: {
    minter: "0x2222222222222222222222222222222222222222",
    pauser: "0x3333333333333333333333333333333333333333",
    metadata: "0x4444444444444444444444444444444444444444",
    compliance: "0x5555555555555555555555555555555555555555",
    operator: "0x6666666666666666666666666666666666666666"
  },
  policies: {
    MINT_RECEIVER_POLICY: { type: "ALLOWLIST", accounts: [] },
    TRANSFER_RECEIVER_POLICY: { type: "ALLOWLIST", accounts: [] },
    TRANSFER_SENDER_POLICY: { type: "BLOCKLIST", accounts: [] }
  },
  proof: {
    required: true,
    proofType: "structured_verification_bundle",
    requiredFor: ["mint eligibility", "role assignment", "allowlist membership"],
    tasks: [
      "Verify member eligibility.",
      "Collect document, entity, location, or community membership proof.",
      "Review proof before adding the account to a B20 allowlist or assigning a role.",
      "Return a memo-ready proof hash for downstream B20 operations."
    ]
  }
};

type Preview = {
  ok: boolean;
  tokenConfig: {
    variant: string;
    name: string;
    symbol: string;
    decimals: number;
    supplyCap: string;
    initialAdmin: string;
  };
  rolesConfig: Array<{ role: string; assignee: string; reason: string }>;
  policyConfig: Array<{ scope: string; type: string; defaultBehavior: string; proofInput: string }>;
  proofRequirements: {
    provider: string;
    proofType: string;
    requiredFor: string[];
    tasks: string[];
    output: Record<string, string>;
  };
  deploymentPlan: {
    checklist: string[];
    initCallsPlan: Array<{ call: string; purpose?: string; role?: string; scope?: string }>;
  };
  missingInputs: string[];
  warnings: string[];
  publicSummary: string;
};

function shortAddress(address: string) {
  if (!address || !address.startsWith("0x") || address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

export default function B20SkillDemoClient() {
  const [requestText, setRequestText] = useState(JSON.stringify(sampleRequest, null, 2));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleSummary = useMemo(() => preview?.rolesConfig.slice(0, 5) ?? [], [preview]);
  const policySummary = useMemo(() => preview?.policyConfig.slice(0, 4) ?? [], [preview]);

  async function runPreview() {
    setLoading(true);
    setError("");
    try {
      const payload = JSON.parse(requestText);
      const res = await fetch("/api/agent/b20/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview failed.");
      setPreview(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or preview failed.");
    } finally {
      setLoading(false);
    }
  }

  function resetSample() {
    setRequestText(JSON.stringify(sampleRequest, null, 2));
    setError("");
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>AI2Human Network / B20 Skills</span>
          <h1>Turn an agent request into a B20 proof-to-policy plan.</h1>
          <p>
            The skill converts a natural-language token request into token config, roles, policy scopes,
            proof requirements, and a Base deployment checklist.
          </p>
          <div className={styles.heroActions}>
            <button type="button" onClick={runPreview} className={styles.primaryButton}>
              {loading ? "Generating..." : "Generate Preview"}
            </button>
            <Link href="/agent/b20-skill.md" className={styles.secondaryButton}>
              Open skill.md
            </Link>
          </div>
        </div>

        <aside className={styles.proofCard}>
          <span>Base Sepolia proof</span>
          <strong>A2HP deployed</strong>
          <code>0xb200000000000000000000eaE911AAD5435c86F3</code>
          <Link
            href="https://sepolia.basescan.org/address/0xb200000000000000000000eaE911AAD5435c86F3"
            target="_blank"
          >
            View on BaseScan
          </Link>
        </aside>
      </header>

      <div className={styles.flow}>
        <span>Agent request</span>
        <span>B20 config</span>
        <span>Roles + policies</span>
        <span>AI2Human proof</span>
        <span>Deploy checklist</span>
      </div>

      <div className={styles.workspace}>
        <section className={styles.inputPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span>Input</span>
              <h2>Agent token request</h2>
            </div>
            <button type="button" onClick={resetSample} className={styles.ghostButton}>
              Reset sample
            </button>
          </div>
          <textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            spellCheck={false}
            className={styles.textarea}
          />
          {error && <p className={styles.error}>{error}</p>}
        </section>

        <section className={styles.outputPanel}>
          {!preview ? (
            <div className={styles.emptyState}>
              <span>Preview is ready to run</span>
              <h2>Click Generate Preview.</h2>
              <p>
                OpenClaw or any agent can call the same endpoint and receive the same machine-readable plan.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.verdictRow}>
                <div>
                  <span>Skill output</span>
                  <h2>{preview.tokenConfig.symbol} / {preview.tokenConfig.variant}</h2>
                </div>
                <strong className={preview.ok ? styles.okBadge : styles.warnBadge}>
                  {preview.ok ? "Ready" : "Needs inputs"}
                </strong>
              </div>

              <div className={styles.metricsGrid}>
                <div>
                  <span>Supply cap</span>
                  <strong>{preview.tokenConfig.supplyCap}</strong>
                </div>
                <div>
                  <span>Decimals</span>
                  <strong>{preview.tokenConfig.decimals}</strong>
                </div>
                <div>
                  <span>Admin</span>
                  <strong>{shortAddress(preview.tokenConfig.initialAdmin)}</strong>
                </div>
              </div>

              <div className={styles.resultGrid}>
                <article>
                  <h3>Roles</h3>
                  {roleSummary.map((role) => (
                    <p key={role.role}>
                      <strong>{role.role}</strong>
                      <span>{shortAddress(role.assignee)}</span>
                    </p>
                  ))}
                </article>
                <article>
                  <h3>Policies</h3>
                  {policySummary.map((policy) => (
                    <p key={policy.scope}>
                      <strong>{policy.scope}</strong>
                      <span>{policy.type}</span>
                    </p>
                  ))}
                </article>
                <article>
                  <h3>Proof requirements</h3>
                  {preview.proofRequirements.requiredFor.map((item) => (
                    <p key={item}>
                      <strong>{item}</strong>
                      <span>{preview.proofRequirements.provider}</span>
                    </p>
                  ))}
                </article>
                <article>
                  <h3>Deploy checklist</h3>
                  {preview.deploymentPlan.checklist.slice(0, 5).map((item) => (
                    <p key={item}>
                      <strong>{item}</strong>
                    </p>
                  ))}
                </article>
              </div>

              <div className={styles.summaryBox}>
                <span>Public summary</span>
                <p>{preview.publicSummary}</p>
              </div>
            </>
          )}
        </section>
      </div>

      <section className={styles.openClaw}>
        <div>
          <span>OpenClaw test path</span>
          <h2>Ask OpenClaw to install/read the skill, then preview a B20 request.</h2>
        </div>
        <pre>{`Read https://ai2human.work/agent/b20-skill.md
Then call:
POST https://ai2human.work/api/agent/b20/preview
with the example at:
https://ai2human.work/agent/b20/examples/rwa-community-token.json`}</pre>
      </section>
    </section>
  );
}
