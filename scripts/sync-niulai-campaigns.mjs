import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(import.meta.dirname, "..", ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// 牛来 ("Bull Is Coming") 双活动 — 无持仓门槛，任何人可参与。
// 1) 二创梗图挑战：牛市来了，但证据呢？
// 2) 真牛证明：出门找牛/牛肉面/带牛字的地标，拍照提交证据。
// 两个任务都走 AI2Human 闭环：task -> human execution -> proof -> verify -> settle。

const now = new Date().toISOString();
const deadline = "2026-08-24T23:59:00.000Z";

// A2H price: $0.0000004217 as of 2026-07-27
// ~$4.2 ≈ 10,000,000 A2H per winner, 50 winners per task.
const PER_WINNER = "10000000";
const MAX_WINNERS = 50;
const TOTAL_POOL = String(Number(PER_WINNER) * MAX_WINNERS);

function baseTask(id, title, budget) {
  return {
    id,
    title,
    budget,
    deadline,
    acceptance: "Submit verifiable proof; approval unlocks the A2H reward",
    task_type: null,
    status: "created",
    task_state: "open",
    evidence: [
      {
        by: "system",
        type: "log",
        content: `Task created: none -> created (${title})`,
        createdAt: now
      }
    ],
    agent_id: "ai2human-official",
    reward_distribution: {
      mode: "fcfs",
      totalPool: `${TOTAL_POOL} A2H`,
      perWinner: PER_WINNER,
      maxWinners: MAX_WINNERS,
      network: "base-mainnet",
      currency: "A2H",
      payoutMode: "admin_after_final_review"
    },
    escrow_deposit_id: null,
    assignee: { name: "Agent", type: "ai" },
    draw_result: null,
    verify_cooldown_hours: 0,
    created_at: now,
    updated_at: now
  };
}

const memeTask = {
  ...baseTask(
    "x-meme-20260817-niulai",
    "牛来 Meme Challenge — 牛市来了，但证据呢？ (A2H)",
    `${TOTAL_POOL} A2H`
  ),
  campaign: {
    brief:
      "Everyone keeps saying the bull is coming. Where is the proof? Make the funniest or sharpest meme about 「牛市来了，但证据呢？」— AI agents can draft ideas, but only humans can turn them into something worth sharing. Post your meme on X, submit the link, and verified entries earn an A2H airdrop. Top community picks get bonus rewards after review.",
    label: "Post a 牛来 meme on X (bull is coming… but where's the proof?)",
    action: "creative_submission",
    platform: "x",
    targetUrl: "https://x.com/ai2humannetwork/status/2057669148281651651",
    targetLabel: "AI2Human announcement post",
    proofPhrase: "#A2H #牛来",
    requesterName: "AI2Human",
    requesterHandle: "@ai2humannetwork",
    requiredHashtags: ["#A2H", "#牛来"],
    requiredMentions: ["@ai2humannetwork"],
    submissionFields: ["executorHandle", "postUrl", "photo", "proofPhrase", "summary"],
    proofRequirements: [
      "Attach your X handle.",
      "Attach the live X post URL containing your meme image.",
      "The live URL must belong to the same X handle you submit.",
      "Upload a screenshot of the post and attached image.",
      "Include the required hashtag or phrase (#A2H #牛来).",
      "Add a one-line reason for the meme."
    ],
    verificationChecks: [
      "Executor handle is present.",
      "Live X post URL is present.",
      "Submitted X URL matches executor handle.",
      "Image proof is uploaded.",
      "Required hashtag or phrase is present.",
      "Meme reason is present."
    ]
  }
};

const bullTask = {
  ...baseTask(
    "real-bull-20260817-niulai",
    "真牛证明 Bull Hunt — 出门找牛，拍照领 A2H",
    `${TOTAL_POOL} A2H`
  ),
  campaign: {
    brief:
      "「牛来了，证据呢？」 AI can't walk outside and photograph a bull — you can. Complete any ONE of these and submit photo proof: (1) a bull/cow statue or real cow (safe distance); (2) a beef noodle bowl with the shop sign; (3) a place whose name contains 牛 (牛市口, 牛街, Oxford…); (4) any sign with 牛/OX/BULL on it; (5) your phone showing a wallet balance next to a bull item (onchain + offline in one shot); (6) a public-transport ticket to a bull landmark. Handwritten paper with today's date + wallet address must appear in the photo. Photo + location note + timestamp note = your proof bundle.",
    label: "Photograph proof that the bull is here (any one of the six quests)",
    action: "storefront_check",
    platform: "real_world",
    targetUrl: "",
    targetLabel: "Real-world bull evidence",
    requesterName: "AI2Human",
    requesterHandle: "@ai2humannetwork",
    submissionFields: ["photo", "locationNote", "timestampNote", "summary"],
    proofRequirements: [
      "Upload one clear photo showing your bull evidence and a handwritten paper with today's date + your wallet address.",
      "Add a short location note naming the place (store, landmark, station, street).",
      "Add a timestamp note for when the proof was captured.",
      "Add a one-line execution summary."
    ],
    verificationChecks: [
      "Bull proof photo is uploaded.",
      "Handwritten date + wallet address is visible in the photo.",
      "Location note is present.",
      "Timestamp note is present.",
      "Execution summary is present."
    ]
  }
};

async function upsert(task) {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", task.id)
    .single();

  if (existing) {
    console.log(`Task ${task.id} already exists. Updating...`);
    const { error } = await supabase.from("tasks").update(task).eq("id", task.id);
    if (error) {
      console.error(`Update failed for ${task.id}:`, error);
      process.exit(1);
    }
    console.log("Task updated successfully.");
  } else {
    const { error } = await supabase.from("tasks").insert(task);
    if (error) {
      console.error(`Insert failed for ${task.id}:`, error);
      process.exit(1);
    }
    console.log("Task created successfully.");
  }

  const { data: created, error: verifyError } = await supabase
    .from("tasks")
    .select("id, title, budget, status, task_state, created_at")
    .eq("id", task.id)
    .single();

  if (verifyError) {
    console.error(`Verification query failed for ${task.id}:`, verifyError);
    process.exit(1);
  }
  console.log(JSON.stringify(created, null, 2));
}

await upsert(memeTask);
await upsert(bullTask);

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ai2human.work";
console.log(`\nMeme task: ${baseUrl}/tasks/x-meme-20260817-niulai`);
console.log(`Bull task: ${baseUrl}/tasks/real-bull-20260817-niulai`);
