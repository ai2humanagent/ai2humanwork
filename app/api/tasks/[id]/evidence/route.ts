import { NextResponse } from "next/server";
import crypto from "crypto";
import { updateDb, type PaymentEntry, type Task } from "../../../../lib/store";
import { canTransition, explainInvalidTransition } from "../../../../lib/taskStateMachine";
import { appendEvidence, appendTransitionEvidence } from "../../../../lib/taskEvidence";
import {
  getTaskEvidenceFields,
  getTaskVerificationStatus
} from "../../../../lib/officialCampaignTasks.js";
import { executeXLayerSettlement } from "../../../../lib/xlayerSettlement";

export const runtime = "nodejs";

function snapshotTask(task: Task): Task {
  return JSON.parse(JSON.stringify(task)) as Task;
}

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const note = String(body.note || "Evidence submitted").trim();
  const url = String(body.url || body.screenshotUrl || "").trim();
  const executorHandle = String(body.executorHandle || "").trim();
  const postUrl = String(body.postUrl || "").trim();
  const profileUrl = String(body.profileUrl || "").trim();
  const proofPhrase = String(body.proofPhrase || "").trim();
  const summary = String(body.summary || note || "").trim();
  const by = body.by === "human" ? "human" : "system";
  const type = body.type === "photo" ? "photo" : "note";

  let updated: Task | null = null;
  let transitionError = "";
  let verificationError = "";
  let settlementError = "";
  let payment: PaymentEntry | null = null;
  let verification: ReturnType<typeof getTaskVerificationStatus> | null = null;
  let readyForSettlement = false;

  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === params.id);
    if (!task) {
      return;
    }

    if (url) {
      appendEvidence(task, {
        by,
        type: "photo",
        content: url
      });
    } else if (type === "photo") {
      appendEvidence(task, {
        by,
        type: "photo",
        content: "Photo evidence"
      });
    }

    if (executorHandle) {
      appendEvidence(task, {
        by,
        type: "note",
        content: `executor_handle: ${executorHandle}`
      });
    }

    if (postUrl) {
      appendEvidence(task, {
        by,
        type: "note",
        content: `post_url: ${postUrl}`
      });
    }

    if (profileUrl) {
      appendEvidence(task, {
        by,
        type: "note",
        content: `profile_url: ${profileUrl}`
      });
    }

    if (proofPhrase) {
      appendEvidence(task, {
        by,
        type: "note",
        content: `proof_phrase: ${proofPhrase}`
      });
    }

    if (summary) {
      appendEvidence(task, {
        by,
        type: "note",
        content: `summary: ${summary}`
      });
    } else if (!url) {
      appendEvidence(task, {
        by,
        type,
        content: note || "Evidence submitted"
      });
    }

    if (by === "human" && (executorHandle || summary || url || postUrl || profileUrl)) {
      appendEvidence(task, {
        by: "system",
        type: "note",
        content: "agent_event: human_operator | Submitted structured proof for verifier review."
      });
    }

    if (task.status === "human_assigned") {
      if (!canTransition(task.status, "human_done")) {
        transitionError = explainInvalidTransition(task.status, "human_done");
        return;
      }
      const previousStatus = task.status;
      task.status = "human_done";
      appendTransitionEvidence(task, {
        by: "system",
        from: previousStatus,
        to: "human_done",
        action: "Human evidence accepted"
      });
    }

    task.updatedAt = new Date().toISOString();
    verification = getTaskVerificationStatus(task);
    if (!verification.ok) {
      verificationError = `Missing verification evidence: ${verification.missing.join(", ")}`;
      updated = snapshotTask(task);
      return;
    }

    const duplicateProofTask = findDuplicateProofTask(db.tasks, task);
    if (duplicateProofTask) {
      verificationError = `Duplicate proof URL detected. Evidence already appears on task "${duplicateProofTask.title}".`;
      updated = snapshotTask(task);
      return;
    }

    readyForSettlement = true;
    updated = snapshotTask(task);
  });

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 400 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (verificationError || !readyForSettlement) {
    return NextResponse.json(
      {
        error: verificationError || "Proof verification failed.",
        task: updated,
        verification
      },
      { status: 400 }
    );
  }

  try {
    await updateDb(async (db) => {
      const task = db.tasks.find((item) => item.id === params.id);
      if (!task) {
        return;
      }

      verification = getTaskVerificationStatus(task);
      if (!verification.ok) {
        verificationError = `Missing verification evidence: ${verification.missing.join(", ")}`;
        updated = snapshotTask(task);
        return;
      }

      const duplicateProofTask = findDuplicateProofTask(db.tasks, task);
      if (duplicateProofTask) {
        verificationError = `Duplicate proof URL detected. Evidence already appears on task "${duplicateProofTask.title}".`;
        updated = snapshotTask(task);
        return;
      }

      if (!canTransition(task.status, "verified")) {
        transitionError = explainInvalidTransition(task.status, "verified");
        updated = snapshotTask(task);
        return;
      }

      const previousStatus = task.status;
      task.status = "verified";
      task.updatedAt = new Date().toISOString();
      appendTransitionEvidence(task, {
        by: "system",
        from: previousStatus,
        to: "verified",
        action: "Automated proof verification passed"
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

      const settlement = await executeXLayerSettlement({
        amount: task.budget?.trim() || "0",
        receiverAddress: task.assignee?.walletAddress
      });

      task.status = "paid";
      task.updatedAt = new Date().toISOString();
      appendTransitionEvidence(task, {
        by: "system",
        from: "verified",
        to: "paid",
        action:
          settlement.method === "xlayer_erc20"
            ? "Payment settled on X Layer"
            : "Payment settled in demo mode"
      });
      appendEvidence(task, {
        by: "system",
        type: "log",
        content: settlement.evidenceLabel
      });
      appendEvidence(task, {
        by: "system",
        type: "note",
        content: `agent_event: settlement_agent | Released ${settlement.amount} ${
          settlement.tokenSymbol || "USDT"
        } via ${settlement.method}.`
      });
      if (settlement.configurationHint && settlement.method === "mock_x402") {
        appendEvidence(task, {
          by: "system",
          type: "note",
          content: settlement.configurationHint
        });
      }

      payment = {
        id: crypto.randomUUID(),
        taskId: task.id,
        amount: settlement.amount,
        receiver: task.assignee?.name || "Executor",
        receiverAddress: settlement.receiverAddress,
        method: settlement.method,
        status: settlement.status,
        source: "task",
        network: settlement.network,
        chainId: settlement.chainId,
        tokenSymbol: settlement.tokenSymbol,
        tokenAddress: settlement.tokenAddress,
        txHash: settlement.txHash,
        explorerUrl: settlement.explorerUrl,
        createdAt: task.updatedAt
      };
      db.payments.unshift(payment);
      updated = snapshotTask(task);
    });
  } catch (error) {
    settlementError = error instanceof Error ? error.message : "Settlement failed";
  }

  if (transitionError || verificationError) {
    return NextResponse.json(
      {
        error: transitionError || verificationError,
        task: updated,
        verification
      },
      { status: 400 }
    );
  }

  if (settlementError) {
    return NextResponse.json(
      {
        error: settlementError,
        task: updated,
        verification
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    task: updated,
    payment,
    verification
  });
}
