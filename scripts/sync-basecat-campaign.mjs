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

// BaseCat Revival Meme Challenge — 100% English.
// A Niu Lai-style meme contest riding the BaseCat wave, for the revival of Base.
// AI2Human loop: task -> human execution -> proof -> verify -> settle.

const now = new Date().toISOString();
const deadline = "2026-08-24T23:59:00.000Z";

// A2H price: $0.0000004217 (reference, 2026-07-27)
// Ranked prizes, ~$100 total: 1st ≈ 50u, 2nd ≈ 20u, 3rd ≈ 10u × 3 slots.
const PRIZES = [
  { rank: 1, amount: "118568000 A2H", slots: 1, label: "1st place" },
  { rank: 2, amount: "47427000 A2H", slots: 1, label: "2nd place" },
  { rank: 3, amount: "23714000 A2H", slots: 3, label: "3rd place" }
];
const TOTAL_POOL = "237137000";
const MAX_WINNERS = 5;

const task = {
  id: "x-basecat-20260818-revival",
  title: "BaseCat Revival Meme Challenge — Base is coming back. Where's the proof?",
  budget: `${TOTAL_POOL} A2H`,
  deadline,
  acceptance: "Submit your X post link; top-ranked entries win A2H",
  task_type: null,
  status: "created",
  task_state: "open",
  evidence: [
    {
      by: "system",
      type: "log",
      content: "Task created: none -> created (BaseCat Revival Meme Challenge)",
      createdAt: now
    }
  ],
  agent_id: "ai2human-official",
  reward_distribution: {
    mode: "ranked_article_contest",
    totalPool: `${TOTAL_POOL} A2H`,
    prizes: PRIZES,
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
  updated_at: now,
  campaign: {
    brief:
      "Base is coming back. Where's the proof?\n\nBaseCat just went 18x in 24 hours and pushed past a $20M market cap — the blue hard-hat cat is leading the charge. But a chain's revival isn't written by AI. It's memed, made, and proven by real people.\n\nThis challenge is for the revival of Base: draw a BaseCat meme (the blue hard-hat cat) in the middle of Base's comeback — green candles, wallets waking up, builders flooding in. The funnier and sharper, the better.\n\nHow to enter:\n1. Create a BaseCat / Base revival meme (any style — the blue hard-hat cat is the star).\n2. Post it publicly on X with #BaseCat #A2H and tag @ai2humannetwork (and @BasecatOnBase).\n3. Submit your X post link on this page. Submissions are verified and ranked after the deadline.\n\nRewards (A2H, ~$100 total pool):\n🥇 1st ≈ 50u · 🥈 2nd ≈ 20u · 🥉 3rd ≈ 10u × 3\n\nDeadline: Aug 25, 07:59 (UTC+8)\n\nWhy AI2Human? Agents can generate a thousand cat pictures in a second — but a meme made by a real human is the hardest proof that the community is actually alive. task → human execution → proof → verify → settle.",
    label: "Post a BaseCat / Base revival meme on X",
    action: "creative_submission",
    platform: "x",
    targetUrl: "https://x.com/BasecatOnBase",
    targetLabel: "Base(d) Cat official account",
    requiresImage: true,
    exampleImages: [
      "https://ai2human.work/campaign/basecat-meme-1.jpg",
      "https://ai2human.work/campaign/basecat-meme-2.svg",
      "https://ai2human.work/campaign/basecat-meme-3.svg",
      "https://ai2human.work/campaign/basecat-meme-4.svg",
      "https://ai2human.work/campaign/basecat-meme-5.svg"
    ],
    proofPhrase: "#A2H #BaseCat",
    requesterName: "AI2Human",
    requesterHandle: "@ai2humannetwork",
    requiredHashtags: ["#BaseCat", "#A2H"],
    requiredMentions: ["@ai2humannetwork"],
    contentKeywords: ["basecat", "revival", "helmet", "overtime", "moon", "proof"],
    submissionFields: ["postUrl"],
    proofRequirements: [
      "Submit the live X post URL of your BaseCat meme."
    ],
    verificationChecks: [
      "Live X post URL is present.",
      "The post is publicly accessible.",
      "The post shows a BaseCat / Base revival meme and was published after the campaign started."
    ]
  }
};

async function upsert() {
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", task.id)
    .single();

  if (existing) {
    console.log(`Task ${task.id} already exists. Updating...`);
    const { error } = await supabase.from("tasks").update(task).eq("id", task.id);
    if (error) {
      console.error(`Update failed:`, error);
      process.exit(1);
    }
    console.log("Task updated successfully.");
  } else {
    const { error } = await supabase.from("tasks").insert(task);
    if (error) {
      console.error(`Insert failed:`, error);
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
    console.error(`Verification query failed:`, verifyError);
    process.exit(1);
  }
  console.log(JSON.stringify(created, null, 2));
}

await upsert();
console.log(`BaseCat task: https://ai2human.work/tasks/${task.id}`);
