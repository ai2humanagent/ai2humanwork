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
  generatedAt: string;
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
  warnings: string[];
  publicSummary: string;
};

type Stage = "request" | "blueprint" | "proof" | "verify" | "deploy";

const stages: Array<{
  id: Stage;
  eyebrow: string;
  title: string;
  copy: string;
}> = [
  {
    id: "request",
    eyebrow: "01 / Agent intent",
    title: "Agent asks for a token system",
    copy: "A normal agent prompt becomes a structured issuance request instead of a loose instruction."
  },
  {
    id: "blueprint",
    eyebrow: "02 / B20 blueprint",
    title: "AI2Human generates the rules",
    copy: "Token params, roles, supply cap, policies, and init-call plan are produced for review."
  },
  {
    id: "proof",
    eyebrow: "03 / Proof task",
    title: "Verification becomes part of issuance",
    copy: "The request creates explicit proof requirements before mint eligibility or role assignment."
  },
  {
    id: "verify",
    eyebrow: "04 / Policy gate",
    title: "Approved proof unlocks token permissions",
    copy: "Verified accounts can be added to allowlists, roles, or mint flows with a proof hash."
  },
  {
    id: "deploy",
    eyebrow: "05 / Onchain receipt",
    title: "The token address is the receipt, not the demo",
    copy: "A Base Sepolia B20 proof token shows the pipeline reaches real chain state."
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
  const [activeStage, setActiveStage] = useState<Stage>("request");
  const [proofState, setProofState] = useState<"pending" | "approved">("pending");

  const roleSummary = useMemo(() => preview?.rolesConfig.slice(0, 8) ?? [], [preview]);
  const policySummary = useMemo(() => preview?.policyConfig.slice(0, 4) ?? [], [preview]);
  const initCalls = useMemo(() => preview?.deploymentPlan.initCallsPlan.slice(0, 8) ?? [], [preview]);

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
    setActiveStage("request");
  }

  function approveProof() {
    setProofState("approved");
    setActiveStage("verify");
  }

  useEffect(() => {
    void runPreview("request");
    // The default demo should be pre-warmed; manual edits use the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>AI2Human Network / B20 issuance flow</span>
          <h1>Let an agent create a token with rules, roles, and proof gates.</h1>
          <p>
            The important part is not that we deployed a test token. The important part is the machine
            before it: an agent asks, AI2Human builds the B20 blueprint, verification decides who gets
            access, and the chain receives the final rule set.
          </p>
          <div className={styles.heroActions}>
            <button type="button" onClick={() => runPreview("blueprint")} className={styles.primaryButton}>
              {loading ? "Building flow..." : "Generate issuance flow"}
            </button>
            <button type="button" onClick={() => setActiveStage("proof")} className={styles.secondaryButton}>
              Show proof gate
            </button>
            <Link href="/agent/b20-skill.md" className={styles.ghostButton}>
              Read skill
            </Link>
          </div>
        </div>

        <aside className={styles.receiptCard}>
          <div>
            <span>Live chain receipt</span>
            <strong>A2HP</strong>
            <p>Base Sepolia B20 proof token</p>
          </div>
          <code>{proofTokenAddress}</code>
          <Link
            href={`https://sepolia.basescan.org/address/${proofTokenAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            View BaseScan receipt
          </Link>
        </aside>
      </header>

      <section className={styles.stageRail} aria-label="B20 issuance stages">
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            type="button"
            onClick={() => setActiveStage(stage.id)}
            className={activeStage === stage.id ? styles.stageActive : styles.stageButton}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.title}</strong>
          </button>
        ))}
      </section>

      <main className={styles.issuanceShell}>
        <section className={styles.leftDesk}>
          <div className={styles.panelHeader}>
            <div>
              <span>Agent request</span>
              <h2>Natural language in, issuance blueprint out.</h2>
            </div>
            <button type="button" onClick={resetSample} className={styles.tinyButton}>
              Reset
            </button>
          </div>

          <div className={styles.promptCard}>
            <p>{sampleRequest.intent}</p>
            <div className={styles.promptMeta}>
              <span>Requester: {sampleRequest.requesterName}</span>
              <span>Use case: RWA community</span>
            </div>
          </div>

          <textarea
            value={requestText}
            onChange={(event) => setRequestText(event.target.value)}
            spellCheck={false}
            className={styles.textarea}
            aria-label="B20 agent request JSON"
          />
          {error && <p className={styles.error}>{error}</p>}
        </section>

        <section className={styles.centerStage}>
          <div className={styles.stageHeader}>
            <span>{stages.find((stage) => stage.id === activeStage)?.eyebrow}</span>
            <h2>{stages.find((stage) => stage.id === activeStage)?.title}</h2>
            <p>{stages.find((stage) => stage.id === activeStage)?.copy}</p>
          </div>

          {activeStage === "request" && (
            <div className={styles.showcaseGrid}>
              <article className={styles.bigTile}>
                <span>Plain request</span>
                <h3>Create a token for verified members.</h3>
                <p>
                  The agent does not need to know every B20 role, policy scope, or precompile detail. It asks
                  for the outcome; the skill expands that into a reviewable system.
                </p>
              </article>
              <article className={styles.signalTile}>
                <strong>4</strong>
                <span>policy scopes generated</span>
              </article>
              <article className={styles.signalTile}>
                <strong>8</strong>
                <span>B20 roles mapped</span>
              </article>
            </div>
          )}

          {activeStage === "blueprint" && preview && (
            <>
              <div className={styles.blueprint}>
                <div className={styles.tokenPlate}>
                  <span>B20 token blueprint</span>
                  <h3>{preview.tokenConfig.name}</h3>
                  <div className={styles.tokenStats}>
                    <div>
                      <span>Symbol</span>
                      <strong>{preview.tokenConfig.symbol}</strong>
                    </div>
                    <div>
                      <span>Variant</span>
                      <strong>{preview.tokenConfig.variant}</strong>
                    </div>
                    <div>
                      <span>Max supply</span>
                      <strong>{formatNumber(preview.tokenConfig.supplyCap)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.roleMatrix}>
                  {roleSummary.map((role) => (
                    <div key={role.role}>
                      <strong>{role.role}</strong>
                      <span>{shortAddress(role.assignee)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.policyGrid}>
                {policySummary.map((policy) => (
                  <article key={policy.scope}>
                    <span>{policy.type}</span>
                    <h3>{policy.scope.replaceAll("_", " ")}</h3>
                    <p>{policy.defaultBehavior}</p>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeStage === "proof" && preview && (
            <div className={styles.proofWorkspace}>
              <article className={styles.proofTask}>
                <span>AI2Human proof task</span>
                <h3>{preview.proofRequirements.optionalTaskTemplate?.title || "Verify B20 eligibility"}</h3>
                <p>
                  {preview.proofRequirements.optionalTaskTemplate?.blockedHumanStep ||
                    "Review eligibility evidence before token permissions are granted."}
                </p>
                <button type="button" onClick={approveProof} className={styles.primaryButton}>
                  Approve sample proof
                </button>
              </article>
              <div className={styles.proofChecklist}>
                {preview.proofRequirements.tasks.map((task) => (
                  <div key={task}>
                    <i />
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeStage === "verify" && preview && (
            <div className={styles.verificationBoard}>
              <div className={proofState === "approved" ? styles.approvedStamp : styles.pendingStamp}>
                <span>Proof status</span>
                <strong>{proofState === "approved" ? "Approved" : "Needs review"}</strong>
              </div>
              <div className={styles.proofOutput}>
                {Object.entries(preview.proofRequirements.output).map(([key, value]) => (
                  <p key={key}>
                    <strong>{key}</strong>
                    <span>{value}</span>
                  </p>
                ))}
              </div>
              <p className={styles.bridgeLine}>
                Approved proof becomes the input for allowlist membership, role assignment, or memo-linked token
                operations.
              </p>
            </div>
          )}

          {activeStage === "deploy" && preview && (
            <div className={styles.deployBoard}>
              <div className={styles.deployedToken}>
                <span>Base Sepolia proof token</span>
                <h3>A2HP is already deployed</h3>
                <code>{proofTokenAddress}</code>
                <Link
                  href={`https://sepolia.basescan.org/address/${proofTokenAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open on BaseScan
                </Link>
              </div>
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

        <aside className={styles.rightInspector}>
          <div className={styles.inspectorTop}>
            <span>What is the product?</span>
            <h2>Not a token address. A proof-to-policy engine.</h2>
            <p>
              B20 gives tokens native rules. AI2Human gives those rules verified inputs before accounts receive
              roles, mint access, or allowlist status.
            </p>
          </div>

          <div className={styles.outcomeList}>
            <div>
              <strong>For agents</strong>
              <span>Ask for a token system in plain English.</span>
            </div>
            <div>
              <strong>For issuers</strong>
              <span>Review roles, supply caps, policies, and proof gates before deploy.</span>
            </div>
            <div>
              <strong>For users</strong>
              <span>Token access follows visible verification rules, not hidden admin promises.</span>
            </div>
          </div>

          {preview && (
            <div className={styles.machineSummary}>
              <span>Machine-readable output</span>
              <p>{preview.publicSummary}</p>
              <Link href="/agent/b20/openclaw-test.md">OpenClaw test prompt</Link>
            </div>
          )}
        </aside>
      </main>

      <section className={styles.openClaw}>
        <div>
          <span>OpenClaw path</span>
          <h2>Any agent can read the skill and produce the same issuance bundle.</h2>
        </div>
        <pre>{`Read https://ai2human.work/agent/b20-skill.md
Then call:
POST https://ai2human.work/api/agent/b20/preview
with:
https://ai2human.work/agent/b20/examples/rwa-community-token.json`}</pre>
      </section>
    </section>
  );
}
