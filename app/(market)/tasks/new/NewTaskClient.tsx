"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import styles from "../../market.module.css";
import {
  getOfficialCampaignTemplates,
  getResearchEvidenceTemplates,
  isResearchEvidenceTemplate
} from "../../../lib/officialCampaignTasks.js";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../lib/assetLabels.js";
import { fetchWithPrivySessionRetry } from "../../../lib/clientPrivySession";

type PromptPreview = {
  readyToCreate?: boolean;
  missingInputs?: string[];
  nextAction?: string;
  rejectionReasons?: Array<{ message?: string }>;
  draft?: {
    title?: string;
    brief?: string;
    budget?: string;
    deadline?: string;
    location?: string;
    proofRequirements?: string[];
  };
};

function creationErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/abort|timeout|timed out|network|fetch/i.test(message)) {
    return "The task request took longer than expected. Check My Published Tasks before retrying—the task may already be processing, and retrying could create another task.";
  }
  return message || "Unable to create and publish this task. Your wallet was not charged.";
}

const CREATE_REQUEST_TIMEOUT_MS = 20_000;

async function createTaskRequest(
  body: Record<string, unknown>,
  session: { authenticated: boolean; getAccessToken: () => Promise<string | null> }
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CREATE_REQUEST_TIMEOUT_MS);
  try {
    return await fetchWithPrivySessionRetry("/api/v1/task-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify(body)
    }, session);
  } finally {
    window.clearTimeout(timeout);
  }
}

