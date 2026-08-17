import crypto from "crypto";
import { isAddress } from "viem";
import {
  deriveAgentPublicState,
  transitionAgentFunding,
  transitionAgentSettlement,
  transitionAgentWorkflow
} from "./agentWorkflowState.js";
import {
  getPrizePoolTransactionStatus,
  getPrizePoolInfo,
  refundPrizePool,
  transferPrizePoolRefund
} from "./prizePool";
import {
  deliverTaskCreatorNotification,
  queueTaskCreatorNotification,
  type QueuedCreatorNotification
} from "./taskCreatorNotifications";
import { readDb, updateDb, type Task } from "./store";
import { acquireXBotFundingLock, releaseXBotFundingLock } from "./xBotStore";
import {
  isExpiredUnfundedXTaskCandidate,
  isExpiredXTaskRefundCandidate
} from "./xTaskLifecyclePolicy.js";
import { refundReviewEventKey } from "./notificationIdempotency.js";

export { isExpiredXTaskRefundCandidate } from "./xTaskLifecyclePolicy.js";

export type ExpiredUnfundedXTaskOutcome = {
  taskId: string;
  status: "expired" | "needs_review" | "skipped";
  error?: string;
};

const DEFAULT_A2H_TOKEN = "0xc46C41005A1A88B0C1491F2B542A4831D6d1EbA3";

type RefundReceipt = {
  status: "pending" | "collection_submitting" | "collected" | "return_submitting" | "return_uncertain" | "returned";
  recipient: string;
  paymentAsset: "USDC" | "A2H";
  poolAmount: string;
  returnAmount: string;
  returnTokenAddress: string;
  returnTokenDecimals: number;
  poolTxHash?: string;
  poolExplorerUrl?: string;
  returnTxHash?: string;
  returnExplorerUrl?: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
};

export type ExpiredXRefundOutcome = {
  taskId: string;
  status: "refunded" | "refund_pending" | "needs_review" | "skipped";
  amount?: string;
  asset?: string;
  poolTxHash?: string;
  returnTxHash?: string;
  error?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function fundingPlan(task: Task) {
  return (task.campaign?.agentLifecycle?.fundingPlan || {}) as Record<string, unknown>;
}

function readRefundReceipt(task: Task): RefundReceipt | null {
  const raw = fundingPlan(task).refund;
  return raw && typeof raw === "object" ? raw as RefundReceipt : null;
}

function setRefundReceipt(task: Task, receipt: RefundReceipt) {
  const lifecycle = task.campaign?.agentLifecycle;
  if (!lifecycle) throw new Error("Task lifecycle is missing.");
  lifecycle.fundingPlan = { ...(lifecycle.fundingPlan || {}), refund: receipt };
}

function latestFundedEvidence(task: Task) {
  const transitions = Array.isArray(task.campaign?.agentLifecycle?.transitions)
    ? task.campaign!.agentLifecycle!.transitions!
    : [];
  return [...transitions]
    .reverse()
    .find((item) => item.machine === "funding" && item.to === "funded")?.evidence || {};
}

function buildRefundReceipt(task: Task, poolAmount: string, now: string): RefundReceipt {
  const evidence = latestFundedEvidence(task);
  const plan = fundingPlan(task);
  const managedPool = plan.managedPool && typeof plan.managedPool === "object"
    ? plan.managedPool as Record<string, unknown>
    : {};
  const a2hPayment = plan.a2hPayment && typeof plan.a2hPayment === "object"
    ? plan.a2hPayment as Record<string, unknown>
    : {};
  const paymentAsset = clean(evidence.paymentAsset).toUpperCase() === "A2H" ? "A2H" : "USDC";
  const recipient = clean(
    evidence.payerAddress ||
    a2hPayment.payerAddress ||
    task.campaign?.source?.requesterWallet ||
    managedPool.deployer
  ).toLowerCase();
  if (!isAddress(recipient)) throw new Error("The original requester wallet could not be verified.");

  if (paymentAsset === "A2H") {
    const a2hAmount = clean(a2hPayment.a2hAmount || evidence.paymentAmount);
    if (!a2hAmount) throw new Error("The original A2H payment amount could not be verified.");
    return {
      status: "pending",
      recipient,
      paymentAsset,
      poolAmount,
      returnAmount: a2hAmount,
      returnTokenAddress: clean(a2hPayment.tokenAddress || process.env.A2H_TOKEN_ADDRESS || DEFAULT_A2H_TOKEN),
      returnTokenDecimals: 18,
      startedAt: now,
      updatedAt: now
    };
  }
  return {
    status: "pending",
    recipient,
    paymentAsset,
    poolAmount,
    returnAmount: poolAmount,
    returnTokenAddress: clean(
      process.env.BASE_SETTLEMENT_TOKEN_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    ),
    returnTokenDecimals: 6,
    startedAt: now,
    updatedAt: now
  };
}

async function deliver(items: Array<QueuedCreatorNotification | null>) {
  await Promise.allSettled(items.map((item) => deliverTaskCreatorNotification(item)));
}

async function markExpiredUnfundedNeedsReview(taskId: string, error: string) {
  let notification: QueuedCreatorNotification | null = null;
  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const now = new Date().toISOString();
    const evidenceContent = `expired_unfunded_needs_review: ${error}`;
    if (!task.evidence.some((item) => item.content === evidenceContent)) {
      task.evidence.unshift({
        id: crypto.randomUUID(),
        by: "system",
        type: "log",
        content: evidenceContent,
        createdAt: now
      });
    }
    notification = queueTaskCreatorNotification(db, task, "needs_review", {
      eventKey: "expired-unfunded-pool-check",
      details: error
    });
  });
  await deliver([notification]);
}

