"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./b20Skill.module.css";

const proofTokenAddress = "0xb200000000000000000000eaE911AAD5435c86F3";

const examples = [
  {
    id: "rwa",
    label: "RWA community",
    summary: "Members need proof before minting or receiving the token.",
    prompt:
      "Create a B20 token for a verified RWA community. Max supply 1,000,000. Only verified members can mint. Admin can freeze risky addresses. Require AI2Human proof before role assignment.",
    token: {
      variant: "ASSET",
      name: "Verified RWA Community",
      symbol: "VRWA",
      decimals: 18,
      maxSupply: "1000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://REQUESTER_METADATA_URI",
      useCase: "rwa-community"
    }
  },
  {
    id: "stablecoin",
    label: "Local stablecoin",
    summary: "Minting requires reserve, issuer, and treasury operator proof.",
    prompt:
      "Create a B20 stablecoin for a local USD reserve program. Only verified treasury operators can mint. Require reserve proof before minting and block risky receivers.",
    token: {
      variant: "STABLECOIN",
      name: "Verified Local Dollar",
      symbol: "VLUSD",
      decimals: 6,
      maxSupply: "5000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://RESERVE_METADATA_URI",
      useCase: "local-stablecoin"
    }
  },
  {
    id: "agent",
    label: "Agent access",
    summary: "Only wallets with verified work proof receive token access.",
    prompt:
      "Create a B20 token for an agent network. Only accounts with verified work proof can receive tokens. Operators can pause transfers when suspicious activity is found.",
    token: {
      variant: "ASSET",
      name: "Agent Work Proof Token",
      symbol: "AWP",
      decimals: 18,
      maxSupply: "10000000",
      initialAdmin: "0x1111111111111111111111111111111111111111",
      contractURI: "ipfs://AGENT_NETWORK_METADATA_URI",
      useCase: "verified-community"
    }
  }
];

function buildRequest(example = examples[0], intent = example.prompt) {
  return {
    intent,
    requesterName: "AI2Human Example Issuer",
    requesterHandle: "@ai2humannetwork",
    token: example.token,
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
        "Verify member, issuer, operator, or reserve eligibility.",
        "Collect document, entity, location, reserve, or community proof.",
        "Review proof before adding the wallet to a B20 allowlist or assigning a role.",
        "Return a memo-ready proof hash for downstream B20 operations."
      ]
    }
  };
}

type Preview = {
  ok: boolean;
  tokenConfig: {
    variant: string;
    name: string;
    symbol: string;
    decimals: number;
    supplyCap: string;
    initialAdmin: string;
    saltHint?: string;
    factory?: {
      method: string;
      addressDerivation: string;
    };
  };
  rolesConfig: Array<{ role: string; assignee: string; reason: string }>;
  policyConfig: Array<{
    scope: string;
    type: string;
    defaultBehavior: string;
    proofInput: string;
    policyId?: string;
  }>;
  proofRequirements: {
    provider: string;
    proofType: string;
    requiredFor: string[];
    tasks: string[];
    output: Record<string, string>;
    optionalTaskTemplate?: {
      title: string;
      blockedHumanStep: string;
      completionLoop: string;
    };
  };
  deploymentPlan: {
    checklist: string[];
    initCallsPlan: Array<{ call: string; purpose?: string; role?: string; scope?: string }>;
  };
  missingInputs: string[];
  publicSummary: string;
};

type Mode = "plan" | "proof" | "deploy";

