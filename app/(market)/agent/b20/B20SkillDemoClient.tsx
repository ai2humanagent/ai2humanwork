"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./b20Skill.module.css";

const proofTokenAddress = "0xb200000000000000000000eaE911AAD5435c86F3";

const examples = [
  {
    label: "Verified community",
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
    label: "Local stablecoin",
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
    label: "Agent access token",
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

function buildRequest(example = examples[0]) {
  return {
    intent: example.prompt,
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
        "Verify member, issuer, or operator eligibility.",
        "Collect document, entity, location, reserve, or community proof.",
        "Review proof before adding the account to a B20 allowlist or assigning a role.",
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

type WorkMode = "overview" | "builder" | "proof" | "deploy";

function shortAddress(address: string) {
  if (!address || !address.startsWith("0x") || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: string | number) {
  const numeric = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-US").format(numeric);
}

function stringifyRequest(request: ReturnType<typeof buildRequest>) {
  return JSON.stringify(request, null, 2);
}

function humanScope(scope: string) {
  return scope
    .replace("MINT_RECEIVER_POLICY", "Who can receive newly minted tokens")
    .replace("TRANSFER_RECEIVER_POLICY", "Who can receive transfers")
    .replace("TRANSFER_SENDER_POLICY", "Who is blocked from sending")
    .replace("TRANSFER_EXECUTOR_POLICY", "Who is blocked from executing transfers");
}

export default function B20SkillDemoClient() {
  const [selectedExample, setSelectedExample] = useState(0);
  const [requestText, setRequestText] = useState(stringifyRequest(buildRequest(examples[0])));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<WorkMode>("overview");
  const [copied, setCopied] = useState(false);

  const roleSummary = useMemo(() => preview?.rolesConfig.slice(0, 8) ?? [], [preview]);
  const policySummary = useMemo(() => preview?.policyConfig.slice(0, 4) ?? [], [preview]);
  const initCalls = useMemo(() => preview?.deploymentPlan.initCallsPlan.slice(0, 7) ?? [], [preview]);
  const taskCount = preview?.proofRequirements.tasks.length ?? 4;

  async function runPreview(nextMode: WorkMode = "builder") {
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
      setMode(nextMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or preview failed.");
      setMode("builder");
    } finally {
      setLoading(false);
    }
  }

  function loadExample(index: number) {
    setSelectedExample(index);
    setRequestText(stringifyRequest(buildRequest(examples[index])));
    setCopied(false);
    setError("");
  }

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    void runPreview("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.topBar}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>A2H</span>
          <span>
            <strong>AI2Human B20 Skill</strong>
            <em>Proof-to-policy builder on Base</em>
          </span>
        </Link>
        <nav className={styles.resourceLinks} aria-label="B20 resources">
          <Link href="/agent/b20-skill.md">Skill file</Link>
          <Link href="/agent/b20/openclaw-test.md">OpenClaw test</Link>
          <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
            Test token
          </Link>
        </nav>
      </header>

      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>B20 + AI agents + human proof</span>
            <h1>Build a proof-gated B20 token from one agent prompt.</h1>
            <p>
              Describe the token you want. AI2Human turns it into B20 supply rules, admin roles, allowlists,
              proof requirements, and a deployment checklist that agents and builders can actually use.
            </p>
            <div className={styles.heroUseCases} aria-label="B20 skill outcomes">
              <p><strong>Token config</strong><span>Name, symbol, decimals, supply cap, variant.</span></p>
              <p><strong>Access rules</strong><span>Who can mint, receive, pause, freeze, or manage roles.</span></p>
              <p><strong>Proof gate</strong><span>What AI2Human must verify before permissions unlock.</span></p>
            </div>
            <div className={styles.heroActions}>
              <button type="button" onClick={() => runPreview("builder")} className={styles.primaryButton}>
                {loading ? "Generating..." : "Generate my B20 plan"}
              </button>
              <button type="button" onClick={() => setMode("proof")} className={styles.secondaryButton}>
                See proof gate
              </button>
            </div>
          </div>

          <div className={styles.productCard} aria-label="Generated B20 product preview">
            <div className={styles.tokenOrb}>
              <span>{preview?.tokenConfig.symbol || "B20"}</span>
              <strong>{preview?.tokenConfig.variant || "ASSET"}</strong>
            </div>
            <div className={styles.productMetrics}>
              <p><span>Supply cap</span><strong>{formatNumber(preview?.tokenConfig.supplyCap || "1000000")}</strong></p>
              <p><span>Roles generated</span><strong>{roleSummary.length || 8}</strong></p>
              <p><span>Policy gates</span><strong>{policySummary.length || 4}</strong></p>
              <p><span>Proof tasks</span><strong>{taskCount}</strong></p>
            </div>
          </div>
        </section>

        <section className={styles.plainEnglish}>
          <article>
            <span>01</span>
            <h2>Describe the token</h2>
            <p>Ask for a community token, RWA token, local stablecoin, or agent access token in normal language.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Generate B20 controls</h2>
            <p>The skill creates supply caps, admin roles, mint roles, pause roles, allowlists, and blocklists.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Require proof first</h2>
            <p>AI2Human defines what must be checked before a wallet receives access or token permissions.</p>
          </article>
          <article>
            <span>04</span>
            <h2>Deploy and operate</h2>
            <p>Use the checklist and init calls to deploy, then attach proof hashes to sensitive token actions.</p>
          </article>
        </section>

        <section className={styles.workbench}>
          <aside className={styles.inputPane}>
            <div className={styles.paneHeader}>
              <span className={styles.eyebrow}>Step 1 · agent request</span>
              <h2>What should the token do?</h2>
              <p>Pick a common use case or paste the exact request you want an agent to understand.</p>
            </div>

            <div className={styles.exampleTabs}>
              {examples.map((example, index) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => loadExample(index)}
                  className={selectedExample === index ? styles.exampleActive : styles.exampleButton}
                >
                  {example.label}
                </button>
              ))}
            </div>

            <textarea
              value={requestText}
              onChange={(event) => setRequestText(event.target.value)}
              spellCheck={false}
              aria-label="B20 agent request JSON"
            />

            <div className={styles.inputActions}>
              <button type="button" onClick={() => runPreview("builder")} className={styles.primaryButton}>
                {loading ? "Generating..." : "Run skill"}
              </button>
              <button type="button" onClick={copyPayload} className={styles.secondaryButton}>
                {copied ? "Copied" : "Copy payload"}
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </aside>

          <section className={styles.outputPane}>
            <div className={styles.modeTabs}>
              {[
                ["overview", "Overview"],
                ["builder", "B20 plan"],
                ["proof", "Proof gate"],
                ["deploy", "Deploy"]
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id as WorkMode)}
                  className={mode === id ? styles.modeActive : styles.modeButton}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "overview" && (
              <div className={styles.overviewGrid}>
                <article className={styles.bigExplanation}>
                  <span className={styles.eyebrow}>What this page does</span>
                  <h2>It turns a token idea into a reviewable machine plan.</h2>
                  <p>
                    A normal user sees a simple flow. A developer gets the exact B20 configuration pieces:
                    token parameters, roles, policy scopes, proof requirements, and deployment checklist.
                  </p>
                </article>
                <article className={styles.userFlow}>
                  <h3>User-facing flow</h3>
                  <p><strong>1. User requests access</strong><span>Wallet, entity, reserve, membership, or work proof.</span></p>
                  <p><strong>2. AI2Human verifies proof</strong><span>The result becomes structured, reviewable evidence.</span></p>
                  <p><strong>3. B20 policy changes</strong><span>The wallet can mint, receive, transfer, or hold a role only after approval.</span></p>
                </article>
              </div>
            )}

            {mode === "builder" && preview && (
              <div className={styles.planGrid}>
                <article className={styles.passport}>
                  <span className={styles.eyebrow}>Generated token passport</span>
                  <h2>{preview.tokenConfig.name}</h2>
                  <div>
                    <p><span>Symbol</span><strong>{preview.tokenConfig.symbol}</strong></p>
                    <p><span>Variant</span><strong>{preview.tokenConfig.variant}</strong></p>
                    <p><span>Supply</span><strong>{formatNumber(preview.tokenConfig.supplyCap)}</strong></p>
                    <p><span>Admin</span><strong>{shortAddress(preview.tokenConfig.initialAdmin)}</strong></p>
                  </div>
                </article>

                <article className={styles.roleList}>
                  <h3>Who controls what</h3>
                  {roleSummary.map((role) => (
                    <p key={role.role}>
                      <strong>{role.role.replaceAll("_", " ")}</strong>
                      <span>{shortAddress(role.assignee)}</span>
                    </p>
                  ))}
                </article>

                <article className={styles.policyList}>
                  <h3>Rules that B20 enforces</h3>
                  {policySummary.map((policy) => (
                    <p key={policy.scope}>
                      <strong>{humanScope(policy.scope)}</strong>
                      <span>{policy.type}: {policy.defaultBehavior}</span>
                    </p>
                  ))}
                </article>
              </div>
            )}

            {mode === "proof" && preview && (
              <div className={styles.proofGrid}>
                <article className={styles.proofHero}>
                  <span className={styles.eyebrow}>AI2Human proof gate</span>
                  <h2>{preview.proofRequirements.optionalTaskTemplate?.title || "Verify B20 eligibility"}</h2>
                  <p>
                    {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                      "Review eligibility evidence before token permissions are granted."}
                  </p>
                </article>
                <article className={styles.proofTasks}>
                  <h3>What must be checked</h3>
                  {preview.proofRequirements.tasks.map((task) => (
                    <p key={task}><span />{task}</p>
                  ))}
                </article>
                <article className={styles.proofOutput}>
                  <h3>What the token system receives</h3>
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
              <div className={styles.deployGrid}>
                <article className={styles.receiptCard}>
                  <span className={styles.eyebrow}>Base Sepolia proof token</span>
                  <h2>A2HP is live</h2>
                  <code>{proofTokenAddress}</code>
                  <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
                    View on BaseScan
                  </Link>
                </article>
                <article className={styles.callStack}>
                  <h3>Deployment checklist preview</h3>
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
        </section>

        <section className={styles.bottomRail}>
          <article>
            <span className={styles.eyebrow}>Why AI2Human matters here</span>
            <h2>B20 has native rules. Those rules still need trusted inputs.</h2>
            <p>
              AI2Human is the layer that turns external checks, community eligibility, issuer review, reserve proof,
              work proof, or suspicious-account review into structured evidence that token systems can use.
            </p>
          </article>
          <article>
            <span className={styles.eyebrow}>For agents</span>
            <h2>One command becomes a full token operating plan.</h2>
            <p>
              Agents can ask for a token system and receive a machine-readable plan with parameters, roles, policies,
              proof gates, and a deployment path.
            </p>
          </article>
        </section>
      </main>
    </section>
  );
}