export async function expireUnfundedXTask(
  taskId: string,
  nowMs = Date.now(),
  input: { notify?: boolean } = {}
): Promise<ExpiredUnfundedXTaskOutcome> {
  const lock = await acquireXBotFundingLock(`expire-unfunded:${taskId}`, 10 * 60 * 1000);
  if (!lock) return { taskId, status: "skipped", error: "Expiration is already being processed." };
  try {
    let db = await readDb();
    let task = db.tasks.find((item) => item.id === taskId);
    if (!task || !isExpiredUnfundedXTaskCandidate(task, nowMs)) {
      return { taskId, status: "skipped" };
    }

    // A process can stop after transferring USDC but before persisting the
    // funded transition. Never label such a task unfunded solely from DB state.
    if (task.poolAddress) {
      const poolInfo = await getPrizePoolInfo(task.poolAddress);
      if (!poolInfo) {
        const error = "Unable to verify whether the expired pending PrizePool contains funds.";
        await markExpiredUnfundedNeedsReview(taskId, error);
        return { taskId, status: "needs_review", error };
      }
      if (Number(poolInfo.poolBalance || 0) > 0) {
        const error = `Expired pending task has ${poolInfo.poolBalance} USDC in its PrizePool; automatic closure stopped for reconciliation.`;
        await markExpiredUnfundedNeedsReview(taskId, error);
        return { taskId, status: "needs_review", error };
      }
    }

    let notification: QueuedCreatorNotification | null = null;
    task = await updateDb((draft) => {
      const current = draft.tasks.find((item) => item.id === taskId);
      if (!current || !isExpiredUnfundedXTaskCandidate(current, nowMs)) return current || task!;
      const lifecycle = current.campaign?.agentLifecycle;
      if (!lifecycle) throw new Error("Expired unfunded X task lifecycle is missing.");
      const at = new Date(nowMs).toISOString();
      if (["draft", "awaiting_funding"].includes(clean(lifecycle.workflowState))) {
        transitionAgentWorkflow(current, {
          to: "expired",
          actor: "x_task_deadline_worker",
          reason: "Task deadline passed before funding completed",
          evidence: { deadline: current.deadline, poolAddress: current.poolAddress || "", fundsMoved: false },
          idempotencyKey: `x-expired-unfunded:${current.id}`,
          at
        });
      }
      if (["funding_pending", "failed"].includes(clean(lifecycle.fundingState))) {
        transitionAgentFunding(current, {
          to: "cancelled",
          actor: "x_task_deadline_worker",
          reason: "Funding closed after the unfunded task deadline",
          evidence: { fundsMoved: false },
          idempotencyKey: `x-expired-unfunded-funding:${current.id}`,
          at
        });
      }
      if (lifecycle.settlementState === "not_ready") {
        transitionAgentSettlement(current, {
          to: "cancelled",
          actor: "x_task_deadline_worker",
          reason: "Settlement cancelled because the task expired before funding",
          evidence: { fundsMoved: false },
          idempotencyKey: `x-expired-unfunded-settlement:${current.id}`,
          at
        });
      }
      lifecycle.status = "closed";
      current.taskState = "closed";
      current.updatedAt = at;
      const evidenceContent = "x_task_expired_unfunded: no funds moved; no refund required";
      if (!current.evidence.some((item) => item.content === evidenceContent)) {
        current.evidence.unshift({
          id: crypto.randomUUID(),
          by: "system",
          type: "log",
          content: evidenceContent,
          createdAt: at
        });
      }
      if (input.notify !== false) {
        notification = queueTaskCreatorNotification(draft, current, "expired_unfunded", {
          eventKey: current.deadline,
          details: "No on-chain refund transaction was necessary."
        });
      }
      return current;
    });
    await deliver([notification]);
    return { taskId: task.id, status: "expired" };
  } finally {
    await releaseXBotFundingLock(`expire-unfunded:${taskId}`, lock).catch(() => undefined);
  }
}

