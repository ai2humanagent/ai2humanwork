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

// A2H price: $0.0000004217 (reference, 2026-07-27)
// Bankr-style ranked prizes, ~$100 total per task:
// 1st ≈ 50u, 2nd ≈ 20u, 3rd ≈ 10u × 3 slots.
const PRIZES = [
  { rank: 1, amount: "118568000 A2H", slots: 1, label: "1st place" },
  { rank: 2, amount: "47427000 A2H", slots: 1, label: "2nd place" },
  { rank: 3, amount: "23714000 A2H", slots: 3, label: "3rd place" }
];
const TOTAL_POOL = "237137000";
const MAX_WINNERS = 5;

function baseTask(id, title, budget) {
  return {
    id,
    title,
    budget,
    deadline,
    acceptance: "Submit your X post link; top-ranked entries win A2H",
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
      "牛市来了，但证据呢？\n\nAI 写得出文案，但拍不出这张图。梗图创作这件事，还是得靠人。\n\n【活动内容】\n围绕「牛市来了，但证据呢？」创作一张牛来梗图——电影截图、表情包、AI 辅助都行，越离谱越有梗越好。\n\n【怎么参与】\n1. 创作梗图并公开发布到你的 X 账号，@AI2Human，带上 #A2H #牛来；\n2. 在本页面提交你的 X 帖子链接；\n3. 提交后等待 AI2Human 验证，通过即得 A2H 空投。\n\n【奖励】\n验证通过即可获得 A2H 空投，共 50 个名额，先到先得。社区点赞高、最有创意的作品，活动结束后还有额外奖励。",
    label: "Post a 牛来 meme on X (bull is coming… but where's the proof?)",
    action: "creative_submission",
    platform: "x",
    targetUrl: "https://x.com/ai2humannetwork/status/2057669148281651651",
    targetLabel: "AI2Human announcement post",
    requiresImage: true,
    exampleImages: [
      "https://ai2human.work/campaign/niulai-meme-1.png",
      "https://ai2human.work/campaign/niulai-meme-2.png",
      "https://ai2human.work/campaign/niulai-meme-3.png",
      "https://ai2human.work/campaign/niulai-meme-4.png"
    ],
    proofPhrase: "#A2H #牛来",
    requesterName: "AI2Human",
    requesterHandle: "@ai2humannetwork",
    requiredHashtags: ["#A2H", "#牛来"],
    requiredMentions: ["@ai2humannetwork"],
    contentKeywords: ["牛来", "牛市", "牛", "bull", "梗图", "meme"],
    submissionFields: ["postUrl"],
    proofRequirements: [
      "Submit the live X post URL of your meme."
    ],
    verificationChecks: [
      "Live X post URL is present.",
      "The post is publicly accessible.",
      "The post shows your meme and was published after the campaign started."
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
      "「牛来了，证据呢？」\n\nAI 拍不了这张照片——出门找牛，只能靠人。\n\n【活动内容】\n完成以下任一「找牛」任务并拍照：\n1. 公牛/奶牛雕像或真牛（保持安全距离）；\n2. 一碗牛肉面 + 店铺招牌；\n3. 名字带「牛」的地方（牛市口、牛街、Oxford…）；\n4. 任何带 牛 / OX / BULL 字样的招牌；\n5. 手机钱包余额 + 牛元素同框（链上 + 线下一次拍全）；\n6. 通往牛地标的公共交通票据。\n\n【怎么参与】\n1. 照片里必须出现手写的当天日期 + 你的钱包地址；\n2. 把照片公开发布到你的 X 账号，@AI2Human，带上 #A2H #真牛；\n3. 在本页面提交你的 X 帖子链接。\n\n【奖励】\n验证通过即可获得 A2H 空投，共 50 个名额，先到先得。",
    label: "Post your 真牛证明 photo on X (any one of the six quests)",
    action: "creative_submission",
    platform: "x",
    targetUrl: "https://x.com/ai2humannetwork/status/2057669148281651651",
    targetLabel: "AI2Human announcement post",
    requiresImage: true,
    proofPhrase: "#A2H #真牛",
    requesterName: "AI2Human",
    requesterHandle: "@ai2humannetwork",
    requiredHashtags: ["#A2H", "#真牛"],
    requiredMentions: ["@ai2humannetwork"],
    contentKeywords: ["牛", "bull", "ox", "真牛", "牛肉面"],
    submissionFields: ["postUrl"],
    proofRequirements: [
      "Submit the live X post URL of your bull-proof photo."
    ],
    verificationChecks: [
      "Live X post URL is present.",
      "The post is publicly accessible.",
      "The photo shows one of the six bull quests.",
      "Handwritten date + wallet address is visible in the photo."
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
