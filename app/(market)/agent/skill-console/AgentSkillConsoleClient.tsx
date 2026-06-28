"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./agentSkillConsole.module.css";

type PresetId = "human" | "lucky-test" | "lucky-production";

type ConsoleResponse = {
  success?: boolean;
  readyToCreate?: boolean;
  readyToPublish?: boolean;
  missingInputs?: string[];
  nextQuestions?: Array<{ field: string; question: string }>;
  fundingPlan?: {
    fundingMode?: string;
    environment?: string;
    payoutDisabled?: boolean;
    createsManagedPrizePool?: boolean;
    fundingInvoice?: {
      amount?: string;
      recipientAddress?: string;
      tokenSymbol?: string;
      network?: string;
      nextAction?: string;
    };
  };
  contractPreflight?: {
    required?: boolean;
    ok?: boolean;
    status?: string;
    issues?: string[];
  };
  preview?: {
    title?: string;
    budget?: string;
    deadline?: string;
    taskState?: string;
    acceptance?: string;
    campaign?: {
      action?: string;
      requesterName?: string;
      requesterHandle?: string;
    };
  };
  task?: {
    id?: string;
    title?: string;
    taskState?: string;
    campaign?: {
      agentLifecycle?: {
        status?: string;
        fundingPlan?: ConsoleResponse["fundingPlan"];
        contractPreflight?: ConsoleResponse["contractPreflight"];
      };
    };
  };
  error?: string;
};

const defaultLinks = {
  followHandle: "@ai2humannetwork",
  telegramUrl: "https://t.me/ai2human",
  repostUrl: "https://x.com/ai2humannetwork/status/2067961312978538825",
  likeUrl: "https://x.com/ai2humannetwork/status/2068623421785673960"
};

const presets: Record<PresetId, { label: string; summary: string; payload: Record<string, unknown> }> = {
  human: {
    label: "Human fallback task",
    summary: "A normal agent request that needs a real account, screenshot proof, and review.",
    payload: {
      templateId: "x_light_engagement",
      requesterName: "AI2Human Network",
      requesterHandle: "@ai2humannetwork",
      targetUrl: defaultLinks.likeUrl,
      budget: "20 USDC",
      deadline: "24h",
      blockedHumanStep: "A real X account must complete the requested action and submit proof.",
      proofPhrase: "#A2H",
      brief:
        "A real human should complete the requested X action, keep it visible until review, and submit screenshot-backed proof.",
      completionLoop: "task -> human execution -> proof -> verify -> settle"
    }
  },
  "lucky-test": {
    label: "Lucky draw test",
    summary: "A safe no-payout reward campaign for OpenClaw or agent testing.",
    payload: {
      templateId: "x_light_engagement",
      requesterName: "AI2Human Network",
      requesterHandle: "@ai2humannetwork",
      targetUrl: defaultLinks.likeUrl,
      environment: "test",
      fundingMode: "test_no_payout",
      campaignLinks: defaultLinks,
      budget: "20 USDC",
      deadline: "24h",
      blockedHumanStep: "Real X accounts must complete campaign actions and submit proof.",
      proofPhrase: "#A2H",
      brief:
        "Follow @ai2humannetwork, join the Telegram group, like the target post, repost the target post, submit screenshot proof, and keep the action visible until review.",
      completionLoop: "task -> human execution -> proof -> verify -> settle",
      rewardDistribution: {
        mode: "lucky_draw",
        totalPool: "20 USDC",
        perWinner: "1 USDC",
        maxWinners: 20,
        drawTime: "after deadline"
      }
    }
  },
  "lucky-production": {
    label: "Managed PrizePool campaign",
    summary: "Production flow: AI2Human creates a PrizePool, returns a USDC invoice, then publishes after funding preflight.",
    payload: {
      templateId: "x_light_engagement",
      requesterName: "AI2Human Network",
      requesterHandle: "@ai2humannetwork",
      targetUrl: defaultLinks.likeUrl,
      environment: "production",
      fundingMode: "ai2human_managed_pool",
      campaignLinks: defaultLinks,
      budget: "100 USDC",
      deadline: "48h",
      blockedHumanStep: "Real users must complete campaign actions and submit proof before they can claim rewards.",
      proofPhrase: "#A2H",
      brief:
        "Only qualified users should complete the X and Telegram actions, submit proof, and keep the actions visible until review.",
      completionLoop: "task -> human execution -> proof -> verify -> settle",
      rewardDistribution: {
        mode: "lucky_draw",
        totalPool: "100 USDC",
        perWinner: "1 USDC",
        maxWinners: 100,
        drawTime: "after deadline"
      },
      eligibility: {
        tokenGate: {
          network: "base",
          chainId: 8453,
          contractAddress: "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3",
          symbol: "A2H",
          decimals: 18,
          minimumUsdValue: "1",
          priceSource: "dexscreener",
          requiredAt: ["quest_action", "reward_claim"]
        }
      }
    }
  }
};

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function readText(value: unknown) {
  return String(value || "").trim();
}