async function prepareExpiredRefund(taskId: string, poolAmount: string, now: string) {
  let notification: QueuedCreatorNotification | null = null;
  const task = await updateDb((db) => {
    const current = db.tasks.find((item) => item.id === taskId);
    if (!current) throw new Error("Expired X task not found.");
    const lifecycle = current.campaign?.agentLifecycle;
    if (!lifecycle) throw new Error("Expired X task lifecycle is missing.");
    if (["live", "in_progress"].includes(clean(lifecycle.workflowState))) {
      transitionAgentWorkflow(current, {
        to: "expired",
        actor: "x_task_deadline_worker",
        reason: "Task deadline passed without verified completion",
        evidence: { deadline: current.deadline, poolAddress: current.poolAddress || "" },
        idempotencyKey: `x-expired:${current.id}`,
        at: now
      });
    }
    if (["expired", "cancelled"].includes(clean(lifecycle.workflowState))) {
      transitionAgentWorkflow(current, {
        to: "refund_pending",
        actor: "x_task_deadline_worker",
        reason: "Expired task entered automatic refund processing",
        evidence: { amount: poolAmount, poolAddress: current.poolAddress || "" },
        idempotencyKey: `x-refund-pending:${current.id}`,
        at: now
      });
    }
    if (lifecycle.fundingState === "funded") {
      transitionAgentFunding(current, {
        to: "refund_pending",
        actor: "x_task_deadline_worker",
        reason: "Remaining PrizePool balance scheduled for requester refund",
        evidence: { amount: poolAmount, poolAddress: current.poolAddress || "" },
        idempotencyKey: `x-funding-refund-pending:${current.id}`,
        at: now
      });
    }
    if (["not_ready", "ready"].includes(clean(lifecycle.settlementState))) {
      transitionAgentSettlement(current, {
        to: "cancelled",
        actor: "x_task_deadline_worker",
        reason: "Settlement cancelled because the uncompleted task expired",
        evidence: { deadline: current.deadline },
        idempotencyKey: `x-expired-settlement-cancelled:${current.id}`,
        at: now
      });
    }
    if (!readRefundReceipt(current)) setRefundReceipt(current, buildRefundReceipt(current, poolAmount, now));
    current.taskState = "closed";
    current.updatedAt = now;
    notification = queueTaskCreatorNotification(db, current, "refund_pending", {
      eventKey: current.deadline,
      details: `Remaining pool balance: ${poolAmount} USDC.`
    });
    return current;
  });
  await deliver([notification]);
  return task;
}

async function markRefundNeedsReview(taskId: string, error: string, stage: string) {
  let notification: QueuedCreatorNotification | null = null;
  await updateDb((db) => {
    const task = db.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const now = new Date().toISOString();
    const receipt = readRefundReceipt(task);
    const sameError = clean(receipt?.error) === clean(error);
    if (receipt && !sameError) {
      receipt.error = error;
      receipt.updatedAt = now;
      setRefundReceipt(task, receipt);
    }
    const evidenceContent = `automatic_refund_needs_review: ${clean(stage)}: ${error}`;
    if (!task.evidence.some((item) => item.content === evidenceContent)) {
      task.evidence.unshift({
        id: crypto.randomUUID(),
        by: "system",
        type: "log",
        content: evidenceContent,
        createdAt: now
      });
    }
    // Stage is stable. Never include updatedAt or another value mutated by the
    // retry itself, otherwise every poll becomes a brand-new email event.
    notification = queueTaskCreatorNotification(db, task, "needs_review", {
      eventKey: refundReviewEventKey(stage),
      details: error
    });
  });
  await deliver([notification]);
}

