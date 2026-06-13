import type { Db, UserAccount } from "./store";
import { getBoundXAccountForWallet, type BoundXAccount } from "./xIdentity";

export type OperatorAccessCheck = {
  ok: boolean;
  user: UserAccount | null;
  xAccount: BoundXAccount | null;
  missing: Array<"wallet" | "contact_email" | "x_account">;
};

export function isUsableContactEmail(email: unknown) {
  const value = String(email || "").trim().toLowerCase();
  if (!value || value.endsWith("@privy.local")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hasUsableContactEmail(user: UserAccount | null) {
  return isUsableContactEmail(user?.contactEmail) || isUsableContactEmail(user?.email);
}

export function getUserContactEmail(user: UserAccount | null) {
  if (isUsableContactEmail(user?.contactEmail)) return String(user?.contactEmail).trim().toLowerCase();
  if (isUsableContactEmail(user?.email)) return String(user?.email).trim().toLowerCase();
  return "";
}

export async function getOperatorAccessForWallet(db: Db, wallet: string): Promise<OperatorAccessCheck> {
  const normalizedWallet = String(wallet || "").trim().toLowerCase();
  const { user, xAccount } = await getBoundXAccountForWallet(db, normalizedWallet);
  const missing: OperatorAccessCheck["missing"] = [];

  if (!normalizedWallet || !user?.walletAddress) missing.push("wallet");
  if (!hasUsableContactEmail(user)) missing.push("contact_email");
  if (!xAccount?.username) missing.push("x_account");

  return {
    ok: missing.length === 0,
    user,
    xAccount,
    missing
  };
}

export function taskAccessError(check: OperatorAccessCheck, action: "do_tasks" | "claim_rewards" | "submit_article" | "claim_task") {
  if (!check.user?.walletAddress || check.missing.includes("wallet")) {
    return "Connect your wallet before continuing.";
  }
  if (check.missing.includes("contact_email") && check.missing.includes("x_account")) {
    return `Add a contact email and bind your X account in Profile before you ${
      action === "claim_rewards" ? "claim rewards" : action === "submit_article" ? "submit an article" : "take tasks"
    }.`;
  }
  if (check.missing.includes("contact_email")) {
    return `Add a contact email in Profile before you ${
      action === "claim_rewards" ? "claim rewards" : action === "submit_article" ? "submit an article" : "take tasks"
    }.`;
  }
  if (check.missing.includes("x_account")) {
    return `Bind your X account in Profile before you ${
      action === "claim_rewards" ? "claim rewards" : action === "submit_article" ? "submit an article" : "take tasks"
    }.`;
  }
  return "Complete your profile before continuing.";
}

export function isReadyForTaskNotifications(user: UserAccount) {
  return Boolean(user.walletAddress && hasUsableContactEmail(user) && user.xAccount?.username);
}
