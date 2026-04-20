import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bundledDbSnapshot from "../../data/db.json";
import {
  seedHumans,
  seedServices,
  type Human,
  type HumanService
} from "./humanMarketplace";
import type { SettlementMethod, SettlementNetwork } from "./settlementTypes";
import {
  DEFAULT_X_TASK_BUDGET,
  DEFAULT_TARGET_URL,
  DEFAULT_REPLY_TARGET_URL,
  buildOfficialCampaignTask,
  buildRealWorldTask,
  DEFAULT_REAL_WORLD_TASK_BUDGET,
  getOfficialCampaignTemplates,
  getRealWorldTaskTemplates
} from "./officialCampaignTasks.js";
import { formatSettlementBudget } from "./assetLabels.js";

export type TaskStatus =
  | "created"
  | "ai_running"
  | "ai_failed"
  | "ai_done"
  | "human_assigned"
  | "human_done"
  | "verified"
  | "paid";

export type EvidenceItem = {
  id: string;
  by: "ai" | "human" | "system";
  type: "log" | "note" | "photo";
  content: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  budget: string;
  deadline: string;
  acceptance: string;
  campaign?: {
    requesterName: string;
    requesterHandle?: string;
    platform: "x" | "real_world";
    action: string;
    label?: string;
    targetUrl?: string;
    targetLabel?: string;
    proofPhrase?: string;
    brief?: string;
    proofRequirements: string[];
    verificationChecks: string[];
    submissionFields?: string[];
  };
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    type: "ai" | "human";
    name: string;
    walletAddress?: string;
  };
  evidence: EvidenceItem[];
};

export type WaitlistEntry = {
  id: string;
  email: string;
  source: string;
  createdAt: string;
};

export type PaymentEntry = {
  id: string;
  taskId?: string;
  fallbackOrderId?: string;
  idempotencyKey?: string;
  amount: string;
  receiver: string;
  receiverAddress?: string;
  payerAddress?: string;
  method: SettlementMethod;
  status: "paid";
  source?: "task" | "fallback_order" | "x402_access";
  network?: SettlementNetwork;
  chainId?: number;
  tokenSymbol?: string;
  tokenAddress?: string;
  txHash?: string;
  explorerUrl?: string;
  createdAt: string;
};

export type FallbackOrderStatus =
  | "created"
  | "accepted"
  | "in_progress"
  | "delivered"
  | "callback_sent"
  | "callback_failed"
  | "verified"
  | "paid";

export type FallbackSubscription = {
  id: string;
  email: string;
  skills: string[];
  cities: string[];
  active: boolean;
  createdAt: string;
  lastNotifiedAt?: string;
};

export type FallbackOrder = {
  id: string;
  serviceId: string;
  providerId: string;
  agentName: string;
  location: string;
  deadline: string;
  budget: string;
  callbackUrl?: string;
  proofRequirements: string[];
  status: FallbackOrderStatus;
  humanId?: string;
  humanName?: string;
  createdAt: string;
  updatedAt: string;
  evidence: EvidenceItem[];
  callback?: {
    attemptedAt?: string;
    status?: "sent" | "failed";
    code?: number;
    message?: string;
  };
};

export type UserAccount = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  humanId?: string;
  authProvider?: "local" | "privy";
  privyUserId?: string;
  walletAddress?: string;
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type Db = {
  tasks: Task[];
  waitlist: WaitlistEntry[];
  payments: PaymentEntry[];
  humans: Human[];
  services: HumanService[];
  fallbackOrders: FallbackOrder[];
  fallbackSubscriptions: FallbackSubscription[];
  users: UserAccount[];
  sessions: AuthSession[];
};