async function finalizeReturnedRefund(input: {
  taskId: string;
  txHash: string;
  explorerUrl: string;
  amount: string;
  recipient: string;
}) {
  let notification: QueuedCreatorNotification | null = null;
  const finalTask = await updateDb((draft) => {
    const current = draft.tasks.find((item) => item.id === input.taskId);
    if (!current) throw new Error("Refunded task disappeared.");
    const lifecycle = current.campaign?.agentLifecycle;
    if (!lifecycle) throw new Error("Refunded task lifecycle is missing.");
    const at = new Date().toISOString();
    const currentReceipt = readRefundReceipt(current);
    if (!currentReceipt) throw new Error("Refund receipt disappeared.");
    currentReceipt.status = "returned";
    currentReceipt.returnTxHash = input.txHash;
    currentReceipt.returnExplorerUrl = input.explorerUrl;
    currentReceipt.updatedAt = at;
    currentReceipt.error = "";
    setRefundReceipt(current, currentReceipt);
    if (lifecycle.fundingState === "refund_pending") {
      transitionAgentFunding(current, {
        to: "refunded",
        actor: "x_task_deadline_worker",
        reason: "Expired task funds returned to requester",
        evidence: {
          poolTxHash: currentReceipt.poolTxHash || "",
          returnTxHash: input.txHash,
          recipient: input.recipient,
          amount: input.amount,
          asset: currentReceipt.paymentAsset
        },
        idempotencyKey: `x-funding-refunded:${current.id}`,
        at
      });
    }
    if (lifecycle.workflowState === "refund_pending") {
      transitionAgentWorkflow(current, {
        to: "refunded",
        actor: "x_task_deadline_worker",
        reason: "Expired task refund confirmed on-chain",
        evidence: { poolTxHash: currentReceipt.poolTxHash || "", returnTxHash: input.txHash },
        idempotencyKey: `x-task-refunded:${current.id}`,
        at
      });
    }
    lifecycle.status = "refunded";
    current.campaign!.agentLifecycle = lifecycle;
    current.taskState = "refunded";
    current.updatedAt = at;
    const evidenceContent = `expired_task_refunded: ${input.amount} ${currentReceipt.paymentAsset} returned to ${input.recipient} tx=${input.txHash}`;
    if (!current.evidence.some((item) => item.content === evidenceContent)) {
      current.evidence.unshift({
        id: crypto.randomUUID(),
        by: "system",
        type: "log",
        content: evidenceContent,
        createdAt: at
      });
    }
    notification = queueTaskCreatorNotification(draft, current, "refunded", {
      eventKey: input.txHash,
      details: `${input.amount} ${currentReceipt.paymentAsset} returned. Receipt: ${input.explorerUrl}`
    });
    return current;
  });
  await deliver([notification]);
  return finalTask;
}