function buildCurl(endpoint: string, payload: string) {
  return `curl https://ai2human.io${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "x-agent-api-key: $AI2HUMAN_AGENT_KEY" \\
  -d '${payload.replaceAll("'", "'\\''")}'`;
}

export default function AgentSkillConsoleClient() {
  const [presetId, setPresetId] = useState<PresetId>("lucky-test");
  const [payloadText, setPayloadText] = useState(() => stringifyJson(presets["lucky-test"].payload));
  const [preview, setPreview] = useState<ConsoleResponse | null>(null);
  const [created, setCreated] = useState<ConsoleResponse | null>(null);
  const [funding, setFunding] = useState<ConsoleResponse | null>(null);
  const [publish, setPublish] = useState<ConsoleResponse | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "create" | "funding" | "publish">("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const payload = useMemo(() => {
    try {
      return JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [payloadText]);

  const taskId = readText(created?.task?.id);
  const previewCurl = payload ? buildCurl("/api/agent/campaigns/preview", stringifyJson(payload)) : "";
  const createCurl = payload ? buildCurl("/api/agent/campaigns", stringifyJson(payload)) : "";

  function choosePreset(nextId: PresetId) {
    setPresetId(nextId);
    setPayloadText(stringifyJson(presets[nextId].payload));
    setPreview(null);
    setCreated(null);
    setFunding(null);
    setPublish(null);
    setError("");
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1600);
  }

  async function callApi(kind: typeof busy, endpoint: string, body?: unknown) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: kind === "funding" && !body ? "GET" : "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const json = (await res.json()) as ConsoleResponse;
      if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
      if (kind === "preview") setPreview(json);
      if (kind === "create") setCreated(json);
      if (kind === "funding") setFunding(json);
      if (kind === "publish") setPublish(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy("");
    }
  }

  function runPreview() {
    if (!payload) {
      setError("Payload is not valid JSON.");
      return;
    }
    void callApi("preview", "/api/agent/campaigns/preview", payload);
  }

  function createDraft() {
    if (!payload) {
      setError("Payload is not valid JSON.");
      return;
    }
    void callApi("create", "/api/agent/campaigns", payload);
  }

  function checkFunding() {
    if (!taskId) {
      setError("Create a draft first, then check funding.");
      return;
    }
    void callApi("funding", `/api/agent/campaigns/${taskId}/funding`);
  }

  function publishDraft() {
    if (!taskId) {
      setError("Create a draft first, then publish.");
      return;
    }
    void callApi("publish", `/api/agent/campaigns/${taskId}/publish`, {});
  }

  const activeLifecycle = created?.task?.campaign?.agentLifecycle;
  const activeFunding = funding?.fundingPlan || activeLifecycle?.fundingPlan || preview?.fundingPlan;
  const activePreflight = funding?.contractPreflight || activeLifecycle?.contractPreflight || preview?.contractPreflight;

  return (
    <section className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div>
            <span className={styles.kicker}>AI2Human Agent Skill</span>
            <h1>Turn an agent request into a verified campaign.</h1>
            <p>
              This console shows the live AI2Human agent flow: preview the task, create a draft, inspect funding,
              publish only after gates pass, then let humans submit proof for verification and settlement.
            </p>
          </div>
          <div className={styles.heroCard}>
            <strong>Core loop</strong>
            <span>{"agent request -> human execution -> structured proof -> verify -> settle"}</span>
          </div>
        </header>

        <section className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.sectionTitle}>
              <span>Step 1</span>
              <h2>Choose request type</h2>
            </div>
            <div className={styles.presets}>
              {(Object.keys(presets) as PresetId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={presetId === id ? styles.presetActive : styles.preset}
                  onClick={() => choosePreset(id)}
                >
                  <strong>{presets[id].label}</strong>
                  <span>{presets[id].summary}</span>
                </button>
              ))}
            </div>

            <div className={styles.safeBox}>
              <strong>Safe testing rule</strong>
              <p>
                Preview is always dry-run. Create writes a draft. Publish opens the campaign only when funding and
                preflight rules pass.
              </p>
            </div>
          </aside>

          <main className={styles.main}>
            <div className={styles.consoleHeader}>
              <div>
                <span>Step 2</span>
                <h2>Edit agent payload</h2>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={() => copyText("payload", payloadText)}>
                {copied === "payload" ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <textarea
              className={styles.payload}
              spellCheck={false}
              value={payloadText}
              onChange={(event) => setPayloadText(event.target.value)}
            />

            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={runPreview} disabled={busy !== "" || !payload}>
                {busy === "preview" ? "Running preview..." : "Run safe preview"}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={createDraft} disabled={busy !== "" || !payload || preview?.readyToCreate === false}>
                {busy === "create" ? "Creating draft..." : "Create draft"}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={checkFunding} disabled={busy !== "" || !taskId}>
                {busy === "funding" ? "Checking..." : "Check funding"}
              </button>
              <button type="button" className={styles.publishButton} onClick={publishDraft} disabled={busy !== "" || !taskId}>
                {busy === "publish" ? "Publishing..." : "Publish after gates"}
              </button>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.outputGrid}>
              <article className={styles.statusCard}>
                <span>Preview</span>
                <strong>{preview ? (preview.readyToCreate ? "Ready to draft" : "Needs inputs") : "Not run"}</strong>
                <p>{preview?.preview?.title || "Run dry-run preview before creating anything."}</p>
              </article>
              <article className={styles.statusCard}>
                <span>Draft</span>
                <strong>{taskId ? taskId : "No draft yet"}</strong>
                <p>{created?.task?.taskState ? `State: ${created.task.taskState}` : "Draft creation writes a task row but keeps it closed."}</p>
              </article>
              <article className={styles.statusCard}>
                <span>Funding</span>
                <strong>{activeFunding?.fundingMode || "Not checked"}</strong>
                <p>
                  {activeFunding?.fundingInvoice?.recipientAddress
                    ? `Fund ${activeFunding.fundingInvoice.amount} to ${activeFunding.fundingInvoice.recipientAddress}`
                    : activeFunding?.payoutDisabled
                      ? "Payout disabled for test flow."
                      : "Funding invoice appears after managed pool creation."}
                </p>
              </article>
              <article className={styles.statusCard}>
                <span>Publish</span>
                <strong>{publish?.success ? "Published" : activePreflight?.ok ? "Gate passed" : "Gate pending"}</strong>
                <p>{activePreflight?.status || "Publish requires funding/preflight for reward campaigns."}</p>
              </article>
            </div>

            {preview?.missingInputs?.length ? (
              <div className={styles.warningBox}>
                <strong>Agent should ask next</strong>
                <ul>
                  {preview.nextQuestions?.map((item) => (
                    <li key={item.field}>{item.question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </main>

          <aside className={styles.inspector}>
            <div className={styles.sectionTitle}>
              <span>Agent commands</span>
              <h2>Copyable calls</h2>
            </div>
            <div className={styles.commandBlock}>
              <div>
                <strong>Preview</strong>
                <button type="button" onClick={() => copyText("preview", previewCurl)} disabled={!previewCurl}>
                  {copied === "preview" ? "Copied" : "Copy"}
                </button>
              </div>
              <code>{previewCurl || "Fix JSON first."}</code>
            </div>
            <div className={styles.commandBlock}>
              <div>
                <strong>Create draft</strong>
                <button type="button" onClick={() => copyText("create", createCurl)} disabled={!createCurl}>
                  {copied === "create" ? "Copied" : "Copy"}
                </button>
              </div>
              <code>{createCurl || "Fix JSON first."}</code>
            </div>

            <div className={styles.links}>
              <Link href="/agent/skill.md">Read skill.md</Link>
              <Link href="/agent/manifest.json">Open manifest</Link>
              <Link href="/agent/openclaw-test.md">OpenClaw test script</Link>
              <Link href="/agent/b20">B20 Proof Gateway</Link>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}