export function makeSeedTasks(count: number): Task[] {
  const xTemplates = getOfficialCampaignTemplates().map((template) => ({
    kind: "x" as const,
    template
  }));
  const realWorldTemplates = getRealWorldTaskTemplates().map((template) => ({
    kind: "real_world" as const,
    template
  }));
  const templates = [...realWorldTemplates, ...xTemplates];
  const realWorldBudgets = [
    formatSettlementBudget("18"),
    formatSettlementBudget("24"),
    formatSettlementBudget("35"),
    formatSettlementBudget("48"),
    formatSettlementBudget("60"),
    formatSettlementBudget("80"),
    formatSettlementBudget("95")
  ];
  const deadlines = ["2h", "4h", "6h", "12h", "24h", "48h", "72h"];
  const humanWallets = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444"
  ];
  const targetUrls = [DEFAULT_TARGET_URL, DEFAULT_REPLY_TARGET_URL];
  const proofAssets = [
    "/freelance-hero.jpg",
    "/freelance-desk.jpg",
    "/freelance-team.jpg",
    "/brand/ai2human-promo-1.png",
    "/brand/ai2human-promo-2.png",
    "/brand/ai2human-promo-3.png"
  ];
  const locationNotes = [
    "Blue Bottle Coffee, Market Street storefront",
    "Midtown 7-Eleven beverage shelf",
    "WeWork front desk handoff counter",
    "Lobby package locker C12",
    "Lunch counter menu board",
    "South Hall main entrance queue"
  ];
  const requesterNames = [
    "Retail Ops Desk",
    "Local Verification Desk",
    "Field Logistics Agent",
    "Partner Success Ops",
    "Store Audit Desk",
    "Event Access Agent"
  ];

  const statuses: TaskStatus[] = [
    "created",
    "created",
    "created",
    "ai_running",
    "ai_failed",
    "ai_done",
    "human_assigned",
    "human_done",
    "verified",
    "paid"
  ];

  const now = Date.now();
  const tasks: Task[] = [];

  for (let i = 0; i < count; i += 1) {
    const status = statuses[i % statuses.length];
    const createdAt = new Date(now - i * 1000 * 60 * 17).toISOString();
    const updatedAt = new Date(now - i * 1000 * 60 * 5).toISOString();
    const id = crypto.randomUUID();
    const scenario = templates[i % templates.length];
    const template = scenario.template;
    const campaignTask =
      scenario.kind === "x"
        ? buildOfficialCampaignTask({
            templateId: template.id,
            requesterName: "ai2human Official",
            requesterHandle: "@ai2humanwork",
            targetUrl: targetUrls[i % targetUrls.length],
            budget: DEFAULT_X_TASK_BUDGET,
            deadline: deadlines[i % deadlines.length],
            brief:
              template.action === "repost"
                ? "Make the repost visible on your timeline so the reviewer can verify it quickly."
                : "Use your own X account, keep the post live, and include the requested campaign CTA."
          })
        : buildRealWorldTask({
            templateId: template.id,
            requesterName: requesterNames[i % requesterNames.length],
            budget:
              realWorldBudgets[i % realWorldBudgets.length] || DEFAULT_REAL_WORLD_TASK_BUDGET,
            deadline: deadlines[i % deadlines.length],
            brief: template.defaultBrief
          });
    const proofPhrase = campaignTask.campaign?.proofPhrase;
    const executorHandle = `@operator${(i % 8) + 1}`;
    const postUrl = `https://x.com/${executorHandle.slice(1)}/status/${1902000000000000000 + i}`;
    const profileUrl = `https://x.com/${executorHandle.slice(1)}`;
    const locationNote = locationNotes[i % locationNotes.length];
    const timestampNote = `Checked at ${new Date(now - i * 1000 * 60 * 3).toLocaleString("en-US", {
      hour12: false
    })}`;
    const proofAsset = proofAssets[i % proofAssets.length];

    const evidence: EvidenceItem[] = [];
    const addEvidence = (by: EvidenceItem["by"], type: EvidenceItem["type"], content: string) => {
      evidence.push({
        id: crypto.randomUUID(),
        by,
        type,
        content,
        createdAt: updatedAt
      });
    };

    if (status === "ai_running") {
      addEvidence(
        "ai",
        "log",
        scenario.kind === "x"
          ? "AI running: querying Wallet API, Market API, and Trade API to decide whether this X task can stay autonomous"
          : "AI running: querying Wallet API, Market API, and Trade API to decide whether this task can stay autonomous"
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: onchainos_precheck | Checking wallet, market, and trade routes before escalation."
      );
    }
    if (status === "ai_failed") {
      addEvidence(
        "ai",
        "log",
        scenario.kind === "x"
          ? "AI failed: Wallet, Market, and Trade prechecks cleared settlement, but a human-owned X identity and live post are still required"
          : "AI failed: Wallet, Market, and Trade prechecks cleared settlement, but an on-site human is still required for proof collection"
      );
      addEvidence(
        "ai",
        "note",
        scenario.kind === "x"
          ? "agent_event: onchainos_precheck | Queried wallet, market, and trade routes, but a human-owned X identity and live post are still required."
          : "agent_event: onchainos_precheck | Queried wallet, market, and trade routes, but the task still requires an on-site check, signature, pickup, or physical proof collection."
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: planner_agent | Escalated to the dispatcher after Wallet API, Market API, and Trade API checks still hit a real-world or compliance blocker."
      );
    }
    if (status === "ai_done") {
      addEvidence(
        "ai",
        "note",
        scenario.kind === "x"
          ? `AI note: campaign brief prepared for ${campaignTask.campaign?.requesterHandle || "@official"} after autonomous planner prechecks cleared.`
          : `AI note: visit brief prepared for ${campaignTask.campaign?.requesterName || "ops desk"} after autonomous planner prechecks cleared.`
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: onchainos_precheck | Queried wallet, market, and trade routes and cleared the task for autonomous execution."
      );
      addEvidence(
        "ai",
        "note",
        "agent_event: planner_agent | Kept the task on the autonomous onchain path after Wallet API, Market API, and Trade API checks cleared."
      );
    }
    if (status === "human_assigned") {
      addEvidence(
        "system",
        "log",
        `Human assigned: ${scenario.kind === "x" ? executorHandle : `field-operator-${(i % 6) + 1}`}`
      );
      addEvidence(
        "system",
        "note",
        `agent_event: dispatcher_agent | Routed the task to ${
          scenario.kind === "x" ? executorHandle : `field-operator-${(i % 6) + 1}`
        } with a payout-ready wallet.`
      );
    }
    if (status === "human_done" || status === "verified" || status === "paid") {
      if (scenario.kind === "x") {
        addEvidence("human", "note", `executor_handle: ${executorHandle}`);
        if (campaignTask.campaign?.action === "repost") {
          addEvidence("human", "note", `profile_url: ${profileUrl}`);
        } else {
          addEvidence("human", "note", `post_url: ${postUrl}`);
        }
        addEvidence("human", "photo", `/brand/ai2human-social-${(i % 3) + 1}.png`);
        if (proofPhrase) {
          addEvidence("human", "note", `proof_phrase: ${proofPhrase}`);
        }
        addEvidence(
          "human",
          "note",
          `summary: Completed ${campaignTask.campaign?.action || "campaign"} task for ${campaignTask.campaign?.requesterHandle || "@official"} and kept the result live for review.`
        );
      } else {
        addEvidence("human", "photo", proofAsset);
        addEvidence("human", "note", `location_note: ${locationNote}`);
        addEvidence("human", "note", `timestamp_note: ${timestampNote}`);
        if (proofPhrase) {
          addEvidence("human", "note", `proof_phrase: ${proofPhrase}`);
        }
        addEvidence(
          "human",
          "note",
          `summary: Completed the ${campaignTask.campaign?.label || "field"} task on-site and returned the requested proof package for reviewer approval.`
        );
      }
    }
    if (status === "verified") addEvidence("system", "log", "Verification checklist passed");
    if (status === "paid") {
      addEvidence("system", "log", "Verification checklist passed");
      addEvidence("system", "log", "Payment settled in demo mode");
    }

    const assignee =
      status === "human_assigned" || status === "human_done"
        ? {
            type: "human" as const,
            name: scenario.kind === "x" ? "Growth Operator" : "Field Operator",
            walletAddress: humanWallets[i % humanWallets.length]
          }
        : status === "ai_running" || status === "ai_done" || status === "ai_failed"
          ? { type: "ai" as const, name: "Demo Agent" }
          : undefined;

    tasks.push({
      id,
      title: campaignTask.title,
      budget: campaignTask.budget,
      deadline: campaignTask.deadline,
      acceptance: campaignTask.acceptance,
      campaign: campaignTask.campaign as Task["campaign"],
      status,
      createdAt,
      updatedAt,
      assignee,
      evidence
    });
  }

  return tasks;
}