export async function refundExpiredXTask(taskId: string, nowMs = Date.now()): Promise<ExpiredXRefundOutcome> {
  const lock = await acquireXBotFundingLock(`refund:${taskId}`, 10 * 60 * 1000);
  if (!lock) return { taskId, status: "skipped", error: "Refund is already being processed." };
  try {
    let db = await readDb();
    let task = db.tasks.find((item) => item.id === taskId);
    if (!task || !isExpiredXTaskRefundCandidate(task, nowMs)) return { taskId, status: "skipped" };
    if (!task.poolAddress) return { taskId, status: "needs_review", error: "PrizePool address is missing." };

    const poolInfo = await getPrizePoolInfo(task.poolAddress);
    if (!poolInfo) {
      const error = "Unable to read the expired PrizePool balance.";
      await markRefundNeedsReview(taskId, error, "pool-read");
      return { taskId, status: "needs_review", error };
    }
    let existingReceipt = readRefundReceipt(task);
    if (existingReceipt?.status === "collection_submitting") {
      if (existingReceipt.poolTxHash) {
        const chainStatus = await getPrizePoolTransactionStatus(existingReceipt.poolTxHash);
        if (chainStatus.status === "success") {
          await updateDb((draft) => {
            const current = draft.tasks.find((item) => item.id === taskId);
            const pending = current ? readRefundReceipt(current) : null;
            if (!current || !pending) return;
            pending.status = "collected";
            pending.poolExplorerUrl = chainStatus.explorerUrl;
            pending.error = "";
            pending.updatedAt = new Date().toISOString();
            setRefundReceipt(current, pending);
          });
          db = await readDb();
          task = db.tasks.find((item) => item.id === taskId)!;
          existingReceipt = readRefundReceipt(task);
        } else if (chainStatus.status === "reverted") {
          await updateDb((draft) => {
            const current = draft.tasks.find((item) => item.id === taskId);
            const pending = current ? readRefundReceipt(current) : null;
            if (!current || !pending) return;
            pending.status = "pending";
            pending.poolTxHash = "";
            pending.poolExplorerUrl = "";
            pending.error = "";
            pending.updatedAt = new Date().toISOString();
            setRefundReceipt(current, pending);
          });
          db = await readDb();
          task = db.tasks.find((item) => item.id === taskId)!;
          existingReceipt = readRefundReceipt(task);
        } else {
          const error = "The PrizePool refund transaction is still pending or its receipt is temporarily unavailable.";
          await markRefundNeedsReview(taskId, error, "collection");
          return { taskId, status: "needs_review", error, poolTxHash: existingReceipt.poolTxHash };
        }
      } else if (Number(poolInfo.poolBalance) > 0) {
        // No hash was ever persisted and the funds are still in the pool, so
        // the previous attempt definitely did not move value. It is safe to
        // return to pending and retry.
        await updateDb((draft) => {
          const current = draft.tasks.find((item) => item.id === taskId);
          const pending = current ? readRefundReceipt(current) : null;
          if (!current || !pending) return;
          pending.status = "pending";
          pending.error = "";
          pending.updatedAt = new Date().toISOString();
          setRefundReceipt(current, pending);
        });
        db = await readDb();
        task = db.tasks.find((item) => item.id === taskId)!;
        existingReceipt = readRefundReceipt(task);
      } else {
        const error = "The PrizePool is empty but the prior refund transaction hash was not recorded.";
        await markRefundNeedsReview(taskId, error, "collection");
        return { taskId, status: "needs_review", error };
      }
    }
    if (["return_submitting", "return_uncertain"].includes(clean(existingReceipt?.status))) {
      if (existingReceipt?.returnTxHash) {
        const chainStatus = await getPrizePoolTransactionStatus(existingReceipt.returnTxHash);
        if (chainStatus.status === "success") {
          const finalTask = await finalizeReturnedRefund({
            taskId,
            txHash: existingReceipt.returnTxHash,
            explorerUrl: chainStatus.explorerUrl,
            amount: existingReceipt.returnAmount,
            recipient: existingReceipt.recipient
          });
          return {
            taskId,
            status: deriveAgentPublicState(finalTask) === "refunded" ? "refunded" : "needs_review",
            amount: existingReceipt.returnAmount,
            asset: existingReceipt.paymentAsset,
            poolTxHash: existingReceipt.poolTxHash,
            returnTxHash: existingReceipt.returnTxHash
          };
        }
        if (chainStatus.status === "reverted") {
          await updateDb((draft) => {
            const current = draft.tasks.find((item) => item.id === taskId);
            const pending = current ? readRefundReceipt(current) : null;
            if (!current || !pending) return;
            pending.status = "collected";
            pending.returnTxHash = "";
            pending.returnExplorerUrl = "";
            pending.error = "";
            pending.updatedAt = new Date().toISOString();
            setRefundReceipt(current, pending);
          });
          db = await readDb();
          task = db.tasks.find((item) => item.id === taskId)!;
          existingReceipt = readRefundReceipt(task);
        } else {
          const error = "The requester refund transfer is still pending or its receipt is temporarily unavailable.";
          await markRefundNeedsReview(taskId, error, "return");
          return {
            taskId,
            status: "needs_review",
            error,
            poolTxHash: existingReceipt.poolTxHash,
            returnTxHash: existingReceipt.returnTxHash
          };
        }
      } else {
        const error = "A prior requester refund transfer has an uncertain outcome and no transaction hash was recorded.";
        await markRefundNeedsReview(taskId, error, "return");
        return { taskId, status: "needs_review", error, poolTxHash: existingReceipt?.poolTxHash };
      }
    }
    const poolAmount = clean(poolInfo.poolBalance);
    if (Number(poolAmount) <= 0 && !existingReceipt?.poolTxHash) {
      const error = "The expired PrizePool is empty but no confirmed refund receipt is recorded.";
      await markRefundNeedsReview(taskId, error, "empty-pool");
      return { taskId, status: "needs_review", error };
    }

    task = await prepareExpiredRefund(taskId, poolAmount || existingReceipt?.poolAmount || "0", new Date(nowMs).toISOString());
    let receipt = readRefundReceipt(task)!;

    if (!receipt.poolTxHash) {
      await updateDb((draft) => {
        const current = draft.tasks.find((item) => item.id === taskId);
        if (!current) return;
        const pending = readRefundReceipt(current);
        if (!pending) return;
        pending.status = "collection_submitting";
        pending.updatedAt = new Date().toISOString();
        setRefundReceipt(current, pending);
      });
      const collected = await refundPrizePool({
        poolAddress: task.poolAddress!,
        onSubmitted: async ({ txHash, explorerUrl }) => {
          await updateDb((draft) => {
            const current = draft.tasks.find((item) => item.id === taskId);
            const pending = current ? readRefundReceipt(current) : null;
            if (!current || !pending) return;
            pending.status = "collection_submitting";
            pending.poolTxHash = txHash;
            pending.poolExplorerUrl = explorerUrl;
            pending.error = "";
            pending.updatedAt = new Date().toISOString();
            setRefundReceipt(current, pending);
          });
        }
      });
      if (!collected.ok) {
        const error = collected.error;
        await updateDb((draft) => {
          const current = draft.tasks.find((item) => item.id === taskId);
          const pending = current ? readRefundReceipt(current) : null;
          if (!current || !pending) return;
          if (collected.txHash) {
            pending.status = "collection_submitting";
            pending.poolTxHash = collected.txHash;
            pending.poolExplorerUrl = collected.explorerUrl || pending.poolExplorerUrl;
          } else {
            // No hash means no value-moving transaction was submitted. Leaving
            // the state as collection_submitting would permanently wedge the
            // refund after a transient RPC read failure.
            pending.status = "pending";
          }
          pending.error = error;
          pending.updatedAt = new Date().toISOString();
          setRefundReceipt(current, pending);
        });
        await markRefundNeedsReview(taskId, error, "collection");
        return { taskId, status: "needs_review", error, poolTxHash: collected.txHash };
      }
      await updateDb((draft) => {
        const current = draft.tasks.find((item) => item.id === taskId);
        if (!current) return;
        const pending = readRefundReceipt(current) || buildRefundReceipt(current, collected.amount, new Date().toISOString());
        pending.status = "collected";
        pending.poolAmount = collected.amount;
        if (pending.paymentAsset === "USDC") pending.returnAmount = collected.amount;
        pending.poolTxHash = collected.txHash;
        pending.poolExplorerUrl = collected.explorerUrl;
        pending.updatedAt = new Date().toISOString();
        pending.error = "";
        setRefundReceipt(current, pending);
        current.evidence.unshift({
          id: crypto.randomUUID(),
          by: "system",
          type: "log",
          content: `expired_pool_refund_collected: ${collected.amount} USDC tx=${collected.txHash}`,
          createdAt: new Date().toISOString()
        });
      });
      db = await readDb();
      task = db.tasks.find((item) => item.id === taskId)!;
      receipt = readRefundReceipt(task)!;
      if (collected.directRecipient) {
        const finalTask = await finalizeReturnedRefund({
          taskId,
          txHash: collected.txHash,
          explorerUrl: collected.explorerUrl,
          amount: collected.amount,
          recipient: collected.directRecipient
        });
        return {
          taskId,
          status: deriveAgentPublicState(finalTask) === "refunded" ? "refunded" : "needs_review",
          amount: collected.amount,
          asset: receipt.paymentAsset,
          poolTxHash: collected.txHash,
          returnTxHash: collected.txHash
        };
      }
    }

    await updateDb((draft) => {
      const current = draft.tasks.find((item) => item.id === taskId);
      if (!current) return;
      const pending = readRefundReceipt(current);
      if (!pending) return;
      pending.status = "return_submitting";
      pending.updatedAt = new Date().toISOString();
      setRefundReceipt(current, pending);
    });
    const returned = await transferPrizePoolRefund({
      recipient: receipt.recipient,
      amount: receipt.returnAmount,
      tokenAddress: receipt.returnTokenAddress,
      decimals: receipt.returnTokenDecimals,
      onSubmitted: async ({ txHash, explorerUrl }) => {
        await updateDb((draft) => {
          const current = draft.tasks.find((item) => item.id === taskId);
          const pending = current ? readRefundReceipt(current) : null;
          if (!current || !pending) return;
          pending.status = "return_submitting";
          pending.returnTxHash = txHash;
          pending.returnExplorerUrl = explorerUrl;
          pending.error = "";
          pending.updatedAt = new Date().toISOString();
          setRefundReceipt(current, pending);
        });
      }
    });
    if (!returned.ok) {
      await updateDb((draft) => {
        const current = draft.tasks.find((item) => item.id === taskId);
        if (!current) return;
        const pending = readRefundReceipt(current);
        if (!pending) return;
        pending.status = returned.txHash ? "return_uncertain" : "collected";
        if (returned.txHash) {
          pending.returnTxHash = returned.txHash;
          pending.returnExplorerUrl = returned.explorerUrl || pending.returnExplorerUrl;
        }
        pending.error = returned.error;
        pending.updatedAt = new Date().toISOString();
        setRefundReceipt(current, pending);
      });
      await markRefundNeedsReview(taskId, returned.error, "return");
      return {
        taskId,
        status: "needs_review",
        error: returned.error,
        poolTxHash: receipt.poolTxHash,
        returnTxHash: returned.txHash
      };
    }

    const finalTask = await finalizeReturnedRefund({
      taskId,
      txHash: returned.txHash,
      explorerUrl: returned.explorerUrl,
      amount: returned.amount,
      recipient: returned.recipient
    });
    return {
      taskId,
      status: deriveAgentPublicState(finalTask) === "refunded" ? "refunded" : "needs_review",
      amount: returned.amount,
      asset: receipt.paymentAsset,
      poolTxHash: receipt.poolTxHash,
      returnTxHash: returned.txHash
    };
  } finally {
    await releaseXBotFundingLock(`refund:${taskId}`, lock).catch(() => undefined);
  }
}

