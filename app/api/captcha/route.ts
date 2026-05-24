import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "../../lib/supabase";

export const runtime = "nodejs";

const CAPTCHA_WORDS = [
  "lucky", "draw", "usdc", "claim", "prize",
  "winner", "crypto", "wallet", "reward", "bonus",
  "token", "coins", "airdrop", "Points", "STACK"
];

function randomWord() {
  return CAPTCHA_WORDS[Math.floor(Math.random() * CAPTCHA_WORDS.length)];
}

/** POST /api/captcha — generate a captcha token + word
 *  Body: { wallet, taskId }
 *  Returns: { token, word } — frontend shows the word, user types it
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim().toLowerCase();
  const taskId = String(body.taskId || "").trim();

  if (!wallet || !taskId) {
    return NextResponse.json({ error: "wallet and taskId required" }, { status: 400 });
  }

  // Check rate limit first (1 per wallet per task per 60s)
  if (supabase) {
    const { data: limitRow } = await supabase
      .from("claim_rate_limits")
      .select("last_claimed_at")
      .eq("wallet_address", wallet)
      .eq("task_id", taskId)
      .single();

    if (limitRow) {
      const lastClaim = new Date(limitRow.last_claimed_at).getTime();
      const now = Date.now();
      if (now - lastClaim < 60_000) {
        const remaining = Math.ceil((60_000 - (now - lastClaim)) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remaining}s before claiming again.` },
          { status: 429 }
        );
      }
    }
  }

  // Generate captcha token
  const word = randomWord();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  if (supabase) {
    await supabase.from("claim_captcha_tokens").insert({
      token,
      wallet_address: wallet,
      task_id: taskId,
      word: word.toLowerCase(),
      expires_at: expiresAt
    });
  }

  return NextResponse.json({ token, word });
}