export function makeSeedFallbackOrders(count: number): FallbackOrder[] {
  const now = Date.now();
  const statuses: FallbackOrderStatus[] = [
    "created",
    "accepted",
    "delivered",
    "callback_sent",
    "callback_failed",
    "verified",
    "paid"
  ];
  const budgets = ["55", "75", "120", "150", "220"].map((value) => formatSettlementBudget(value));
  const deadlines = ["1h", "2h", "4h", "6h", "12h"];
  const locations = ["Shanghai", "Austin", "Berlin", "Singapore", "Tokyo"];

  const serviceByIndex = seedServices.slice(0, Math.max(1, Math.min(seedServices.length, count)));
  const humansById = new Map(seedHumans.map((human) => [human.id, human] as const));
  const orders: FallbackOrder[] = [];

  for (let i = 0; i < count; i += 1) {
    const service = serviceByIndex[i % serviceByIndex.length];
    const provider = humansById.get(service.providerId);
    if (!provider) continue;

    const status = statuses[i % statuses.length];
    const createdAt = new Date(now - i * 1000 * 60 * 13).toISOString();
    const updatedAt = new Date(now - i * 1000 * 60 * 4).toISOString();
    const order: FallbackOrder = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      providerId: provider.id,
      agentName: `Agent-${(i % 5) + 1}`,
      location: locations[i % locations.length],
      deadline: deadlines[i % deadlines.length],
      budget: budgets[i % budgets.length],
      proofRequirements: ["photo", "timestamp"],
      status,
      humanId: status === "created" ? undefined : provider.id,
      humanName: status === "created" ? undefined : provider.name,
      createdAt,
      updatedAt,
      evidence: []
    };

    if (status !== "created") {
      order.evidence.push({
        id: crypto.randomUUID(),
        by: "human",
        type: "log",
        content: `Order accepted by ${provider.name}`,
        createdAt: updatedAt
      });
    }
    if (status === "delivered" || status === "callback_sent" || status === "callback_failed") {
      order.evidence.push({
        id: crypto.randomUUID(),
        by: "human",
        type: "photo",
        content: "https://example.com/campaign-proof.jpg",
        createdAt: updatedAt
      });
    }
    if (
      status === "callback_sent" ||
      status === "callback_failed" ||
      status === "verified" ||
      status === "paid"
    ) {
      order.callback = {
        attemptedAt: updatedAt,
        status: status === "callback_failed" ? "failed" : "sent",
        code: status === "callback_failed" ? 500 : 200,
        message: status === "callback_failed" ? "Callback failed." : "Callback sent."
      };
    }

    orders.push(order);
  }

  return orders;
}