function QuickTaskComposer({
  createLabel,
  onCreate,
  onEditDraft,
  publishing,
  taskSaved
}: {
  createLabel: string;
  onCreate?: (prompt: string, reviewPolicy: "ai_auto" | "publisher_approval") => Promise<void>;
  onEditDraft?: (preview: PromptPreview) => void;
  publishing?: boolean;
  taskSaved?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [reviewPolicy, setReviewPolicy] = useState<"ai_auto" | "publisher_approval">("ai_auto");
  const examples = [
    ["Unitree remote shoot", "Find one Unitree G1 owner for a supervised remote video shoot. The project team will control the robot online for up to 4 hours and record several movements. Reward 100 USDC. Complete within 3 days."],
    ["Local photo check", "Visit one store in Shanghai, photograph the storefront and opening hours, and submit timestamped proof. Reward 20 USDC. Complete within 24 hours."],
    ["Product test", "Use a real X account to test our onboarding flow and submit screenshots of each completed step. Reward 10 USDC. Complete within 2 days."]
  ];

  async function previewPrompt() {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/v1/task-drafts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const payload = await response.json();
      setPreview(payload);
      if (!response.ok) setError(payload.rejectionReasons?.[0]?.message || payload.error || "Please revise the task.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preview the task.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className={styles.formCard}>
      <span className={styles.agentKicker}>Fast path · powered by ai2humanbot</span>
      <h2 className={styles.formTitle}>Describe what needs to happen</h2>
      <p className={styles.pageLead}>Write naturally. Include the outcome, who or what is needed, reward, deadline, and any location or remote-access constraint.</p>
      <div className={styles.taskExampleRow}>
        {examples.map(([label, example]) => (
          <button key={label} type="button" onClick={() => { setPrompt(example); setPreview(null); }}>{label}</button>
        ))}
      </div>
      <textarea
        className={styles.textarea}
        value={prompt}
        onChange={(event) => { setPrompt(event.target.value); setPreview(null); }}
        placeholder="Example: Find one Unitree G1 owner for a supervised remote video shoot. Remote control for up to 4 hours, record several movements, reward 100 USDC, complete within 3 days."
        rows={5}
      />
      <fieldset className={styles.reviewPolicyPicker}>
        <legend>Who gives final proof approval?</legend>
        <label className={reviewPolicy === "ai_auto" ? styles.reviewPolicySelected : ""}>
          <input type="radio" name="review-policy" checked={reviewPolicy === "ai_auto"} onChange={() => setReviewPolicy("ai_auto")} />
          <span><strong>AI auto-approval</strong><small>Fastest. AI releases payment when every check passes; uncertain proof is held for review.</small></span>
        </label>
        <label className={reviewPolicy === "publisher_approval" ? styles.reviewPolicySelected : ""}>
          <input type="radio" name="review-policy" checked={reviewPolicy === "publisher_approval"} onChange={() => setReviewPolicy("publisher_approval")} />
          <span><strong>I approve before payment</strong><small>AI checks the proof first, then you make the final approve or revision decision.</small></span>
        </label>
      </fieldset>
      <div className={styles.quickTaskActions}>
        <button type="button" className={styles.submitButton} disabled={working || prompt.trim().length < 8} onClick={previewPrompt}>
          {working ? "Structuring task..." : "Generate task preview"}
        </button>
        {preview?.readyToCreate && onCreate ? (
          <button type="button" className={styles.submitButton} disabled={working || publishing} onClick={() => onCreate(prompt, reviewPolicy)}>{publishing ? "Publishing task…" : createLabel}</button>
        ) : null}
        {preview?.draft && onEditDraft ? (
          <button type="button" className={styles.secondaryTaskButton} onClick={() => onEditDraft(preview)}>Edit details</button>
        ) : null}
      </div>
      {error ? <div className={styles.alert}>{error}</div> : null}
      {publishing ? (
        <div className={styles.taskPublishProgress} role="status" aria-live="polite">
          <strong>{taskSaved ? "Task saved · opening your publishing workspace" : "Creating your task"}</strong>
          <div><span className={styles.taskPublishDone}>✓</span><span>Task structured</span></div>
          <div><span className={taskSaved ? styles.taskPublishDone : styles.taskPublishActive}>{taskSaved ? "✓" : ""}</span><span>Task saved safely</span></div>
          <div><span className={taskSaved ? styles.taskPublishActive : ""} /><span>Continue wallet setup and publishing</span></div>
          <small>{taskSaved ? "Taking you to the same task—nothing has been lost or duplicated." : "Keep this page open while AI2Human saves the task."}</small>
        </div>
      ) : null}
      {preview?.draft ? (
        <div className={styles.quickTaskPreview}>
          <div><span>Task</span><strong>{preview.draft.title}</strong></div>
          <div><span>Reward</span><strong>{preview.draft.budget}</strong></div>
          <div><span>Deadline</span><strong>{preview.draft.deadline}</strong></div>
          <div><span>Location</span><strong>{preview.draft.location}</strong></div>
          <div className={styles.quickTaskWide}><span>Proof AI will require</span><strong>{preview.draft.proofRequirements?.join(" · ")}</strong></div>
          {preview.missingInputs?.length ? <div className={styles.quickTaskWide}><span>Still needed</span><strong>{preview.missingInputs.join(", ")}</strong></div> : null}
        </div>
      ) : null}
    </section>
  );
}

const TEMPLATES = [...getOfficialCampaignTemplates(), ...getResearchEvidenceTemplates()];
const RESEARCH_PILOT = {
  requesterName: "AI2Human Research Pilot",
  requesterHandle: "@ai2humannetwork",
  targetUrl: "https://github.com/netneurolab/neuromaps",
  reward: "10",
  duration: "48",
  brief:
    "Verify whether a new reader can reach the public code and any linked dataset or documentation from this repository. Submit the direct source link, the access path you followed, the observed result, a bounded verdict, and what this check does not establish. Do not assess scientific validity or bypass access controls."
};

type FieldsProps = {
  templateId: string;
  setTemplateId: (value: string) => void;
  requesterName: string;
  setRequesterName: (value: string) => void;
  requesterHandle: string;
  setRequesterHandle: (value: string) => void;
  targetUrl: string;
  setTargetUrl: (value: string) => void;
  reward: string;
  setReward: (value: string) => void;
  duration: string;
  setDuration: (value: string) => void;
  proofPhrase: string;
  setProofPhrase: (value: string) => void;
  brief: string;
  setBrief: (value: string) => void;
  researchConsent: boolean;
  setResearchConsent: (value: boolean) => void;
};

function CampaignFields(props: FieldsProps) {
  const selectedTemplate =
    TEMPLATES.find((template) => template.id === props.templateId) || TEMPLATES[0];
  const isResearchTemplate = isResearchEvidenceTemplate(selectedTemplate.id);

  function loadResearchPilot() {
    props.setRequesterName(RESEARCH_PILOT.requesterName);
    props.setRequesterHandle(RESEARCH_PILOT.requesterHandle);
    props.setTargetUrl(RESEARCH_PILOT.targetUrl);
    props.setReward(RESEARCH_PILOT.reward);
    props.setDuration(RESEARCH_PILOT.duration);
    props.setProofPhrase("");
    props.setBrief(RESEARCH_PILOT.brief);
  }

  return (
    <div className={`${styles.filters} ${styles.filtersNewTask}`}>
      <div className={styles.field}>
        <label>Task Template</label>
        <select
          className={styles.select}
          value={props.templateId}
          onChange={(event) => props.setTemplateId(event.target.value)}
        >
          {TEMPLATES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className={styles.modeHelp}>
          <div>
            <strong>{selectedTemplate.label}</strong>
            <span> {selectedTemplate.title}</span>
          </div>
        </div>
        {isResearchTemplate ? (
          <button type="button" className={styles.templateFillButton} onClick={loadResearchPilot}>
            Load ResearchHub pilot defaults
          </button>
        ) : null}
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>{isResearchTemplate ? "Research requester" : "Project / Requester"}</label>
          <input
            className={styles.input}
            value={props.requesterName}
            onChange={(event) => props.setRequesterName(event.target.value)}
            placeholder="Your Project"
            required
          />
        </div>
        <div className={styles.field}>
          <label>{isResearchTemplate ? "Public contact or X handle" : "Project X Handle"}</label>
          <input
            className={styles.input}
            value={props.requesterHandle}
            onChange={(event) => props.setRequesterHandle(event.target.value)}
            placeholder={isResearchTemplate ? "Optional" : "@yourproject"}
            required={!isResearchTemplate}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>{isResearchTemplate ? "Research artifact URL" : "Target URL or Post"}</label>
        <input
          className={styles.input}
          value={props.targetUrl}
          onChange={(event) => props.setTargetUrl(event.target.value)}
          placeholder={isResearchTemplate ? "https://doi.org/... or https://github.com/..." : "https://x.com/yourbrand/status/..."}
          required
        />
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>{`Reward (${DEFAULT_SETTLEMENT_TOKEN_SYMBOL})`}</label>
          <input
            className={styles.input}
            value={props.reward}
            onChange={(event) => props.setReward(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label>Deadline (hours)</label>
          <input
            className={styles.input}
            value={props.duration}
            onChange={(event) => props.setDuration(event.target.value)}
            required
          />
        </div>
      </div>

      {!isResearchTemplate ? (
        <div className={styles.field}>
          <label>Required Phrase / Hashtag</label>
          <input
            className={styles.input}
            value={props.proofPhrase}
            onChange={(event) => props.setProofPhrase(event.target.value)}
            placeholder="Optional override"
          />
        </div>
      ) : null}

      <div className={styles.field}>
        <label>Task Brief</label>
        <textarea
          className={styles.textarea}
          placeholder="Explain the human-needed step, required proof, and what completion should look like..."
          value={props.brief}
          onChange={(event) => props.setBrief(event.target.value)}
          required
        />
      </div>

      <div className={styles.modeHelp}>
        <div>
          <strong>Proof requirements</strong>
        </div>
        {selectedTemplate.proofRequirements.map((item) => (
          <div key={`proof-${selectedTemplate.id}-${item}`}>{item}</div>
        ))}
      </div>

      {isResearchTemplate ? (
        <div className={styles.researchSafetyNote}>
          <strong>Scope</strong>
          <span>Public sources only. This task checks access and documented setup paths, not scientific validity, replication, or publication eligibility.</span>
        </div>
      ) : null}

      {isResearchTemplate ? (
        <label className={styles.researchConsentRow}>
          <input
            type="checkbox"
            checked={props.researchConsent}
            onChange={(event) => props.setResearchConsent(event.target.checked)}
          />
          <span>
            I agree that this task's data (task text, evidence hashes, verification records — not raw evidence) may be
            used for the JOVE-Core research study. Retention until 2027-08-16. I can withdraw consent at any time.
            Raw evidence stays private.
          </span>
        </label>
      ) : null}

      <div className={styles.modeHelp}>
        <div>
          <strong>Reviewer checklist</strong>
        </div>
        {selectedTemplate.verificationChecks.map((item) => (
          <div key={`verify-${selectedTemplate.id}-${item}`}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function buildHandoffPacket({
  templateId,
  requesterName,
  requesterHandle,
  targetUrl,
  reward,
  duration,
  proofPhrase,
  brief
}: {
  templateId: string;
  requesterName: string;
  requesterHandle: string;
  targetUrl: string;
  reward: string;
  duration: string;
  proofPhrase: string;
  brief: string;
}) {
  const selectedTemplate = TEMPLATES.find((template) => template.id === templateId) || TEMPLATES[0];
  return {
    routeTo: "AI2Human",
    intent: "create_human_fallback_task",
    templateId,
    requesterName,
    requesterHandle,
    targetUrl,
    budget: reward ? `${reward} ${DEFAULT_SETTLEMENT_TOKEN_SYMBOL}` : "",
    deadline: duration ? `${duration}h` : "",
    blockedHumanStep: selectedTemplate?.title || "Human execution step",
    proofPhrase:
      proofPhrase ||
      (selectedTemplate && "defaultProofPhrase" in selectedTemplate
        ? selectedTemplate.defaultProofPhrase
        : ""),
    brief,
    proofRequirements: selectedTemplate?.proofRequirements || [],
    verificationChecks: selectedTemplate?.verificationChecks || [],
    completionLoop: "task -> human execution -> proof -> verify -> settle"
  };
}

function AgentHandoffPanel({
  templateId,
  requesterName,
  requesterHandle,
  targetUrl,
  reward,
  duration,
  proofPhrase,
  brief
}: {
  templateId: string;
  requesterName: string;
  requesterHandle: string;
  targetUrl: string;
  reward: string;
  duration: string;
  proofPhrase: string;
  brief: string;
}) {
  const [copied, setCopied] = useState(false);
  const packet = useMemo(
    () =>
      buildHandoffPacket({
        templateId,
        requesterName,
        requesterHandle,
        targetUrl,
        reward,
        duration,
        proofPhrase,
        brief
      }),
    [templateId, requesterName, requesterHandle, targetUrl, reward, duration, proofPhrase, brief]
  );
  const packetText = useMemo(() => JSON.stringify(packet, null, 2), [packet]);

  async function copyPacket() {
    await navigator.clipboard.writeText(packetText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <aside className={styles.handoffPanel}>
      <div className={styles.handoffHeader}>
        <span>Agent handoff packet</span>
        <button type="button" onClick={copyPacket}>
          {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <p>
        This is the task packet an agent or project team can hand to AI2Human when a workflow
        reaches a human gate.
      </p>
      <pre>{packetText}</pre>
    </aside>
  );
}

function CreateTaskShell({
  children,
  templateId,
  requesterName,
  requesterHandle,
  targetUrl,
  reward,
  duration,
  proofPhrase,
  brief
}: {
  children: ReactNode;
  templateId: string;
  requesterName: string;
  requesterHandle: string;
  targetUrl: string;
  reward: string;
  duration: string;
  proofPhrase: string;
  brief: string;
}) {
  return (
    <div className={styles.createGrid}>
      {children}
      <AgentHandoffPanel
        templateId={templateId}
        requesterName={requesterName}
        requesterHandle={requesterHandle}
        targetUrl={targetUrl}
        reward={reward}
        duration={duration}
        proofPhrase={proofPhrase}
        brief={brief}
      />
    </div>
  );
}

function NewTaskStatic() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.id || "x_quote_launch");
  const [requesterName, setRequesterName] = useState("");
  const [requesterHandle, setRequesterHandle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [reward, setReward] = useState("");
  const [duration, setDuration] = useState("");
  const [proofPhrase, setProofPhrase] = useState("");
  const [brief, setBrief] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);

  return (
    <>
    <QuickTaskComposer createLabel="Sign in to Create Draft" onEditDraft={() => setShowAdvanced(true)} />
    <details className={styles.advancedTaskEditor} open={showAdvanced} onToggle={(event) => setShowAdvanced(event.currentTarget.open)}>
      <summary><strong>Advanced editor</strong><span>Use a template or control every field manually</span></summary>
    <CreateTaskShell
      templateId={templateId}
      requesterName={requesterName}
      requesterHandle={requesterHandle}
      targetUrl={targetUrl}
      reward={reward}
      duration={duration}
      proofPhrase={proofPhrase}
      brief={brief}
    >
      <form className={styles.formCard} onSubmit={(event) => event.preventDefault()}>
        <h2 className={styles.formTitle}>Create Human Task Campaign</h2>
        <CampaignFields
          templateId={templateId}
          setTemplateId={setTemplateId}
          requesterName={requesterName}
          setRequesterName={setRequesterName}
          requesterHandle={requesterHandle}
          setRequesterHandle={setRequesterHandle}
          targetUrl={targetUrl}
          setTargetUrl={setTargetUrl}
          reward={reward}
          setReward={setReward}
          duration={duration}
          setDuration={setDuration}
          proofPhrase={proofPhrase}
          setProofPhrase={setProofPhrase}
          brief={brief}
          setBrief={setBrief}
          researchConsent={researchConsent}
          setResearchConsent={setResearchConsent}
        />
        <button type="button" className={`${styles.submitButton} ${styles.submitButtonDisabled}`} disabled>
          Sign in to Publish Human Task
        </button>
      </form>
    </CreateTaskShell>
    </details>
    </>
  );
}

function NewTaskPrivy() {
  const router = useRouter();
  const { ready, authenticated, login, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.id || "x_quote_launch");
  const [requesterName, setRequesterName] = useState("");
  const [requesterHandle, setRequesterHandle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [reward, setReward] = useState("");
  const [duration, setDuration] = useState("");
  const [proofPhrase, setProofPhrase] = useState("");
  const [brief, setBrief] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const walletAddress =
    wallets.find((wallet) => wallet.walletClientType !== "privy" && wallet.address)?.address ||
    user?.wallet?.address ||
    wallets.find((wallet) => wallet.address)?.address;

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === templateId) || TEMPLATES[0],
    [templateId]
  );

  async function continueToTask(taskId: string, fundingStatus: string) {
    setTaskSaved(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    router.push(`/tasks/${taskId}?created=1&funding=${encodeURIComponent(fundingStatus)}`);
  }

  useEffect(() => {
    if (!authenticated || requesterName || requesterHandle) return;
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.user?.xAccount?.username) return;
        const username = String(payload.user.xAccount.username).replace(/^@/, "");
        setRequesterName(String(payload.user.xAccount.name || username));
        setRequesterHandle(`@${username}`);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [authenticated, requesterHandle, requesterName]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!authenticated) {
      login();
      return;
    }

    const isResearch = isResearchEvidenceTemplate(selectedTemplate.id);
    if (isResearch && !researchConsent) {
      setError("Please agree to the research consent before creating a research task.");
      return;
    }

    setSubmitting(true);
    try {
      const prompt = `${brief || selectedTemplate.title}. Reward ${reward} ${DEFAULT_SETTLEMENT_TOKEN_SYMBOL}. Complete within ${duration} hours.${targetUrl ? ` Reference: ${targetUrl}.` : ""}${proofPhrase ? ` Proof phrase: ${proofPhrase}.` : ""}`;
      const createBody: Record<string, unknown> = { prompt, requesterName, requesterHandle };
      if (isResearch) {
        createBody.templateId = selectedTemplate.id;
        createBody.researchConsent = {
          version: "jove-core-consent-v1",
          consentedAt: new Date().toISOString(),
          retention: "2027-08-16"
        };
      }
      const response = await createTaskRequest(
        createBody,
        { authenticated, getAccessToken }
      );

      const payload = (await response.json().catch(() => ({}))) as { error?: string; task?: { id?: string }; funding?: { status?: string } };
      if (!response.ok) throw new Error(payload.error || "Failed to create task.");
      if (!payload.task?.id) throw new Error("Task was created, but its detail link was not returned.");

      await continueToTask(payload.task.id, payload.funding?.status || "pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createPromptDraft(prompt: string, reviewPolicy: "ai_auto" | "publisher_approval") {
    if (!authenticated) { login(); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await createTaskRequest(
        { prompt, requesterName: requesterName || undefined, reviewPolicy },
        { authenticated, getAccessToken }
      );
      const payload = await response.json();
      if (!response.ok || !payload.task?.id) throw new Error(payload.error || payload.rejectionReasons?.[0]?.message || "Unable to create and publish this task. Your wallet was not charged.");
      await continueToTask(payload.task.id, payload.funding?.status || "pending");
    } catch (creationError) {
      setError(creationErrorMessage(creationError));
    } finally {
      setSubmitting(false);
    }
  }

  function editPromptDraft(preview: PromptPreview) {
    const draft = preview.draft;
    if (!draft) return;
    const rewardMatch = String(draft.budget || "").match(/[\d.]+/);
    const deadlineText = String(draft.deadline || "").toLowerCase();
    const deadlineMatch = deadlineText.match(/[\d.]+/);
    if (rewardMatch) setReward(rewardMatch[0]);
    if (deadlineMatch) {
      const value = Number(deadlineMatch[0]);
      const hours = deadlineText.includes("d") || deadlineText.includes("day") ? value * 24 : value;
      setDuration(String(hours));
    }
    if (draft.brief) setBrief(draft.brief);
    setTemplateId("community_proof_task");
    setShowAdvanced(true);
  }

  return (
    <>
    <QuickTaskComposer
      createLabel={authenticated ? "Create & publish task" : "Sign in to create task"}
      onCreate={createPromptDraft}
      onEditDraft={editPromptDraft}
      publishing={submitting}
      taskSaved={taskSaved}
    />
    <details className={styles.advancedTaskEditor} open={showAdvanced} onToggle={(event) => setShowAdvanced(event.currentTarget.open)}>
      <summary><strong>Template editor</strong><span>Optional: use for standard social, product-test, or proof campaigns</span></summary>
    <CreateTaskShell
      templateId={templateId}
      requesterName={requesterName}
      requesterHandle={requesterHandle}
      targetUrl={targetUrl}
      reward={reward}
      duration={duration}
      proofPhrase={proofPhrase}
      brief={brief}
    >
      <form className={styles.formCard} onSubmit={onSubmit}>
        <h2 className={styles.formTitle}>Create Human Task Campaign</h2>
        {error ? <div className={styles.alert}>{error}</div> : null}
        <CampaignFields
          templateId={templateId}
          setTemplateId={setTemplateId}
          requesterName={requesterName}
          setRequesterName={setRequesterName}
          requesterHandle={requesterHandle}
          setRequesterHandle={setRequesterHandle}
          targetUrl={targetUrl}
          setTargetUrl={setTargetUrl}
          reward={reward}
          setReward={setReward}
          duration={duration}
          setDuration={setDuration}
          proofPhrase={proofPhrase}
          setProofPhrase={setProofPhrase}
          brief={brief}
          setBrief={setBrief}
          researchConsent={researchConsent}
          setResearchConsent={setResearchConsent}
        />
        <button type="submit" className={styles.submitButton} disabled={!ready || submitting}>
          {!authenticated
            ? "Sign in to Publish Human Task"
            : submitting
              ? "Creating & publishing…"
              : "Create & publish task"}
        </button>
        <p className={styles.taskBudgetConsent}>By publishing, you authorize AI2Human to use the displayed reward from your embedded wallet. Funds move only through the task PrizePool and only once.</p>
      </form>
    </CreateTaskShell>
    </details>
    </>
  );
}

export default function NewTaskClient({ privyEnabled }: { privyEnabled: boolean }) {
  return privyEnabled ? <NewTaskPrivy /> : <NewTaskStatic />;
}
