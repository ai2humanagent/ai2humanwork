"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import styles from "../../market.module.css";
import {
  getDefaultTargetUrlForTemplate,
  getOfficialCampaignTemplates
} from "../../../lib/officialCampaignTasks.js";

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
        <label>Campaign Template</label>
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
          <label>Official Requester</label>
          <input
            className={styles.input}
            value={props.requesterName}
            onChange={(event) => props.setRequesterName(event.target.value)}
            placeholder="ai2human Official"
            required
          />
        </div>
        <div className={styles.field}>
          <label>Official X Handle</label>
          <input
            className={styles.input}
            value={props.requesterHandle}
            onChange={(event) => props.setRequesterHandle(event.target.value)}
            placeholder="@ai2humanwork"
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label>Target Post URL</label>
        <input
          className={styles.input}
          value={props.targetUrl}
          onChange={(event) => props.setTargetUrl(event.target.value)}
          placeholder="https://x.com/yourbrand/status/..."
        />
      </div>

      <div className={styles.row2}>
        <div className={styles.field}>
          <label>Reward (USDT)</label>
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
        <label>Campaign Brief</label>
        <textarea
          className={styles.textarea}
          placeholder="Explain what the executor should do and what angle or CTA should appear in the post..."
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

function NewTaskStatic() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.id || "x_quote_launch");
  const [requesterName, setRequesterName] = useState("ai2human Official");
  const [requesterHandle, setRequesterHandle] = useState("@ai2humanwork");
  const [targetUrl, setTargetUrl] = useState(getDefaultTargetUrlForTemplate(TEMPLATES[0]?.id));
  const [reward, setReward] = useState("25");
  const [duration, setDuration] = useState("24");
  const [proofPhrase, setProofPhrase] = useState("");
  const [brief, setBrief] = useState("Amplify the official post and keep the result live for review.");

  useEffect(() => {
    setTargetUrl(getDefaultTargetUrlForTemplate(templateId));
  }, [templateId]);

  return (
    <form className={styles.formCard} onSubmit={(event) => event.preventDefault()}>
      <h2 className={styles.formTitle}>Create Official Campaign Task</h2>
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
        Connect Wallet to Create Task
      </button>
    </form>
  );
}

function NewTaskPrivy() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const [templateId, setTemplateId] = useState(TEMPLATES[0]?.id || "x_quote_launch");
  const [requesterName, setRequesterName] = useState("ai2human Official");
  const [requesterHandle, setRequesterHandle] = useState("@ai2humanwork");
  const [targetUrl, setTargetUrl] = useState(getDefaultTargetUrlForTemplate(TEMPLATES[0]?.id));
  const [reward, setReward] = useState("25");
  const [duration, setDuration] = useState("24");
  const [proofPhrase, setProofPhrase] = useState("");
  const [brief, setBrief] = useState("Amplify the official post and keep the result live for review.");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((template) => template.id === templateId) || TEMPLATES[0],
    [templateId]
  );

  useEffect(() => {
    setTargetUrl(getDefaultTargetUrlForTemplate(templateId));
  }, [templateId]);

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
          budget: `${reward} USDT`,
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
    <form className={styles.formCard} onSubmit={onSubmit}>
      <h2 className={styles.formTitle}>Create Official Campaign Task</h2>
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
          ? "Connect Wallet to Create Task"
          : submitting
            ? "Creating..."
            : "Create Official Task"}
      </button>
    </form>
  );
}

export default function NewTaskClient({ privyEnabled }: { privyEnabled: boolean }) {
  return privyEnabled ? <NewTaskPrivy /> : <NewTaskStatic />;
}
