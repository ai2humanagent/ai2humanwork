"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./b20Skill.module.css";

const proofTokenAddress = "0xb200000000000000000000eaE911AAD5435c86F3";

const sampleRequest = {
  intent:
    "Create a B20 token for a verified RWA community. Max supply 1,000,000. Only verified members can mint. Admin can freeze risky addresses. Require AI2Human proof before role assignment.",
  requesterName: "Example RWA Community",
  requesterHandle: "@ai2humannetwork",
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

type Stage = "request" | "blueprint" | "proof" | "verify" | "deploy";

const stages: Array<{ id: Stage; label: string; title: string; copy: string }> = [
  {
    id: "request",
    label: "Intent",
    title: "Agent request captured",
    copy: "A single prompt is converted into a structured token issuance request."
  },
  {
    id: "blueprint",
    label: "Blueprint",
    title: "B20 rules generated",
    copy: "Token parameters, role assignments, policy scopes, and init calls are ready for review."
  },
  {
    id: "proof",
    label: "Proof",
    title: "AI2Human verification task",
    copy: "The system defines what must be verified before access is granted."
  },
  {
    id: "verify",
    label: "Gate",
    title: "Proof unlocks permissions",
    copy: "Approved proof becomes the input for allowlists, roles, or memo-linked token actions."
  },
  {
    id: "deploy",
    label: "Receipt",
    title: "Base Sepolia receipt",
    copy: "The deployed B20 proof token is the receipt of the pipeline."
  }
];

function shortAddress(address: string) {
  if (!address || !address.startsWith("0x") || address.length < 12) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatNumber(value: string | number) {
  const numeric = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat("en-US").format(numeric);
}

function stringifyRequest(request: typeof sampleRequest) {
  return JSON.stringify(request, null, 2);
}

export default function B20SkillDemoClient() {
  const [requestText, setRequestText] = useState(stringifyRequest(sampleRequest));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState<Stage>("blueprint");
  const [proofState, setProofState] = useState<"pending" | "approved">("pending");

  const roleSummary = useMemo(() => preview?.rolesConfig.slice(0, 8) ?? [], [preview]);
  const policySummary = useMemo(() => preview?.policyConfig.slice(0, 4) ?? [], [preview]);
  const initCalls = useMemo(() => preview?.deploymentPlan.initCallsPlan.slice(0, 7) ?? [], [preview]);
  const activeStageMeta = stages.find((stage) => stage.id === activeStage) || stages[0];

  async function runPreview(nextStage: Stage = "blueprint") {
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
      setActiveStage(nextStage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or preview failed.");
      setActiveStage("request");
    } finally {
      setLoading(false);
    }
  }

  function resetSample() {
    setRequestText(stringifyRequest(sampleRequest));
    setError("");
    setProofState("pending");
    void runPreview("blueprint");
  }

  function approveProof() {
    setProofState("approved");
    setActiveStage("verify");
  }

  useEffect(() => {
    void runPreview("blueprint");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.commandBar}>
        <div>
          <span className={styles.kicker}>AI2Human Network</span>
          <h1>B20 Issuance Flow</h1>
        </div>
        <nav className={styles.topLinks} aria-label="B20 resources">
          <Link href="/agent/b20-skill.md">Skill</Link>
          <Link href="/agent/b20/openclaw-test.md">OpenClaw</Link>
          <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
            BaseScan
          </Link>
        </nav>
      </header>

      <section className={styles.heroWorkbench}>
        <div className={styles.agentConsole}>
          <span className={styles.kicker}>Agent command</span>
          <p>{sampleRequest.intent}</p>
          <div className={styles.commandActions}>
            <button type="button" onClick={() => runPreview("blueprint")} className={styles.primaryButton}>
              {loading ? "Generating..." : "Generate B20 machine"}
            </button>
            <button type="button" onClick={() => setActiveStage("proof")} className={styles.secondaryButton}>
              Inspect proof gate
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.tokenMachine} aria-label="B20 issuance machine">
          <div className={styles.machineHeader}>
            <span>B20 machine output</span>
            <strong>{preview?.ok ? "Ready" : "Needs inputs"}</strong>
          </div>
          <div className={styles.machineCore}>
            <div className={styles.tokenSeal}>
              <span>{preview?.tokenConfig.symbol || "VRWA"}</span>
              <strong>{preview?.tokenConfig.variant || "ASSET"}</strong>
            </div>
            <div className={styles.machineLines}>
              <p><span>Roles</span><strong>{roleSummary.length || 8}</strong></p>
              <p><span>Policies</span><strong>{policySummary.length || 4}</strong></p>
              <p><span>Proof gates</span><strong>{preview?.proofRequirements.requiredFor.length || 3}</strong></p>
            </div>
          </div>
          <p className={styles.machineCopy}>
            AI2Human turns the request into roles, policy scopes, proof requirements, and deploy steps.
          </p>
        </div>

        <aside className={styles.receipt}>
          <span className={styles.kicker}>Live receipt</span>
          <strong>A2HP</strong>
          <p>Base Sepolia proof token</p>
          <code>{proofTokenAddress}</code>
        </aside>
      </section>

      <section className={styles.stageDock} aria-label="Issuance stages">
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => setActiveStage(stage.id)}
            className={activeStage === stage.id ? styles.stageActive : styles.stageButton}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.label}</strong>
          </button>
        ))}
      </section>

      <main className={styles.workspace}>
        <section className={styles.stagePanel}>
          <div className={styles.stageHeader}>
            <span>{activeStageMeta.label}</span>
            <h2>{activeStageMeta.title}</h2>
            <p>{activeStageMeta.copy}</p>
          </div>

          {activeStage === "request" && (
            <div className={styles.requestView}>
              <div className={styles.transcript}>
                <span>Agent</span>
                <p>{sampleRequest.intent}</p>
              </div>
              <div className={styles.transcript}>
                <span>AI2Human</span>
                <p>Convert this into token config, role map, policy scopes, proof task, and deployment checklist.</p>
              </div>
              <details className={styles.payloadDetails}>
                <summary>Raw agent payload</summary>
                <textarea
                  value={requestText}
                  onChange={(event) => setRequestText(event.target.value)}
                  spellCheck={false}
                  aria-label="B20 agent request JSON"
                />
                <button type="button" onClick={resetSample} className={styles.miniButton}>
                  Reset sample
                </button>
              </details>
            </div>
          )}

          {activeStage === "blueprint" && preview && (
            <div className={styles.blueprintView}>
              <article className={styles.tokenPassport}>
                <span>B20 token passport</span>
                <h3>{preview.tokenConfig.name}</h3>
                <div>
                  <p><span>Symbol</span><strong>{preview.tokenConfig.symbol}</strong></p>
                  <p><span>Supply cap</span><strong>{formatNumber(preview.tokenConfig.supplyCap)}</strong></p>
                  <p><span>Decimals</span><strong>{preview.tokenConfig.decimals}</strong></p>
                </div>
              </article>
              <div className={styles.roleTable}>
                {roleSummary.map((role) => (
                  <p key={role.role}>
                    <strong>{role.role}</strong>
                    <span>{shortAddress(role.assignee)}</span>
                  </p>
                ))}
              </div>
              <div className={styles.policyStrip}>
                {policySummary.map((policy) => (
                  <article key={policy.scope}>
                    <strong>{policy.type}</strong>
                    <span>{policy.scope.replaceAll("_", " ")}</span>
                    <p>{policy.defaultBehavior}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeStage === "proof" && preview && (
            <div className={styles.proofView}>
              <article className={styles.proofTicket}>
                <span>Verification job</span>
                <h3>{preview.proofRequirements.optionalTaskTemplate?.title || "Verify B20 eligibility"}</h3>
                <p>
                  {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                    "Review eligibility evidence before token permissions are granted."}
                </p>
                <button type="button" onClick={approveProof} className={styles.primaryButton}>
                  Approve sample proof
                </button>
              </article>
              <div className={styles.checklist}>
                {preview.proofRequirements.tasks.map((task) => (
                  <p key={task}>
                    <i />
                    <span>{task}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {activeStage === "verify" && preview && (
            <div className={styles.verifyView}>
              <div className={proofState === "approved" ? styles.approved : styles.pending}>
                <span>Proof status</span>
                <strong>{proofState === "approved" ? "Approved" : "Needs review"}</strong>
              </div>
              <div className={styles.proofOutputs}>
                {Object.entries(preview.proofRequirements.output).map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {activeStage === "deploy" && preview && (
            <div className={styles.deployView}>
              <article className={styles.chainReceipt}>
                <span>Base Sepolia</span>
                <h3>A2HP deployed</h3>
                <code>{proofTokenAddress}</code>
                <Link href={`https://sepolia.basescan.org/address/${proofTokenAddress}`} target="_blank" rel="noreferrer">
                  View token receipt
                </Link>
              </article>
              <div className={styles.callStack}>
                {initCalls.map((call, index) => (
                  <p key={`${call.call}-${index}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{call.call}</strong>
                    <em>{call.purpose || call.role || call.scope}</em>
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className={styles.sideRail}>
          <div className={styles.sideBlock}>
            <span>What users should understand</span>
            <h2>AI agents can request token systems with verification built in.</h2>
            <p>
              The token is not the magic trick. The magic trick is the path from request to rules to proof to
              policy-controlled token access.
            </p>
          </div>
          <div className={styles.sideList}>
            <p><strong>Agent</strong><span>Describes the token system.</span></p>
            <p><strong>AI2Human</strong><span>Builds proof and policy gates.</span></p>
            <p><strong>B20</strong><span>Receives native roles, caps, policies, and receipt.</span></p>
          </div>
          <div className={styles.openClawBox}>
            <span>OpenClaw test</span>
            <code>POST /api/agent/b20/preview</code>
            <Link href="/agent/b20/openclaw-test.md">Open test prompt</Link>
          </div>
        </aside>
      </main>
    </section>
  );
}
