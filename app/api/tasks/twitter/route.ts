import { NextResponse } from "next/server";
import crypto from "crypto";
import { readDb, updateDb, type Task, type TaskType } from "../../../lib/store";

export const runtime = "nodejs";

type TwitterTaskInput = {
  type: "twitter_follow" | "twitter_like" | "twitter_retweet" | "twitter_comment";
  title: string;
  description?: string;
  targetUsername?: string;
  targetTweetId?: string;
  targetUrl?: string;
  reward: string;
  cooldownHours?: number;
};

const TWITTER_TASK_CONFIGS: Record<TwitterTaskInput["type"], {
  platform: "x";
  action: string;
  label: string;
  acceptance: string;
}> = {
  twitter_follow: {
    platform: "x",
    action: "follow",
    label: "Follow",
    acceptance: "Follow the target X account and click Verify to claim your reward."
  },
  twitter_like: {
    platform: "x",
    action: "like",
    label: "Like",
    acceptance: "Like the target X post and click Verify to claim your reward."
  },
  twitter_retweet: {
    platform: "x",
    action: "retweet",
    label: "Repost",
    acceptance: "Repost the target X post and click Verify to claim your reward."
  },
  twitter_comment: {
    platform: "x",
    action: "comment",
    label: "Comment",
    acceptance: "Leave a comment on the target X post and click Verify to claim your reward."
  }
};

export async function GET() {
  const db = await readDb();
  const twitterTasks = db.tasks.filter((task) =>
    ["twitter_follow", "twitter_like", "twitter_retweet", "twitter_comment"].includes(task.taskType || "")
  );
  return NextResponse.json(twitterTasks);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { type, title, targetUsername, targetTweetId, targetUrl, reward, cooldownHours } = body as Partial<TwitterTaskInput>;

  if (!type || !title || !reward) {
    return NextResponse.json({ error: "type, title, and reward are required" }, { status: 400 });
  }

  const config = TWITTER_TASK_CONFIGS[type as TwitterTaskInput["type"]];
  if (!config) {
    return NextResponse.json({ error: "Invalid Twitter task type" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: `tw-${crypto.randomUUID().slice(0, 8)}`,
    title,
    budget: String(reward).trim(),
    deadline: "24h",
    acceptance: config.acceptance,
    taskType: type as TaskType,
    campaign: {
      requesterName: "AI2Human Official",
      requesterHandle: "@ai2humanwork",
      platform: config.platform,
      action: config.action,
      label: config.label,
      targetUrl: targetUrl || `https://x.com/${targetUsername || "ai2humanwork"}`,
      targetLabel: "Target",
      proofPhrase: "",
      brief: title,
      proofRequirements: [`Complete the ${config.label} action on X`, "Click Verify to claim your reward"],
      verificationChecks: [],
      submissionFields: []
    },
    status: "created",
    verifyCooldownHours: cooldownHours || 24,
    createdAt: now,
    updatedAt: now,
    evidence: []
  };

  await updateDb((db) => {
    db.tasks.unshift(task);
  });

  return NextResponse.json(task, { status: 201 });
}

// Seed default Twitter tasks
export async function PUT() {
  const db = await readDb();
  const existingTwitter = db.tasks.filter((task) =>
    ["twitter_follow", "twitter_like", "twitter_retweet", "twitter_comment"].includes(task.taskType || "")
  );

  if (existingTwitter.length > 0) {
    return NextResponse.json({ message: "Twitter tasks already seeded", count: existingTwitter.length });
  }

  const now = new Date().toISOString();
  const defaultTasks: Task[] = [
    {
      id: `tw-follow-${crypto.randomUUID().slice(0, 8)}`,
      title: "Follow @ai2humanwork on X",
      budget: "0.5",
      deadline: "24h",
      acceptance: "Follow the @ai2humanwork X account and click Verify to claim your reward.",
      taskType: "twitter_follow",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "follow",
        label: "Follow",
        targetUrl: "https://x.com/ai2humanwork",
        targetLabel: "Target account",
        proofPhrase: "",
        brief: "Follow @ai2humanwork on X",
        proofRequirements: ["Follow @ai2humanwork on X", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    },
    {
      id: `tw-like-${crypto.randomUUID().slice(0, 8)}`,
      title: "Like our latest post on X",
      budget: "0.25",
      deadline: "24h",
      acceptance: "Find and like our latest announcement post, then click Verify.",
      taskType: "twitter_like",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "like",
        label: "Like",
        targetUrl: "https://x.com/ai2humanwork/status/2023556314602016768",
        targetLabel: "Target post",
        proofPhrase: "",
        brief: "Like @ai2humanwork latest post",
        proofRequirements: ["Like the announcement post", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    },
    {
      id: `tw-retweet-${crypto.randomUUID().slice(0, 8)}`,
      title: "Repost our announcement",
      budget: "0.75",
      deadline: "24h",
      acceptance: "Repost the announcement to your timeline and click Verify.",
      taskType: "twitter_retweet",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "retweet",
        label: "Repost",
        targetUrl: "https://x.com/ai2humanwork/status/2023556314602016768",
        targetLabel: "Target post",
        proofPhrase: "",
        brief: "Repost @ai2humanwork announcement",
        proofRequirements: ["Repost the announcement to your timeline", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    },
    {
      id: `tw-follow-base-${crypto.randomUUID().slice(0, 8)}`,
      title: "Follow @base on X",
      budget: "0.3",
      deadline: "24h",
      acceptance: "Follow @base on X and click Verify to claim your reward.",
      taskType: "twitter_follow",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "follow",
        label: "Follow",
        targetUrl: "https://x.com/base",
        targetLabel: "Target account",
        proofPhrase: "",
        brief: "Follow @base on X",
        proofRequirements: ["Follow @base on X", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    },
    {
      id: `tw-like-base-${crypto.randomUUID().slice(0, 8)}`,
      title: "Like @base latest post",
      budget: "0.2",
      deadline: "24h",
      acceptance: "Find and like the latest @base tweet, then click Verify.",
      taskType: "twitter_like",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "like",
        label: "Like",
        targetUrl: "https://x.com/base",
        targetLabel: "Target account",
        proofPhrase: "",
        brief: "Like @base latest post",
        proofRequirements: ["Like the latest @base post", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    },
    {
      id: `tw-follow-bankr-${crypto.randomUUID().slice(0, 8)}`,
      title: "Follow @bankrbot on X",
      budget: "0.4",
      deadline: "24h",
      acceptance: "Follow @bankrbot on X and click Verify to claim your reward.",
      taskType: "twitter_follow",
      campaign: {
        requesterName: "AI2Human Official",
        requesterHandle: "@ai2humanwork",
        platform: "x",
        action: "follow",
        label: "Follow",
        targetUrl: "https://x.com/bankrbot",
        targetLabel: "Target account",
        proofPhrase: "",
        brief: "Follow @bankrbot on X",
        proofRequirements: ["Follow @bankrbot on X", "Click Verify to claim your reward"],
        verificationChecks: [],
        submissionFields: []
      },
      status: "created",
      verifyCooldownHours: 24,
      createdAt: now,
      updatedAt: now,
      evidence: []
    }
  ];

  await updateDb((db) => {
    db.tasks.unshift(...defaultTasks);
  });

  return NextResponse.json({ seeded: defaultTasks.length, tasks: defaultTasks });
}