function shortAddress(address: string) {
  if (!address || !address.startsWith("0x") || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: string | number) {
  const numeric = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-US").format(numeric);
}

function humanScope(scope: string) {
  const labels: Record<string, string> = {
    MINT_RECEIVER_POLICY: "Mint receiver",
    TRANSFER_RECEIVER_POLICY: "Transfer receiver",
    TRANSFER_SENDER_POLICY: "Transfer sender",
    TRANSFER_EXECUTOR_POLICY: "Transfer executor"
  };
  return labels[scope] || scope.replaceAll("_", " ");
}

function compactRole(role: string) {
  return role.replaceAll("_", " ").replace("ROLE", "").trim();
}

export default function B20SkillDemoClient() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [prompt, setPrompt] = useState(examples[0].prompt);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mode, setMode] = useState<Mode>("plan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const selected = examples[selectedExample];
  const request = useMemo(() => buildRequest(selected, prompt), [selected, prompt]);
  const roleSummary = preview?.rolesConfig.slice(0, 8) ?? [];
  const policySummary = preview?.policyConfig.slice(0, 4) ?? [];
  const initCalls = preview?.deploymentPlan.initCallsPlan.slice(0, 8) ?? [];
  const rawPayload = useMemo(() => JSON.stringify(request, null, 2), [request]);

  async function runPreview(nextMode: Mode = "plan") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/agent/b20/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview failed.");
      setPreview(json);
      setMode(nextMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate B20 plan.");
    } finally {
      setLoading(false);
    }
  }

  function chooseExample(index: number) {
    setSelectedExample(index);
    setPrompt(examples[index].prompt);
    setCopied("");
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  useEffect(() => {
    void runPreview("plan");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>A2H</span>
          <strong>AI2Human B20 Skill</strong>
        </Link>
        <nav className={styles.links} aria-label="B20 resources">
          <Link href="/agent/b20-skill.md">Skill</Link>
          <Link href="/agent/b20/openclaw-test.md">OpenClaw</Link>
          <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
            BaseScan
          </Link>
        </nav>
      </header>

      <main className={styles.console}>
        <section className={styles.intro}>
          <div>
            <span className={styles.kicker}>B20 Proof Engine</span>
            <h1>Launch B20 tokens with proof built into the rules.</h1>
            <p>
              Agents describe what they want. AI2Human turns it into token config, role controls, policy gates,
              proof requirements, and a deployable operating checklist.
            </p>
            <div className={styles.introActions}>
              <button type="button" onClick={() => runPreview("plan")} className={styles.primaryButton}>
                {loading ? "Generating..." : "Generate B20 plan"}
              </button>
              <button type="button" onClick={() => setMode("proof")} className={styles.secondaryButton}>
                View proof gate
              </button>
            </div>
          </div>
          <div className={styles.receiptStrip}>
            <p><span>Live test token</span><strong>A2HP</strong></p>
            <p><span>Base Sepolia</span><strong>{shortAddress(proofTokenAddress)}</strong></p>
            <p><span>Skill output</span><strong>Proof to policy</strong></p>
          </div>
        </section>

        <section className={styles.cockpit}>
          <aside className={styles.composer}>
            <div className={styles.panelHead}>
              <span className={styles.kicker}>1. Describe</span>
              <h2>What should the token enforce?</h2>
            </div>

            <div className={styles.presets}>
              {examples.map((example, index) => (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => chooseExample(index)}
                  className={selectedExample === index ? styles.presetActive : styles.preset}
                >
                  <strong>{example.label}</strong>
                  <span>{example.summary}</span>
                </button>
              ))}
            </div>

            <label className={styles.promptBox}>
              <span>Agent prompt</span>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>

            <div className={styles.actions}>
              <button type="button" onClick={() => runPreview("plan")} className={styles.primaryButton}>
                {loading ? "Generating..." : "Generate B20 plan"}
              </button>
              <button type="button" onClick={() => copyText("payload", rawPayload)} className={styles.secondaryButton}>
                {copied === "payload" ? "Copied" : "Copy API payload"}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </aside>

          <section className={styles.output}>
            <div className={styles.modeTabs}>
              <button type="button" onClick={() => setMode("plan")} className={mode === "plan" ? styles.modeActive : styles.mode}>
                Token plan
              </button>
              <button type="button" onClick={() => setMode("proof")} className={mode === "proof" ? styles.modeActive : styles.mode}>
                Proof gate
              </button>
              <button type="button" onClick={() => setMode("deploy")} className={mode === "deploy" ? styles.modeActive : styles.mode}>
                Deploy path
              </button>
            </div>

            {mode === "plan" && preview && (
              <div className={styles.planView}>
                <article className={styles.tokenCard}>
                  <span className={styles.kicker}>2. Token blueprint</span>
                  <div className={styles.tokenSymbol}>{preview.tokenConfig.symbol}</div>
                  <h2>{preview.tokenConfig.name}</h2>
                  <div className={styles.tokenStats}>
                    <p><span>Variant</span><strong>{preview.tokenConfig.variant}</strong></p>
                    <p><span>Supply cap</span><strong>{formatNumber(preview.tokenConfig.supplyCap)}</strong></p>
                    <p><span>Decimals</span><strong>{preview.tokenConfig.decimals}</strong></p>
                    <p><span>Admin</span><strong>{shortAddress(preview.tokenConfig.initialAdmin)}</strong></p>
                  </div>
                </article>

                <article className={styles.rulesCard}>
                  <span className={styles.kicker}>3. Native B20 controls</span>
                  <div className={styles.rulesGrid}>
                    {roleSummary.map((role) => (
                      <p key={role.role}>
                        <strong>{compactRole(role.role)}</strong>
                        <span>{shortAddress(role.assignee)}</span>
                      </p>
                    ))}
                  </div>
                </article>

                <article className={styles.policyCard}>
                  <span className={styles.kicker}>4. Policy gates</span>
                  {policySummary.map((policy) => (
                    <p key={policy.scope}>
                      <strong>{humanScope(policy.scope)}</strong>
                      <span>{policy.type}</span>
                      <em>{policy.defaultBehavior}</em>
                    </p>
                  ))}
                </article>
              </div>
            )}

            {mode === "proof" && preview && (
              <div className={styles.proofView}>
                <article className={styles.proofCard}>
                  <span className={styles.kicker}>AI2Human gate</span>
                  <h2>{preview.proofRequirements.optionalTaskTemplate?.title || "Verify eligibility"}</h2>
                  <p>
                    {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                      "Review evidence before token permissions are granted."}
                  </p>
                </article>

                <article className={styles.timeline}>
                  {preview.proofRequirements.tasks.map((task, index) => (
                    <p key={task}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{task}</strong>
                    </p>
                  ))}
                </article>

                <article className={styles.outputBundle}>
                  <span className={styles.kicker}>Structured proof bundle</span>
                  {Object.entries(preview.proofRequirements.output).map(([key, value]) => (
                    <p key={key}>
                      <strong>{key}</strong>
                      <span>{value}</span>
                    </p>
                  ))}
                </article>
              </div>
            )}

            {mode === "deploy" && preview && (
              <div className={styles.deployView}>
                <article className={styles.deployCard}>
                  <span className={styles.kicker}>Base Sepolia receipt</span>
                  <h2>A2HP proof token is live.</h2>
                  <code>{proofTokenAddress}</code>
                  <div className={styles.actions}>
                    <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
                      Open BaseScan
                    </Link>
                    <button type="button" onClick={() => copyText("address", proofTokenAddress)} className={styles.secondaryButton}>
                      {copied === "address" ? "Copied" : "Copy address"}
                    </button>
                  </div>
                </article>

                <article className={styles.callStack}>
                  <span className={styles.kicker}>Generated init path</span>
                  {initCalls.map((call, index) => (
                    <p key={`${call.call}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{call.call}</strong>
                      <em>{call.purpose || call.role || call.scope}</em>
                    </p>
                  ))}
                </article>
              </div>
            )}
          </section>

          <aside className={styles.explainer}>
            <span className={styles.kicker}>Why this is useful</span>
            <h2>B20 has rules. AI2Human supplies the proof those rules depend on.</h2>
            <div className={styles.loop}>
              <p><strong>Agent request</strong><span>“Create this token system.”</span></p>
              <p><strong>Human / agent verification</strong><span>Check entity, reserve, member, location, work, or policy evidence.</span></p>
              <p><strong>Structured proof</strong><span>Return verdict, proof hash, reviewer, evidence URI.</span></p>
              <p><strong>B20 action</strong><span>Mint, allowlist, assign role, pause, freeze, or attach memo.</span></p>
            </div>
          </aside>
        </section>
      </main>
    </section>
  );
}
