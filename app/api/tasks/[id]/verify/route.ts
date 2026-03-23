import { NextResponse } from "next/server";
import { updateDb, type Task } from "../../../../lib/store";
import { checkAdminAuth } from "../../../../lib/adminAuth";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";
import {
  getTaskEvidenceFields,
  getTaskVerificationStatus
} from "../../../../lib/officialCampaignTasks.js";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = checkAdminAuth(_request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let updated: unknown = null;
  let transitionError = "";
  let verificationError = "";

  function findDuplicateProofTask(dbTasks: Task[], currentTask: Task) {
    const currentEvidence = getTaskEvidenceFields(currentTask);
    const currentUrls = [currentEvidence.normalizedPostUrl, currentEvidence.normalizedProfileUrl].filter(
      Boolean
    );
    if (!currentUrls.length) return null;

    return (
      dbTasks.find((candidate) => {
        if (candidate.id === currentTask.id) return false;
        if (!["human_done", "verified", "paid"].includes(candidate.status)) return false;
        const other = getTaskEvidenceFields(candidate);
        const otherUrls = [other.normalizedPostUrl, other.normalizedProfileUrl].filter(Boolean);
        return currentUrls.some((url) => otherUrls.includes(url));
      }) || null
    );
  }

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    if (!canTransition(task.status, "verified")) {
      transitionError = explainInvalidTransition(task.status, "verified");
      return;
    }

    const verification = getTaskVerificationStatus(task);
    if (!verification.ok) {
      verificationError = `Missing verification evidence: ${verification.missing.join(", ")}`;
      return;
    }

    const duplicateProofTask = findDuplicateProofTask(db.tasks, task);
    if (duplicateProofTask) {
      verificationError = `Duplicate proof URL detected. Evidence already appears on task "${duplicateProofTask.title}".`;
      return;
    }

    const previousStatus = task.status;
    task.status = "verified";
    task.updatedAt = new Date().toISOString();
    appendTransitionEvidence(task, {
      by: "system",
      from: previousStatus,
      to: "verified",
      action: "Reviewer approved"
    });
    if (verification.checks.length) {
      appendEvidence(task, {
        by: "system",
        type: "note",
        content: `verification_passed: ${verification.checks.map((check) => check.id).join(", ")}`
      });
    }
    appendEvidence(task, {
      by: "system",
      type: "note",
      content:
        "agent_event: verifier_agent | Approved structured proof after handle/URL integrity and duplicate-proof checks passed."
    });
    updated = task;
  });

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (verificationError) {
    return NextResponse.json({ error: verificationError }, { status: 400 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