function getDbPath(): string {
  // Vercel/serverless environments generally don't allow writing to the repo
  // filesystem; /tmp is writable but ephemeral. For a real deployment, replace
  // this with a durable store (Vercel KV/Postgres, etc.).
  if (process.env.TRUSTNET_DB_PATH) {
    return process.env.TRUSTNET_DB_PATH;
  }
  if (process.env.VERCEL) {
    return path.join("/tmp", "trustnet-db.json");
  }
  return path.join(process.cwd(), "data", "db.json");
}

const DB_PATH = getDbPath();

function makeInitialDb(): Db {
  return {
    tasks: makeSeedTasks(60),
    waitlist: [],
    payments: [],
    humans: seedHumans,
    services: seedServices,
    fallbackOrders: makeSeedFallbackOrders(12),
    fallbackSubscriptions: [],
    users: [],
    sessions: []
  };
}

function mergeById<T extends { id: string }>(primary: T[], fallback: T[]): T[] {
  if (!primary.length) return [...fallback];
  if (!fallback.length) return [...primary];

  const merged = [...primary];
  const seen = new Set(primary.map((item) => item.id));

  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

function getBundledDb(): Db {
  return JSON.parse(JSON.stringify(bundledDbSnapshot)) as Db;
}

async function ensureDb(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    const initial = getBundledDb();
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<Db> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Db;
  const bundled = getBundledDb();

  const tasks = mergeById(
    Array.isArray(parsed.tasks) ? parsed.tasks : [],
    Array.isArray(bundled?.tasks) ? bundled.tasks : []
  );
  const humans = Array.isArray(parsed.humans) && parsed.humans.length > 0
    ? parsed.humans
    : seedHumans.map((human) => ({ ...human }));
  const services = Array.isArray(parsed.services) && parsed.services.length > 0
    ? parsed.services
    : seedServices.map((service) => ({ ...service }));
  const fallbackOrders =
    mergeById(
      Array.isArray(parsed.fallbackOrders) ? parsed.fallbackOrders : [],
      Array.isArray(bundled?.fallbackOrders) ? bundled.fallbackOrders : []
    );
  const payments = mergeById(
    Array.isArray(parsed.payments) ? parsed.payments : [],
    Array.isArray(bundled?.payments) ? bundled.payments : []
  );

  return {
    tasks: tasks.length > 0 ? tasks : makeSeedTasks(60),
    waitlist: parsed.waitlist ?? [],
    payments,
    humans,
    services,
    fallbackOrders: fallbackOrders.length > 0 ? fallbackOrders : makeSeedFallbackOrders(12),
    fallbackSubscriptions: parsed.fallbackSubscriptions ?? [],
    users: parsed.users ?? [],
    sessions: parsed.sessions ?? []
  };
}

export async function writeDb(db: Db): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function updateDb<T>(
  updater: (db: Db) => T | Promise<T>
): Promise<T> {
  const db = await readDb();
  const result = await updater(db);
  await writeDb(db);
  return result;
}
