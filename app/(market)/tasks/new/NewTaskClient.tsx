"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import styles from "../../market.module.css";
import {
  getOfficialCampaignTemplates
} from "../../../lib/officialCampaignTasks.js";
import { DEFAULT_SETTLEMENT_TOKEN_SYMBOL } from "../../../lib/assetLabels.js";

const TEMPLATES = getOfficialCampaignTemplates();

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
};

function CampaignFields(props: FieldsProps) {
  const selectedTemplate =
    TEMPLATES.find((template) => template.id === props.templateId) || TEMPLATES[0];

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
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Project / Requester</label>
          <input
            className={styles.input}
            value={props.requesterName}
            onChange={(event) => props.setRequesterName(event.target.value)}
            placeholder="Your Project"
            required
          />
        </div>
        <div className={styles.field}>
          <label>Project X Handle</label>
          <input
            className={styles.input}
            value={props.requesterHandle}
            onChange={(event) => props.setRequesterHandle(event.target.value)}
            placeholder="@yourproject"
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>Target URL or Post</label>
        <input
          className={styles.input}
          value={props.targetUrl}
          onChange={(event) => props.setTargetUrl(event.target.value)}
          placeholder="https://x.com/yourbrand/status/..."
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

      <div className={styles.field}>
        <label>Required Phrase / Hashtag</label>
        <input
          className={styles.input}
          value={props.proofPhrase}
          onChange={(event) => props.setProofPhrase(event.target.value)}
          placeholder="Optional override"
        />
      </div>

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
    proofPhrase: proofPhrase || selectedTemplate?.defaultProofPhrase || "",
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

  return (
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
        />
        <button type="button" className={`${styles.submitButton} ${styles.submitButtonDisabled}`} disabled>
          Connect Wallet to Create Human Task
        </button>
      </form>
    </CreateTaskShell>
  );
}

function NewTaskPrivy() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
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

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === templateId) || TEMPLATES[0],
    [templateId]
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!authenticated) {
      login();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          title: selectedTemplate.title,
          requesterName,
          requesterHandle,
          targetUrl,
          budget: `${reward} ${DEFAULT_SETTLEMENT_TOKEN_SYMBOL}`,
          deadline: `${duration}h`,
          proofPhrase,
          brief
        })
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to create task.");

      router.push("/reviewer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        />
        <button type="submit" className={styles.submitButton} disabled={!ready || submitting}>
          {!authenticated
            ? "Connect Wallet to Create Human Task"
            : submitting
              ? "Creating..."
              : "Create Human Task"}
        </button>
      </form>
    </CreateTaskShell>
  );
}

export default function NewTaskClient({ privyEnabled }: { privyEnabled: boolean }) {
  return privyEnabled ? <NewTaskPrivy /> : <NewTaskStatic />;
}