export async function runExpiredXTaskRefunds(input: { limit?: number; nowMs?: number } = {}) {
  const nowMs = input.nowMs || Date.now();
  const limit = Math.max(1, Math.min(Number(input.limit || 5), 20));
  const db = await readDb();
  const unfundedDue = db.tasks
    .filter((task) => isExpiredUnfundedXTaskCandidate(task, nowMs))
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, limit);
  const unfundedResults: ExpiredUnfundedXTaskOutcome[] = [];
  for (const task of unfundedDue) {
    // Do not create a burst of late emails when this reconciler is first
    // deployed against historical data. Normal deadline runs still notify.
    const createdAtMs = Date.parse(task.createdAt || "");
    const notify = Number.isFinite(createdAtMs) && nowMs - createdAtMs <= 24 * 60 * 60 * 1000;
    unfundedResults.push(await expireUnfundedXTask(task.id, nowMs, { notify }).catch((error) => ({
      taskId: task.id,
      status: "needs_review" as const,
      error: error instanceof Error ? error.message : "Unfunded task expiration failed."
    })));
  }
  const due = db.tasks
    .filter((task) => isExpiredXTaskRefundCandidate(task, nowMs))
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, limit);
  const results: ExpiredXRefundOutcome[] = [];
  for (const task of due) {
    results.push(await refundExpiredXTask(task.id, nowMs).catch((error) => ({
      taskId: task.id,
      status: "needs_review" as const,
      error: error instanceof Error ? error.message : "Automatic refund failed."
    })));
  }
  return {
    checkedAt: new Date(nowMs).toISOString(),
    due: due.length,
    results,
    expiredUnfundedDue: unfundedDue.length,
    expiredUnfundedResults: unfundedResults
  };
}
