import { NextResponse } from "next/server";
import { readDb, updateDb, type Task, type RewardDistribution, type RewardDistributionMode } from "../../lib/store";
import { appendEvidence } from "../../lib/taskEvidence";
import { buildOfficialCampaignTask } from "../../lib/officialCampaignTasks.js";
import { sortTasksForBoard } from "../../lib/taskBoard.js";

export const runtime = "nodejs";

const VALID_DISTRIBUTION_MODES: RewardDistributionMode[] = ["fcfs", "lucky_draw", "equal"];

function parseRewardDistribution(raw: unknown, fallbackBudget: string): RewardDistribution | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const mode = String(obj.mode || "").trim() as RewardDistributionMode;
  if (!VALID_DISTRIBUTION_MODES.includes(mode)) return undefined;
  return {
    mode,
    totalPool: String(obj.totalPool || fallbackBudget).trim(),
    perWinner: obj.perWinner ? String(obj.perWinner).trim() : undefined,
    maxWinners: Math.max(1, Math.floor(Number(obj.maxWinners) || 1)),
    drawTime: obj.drawTime ? String(obj.drawTime).trim() : undefined
  };
}

export async function GET() {
  const db = await readDb();
  return NextResponse.json(sortTasksForBoard(db.tasks));
}

export async function POST(request: Request) {
  const body = await request.json();
  const templateId = String(body.templateId || "").trim();
  const title = String(body.title || "").trim();
  const budget = String(body.budget || "").trim();
  const deadline = String(body.deadline || "").trim();
  const acceptance = String(body.acceptance || "").trim();
  const requesterName = String(body.requesterName || "").trim();
  const requesterHandle = String(body.requesterHandle || "").trim();
  const targetUrl = String(body.targetUrl || "").trim();
  const proofPhrase = String(body.proofPhrase || "").trim();
  const brief = String(body.brief || "").trim();
  const agentId = String(body.agentId || "").trim() || undefined;

  if (!title && !templateId) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const db = await readDb();

  // Validate agentId if provided
  if (agentId && !db.agents.some((a) => a.id === agentId)) {
    return NextResponse.json({ error: "Agent not found" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const campaignTask = templateId
    ? buildOfficialCampaignTask({
        templateId,
        title: title || undefined,
        budget: budget || undefined,
        deadline: deadline || undefined,
        requesterName: requesterName || undefined,
        requesterHandle: requesterHandle || undefined,
        targetUrl: targetUrl || undefined,
        proofPhrase: proofPhrase || undefined,
        brief: brief || undefined
      })
    : null;

  const finalBudget = campaignTask?.budget || budget || "TBD";
  const rewardDistribution = parseRewardDistribution(body.rewardDistribution, finalBudget);

  const task: Task = {
    id: crypto.randomUUID(),
    title: campaignTask?.title || title,
    budget: finalBudget,
    deadline: campaignTask?.deadline || deadline || "TBD",
    acceptance: campaignTask?.acceptance || acceptance || "Provide evidence/logs",
    campaign: campaignTask?.campaign as Task["campaign"],
    agentId,
    rewardDistribution,
    status: "created" as const,
    createdAt: now,
    updatedAt: now,
    evidence: []
  };

  appendEvidence(task, {
    by: "system",
    type: "log",
    content: "Task created: none -> created",
    createdAt: now
  });
  if (campaignTask?.campaign?.brief) {
    appendEvidence(task, {
      by: "system",
      type: "note",
      content: `campaign_brief: ${campaignTask.campaign.brief}`,
      createdAt: now
    });
  }

  await updateDb((db) => {
    db.tasks.unshift(task);
    if (agentId) {
      const agent = db.agents.find((a) => a.id === agentId);
      if (agent) agent.tasksPublished += 1;
    }
  });

  return NextResponse.json(task, { status: 201 });
}
