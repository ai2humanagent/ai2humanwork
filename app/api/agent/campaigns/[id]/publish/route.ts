import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  readDb,
  updateDb,
  type Notification,
  type UserAccount
} from "../../../../../lib/store";
import {
  inferWinnerDistribution,
  readFundingPlan,
  runAgentCampaignContractPreflight
} from "../../../../../lib/agentCampaignProtocol.js";
import { addNotification, sendEmailNotification } from "../../../../../lib/notificationDelivery";
import { isReadyForTaskNotifications } from "../../../../../lib/operatorAccess";
import { requireAgentCampaignAuth } from "../../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CampaignEnvironment = "test" | "production";
type CampaignFundingMode = "test_no_payout" | "unfunded_campaign" | "prize_pool_contract" | "escrow_deposit" | "ai2human_managed_pool";

function readCampaignEnvironment(value: unknown): CampaignEnvironment | undefined {
  return value === "test" || value === "production" ? value : undefined;
}

function readCampaignFundingMode(value: unknown): CampaignFundingMode | undefined {
  return value === "test_no_payout" ||
    value === "unfunded_campaign" ||
    value === "prize_pool_contract" ||
    value === "escrow_deposit" ||
    value === "ai2human_managed_pool"
    ? value
    : undefined;
}

function canPublishWithFunding(task: Awaited<ReturnType<typeof readDb>>["tasks"][number], contractPreflight: { ok?: boolean }, fundingPlan: ReturnType<typeof readFundingPlan>) {
  if (fundingPlan.payoutDisabled) return { ok: true };
  if (fundingPlan.fundingMode === "unfunded_campaign") return { ok: true };
  if (fundingPlan.fundingMode === "prize_pool_contract" || fundingPlan.fundingMode === "ai2human_managed_pool") {
    return contractPreflight.ok
      ? { ok: true }
      : { ok: false, error: "PrizePool contract preflight has not passed." };
  }
  if (fundingPlan.fundingMode === "escrow_deposit") {
    return task.escrowDepositId
      ? { ok: true }
      : { ok: false, error: "Escrow deposit is required before publishing this campaign." };
  }
  if (task.rewardDistribution) {
    return { ok: false, error: "Reward campaigns must declare a valid fundingMode before publish." };
  }
  return { ok: true };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAgentCampaignAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = await readDb();
  const task = db.tasks.find((item) => item.id === id);
  if (!task) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }
  if (task.campaign?.agentLifecycle?.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft agent campaigns can be published through this endpoint." },
      { status: 400 }
    );
  }

  const input = {
    ...body,
    taskId: id,
    budget: task.budget,
    fundingMode: body.fundingMode || task.campaign?.fundingMode,
    environment: body.environment || task.campaign?.environment,
    poolAddress: body.poolAddress || task.poolAddress || task.campaign?.poolAddress
  };
  const fundingPlan = readFundingPlan(input, task.rewardDistribution);
  const existingFundingPlan =
    task.campaign?.agentLifecycle?.fundingPlan && typeof task.campaign.agentLifecycle.fundingPlan === "object"
      ? task.campaign.agentLifecycle.fundingPlan
      : {};
  const publishFundingPlan = {
    ...existingFundingPlan,
    ...fundingPlan
  };
  const winnerDistribution = inferWinnerDistribution(input, task.rewardDistribution);
  const contractPreflight = await runAgentCampaignContractPreflight(db, input, task.rewardDistribution);
  const publishGate = canPublishWithFunding(task, contractPreflight, fundingPlan);
  if (!publishGate.ok) {
    return NextResponse.json(
      { error: publishGate.error, fundingPlan: publishFundingPlan, contractPreflight },
      { status: 400 }
    );
  }

  const notifications: Array<{ user: UserAccount; notification: Notification }> = [];
  const publishedAt = new Date().toISOString();
  const environment = readCampaignEnvironment(fundingPlan.environment) || task.campaign?.environment;
  const fundingMode = readCampaignFundingMode(fundingPlan.fundingMode) || task.campaign?.fundingMode;

  await updateDb((draft) => {
    const current = draft.tasks.find((item) => item.id === id);
    if (!current) throw new Error("Campaign disappeared during publish.");
    current.taskState = "open";
    current.status = "created";
    current.updatedAt = publishedAt;
    current.poolAddress = fundingPlan.poolAddress || current.poolAddress;
    current.campaign = {
      ...current.campaign!,
      environment,
      fundingMode,
      payoutDisabled: fundingPlan.payoutDisabled || current.campaign?.payoutDisabled,
      isTest: environment === "test" || current.campaign?.isTest,
      agentLifecycle: {
        ...current.campaign?.agentLifecycle,
        status: "published",
        readyToCreate: true,
        readyToPublish: true,
        publishedAt,
        fundingPlan: publishFundingPlan,
        contractPreflight,
        winnerDistribution
      }
    };
    current.evidence.unshift({
      id: crypto.randomUUID(),
      by: "system",
      type: "log",
      content: `agent_campaign_published: funding=${fundingPlan.fundingMode || "none"} | environment=${fundingPlan.environment || "unspecified"} | payoutDisabled=${fundingPlan.payoutDisabled ? "true" : "false"}`,
      createdAt: publishedAt
    });

    if (environment !== "test") {
      for (const user of draft.users) {
        if (!isReadyForTaskNotifications(user)) continue;
        const notification = addNotification(draft, {
          userId: user.id,
          type: "task_assigned",
          title: "New task available",
          body: `"${current.title}" is now available. Open the task, complete proof, and settle after verification.`,
          taskId: current.id
        });
        notifications.push({ user: { ...user }, notification });
      }
    }
  });

  await Promise.allSettled(
    notifications.map((item) =>
      sendEmailNotification({
        user: item.user,
        notification: item.notification,
        reason: "task"
      })
    )
  );

  return NextResponse.json({ success: true, taskId: id, publishedAt, fundingPlan: publishFundingPlan, contractPreflight, notifications: notifications.length });
}
