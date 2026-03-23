import { NextResponse } from "next/server";
import { readDb, updateDb, type Task } from "../../lib/store";
import { appendEvidence } from "../../lib/taskEvidence";
import { buildOfficialCampaignTask } from "../../lib/officialCampaignTasks.js";

export const runtime = "nodejs";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(db.tasks);
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

  if (!title && !templateId) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
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
  const task: Task = {
    id: crypto.randomUUID(),
    title: campaignTask?.title || title,
    budget: campaignTask?.budget || budget || "TBD",
    deadline: campaignTask?.deadline || deadline || "TBD",
    acceptance: campaignTask?.acceptance || acceptance || "Provide evidence/logs",
    campaign: campaignTask?.campaign as Task["campaign"],
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
  });

  return NextResponse.json(task, { status: 201 });
}
